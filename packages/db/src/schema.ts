import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "booking_started",
  "booked",
  "lost",
  "spam",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "reminded",
  "completed",
  "no_show",
  "cancelled",
  "rescheduled",
]);

export const channelEnum = pgEnum("channel", [
  "web_form",
  "instagram_dm",
  "whatsapp",
  "email",
  "phone",
  "walk_in",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "scheduled",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const packageTypeEnum = pgEnum("package_type", [
  "starter",
  "growth",
  "premium",
]);

// ── 1. Clients (Salons) ────────────────────────────────────────────────────────

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  packageType: packageTypeEnum("package_type").notNull().default("starter"),
  timezone: text("timezone").notNull().default("Europe/Vienna"),
  languages: jsonb("languages").notNull().default(["de"]),
  configSnapshot: jsonb("config_snapshot"),
  gdprContactEmail: text("gdpr_contact_email").notNull(),
  dataRetentionDays: integer("data_retention_days").notNull().default(730),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── 2. Services ────────────────────────────────────────────────────────────────

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  serviceSlug: text("service_slug").notNull(), // Matches id from services.json
  serviceName: text("service_name").notNull(),
  category: text("category").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  priceEur: integer("price_eur"), // Cents; null = on request
  description: text("description"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── 3. Leads ───────────────────────────────────────────────────────────────────

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  source: channelEnum("source").notNull(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  rawMessage: text("raw_message"),
  intent: text("intent"),
  intentConfidence: integer("intent_confidence"), // 0–100
  status: leadStatusEnum("status").notNull().default("new"),
  assignedTo: text("assigned_to"),
  language: text("language").default("de"),
  gdprConsentAt: timestamp("gdpr_consent_at"),
  gdprConsentMethod: text("gdpr_consent_method"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── 4. Bookings ────────────────────────────────────────────────────────────────

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  leadId: uuid("lead_id").references(() => leads.id),
  serviceId: uuid("service_id").references(() => services.id),
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact").notNull(),
  appointmentAt: timestamp("appointment_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  status: bookingStatusEnum("status").notNull().default("pending"),
  reminderSentAt: jsonb("reminder_sent_at"),
  notes: text("notes"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── 5. Messages ────────────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  leadId: uuid("lead_id").references(() => leads.id),
  bookingId: uuid("booking_id").references(() => bookings.id),
  channel: channelEnum("channel").notNull(),
  direction: text("direction").notNull(), // 'inbound' | 'outbound'
  senderType: text("sender_type").notNull(), // 'customer' | 'agent' | 'system' | 'human_operator'
  agentName: text("agent_name"),
  body: text("body").notNull(),
  metadata: jsonb("metadata"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// ── 6. Automation Jobs ─────────────────────────────────────────────────────────

export const automationJobs = pgTable("automation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  bookingId: uuid("booking_id").references(() => bookings.id),
  leadId: uuid("lead_id").references(() => leads.id),
  jobType: text("job_type").notNull(), // 'reminder_24h' | 'reminder_3h' | 'recovery' | 'winback'
  scheduledAt: timestamp("scheduled_at").notNull(),
  executedAt: timestamp("executed_at"),
  status: jobStatusEnum("status").notNull().default("scheduled"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── 7. Event Logs (primary debugging table) ────────────────────────────────────

export const eventLogs = pgTable("event_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  leadId: uuid("lead_id"),
  bookingId: uuid("booking_id"),
  eventType: text("event_type").notNull(), // 'agent_call' | 'flow_step' | 'error' | 'human_escalation' | 'config_change'
  agentName: text("agent_name"),
  inputSummary: text("input_summary"),
  outputSummary: text("output_summary"),
  status: text("status").notNull(), // 'success' | 'failure' | 'timeout' | 'escalated'
  durationMs: integer("duration_ms"),
  tokenCount: integer("token_count"),
  errorMessage: text("error_message"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── 8. GDPR Consent Records ────────────────────────────────────────────────────

export const gdprConsents = pgTable("gdpr_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  leadId: uuid("lead_id").references(() => leads.id),
  consentType: text("consent_type").notNull(), // 'data_processing' | 'marketing' | 'reminder_messages'
  granted: boolean("granted").notNull(),
  method: text("method").notNull(), // 'web_form' | 'whatsapp_reply' | 'verbal'
  ipAddress: text("ip_address"),
  consentText: text("consent_text"),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
});

// ── Type exports ───────────────────────────────────────────────────────────────

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type AutomationJob = typeof automationJobs.$inferSelect;
export type NewAutomationJob = typeof automationJobs.$inferInsert;
export type EventLog = typeof eventLogs.$inferSelect;
export type NewEventLog = typeof eventLogs.$inferInsert;
export type GdprConsent = typeof gdprConsents.$inferSelect;
export type NewGdprConsent = typeof gdprConsents.$inferInsert;
