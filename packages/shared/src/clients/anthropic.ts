import Anthropic from "@anthropic-ai/sdk";
import { type ZodSchema } from "zod";
import { withRetry } from "../utils/retry.js";

// ── Config ─────────────────────────────────────────────────────────────────────

// claude-sonnet-4-0 is the alias for claude-sonnet-4-20250514 (CLAUDE.md spec)
export const DEFAULT_MODEL = "claude-sonnet-4-0";
const DEFAULT_MAX_TOKENS = 1024;
const TIMEOUT_MS = 30_000;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AgentCallResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  tokenUsage: { input: number; output: number; total: number };
  durationMs: number;
  retryCount: number;
}

export interface CallAgentOptions<T> {
  systemPrompt: string;
  userMessage: string;
  outputSchema: ZodSchema<T>;
  clientId: string;
  agentName: string;
  maxTokens?: number;
  model?: string;
}

// ── Singleton client ───────────────────────────────────────────────────────────

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (_client) return _client;

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is not set"
    );
  }

  // SDK-level retries handle 429 + 5xx automatically.
  // We layer our own withRetry on top for JSON parse / schema failures.
  _client = new Anthropic({
    apiKey,
    maxRetries: 0, // Disable SDK retries — we control retry logic ourselves
    timeout: TIMEOUT_MS,
  });
  return _client;
}

/** For testing: reset the singleton so a mock can be injected. */
export function _resetAnthropicClient(): void {
  _client = null;
}

/** For testing: inject a pre-built client (e.g., a Vitest mock). */
export function _setAnthropicClient(client: Anthropic): void {
  _client = client;
}

// ── JSON extraction ────────────────────────────────────────────────────────────

/**
 * Extracts a JSON object from a Claude response.
 * Handles plain JSON, markdown code fences, and JSON embedded in prose.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();

  // 1. Direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // continue
  }

  // 2. JSON inside a ```json ... ``` or ``` ... ``` fence
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) {
    return JSON.parse(fence[1].trim());
  }

  // 3. First complete { ... } block in the text
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error(
    `No valid JSON found in Claude response. Raw text (first 200 chars): ${trimmed.slice(0, 200)}`
  );
}

// ── Core callAgent ─────────────────────────────────────────────────────────────

/**
 * Calls a Claude agent with a system prompt + user message and validates
 * the JSON output against a Zod schema.
 *
 * Retry policy:
 *   - Up to 3 total attempts (2 retries) with exponential backoff
 *   - Retries on: API errors, timeouts, invalid JSON, schema validation failures
 *   - retryCount in result = number of retries that occurred (0 = first attempt worked)
 *
 * Token tracking:
 *   - Reports input + output tokens from the last successful API call
 *   - Use for cost tracking in event_logs
 */
export async function callAgent<T>(
  options: CallAgentOptions<T>
): Promise<AgentCallResult<T>> {
  const startTime = Date.now();
  let retryCount = 0;
  let tokenUsage = { input: 0, output: 0, total: 0 };

  try {
    const client = getAnthropicClient();
    const model = options.model ?? process.env["CLAUDE_MODEL"] ?? DEFAULT_MODEL;
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

    const data = await withRetry(
      async () => {
        const response = await client.messages.create({
          model,
          max_tokens: maxTokens,
          system: options.systemPrompt,
          messages: [{ role: "user", content: options.userMessage }],
        });

        // Track tokens from the last call
        tokenUsage = {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens,
        };

        // Extract text block
        const textBlock = response.content.find((b) => b.type === "text");
        if (!textBlock || textBlock.type !== "text") {
          throw new Error(
            `Claude returned no text content. stop_reason=${response.stop_reason}`
          );
        }

        // Parse + validate
        const raw = extractJson(textBlock.text);
        const parsed = options.outputSchema.safeParse(raw);
        if (!parsed.success) {
          throw new Error(
            `Output schema validation failed for agent "${options.agentName}": ${parsed.error.message}`
          );
        }

        return parsed.data;
      },
      {
        maxAttempts: 3,
        baseDelayMs: 1_000,
        maxDelayMs: 8_000,
        onRetry: (attempt, error) => {
          retryCount = attempt;
          // Only log in non-test environments to keep test output clean
          if (process.env["NODE_ENV"] !== "test") {
            console.warn(
              `[callAgent] retry ${attempt} for agent "${options.agentName}" (${error.message})`
            );
          }
        },
      }
    );

    return {
      success: true,
      data,
      error: null,
      tokenUsage,
      durationMs: Date.now() - startTime,
      retryCount,
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : String(err),
      tokenUsage,
      durationMs: Date.now() - startTime,
      retryCount,
    };
  }
}
