export {
  callAgent,
  extractJson,
  getAnthropicClient,
  _resetAnthropicClient,
  _setAnthropicClient,
  DEFAULT_MODEL,
} from "./clients/anthropic.js";
export type { AgentCallResult, CallAgentOptions } from "./clients/anthropic.js";

export { logger } from "./utils/logger.js";
export { withRetry } from "./utils/retry.js";
export {
  checkRateLimit,
  resetRateLimit,
  clearAllRateLimits,
  PUBLIC_RATE_LIMIT,
  ADMIN_RATE_LIMIT,
} from "./utils/rate-limiter.js";
export type { RateLimitOptions, RateLimitResult } from "./utils/rate-limiter.js";
export {
  stripHtml,
  sanitizeString,
  sanitizeObject,
  isValidEmail,
  isValidPhone,
  isWithinLength,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
} from "./utils/sanitizer.js";
export { createLeadInputSchema, createLeadResponseSchema } from "./types/lead.types.js";
export type { CreateLeadInput, CreateLeadResponse } from "./types/lead.types.js";
export {
  agentMessageSchema,
  intakeOutputSchema,
  bookingOutputSchema,
  followupOutputSchema,
  contentOutputSchema,
} from "./types/agent.types.js";
export type {
  AgentMessage,
  IntakeOutput,
  BookingOutput,
  FollowupOutput,
  ContentOutput,
} from "./types/agent.types.js";
