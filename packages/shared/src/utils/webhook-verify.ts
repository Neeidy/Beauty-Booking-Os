/**
 * Webhook signature verification utilities.
 *
 * Verifies HMAC-SHA256 signatures from WhatsApp Business API and
 * Instagram Graph API webhooks to prevent spoofed requests.
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies a WhatsApp Business API webhook signature.
 *
 * WhatsApp signs the raw request body with HMAC-SHA256 using the app secret
 * and sends the hex-encoded signature in the X-Hub-Signature-256 header
 * as "sha256=<hex>".
 *
 * @param rawBody - Raw request body bytes (not parsed JSON)
 * @param signature - Value of X-Hub-Signature-256 header
 * @param appSecret - WhatsApp app secret from environment
 */
export function verifyWhatsAppSignature(
  rawBody: Buffer,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature) return false;

  const prefix = "sha256=";
  if (!signature.startsWith(prefix)) return false;

  const receivedHex = signature.slice(prefix.length);
  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(receivedHex, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    // Buffer.from with "hex" may throw on invalid hex strings
    return false;
  }
}

/**
 * Verifies an Instagram Graph API webhook signature.
 *
 * Instagram uses the same HMAC-SHA256 mechanism as WhatsApp (Meta platform).
 * The signature is sent in X-Hub-Signature-256 as "sha256=<hex>".
 */
export function verifyInstagramSignature(
  rawBody: Buffer,
  signature: string | null,
  appSecret: string
): boolean {
  // Same algorithm as WhatsApp — Meta platform standard
  return verifyWhatsAppSignature(rawBody, signature, appSecret);
}

/**
 * Verifies a WhatsApp webhook verification challenge (GET request).
 *
 * When you register a webhook URL, Meta sends a GET request with:
 *   hub.mode=subscribe
 *   hub.verify_token=<your verify token>
 *   hub.challenge=<random string to echo back>
 *
 * Return the challenge string if valid, null if invalid.
 */
export function verifyWebhookChallenge(
  mode: string | null,
  verifyToken: string | null,
  challenge: string | null,
  expectedToken: string
): string | null {
  if (mode === "subscribe" && verifyToken === expectedToken && challenge) {
    return challenge;
  }
  return null;
}
