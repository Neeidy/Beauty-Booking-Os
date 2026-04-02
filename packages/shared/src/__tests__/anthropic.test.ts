import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import {
  callAgent,
  extractJson,
  _resetAnthropicClient,
  _setAnthropicClient,
} from "../clients/anthropic.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TestSchema = z.object({
  intent: z.enum(["new_booking", "price_inquiry", "unclear"]),
  confidence: z.number(),
});

type TestOutput = z.infer<typeof TestSchema>;

function makeMessage(text: string, inputTokens = 100, outputTokens = 50) {
  return {
    id: "msg_test",
    type: "message" as const,
    role: "assistant" as const,
    content: [{ type: "text" as const, text }],
    model: "claude-sonnet-4-0",
    stop_reason: "end_turn" as const,
    stop_sequence: null,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  };
}

function makeMockClient(messageOrFn: unknown) {
  const create = typeof messageOrFn === "function"
    ? messageOrFn
    : vi.fn().mockResolvedValue(messageOrFn);

  return {
    messages: { create },
  } as unknown as Parameters<typeof _setAnthropicClient>[0];
}

const CALL_OPTS = {
  systemPrompt: "You are a test agent. Respond with JSON only.",
  userMessage: "Classify this message",
  outputSchema: TestSchema,
  clientId: "00000000-0000-0000-0000-000000000001",
  agentName: "test-agent",
};

// ── extractJson ────────────────────────────────────────────────────────────────

describe("extractJson", () => {
  it("parses plain JSON", () => {
    const result = extractJson('{"intent":"new_booking","confidence":0.9}');
    expect(result).toEqual({ intent: "new_booking", confidence: 0.9 });
  });

  it("parses JSON in a ```json fence", () => {
    const result = extractJson(
      '```json\n{"intent":"price_inquiry","confidence":0.8}\n```'
    );
    expect(result).toEqual({ intent: "price_inquiry", confidence: 0.8 });
  });

  it("parses JSON in a plain ``` fence", () => {
    const result = extractJson(
      '```\n{"intent":"unclear","confidence":0.3}\n```'
    );
    expect(result).toEqual({ intent: "unclear", confidence: 0.3 });
  });

  it("extracts first JSON object from prose", () => {
    const result = extractJson(
      'The answer is: {"intent":"new_booking","confidence":0.95} as per the analysis.'
    );
    expect(result).toEqual({ intent: "new_booking", confidence: 0.95 });
  });

  it("throws on text with no JSON", () => {
    expect(() => extractJson("I cannot help with that.")).toThrow(
      /No valid JSON found/
    );
  });
});

// ── callAgent — success path ───────────────────────────────────────────────────

describe("callAgent — success", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("returns parsed data + token usage on first attempt", async () => {
    const validJson = '{"intent":"new_booking","confidence":0.92}';
    _setAnthropicClient(makeMockClient(makeMessage(validJson, 120, 60)));

    const result = await callAgent<TestOutput>(CALL_OPTS);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ intent: "new_booking", confidence: 0.92 });
    expect(result.error).toBeNull();
    expect(result.tokenUsage).toEqual({ input: 120, output: 60, total: 180 });
    expect(result.retryCount).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("accepts JSON wrapped in a markdown fence", async () => {
    const fenced = "```json\n{\"intent\":\"price_inquiry\",\"confidence\":0.8}\n```";
    _setAnthropicClient(makeMockClient(makeMessage(fenced)));

    const result = await callAgent<TestOutput>(CALL_OPTS);
    expect(result.success).toBe(true);
    expect(result.data?.intent).toBe("price_inquiry");
  });

  it("respects custom maxTokens option", async () => {
    const create = vi.fn().mockResolvedValue(
      makeMessage('{"intent":"unclear","confidence":0.4}')
    );
    _setAnthropicClient(makeMockClient(create));

    await callAgent<TestOutput>({ ...CALL_OPTS, maxTokens: 512 });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 512 })
    );
  });
});

// ── callAgent — retry path ─────────────────────────────────────────────────────

describe("callAgent — retry", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("retries on invalid JSON and succeeds on second attempt", async () => {
    const create = vi.fn()
      .mockResolvedValueOnce(makeMessage("not valid json"))
      .mockResolvedValueOnce(makeMessage('{"intent":"new_booking","confidence":0.85}'));

    _setAnthropicClient(makeMockClient(create));

    const result = await callAgent<TestOutput>({
      ...CALL_OPTS,
      // Speed up test: override withRetry by using tiny delays
    });

    expect(result.success).toBe(true);
    expect(result.data?.intent).toBe("new_booking");
    expect(result.retryCount).toBe(1);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("retries on schema validation failure", async () => {
    const create = vi.fn()
      .mockResolvedValueOnce(makeMessage('{"intent":"INVALID_INTENT","confidence":0.9}'))
      .mockResolvedValueOnce(makeMessage('{"intent":"unclear","confidence":0.4}'));

    _setAnthropicClient(makeMockClient(create));

    const result = await callAgent<TestOutput>(CALL_OPTS);
    expect(result.success).toBe(true);
    expect(result.data?.intent).toBe("unclear");
    expect(result.retryCount).toBe(1);
  });

  it("returns failure after max retries exhausted", async () => {
    const create = vi.fn().mockResolvedValue(makeMessage("not json at all"));
    _setAnthropicClient(makeMockClient(create));

    const result = await callAgent<TestOutput>(CALL_OPTS);

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(create).toHaveBeenCalledTimes(3); // 3 total attempts (maxAttempts)
  });

  it("returns failure and structured error when API throws", async () => {
    const create = vi.fn().mockRejectedValue(
      new Error("API connection refused")
    );
    _setAnthropicClient(makeMockClient(create));

    const result = await callAgent<TestOutput>(CALL_OPTS);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/API connection refused/);
    expect(result.data).toBeNull();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
