import type { ClientConfig } from "@beauty-booking/config";

// ── Types ──────────────────────────────────────────────────────────────────────

export type TargetAgent =
  | "intake-agent"
  | "booking-agent"
  | "followup-agent"
  | "content-agent"
  | "human";

export interface RoutingDecision {
  targetAgent: TargetAgent;
  context: Record<string, unknown>;
  priority: "normal" | "high" | "urgent";
  reason: string;
}

export type InboundEventType =
  | "new_lead"              // Fresh lead, no classification yet
  | "lead_classified"       // Intake Agent has run, intent known
  | "booking_confirmed"     // Booking created → schedule reminders
  | "reminder_due"          // Time-based: 24h or 3h before appointment
  | "cancellation"          // Customer cancelled
  | "no_show"               // Customer didn't show up
  | "unknown";              // Unrecognized event

export interface InboundEvent {
  type: InboundEventType;
  clientId: string;
  leadId?: string;
  bookingId?: string;
  intent?: string;         // Set when type === "lead_classified"
  metadata?: Record<string, unknown>;
}

// ── Feature flag check ────────────────────────────────────────────────────────

function aiEnabled(config: ClientConfig, feature: keyof ClientConfig["features"]): boolean {
  return config.features[feature] === true;
}

// ── Core routing logic (rule-based, not AI) ───────────────────────────────────

/**
 * Routes an inbound event to the correct agent.
 * Rule-based in V1 — no AI involved in routing decisions.
 * Feature flags from the client config control which agents are available.
 */
export function routeEvent(
  event: InboundEvent,
  clientConfig: ClientConfig
): RoutingDecision {
  switch (event.type) {
    case "new_lead": {
      if (!aiEnabled(clientConfig, "aiIntake")) {
        return {
          targetAgent: "human",
          context: { reason: "aiIntake feature not enabled for this package" },
          priority: "normal",
          reason: "aiIntake not enabled for this package — route to human for manual follow-up.",
        };
      }
      return {
        targetAgent: "intake-agent",
        context: { leadId: event.leadId },
        priority: "normal",
        reason: "New lead received — classify intent with intake agent.",
      };
    }

    case "lead_classified": {
      const intent = event.intent ?? "unclear";

      // Complaints and escalations always go to human
      if (intent === "complaint") {
        return {
          targetAgent: "human",
          context: { leadId: event.leadId, intent },
          priority: "high",
          reason: "Complaint intent — escalate to human operator immediately.",
        };
      }

      // Unclear intent → human review
      if (intent === "unclear") {
        return {
          targetAgent: "human",
          context: { leadId: event.leadId, intent },
          priority: "normal",
          reason: "Intent unclear (low confidence) — human review required.",
        };
      }

      // Booking and service inquiries → booking agent
      if (
        intent === "new_booking" ||
        intent === "price_inquiry" ||
        intent === "service_info" ||
        intent === "existing_booking_change"
      ) {
        if (!aiEnabled(clientConfig, "aiBooking")) {
          return {
            targetAgent: "human",
            context: { leadId: event.leadId, intent },
            priority: "normal",
            reason: "aiBooking feature not enabled — route to human.",
          };
        }
        return {
          targetAgent: "booking-agent",
          context: { leadId: event.leadId, intent },
          priority: "normal",
          reason: `Intent "${intent}" — route to booking agent for conversion.`,
        };
      }

      // Fallback: unknown intent value
      return {
        targetAgent: "human",
        context: { leadId: event.leadId, intent },
        priority: "normal",
        reason: `Unhandled intent "${intent}" — route to human as safety fallback.`,
      };
    }

    case "booking_confirmed": {
      if (!aiEnabled(clientConfig, "aiFollowUp")) {
        return {
          targetAgent: "human",
          context: { bookingId: event.bookingId },
          priority: "normal",
          reason: "aiFollowUp not enabled — human to send confirmation manually.",
        };
      }
      return {
        targetAgent: "followup-agent",
        context: { bookingId: event.bookingId, action: "schedule_reminders" },
        priority: "normal",
        reason: "Booking confirmed — schedule reminder jobs via followup agent.",
      };
    }

    case "reminder_due": {
      return {
        targetAgent: "followup-agent",
        context: { bookingId: event.bookingId, ...event.metadata },
        priority: "normal",
        reason: "Reminder job due — followup agent to send reminder message.",
      };
    }

    case "cancellation":
    case "no_show": {
      if (!aiEnabled(clientConfig, "recoveryFlow")) {
        return {
          targetAgent: "human",
          context: { bookingId: event.bookingId, event: event.type },
          priority: "normal",
          reason: "recoveryFlow not enabled — human to handle manually.",
        };
      }
      return {
        targetAgent: "followup-agent",
        context: {
          bookingId: event.bookingId,
          action: "recovery",
          trigger: event.type,
        },
        priority: event.type === "no_show" ? "high" : "normal",
        reason: `${event.type} detected — schedule recovery flow via followup agent.`,
      };
    }

    default: {
      return {
        targetAgent: "human",
        context: { rawEvent: event },
        priority: "normal",
        reason: `Unknown event type "${event.type}" — route to human as safety fallback.`,
      };
    }
  }
}
