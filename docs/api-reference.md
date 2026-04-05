# API Reference — Beauty Booking OS

All endpoints are served from the Next.js app. Base URL: `https://<salon-domain>`.

---

## Authentication

### Admin Endpoints
Admin endpoints (`/api/admin/*`, `/api/gdpr/*`, `/api/jobs/*`) require a session cookie set by the login flow.

**Login:**
```
POST /api/admin/auth/login
Body: { "secret": "<ADMIN_SECRET>" }
Response: Sets `admin_session` cookie (httpOnly, 24h)
```

**Logout:**
```
POST /api/admin/auth/logout
Response: Clears session cookie
```

### Job Endpoints
`/api/jobs/*` endpoints use bearer token auth:
```
Authorization: Bearer <WEBHOOK_SECRET>
```

---

## Public Endpoints

### Create Lead
```
POST /api/lead
Content-Type: application/json
Rate limit: 30 req/min per IP

Body:
{
  "customerName": string,          // Required, max 200 chars
  "customerEmail": string,         // Required (if no phone), valid email
  "customerPhone": string,         // Required (if no email), 7-15 digits
  "rawMessage": string,            // Required, max 2000 chars
  "source": "web_form" | "instagram_dm" | "whatsapp" | "email",
  "language": "de" | "en" | "tr", // Optional, default "de"
  "gdprConsent": boolean           // Required, must be true
}

Response 201:
{
  "id": "uuid",
  "status": "new",
  "createdAt": "ISO timestamp"
}

Response 400: Validation error
Response 429: Rate limit exceeded
```

### Create Booking
```
POST /api/booking
Content-Type: application/json

Body:
{
  "leadId": "uuid",                // Optional — link to existing lead
  "serviceId": "uuid",             // Optional — link to service
  "customerName": string,
  "customerContact": string,       // Email or phone
  "appointmentAt": "ISO timestamp",
  "durationMinutes": number,
  "notes": string                  // Optional
}

Response 201:
{
  "id": "uuid",
  "status": "pending",
  "appointmentAt": "ISO timestamp"
}
```

### Update Booking Status
```
PATCH /api/booking/:id/status
Body: { "status": "confirmed" | "completed" | "no_show" | "rescheduled" }
Response 200: { "id": "uuid", "status": string }
```

### Cancel Booking
```
POST /api/booking/:id/cancel
Body: { "reason": string }  // Optional
Response 200: { "id": "uuid", "status": "cancelled", "cancelledAt": "ISO timestamp" }
```

---

## Webhook Endpoints

### WhatsApp Webhook — Verification (GET)
```
GET /api/webhook/whatsapp
Query: hub.mode, hub.verify_token, hub.challenge
Response 200: <challenge string> (if token matches WHATSAPP_VERIFY_TOKEN)
Response 403: Invalid token
```

### WhatsApp Webhook — Events (POST)
```
POST /api/webhook/whatsapp
Headers: X-Hub-Signature-256: sha256=<hmac>
Body: WhatsApp Business API event payload (raw JSON)
Response 200: { "status": "received" }
Response 403: Signature verification failed
```

### Instagram Webhook — Verification (GET)
```
GET /api/webhook/instagram
Query: hub.mode, hub.verify_token, hub.challenge
Response 200: <challenge string>
Response 403: Invalid token
```

### Instagram Webhook — Events (POST)
```
POST /api/webhook/instagram
Headers: X-Hub-Signature-256: sha256=<hmac>
Body: Instagram Graph API event payload
Response 200: { "status": "received" }
Response 403: Signature verification failed
```

---

## Admin Endpoints (Admin Cookie Required)

### List Leads
```
GET /api/admin/leads
Query params:
  status=new|contacted|qualified|booked|lost|spam
  source=web_form|instagram_dm|whatsapp|email
  dateFrom=ISO date
  dateTo=ISO date
  search=string (matches name/email)
  page=number (default 1)
  limit=number (default 20, max 100)

Response 200:
{
  "leads": [...],
  "total": number,
  "page": number,
  "totalPages": number
}
```

### List Bookings
```
GET /api/admin/bookings
Query params:
  status=pending|confirmed|reminded|completed|no_show|cancelled
  dateFrom=ISO date
  dateTo=ISO date

Response 200: { "bookings": [...] }
```

### List Event Logs
```
GET /api/admin/logs
Query params:
  eventType=string
  agentName=string
  status=success|failure|timeout|escalated
  dateFrom=ISO date (default: last 24h)

Response 200:
{
  "logs": [...],
  "totalTokens": number
}
```

### List Escalations
```
GET /api/admin/escalations
Response 200: { "escalations": [...] }  // Leads with assignedTo="human_review"
```

### Update Escalation
```
PATCH /api/admin/escalations/:id
Body: { "action": "qualify" | "spam" | "contacted" }

qualify   → status = "qualified"
spam      → status = "spam"
contacted → status = "contacted", assignedTo cleared

Response 200: { "id": "uuid", "status": string }
```

### Stats
```
GET /api/admin/stats
Response 200:
{
  "newLeadsToday": number,
  "bookingsToday": number,
  "pendingEscalations": number,
  "conversionRate": number  // booked / total leads (last 30d)
}
```

---

## GDPR Endpoints (Admin Cookie Required)

### Export Lead Data (Right to Data Portability)
```
GET /api/gdpr/export/:leadId

Response 200:
{
  "exportedAt": "ISO timestamp",
  "leadId": "uuid",
  "personalData": {
    "lead": { ...all lead fields },
    "bookings": [...],
    "messages": [...],
    "consents": [...]
  },
  "dataCategories": ["contact_info", "booking_history", "communication_history", "consent_records"]
}

Response 404: Lead not found
```

### Delete Lead Data (Right to Erasure)
```
DELETE /api/gdpr/data/:leadId

Anonymizes all PII:
  - customerName → "ANONYMIZED"
  - customerEmail → "anonymized@deleted.local"
  - customerPhone → "0000000000"
  - rawMessage → "ANONYMIZED"
  - booking.customerName, customerContact → anonymized
  - messages.body → "ANONYMIZED"
  - consents → revokedAt = now()

Response 200:
{
  "anonymized": true,
  "recordsAffected": number
}

Response 404: Lead not found
```

---

## System Endpoints

### Health Check
```
GET /api/health

Response 200 (ok/degraded):
{
  "status": "ok" | "degraded",
  "timestamp": "ISO timestamp",
  "checks": {
    "database": "ok" | "error",
    "failedJobs": { "count": number, "alert": boolean },
    "escalationQueue": { "count": number, "alert": boolean }
  },
  "alerts": string[]
}

Response 503 (critical):
  Same body, status = "critical"
```

---

## Job Endpoints (Bearer Auth Required)

### Run Due Reminders
```
POST /api/jobs/reminders/run
Authorization: Bearer <WEBHOOK_SECRET>

Response 200:
{
  "processed": number,
  "succeeded": number,
  "failed": number
}
```

### Run Recovery Jobs
```
POST /api/jobs/recovery/run
Authorization: Bearer <WEBHOOK_SECRET>

Response 200: { "processed": number, "succeeded": number, "failed": number }
```

### Run Data Retention
```
POST /api/jobs/retention
Authorization: Bearer <WEBHOOK_SECRET>
Query: dry_run=true (optional — scan only, no writes)

Response 200:
{
  "dryRun": boolean,
  "clientsProcessed": number,
  "totalLeadsScanned": number,
  "totalLeadsAnonymized": number,
  "details": [
    {
      "clientId": "uuid",
      "retentionDays": number,
      "leadsScanned": number,
      "leadsAnonymized": number,
      "dryRun": boolean
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Forbidden (wrong secret / signature) |
| 404 | Resource not found |
| 429 | Rate limit exceeded (includes `Retry-After` header) |
| 500 | Internal server error |
| 503 | Service unavailable (database down) |
