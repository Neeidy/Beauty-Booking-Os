# Sprint V2-5: Waiting List (Warteliste)

**Backend status:** `packages/**` FROZEN. `apps/web/**` is the only working directory.  
**Schema decision:** NO new DB table, NO migration. Waiting list entries are stored as leads with `metadata.waitingList: true`. This keeps `packages/db/src/schema.ts` untouched while reusing the existing `leads` table, GDPR pipeline, and admin lead views.  
**Trigger decision:** Customer clicks "Warteliste beitreten" in SlotPicker when all slots for a day are full. This is a frontend action — a separate POST to a new `/api/waiting-list` route (NOT `/api/lead`). The `/api/lead` route is NOT modified.  
**Notification decision:** When a booking is cancelled or marked no_show, the status route (`apps/web/app/api/booking/[id]/status/route.ts`) checks for waiting list entries for the same service+date and marks them `metadata.waitingList_notified: true`. No email sent in this sprint — admin sees notified entries in the waiting list admin view and handles outreach manually. Email automation is V2-5+.

---

## Context

V2-4 added the live slot picker. When a customer selects a date and ALL slots are unavailable (SlotPicker receives a response where `slots.every(s => s.available === false)`), a "Warteliste beitreten" button appears. Clicking it creates a waiting list lead record and shows a confirmation message. The admin can view all waiting list entries at `/admin/waiting-list`.

When any booking for the same service+date is cancelled or marked no_show, the status route flags waiting list entries as notified. Admin sees these flagged entries and contacts the customer manually.

**Verified patterns from previous sprints:**
- Status enum uses underscore: `no_show` (not `noshow`) — verified V2-4
- Timezone helpers: `Date.UTC()` approach, machine-TZ-independent — established V2-3, used V2-4
- Auth: `import { isAdminApiAuthenticated } from "@/lib/admin-auth"` — V2-1 pattern
- DB imports: `import { getDb, leads, bookings, services } from "@beauty-booking/db"` — match exact imports from existing routes; read `apps/web/app/api/admin/front-desk/route.ts` to verify
- Default client: `process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000"`
- CSS vars: `--color-background`, `--color-primary`, `--color-secondary`, `--color-accent`, `--color-text`, `--color-text-muted` — do NOT invent new ones
- No external libraries (no date-fns, no calendar libs)
- `export const dynamic = "force-dynamic"` on every new route
- `services.serviceName` (not `services.name`) — V2-4 deviation confirmed
- Business hours hardcoded: Mo–Sa 09–18, Sun 10–16 (same as V2-4 slots API)

---

## Files To Create

1. `apps/web/app/api/waiting-list/route.ts` — public POST endpoint (customer-facing)
2. `apps/web/app/api/admin/waiting-list/route.ts` — admin GET endpoint
3. `apps/web/app/admin/waiting-list/page.tsx` — server component
4. `apps/web/app/admin/waiting-list/WaitingListView.tsx` — client component
5. `apps/web/__tests__/waiting-list-api.test.ts` — 10 Vitest tests

## Files To Modify

1. `apps/web/components/SlotPicker.tsx` — add "Warteliste beitreten" UI when all slots unavailable
2. `apps/web/app/api/booking/[id]/status/route.ts` — add waiting list notification check on cancel/no_show
3. `apps/web/components/admin/Sidebar.tsx` — add "Warteliste" nav item

## Files That Must NOT Be Touched

- Anything under `packages/**`
- `apps/web/app/api/lead/route.ts`
- `apps/web/components/BookingForm.tsx`
- `apps/web/components/DatePicker.tsx`
- `apps/web/app/api/booking/slots/route.ts`
- Any other existing admin route or page
- `globals.css`, `tailwind.config.ts`

---

## Task 1 — Public Waiting List POST Endpoint

**File:** `apps/web/app/api/waiting-list/route.ts`

```typescript
export const dynamic = "force-dynamic";
```

**Handler:** `POST /api/waiting-list`

**Public — NO auth check.** This endpoint is called by unauthenticated customers (same pattern as `/api/booking/slots`).

**Request body (JSON):**
```typescript
{
  customerName: string;       // required, min 2 chars
  customerEmail: string;      // required, valid email
  customerPhone?: string;     // optional
  serviceId: string;          // required, UUID
  requestedDate: string;      // required, YYYY-MM-DD
  clientId?: string;          // optional, defaults to DEMO_CLIENT_ID
  gdprConsent: boolean;       // required, must be true
}
```

**Zod schema (define inline in this file):**
```typescript
const WaitingListRequestSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  serviceId: z.string().uuid(),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientId: z.string().uuid().optional(),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "GDPR consent required" }),
  }),
});
```

**Validation:**
- Parse request body with `WaitingListRequestSchema.safeParse()`
- If invalid → `NextResponse.json({ error: "Validation failed", details: result.error.flatten() }, { status: 400 })`
- If `gdprConsent !== true` → 400 (covered by Zod literal)

**Logic:**

1. Resolve `clientId`: `body.clientId ?? process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000"`

2. Check if requested date is in the future (Vienna timezone):
```typescript
// Use the same anchor approach as V2-4 slots API
const now = new Date();
const anchorDateUTC = viennaWallClockToUTC(requestedDate, 0, 0);
if (anchorDateUTC < now) {
  return NextResponse.json({ error: "Requested date is in the past" }, { status: 400 });
}
```
Copy `viennaWallClockToUTC` and `getViennaOffsetMinutes` verbatim from `apps/web/app/api/booking/slots/route.ts` — do NOT import from there, copy the helpers into this file.

3. Check for duplicate: query `leads` where:
   - `leads.customerEmail = customerEmail`
   - `leads.metadata->>'waitingList' = 'true'`
   - `leads.metadata->>'requestedDate' = requestedDate`
   - `leads.metadata->>'requestedServiceId' = serviceId`
   - `leads.clientId = clientId`

   Use Drizzle's `sql` template literal for the JSONB field comparison:
   ```typescript
   import { sql } from "drizzle-orm";
   // ...
   const existing = await db
     .select({ id: leads.id })
     .from(leads)
     .where(
       and(
         eq(leads.clientId, clientId),
         eq(leads.customerEmail, customerEmail),
         sql`${leads.metadata}->>'waitingList' = 'true'`,
         sql`${leads.metadata}->>'requestedDate' = ${requestedDate}`,
         sql`${leads.metadata}->>'requestedServiceId' = ${serviceId}`
       )
     )
     .limit(1);
   if (existing.length > 0) {
     return NextResponse.json({ success: true, alreadyRegistered: true }, { status: 200 });
   }
   ```

4. Insert into `leads`:
```typescript
const newLead = await db
  .insert(leads)
  .values({
    clientId,
    source: "web_form",
    customerName,
    customerEmail,
    customerPhone: customerPhone ?? null,
    rawMessage: `Warteliste: ${serviceName ?? serviceId} am ${requestedDate}`,
    status: "new",
    gdprConsentAt: new Date(),
    gdprConsentMethod: "web_form_checkbox",
    metadata: {
      waitingList: true,
      requestedDate,
      requestedServiceId: serviceId,
      waitingList_notified: false,
      waitingList_registeredAt: new Date().toISOString(),
    },
  })
  .returning({ id: leads.id });
```

Before inserting, fetch service name for the `rawMessage`:
```typescript
let serviceName: string | null = null;
try {
  const svc = await db
    .select({ serviceName: services.serviceName })
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);
  if (svc[0]) serviceName = svc[0].serviceName;
} catch {
  // non-blocking, rawMessage will use serviceId as fallback
}
```

5. **Response on success:**
```typescript
return NextResponse.json({
  success: true,
  alreadyRegistered: false,
  leadId: newLead[0].id,
}, { status: 201 });
```

**No event_log write** — keep consistent with slots API (which also skips it). If existing booking routes write to event_logs and the pattern is established, you MAY add it, but it is not required.

---

## Task 2 — Admin Waiting List GET Endpoint

**File:** `apps/web/app/api/admin/waiting-list/route.ts`

```typescript
export const dynamic = "force-dynamic";
```

**Handler:** `GET /api/admin/waiting-list`

**Auth:** First line — `if (!isAdminApiAuthenticated(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });`

**Query params:**
- `clientId?: string` — default `DEMO_CLIENT_ID`
- `serviceId?: string` — optional filter
- `date?: string` — optional filter `YYYY-MM-DD`
- `notified?: string` — `"true"` | `"false"` — optional filter
- `page?: string` — default `"1"`
- `limit?: string` — default `"20"`

**Query:**
```typescript
const db = getDb();
const allWaiting = await db
  .select({
    id: leads.id,
    customerName: leads.customerName,
    customerEmail: leads.customerEmail,
    customerPhone: leads.customerPhone,
    metadata: leads.metadata,
    createdAt: leads.createdAt,
  })
  .from(leads)
  .where(
    and(
      eq(leads.clientId, clientId),
      sql`${leads.metadata}->>'waitingList' = 'true'`,
      ...(serviceId ? [sql`${leads.metadata}->>'requestedServiceId' = ${serviceId}`] : []),
      ...(date ? [sql`${leads.metadata}->>'requestedDate' = ${date}`] : []),
      ...(notified === "true"
        ? [sql`${leads.metadata}->>'waitingList_notified' = 'true'`]
        : notified === "false"
        ? [sql`${leads.metadata}->>'waitingList_notified' = 'false'`]
        : [])
    )
  )
  .orderBy(leads.createdAt)
  .limit(limitNum)
  .offset((pageNum - 1) * limitNum);
```

**Response Zod schema (define inline, validate before returning):**
```typescript
const WaitingListEntrySchema = z.object({
  id: z.string().uuid(),
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  customerPhone: z.string().nullable(),
  requestedDate: z.string(),
  requestedServiceId: z.string(),
  notified: z.boolean(),
  registeredAt: z.string(),
  createdAt: z.string(),
});

const WaitingListResponseSchema = z.object({
  entries: z.array(WaitingListEntrySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
```

Map the raw DB rows before returning:
```typescript
const entries = allWaiting.map((row) => ({
  id: row.id,
  customerName: row.customerName,
  customerEmail: row.customerEmail,
  customerPhone: row.customerPhone,
  requestedDate: (row.metadata as Record<string, unknown>)?.requestedDate as string ?? "",
  requestedServiceId: (row.metadata as Record<string, unknown>)?.requestedServiceId as string ?? "",
  notified: (row.metadata as Record<string, unknown>)?.waitingList_notified === true,
  registeredAt: (row.metadata as Record<string, unknown>)?.waitingList_registeredAt as string ?? row.createdAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
}));
```

Validate with `WaitingListResponseSchema.parse(...)` before returning. If parse throws, return 500.

---

## Task 3 — Admin Waiting List Page

**File:** `apps/web/app/admin/waiting-list/page.tsx`

Server component. Pattern: same as `apps/web/app/admin/front-desk/page.tsx`. Read that file first.

```typescript
export const dynamic = "force-dynamic";
```

Fetches `/api/admin/waiting-list` server-side with admin auth headers. Passes data to `WaitingListView`.

**File:** `apps/web/app/admin/waiting-list/WaitingListView.tsx`

`"use client"` at top.

**Layout:**
- Page title: `"Warteliste"` (h1)
- Summary bar: `{total} Einträge | {notifiedCount} benachrichtigt`
- Filter row: Date input (`type="date"`), Notified toggle (`Alle | Offen | Benachrichtigt`), optional service dropdown if services are available
- Table with columns: `Datum | Uhrzeit | Kunde | E-Mail | Telefon | Hizmet | Status | Registriert`

**Table row fields:**
- Datum: `requestedDate` formatted as `DD.MM.YYYY` using `Intl.DateTimeFormat("de-AT")`
- Kunde: `customerName ?? "—"`
- E-Mail: `customerEmail ?? "—"` (truncate to 30 chars if needed)
- Telefon: `customerPhone ?? "—"`
- Hizmet: `requestedServiceId` — read service name if available, otherwise show UUID truncated to 8 chars
- Status badge:
  - `notified: false` → amber background, label `"Wartend"` 
  - `notified: true` → green background, label `"Benachrichtigt"`
- Registriert: `registeredAt` formatted as `DD.MM.YYYY HH:mm` Vienna time

**Empty state:** "Keine Wartelisteneinträge vorhanden"

**Styling:** Match existing admin page visual language. Use only existing CSS vars. No new Tailwind classes that weren't used in V2-1 through V2-4.

**No pagination UI needed in V2-5** — display first 20 entries (default). Pagination can be added in a future sprint.

---

## Task 4 — SlotPicker: "Warteliste beitreten" UI

**File:** `apps/web/components/SlotPicker.tsx`

Read the current file carefully before making any changes.

**When to show the waiting list section:**  
After slots are loaded (not loading, no error), if `slots.length > 0 && slots.every(s => s.available === false)`:
```typescript
const allFull = !isLoading && !error && slots.length > 0 && slots.every((s) => !s.available);
```

**Add local state:**
```typescript
const [showWaitingForm, setShowWaitingForm] = useState(false);
const [waitingSubmitted, setWaitingSubmitted] = useState(false);
const [waitingLoading, setWaitingLoading] = useState(false);
const [waitingError, setWaitingError] = useState<string | null>(null);
```

**UI when `allFull === true`:**
```tsx
{allFull && !waitingSubmitted && (
  <div style={{ marginTop: "16px", padding: "12px", border: "1px solid var(--color-accent)", borderRadius: "8px" }}>
    <p style={{ color: "var(--color-text)", marginBottom: "8px", fontSize: "14px" }}>
      Alle Termine für diesen Tag sind vergeben.
    </p>
    {!showWaitingForm ? (
      <button
        type="button"
        onClick={() => setShowWaitingForm(true)}
        style={{
          background: "var(--color-primary)",
          color: "var(--color-background)",
          border: "none",
          borderRadius: "6px",
          padding: "10px 16px",
          cursor: "pointer",
          fontSize: "14px",
          minHeight: "44px",
        }}
      >
        Warteliste beitreten
      </button>
    ) : (
      <WaitingListForm
        date={date!}
        serviceId={serviceId!}
        clientId={clientId}
        onSuccess={() => setWaitingSubmitted(true)}
        onError={(msg) => setWaitingError(msg)}
        isLoading={waitingLoading}
        setIsLoading={setWaitingLoading}
      />
    )}
    {waitingError && (
      <p style={{ color: "#DC2626", fontSize: "13px", marginTop: "8px" }}>{waitingError}</p>
    )}
  </div>
)}

{allFull && waitingSubmitted && (
  <div style={{ marginTop: "16px", padding: "12px", background: "#D1FAE5", borderRadius: "8px" }}>
    <p style={{ color: "#065F46", fontSize: "14px" }}>
      ✓ Sie stehen auf der Warteliste. Wir melden uns, sobald ein Termin frei wird.
    </p>
  </div>
)}
```

**WaitingListForm sub-component** — define in the same file, below SlotPicker:

```typescript
interface WaitingListFormProps {
  date: string;
  serviceId: string;
  clientId: string | null;
  onSuccess: () => void;
  onError: (msg: string) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}
```

Fields: `customerName` (text, required), `customerEmail` (email, required), `customerPhone` (text, optional), `gdprConsent` (checkbox, required).

Submit handler:
```typescript
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setIsLoading(true);
  try {
    const res = await fetch("/api/waiting-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        serviceId,
        requestedDate: date,
        clientId: clientId ?? undefined,
        gdprConsent: true,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      onError(data.error ?? "Fehler beim Eintragen. Bitte versuchen Sie es erneut.");
    } else {
      onSuccess();
    }
  } catch {
    onError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
  } finally {
    setIsLoading(false);
  }
}
```

Styling: match existing form elements in `BookingForm.tsx`. Minimum touch targets 44px. No horizontal overflow at 375px.

**CRITICAL:** The `WaitingListForm` renders inside `SlotPicker` which is inside `BookingForm`. Do NOT use HTML `<form>` tags — use `<div onSubmit>` or a button with `onClick` handler to avoid nested form issues. Actually: the outer `BookingForm` IS a `<form>`. So `WaitingListForm` must NOT render a `<form>` element — use a `<div>` container with a submit `<button type="button" onClick={handleSubmit}>`. Adjust the submit handler signature accordingly (remove `e: React.FormEvent`, call directly from onClick).

---

## Task 5 — Status Route: Waiting List Notification Hook

**File:** `apps/web/app/api/booking/[id]/status/route.ts`

Read the current file carefully. Understand the existing flow before modifying.

**What to add:** After a booking is successfully updated to `cancelled` or `no_show`, query for waiting list entries for the same service+date and set `waitingList_notified: true` in their metadata.

**Where to add it:** After the status update DB write succeeds, before the response is returned. Wrap in a `try/catch` — if this notification check fails, it must NOT affect the main response. The booking status change must succeed regardless.

```typescript
// After successful status update — notify waiting list if cancelled or no_show
if (newStatus === "cancelled" || newStatus === "no_show") {
  try {
    // Get the booking details to find service + date
    const updatedBooking = await db
      .select({
        serviceId: bookings.serviceId,
        appointmentAt: bookings.appointmentAt,
        clientId: bookings.clientId,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (updatedBooking[0]) {
      const { serviceId, appointmentAt, clientId } = updatedBooking[0];
      // Format the date in Vienna timezone
      const requestedDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Vienna",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(appointmentAt));

      // Find unnotified waiting list entries for same service + date
      const waitingEntries = await db
        .select({ id: leads.id, metadata: leads.metadata })
        .from(leads)
        .where(
          and(
            eq(leads.clientId, clientId),
            sql`${leads.metadata}->>'waitingList' = 'true'`,
            sql`${leads.metadata}->>'waitingList_notified' = 'false'`,
            sql`${leads.metadata}->>'requestedServiceId' = ${serviceId}`,
            sql`${leads.metadata}->>'requestedDate' = ${requestedDate}`
          )
        );

      // Mark each as notified
      for (const entry of waitingEntries) {
        const updatedMeta = {
          ...(entry.metadata as Record<string, unknown>),
          waitingList_notified: true,
          waitingList_notifiedAt: new Date().toISOString(),
        };
        await db
          .update(leads)
          .set({ metadata: updatedMeta, updatedAt: new Date() })
          .where(eq(leads.id, entry.id));
      }
    }
  } catch (err) {
    // Non-blocking — log but do not fail the status update
    console.error("[waiting-list] notification hook failed:", err);
  }
}
```

**Import additions needed at top of file:**
- `leads` from `"@beauty-booking/db"` — add to existing import if not present
- `sql` from `"drizzle-orm"` — add to existing import if not present

Do NOT restructure existing code. Only add the above block after the successful status write.

---

## Task 6 — Sidebar Nav Item

**File:** `apps/web/components/admin/Sidebar.tsx`

Read the file. Add one item after "Front Desk" (or after "Takvim"):
- Label: `"Warteliste"`
- Href: `/admin/waiting-list`
- Icon: `Clock` from `lucide-react` (or whatever icon library previous sprints used — match exactly)

Same active-state pattern as existing items. Do NOT reorder existing items.

---

## Task 7 — Tests

**File:** `apps/web/__tests__/waiting-list-api.test.ts`

Mirror the mocking pattern from `apps/web/__tests__/booking-slots-api.test.ts` and `front-desk-api.test.ts`. Read both before writing.

**10 test cases:**

1. **Missing customerName → 400** — POST body without `customerName` → HTTP 400.

2. **Invalid email → 400** — POST body with `customerEmail: "notanemail"` → HTTP 400.

3. **Missing gdprConsent → 400** — POST body with `gdprConsent: false` → HTTP 400 (Zod literal check).

4. **Past date → 400** — POST body with `requestedDate: "2020-01-01"` → HTTP 400.

5. **Valid entry created → 201** — Mock `leads.insert` returns `[{ id: "abc-123" }]`. Mock `leads.select` (duplicate check) returns `[]`. Mock `services.select` returns `[{ serviceName: "Gelnägel" }]`. Assert HTTP 201, `body.success === true`, `body.leadId === "abc-123"`, `body.alreadyRegistered === false`.

6. **Duplicate entry → 200 alreadyRegistered** — Mock duplicate check returns `[{ id: "existing-id" }]`. Assert HTTP 200, `body.alreadyRegistered === true`. Assert insert is NOT called.

7. **Admin list — unauthorized → 401** — GET `/api/admin/waiting-list` without auth header → HTTP 401.

8. **Admin list — returns entries** — Mock `leads.select` returns 2 rows with `metadata: { waitingList: true, requestedDate: "2026-06-01", requestedServiceId: "svc-uuid", waitingList_notified: false, waitingList_registeredAt: "2026-04-10T10:00:00.000Z" }`. Assert response `entries.length === 2`, `entries[0].requestedDate === "2026-06-01"`, `entries[0].notified === false`.

9. **Admin list — notified filter** — Mock 3 entries (2 notified, 1 not). Call with `?notified=true`. Assert only 2 returned. (Mock the DB to return filtered results, or test the filter logic directly.)

10. **Admin list — Zod response shape** — Normal scenario. Assert response has `entries`, `total`, `page`, `limit`. Assert each entry has `id`, `customerName`, `customerEmail`, `requestedDate`, `requestedServiceId`, `notified`, `registeredAt`, `createdAt`.

No `.skip`, no `.todo`. All 10 must pass.

---

## Verification — Must Pass Before Commit

Stop on first failure. Do NOT commit if any check fails.

1. `pnpm typecheck` → 0 errors
2. `pnpm test` → **265/265 passing** (255 + 10 new). If count differs, report which tests changed.
3. `pnpm --filter @beauty/web build` → clean build
4. `pnpm dev` → manual smoke checks:
   - `/booking` loads normally, DatePicker + SlotPicker still work
   - On a day where all slots are blocked: "Alle Termine für diesen Tag sind vergeben." message appears
   - "Warteliste beitreten" button appears, min 44px touch target
   - Clicking button shows the form fields
   - Submitting without name or email shows browser validation (required fields)
   - Valid submit → success message "Sie stehen auf der Warteliste..."
   - `/admin/waiting-list` loads (may be empty if no test entries)
   - "Warteliste" nav item visible in sidebar, active state correct
   - Cancel a booking in admin → check DB that corresponding waiting list entry (if any) has `waitingList_notified: true` in metadata

If any check fails, stop and report. Do not commit.

---

## Commit — Two Commits

**Commit 1 — feature:**
```bash
git add .
git status
git commit -m "feat(booking): V2-5 waiting list (Warteliste) — public signup, admin view, cancel hook, 10 tests"
git push
```

**Commit 2 — CLAUDE.md:**

Append to the V2 Sprints section in `CLAUDE.md`:

```markdown
### V2-5: Waiting List (Warteliste) — COMPLETED
- New public endpoint: POST /api/waiting-list (no auth, customer-facing)
- New admin endpoint: GET /api/admin/waiting-list (auth required)
- New admin page: /admin/waiting-list
- Waiting list entries stored as leads with metadata.waitingList: true
- No new DB table, no migration — reuses leads table JSONB metadata
- SlotPicker: shows "Warteliste beitreten" UI when all slots unavailable
- WaitingListForm: inline form in SlotPicker, no nested <form> (button onClick pattern)
- Duplicate registration guard: same email+service+date → alreadyRegistered: true
- Status route hook: cancel/no_show triggers metadata.waitingList_notified: true
- Admin view shows: date, customer, service, notified status, registered timestamp
- No email notification in this sprint — admin handles outreach manually
- Tests: 265/265 (255 + 10 new)
- No packages/** changes, no DB schema changes
```

```bash
git add CLAUDE.md
git commit -m "docs: log V2-5 completion in CLAUDE.md"
git push
git log --oneline -5
```

---

## Acceptance Criteria — Report On Each

- [ ] `POST /api/waiting-list` returns 201 with `leadId` on valid input
- [ ] `POST /api/waiting-list` returns 400 on missing name, invalid email, missing gdprConsent
- [ ] `POST /api/waiting-list` returns 400 on past date
- [ ] Duplicate submission returns 200 with `alreadyRegistered: true` (no duplicate insert)
- [ ] `GET /api/admin/waiting-list` returns 401 without auth
- [ ] Admin endpoint returns Zod-validated response with `entries`, `total`, `page`, `limit`
- [ ] Admin endpoint `?notified=true/false` filter works
- [ ] `/admin/waiting-list` page renders (even if empty)
- [ ] "Warteliste" nav item in sidebar, active state correct
- [ ] SlotPicker: waiting list UI only shows when `allFull === true` (not when some slots available)
- [ ] WaitingListForm renders inside SlotPicker without nested `<form>` tags
- [ ] WaitingListForm: submit creates entry, shows success message
- [ ] WaitingListForm: network error shows German error message
- [ ] Status route: cancel updates matching waiting list entries to `waitingList_notified: true`
- [ ] Status route: no_show updates matching waiting list entries to `waitingList_notified: true`
- [ ] Status route hook failure does NOT break booking status update (try/catch verified)
- [ ] Mobile 375px: waiting list UI touch targets ≥44px, no horizontal overflow
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` → 265/265
- [ ] `pnpm --filter @beauty/web build` clean
- [ ] `packages/**` NOT modified
- [ ] `apps/web/app/api/lead/route.ts` NOT modified
- [ ] `apps/web/components/BookingForm.tsx` NOT modified (SlotPicker modified, not BookingForm)
- [ ] Both commits pushed

---

## Report Back

1. Exact test count
2. Any deviation from these instructions and why
3. Whether Drizzle's `sql` template literal worked for JSONB field comparisons, or if an alternative approach was needed
4. Whether the nested `<form>` issue in WaitingListForm was encountered and how resolved
5. Whether the status route hook added any imports that conflicted with existing ones
6. Both commit hashes
7. Any Vienna timezone edge case noticed in the `requestedDate` extraction from `appointmentAt`
