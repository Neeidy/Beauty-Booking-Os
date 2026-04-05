import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  verifyWhatsAppSignature,
  verifyInstagramSignature,
  verifyWebhookChallenge,
} from "../utils/webhook-verify.js";

const APP_SECRET = "test-app-secret-1234";
const BODY = Buffer.from(JSON.stringify({ entry: [{ id: "123" }] }));

function sign(body: Buffer, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

// ── WhatsApp signature verification ──────────────────────────────────────────

describe("verifyWhatsAppSignature", () => {
  it("accepts a valid HMAC-SHA256 signature", () => {
    const sig = sign(BODY, APP_SECRET);
    expect(verifyWhatsAppSignature(BODY, sig, APP_SECRET)).toBe(true);
  });

  it("rejects a signature computed with wrong secret", () => {
    const sig = sign(BODY, "wrong-secret");
    expect(verifyWhatsAppSignature(BODY, sig, APP_SECRET)).toBe(false);
  });

  it("rejects when signature header is null", () => {
    expect(verifyWhatsAppSignature(BODY, null, APP_SECRET)).toBe(false);
  });

  it("rejects signature without sha256= prefix", () => {
    const hex = createHmac("sha256", APP_SECRET).update(BODY).digest("hex");
    expect(verifyWhatsAppSignature(BODY, hex, APP_SECRET)).toBe(false);
  });

  it("rejects tampered body", () => {
    const sig = sign(BODY, APP_SECRET);
    const tamperedBody = Buffer.from(JSON.stringify({ entry: [{ id: "EVIL" }] }));
    expect(verifyWhatsAppSignature(tamperedBody, sig, APP_SECRET)).toBe(false);
  });

  it("rejects invalid hex in signature", () => {
    expect(verifyWhatsAppSignature(BODY, "sha256=notvalidhex!!", APP_SECRET)).toBe(false);
  });
});

// ── Instagram signature verification ─────────────────────────────────────────

describe("verifyInstagramSignature", () => {
  it("accepts valid signature (same algorithm as WhatsApp)", () => {
    const sig = sign(BODY, APP_SECRET);
    expect(verifyInstagramSignature(BODY, sig, APP_SECRET)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyInstagramSignature(BODY, "sha256=badvalue", APP_SECRET)).toBe(false);
  });
});

// ── Webhook challenge verification ───────────────────────────────────────────

describe("verifyWebhookChallenge", () => {
  const VERIFY_TOKEN = "my-verify-token";

  it("returns challenge when mode=subscribe and token matches", () => {
    const result = verifyWebhookChallenge("subscribe", VERIFY_TOKEN, "abc123", VERIFY_TOKEN);
    expect(result).toBe("abc123");
  });

  it("returns null when mode is wrong", () => {
    expect(verifyWebhookChallenge("unsubscribe", VERIFY_TOKEN, "abc123", VERIFY_TOKEN)).toBeNull();
  });

  it("returns null when token is wrong", () => {
    expect(verifyWebhookChallenge("subscribe", "wrong-token", "abc123", VERIFY_TOKEN)).toBeNull();
  });

  it("returns null when challenge is missing", () => {
    expect(verifyWebhookChallenge("subscribe", VERIFY_TOKEN, null, VERIFY_TOKEN)).toBeNull();
  });

  it("returns null when all params are null", () => {
    expect(verifyWebhookChallenge(null, null, null, VERIFY_TOKEN)).toBeNull();
  });
});
