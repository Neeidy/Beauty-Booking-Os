# Sprint V2-11 — Slot Reservation + Locking

**Status:** Ready for implementation
**Workstream:** `apps/web/**` + **required DB exception for this sprint only**
**Current project state:** V2-10 complete, 290/290 tests passing
**Sprint objective:** Prevent race conditions in slot booking by adding short-lived
slot reservations, DB-backed locking, and submit-time reservation validation.

> **DB schema frozen rule exception:** This is the one sprint explicitly planned
> to touch `packages/db/src/schema.ts`. This was decided at V2-4 and noted in
> the roadmap. No other packages change.

---

## 1. Sprint Scope

### This sprint will do
- Add a dedicated reservation layer for selected booking slots
- Prevent overlapping slot holds at DB level
- Prevent form submission without a valid reservation
- Keep `/api/lead` unchanged
- Make expired reservations stop blocking availability automatically
- Integrate reservation lifecycle into the existing customer booking flow

### This sprint will not do
- No staff-capacity or parallel staff slot inventory
- No redesign of booking UX
- No localStorage
- No external calendar/datepicker libraries
- No reminder, email, or AI flow changes
- No changes to waiting list, staff preference, Google source, or rebooking logic
  unless required for compatibility

---

## 2. Architectural Decision

### Chosen solution
Dedicated DB table + wrapper submit route.

**New DB table:** `slot_reservations`
**New routes:**
- `POST /api/booking/reservations`
- `DELETE /api/booking/reservations/[token]`
- `POST /api/booking/submit`

### Why
Current slot availability is read-time only. Two users can see the same slot as
available, select it simultaneously, and both continue toward submit.
This sprint adds **write-time protection**.

### Key rule
`/api/lead` stays untouched. Reservation validation happens in a wrapper route
(`/api/booking/submit`) that validates the reservation token, then forwards the
original payload via `fetch(origin + "/api/lead", ...)` — same pattern used in
V2-10 admin rebooking POST. No direct route handler import.

---

## 3. Mandatory Pre-Read

Read these files first. Do not code before this step is complete.

```bash
# DB schema — full file, understand existing enum style and table patterns
cat packages/db/src/schema.ts

# DB migration path — how does this project apply migrations?
ls -la packages/db/
find packages/db -maxdepth 3 -type f | sort
cat packages/db/package.json | grep -i "migrate\|generate\|push"

# Supabase extension support — btree_gist available?
# Check existing migrations for any CREATE EXTENSION patterns
find packages/db -name "*.sql" | xargs grep -l "EXTENSION" 2>/dev/null || echo "No extension SQL found"

# Current slots route — full blocking logic
cat apps/web/app/api/booking/slots/route.ts

# Lead route — payload shape (for forward contract)
cat apps/web/app/api/lead/route.ts

# Booking form schema — for .extend() pattern
cat apps/web/lib/booking-form-schema.ts

# BookingForm — submit handler, current endpoint, metadata merge
cat apps/web/components/BookingForm.tsx

# SlotPicker — current state, onSlotSelect callback, fetch pattern
cat apps/web/components/SlotPicker.tsx

# Vienna helpers — viennaWallClockToUTC signature
cat apps/web/lib/vienna-helpers.ts

# Next.js 15 params pattern — verified in V2-9
cat apps/web/app/api/admin/bookings/\[id\]/reviews/route.ts | head -20
```

### Hard stop rules
Stop and revise before coding if:
- Migration path differs from expected (Drizzle generate vs raw SQL vs Supabase console)
- `btree_gist` extension not available AND fallback transaction approach needed
- `/api/lead` payload cannot be proxied safely via internal `fetch`
- Current slot blocking logic is materially different than assumed
- `BookingForm` submit handler cannot be redirected cleanly to wrapper route
- `[token]` params pattern differs from `[id]` pattern verified in V2-9

Do not guess around these points.

---

## 4. Data Model

### 4.1 Migration file

**File:** `packages/db/migrations/003_slot_reservations.sql`
(or whatever number is next — check existing migration files first)

```sql
-- Enable btree_gist if not already enabled (required for exclusion constraint)
-- Supabase supports this extension. If CREATE EXTENSION fails, use fallback (section 4.3).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Reservation status enum
CREATE TYPE reservation_status AS ENUM ('active', 'submitted', 'released', 'expired');

-- slot_reservations table
CREATE TABLE slot_reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id),
  service_id      UUID NOT NULL REFERENCES services(id),
  reservation_token TEXT NOT NULL UNIQUE,
  slot_start      TIMESTAMPTZ NOT NULL,
  slot_end        TIMESTAMPTZ NOT NULL,
  status          reservation_status NOT NULL DEFAULT 'active',
  expires_at      TIMESTAMPTZ NOT NULL,
  submitted_at    TIMESTAMPTZ,
  released_at     TIMESTAMPTZ,
  lead_id         UUID REFERENCES leads(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_slot_reservations_token
  ON slot_reservations (reservation_token);

CREATE INDEX idx_slot_reservations_client_status_expires
  ON slot_reservations (client_id, status, expires_at);

CREATE INDEX idx_slot_reservations_client_slot_start
  ON slot_reservations (client_id, slot_start);

CREATE INDEX idx_slot_reservations_lead_id
  ON slot_reservations (lead_id) WHERE lead_id IS NOT NULL;

-- DB-level overlap protection (preferred)
-- Prevents two active/submitted reservations from overlapping for the same client
ALTER TABLE slot_reservations
  ADD CONSTRAINT no_overlap_active_submitted
  EXCLUDE USING gist (
    client_id WITH =,
    tstzrange(slot_start, slot_end, '[)') WITH &&
  )
  WHERE (status IN ('active', 'submitted'));

-- RLS
ALTER TABLE slot_reservations ENABLE ROW LEVEL SECURITY;

-- Server-side only access (service role bypasses RLS)
-- No direct public/anon browser access
CREATE POLICY "slot_reservations_server_only"
  ON slot_reservations
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
```

> **If `btree_gist` or exclusion constraint fails:** Remove the `ADD CONSTRAINT`
> block and use the transaction fallback in section 4.3. Note the deviation in
> report back.

### 4.2 Drizzle schema addition

**File:** `packages/db/src/schema.ts`

Add after existing enums and before or after `automationJobs` table:

```typescript
export const reservationStatusEnum = pgEnum('reservation_status', [
  'active', 'submitted', 'released', 'expired',
]);

export const slotReservations = pgTable('slot_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  serviceId: uuid('service_id').notNull().references(() => services.id),
  reservationToken: text('reservation_token').notNull().unique(),
  slotStart: timestamp('slot_start', { withTimezone: true }).notNull(),
  slotEnd: timestamp('slot_end', { withTimezone: true }).notNull(),
  status: reservationStatusEnum('status').notNull().default('active'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  leadId: uuid('lead_id').references(() => leads.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Re-export from `packages/db/src/index.ts`:
```typescript
export { slotReservations, reservationStatusEnum } from './schema';
```

> **After adding schema:** Run `pnpm --filter @beauty-booking/db generate` (or
> whatever the project's Drizzle generate command is — confirmed in pre-read).
> If using raw SQL migrations only, skip generate.

### 4.3 Fallback overlap protection (only if exclusion constraint unavailable)

If `btree_gist` cannot be enabled, use this transaction pattern inside
`POST /api/booking/reservations`:

```typescript
// Inside a Drizzle transaction:
await db.transaction(async (tx) => {
  // 1. expire stale reservations first
  await expireStaleSlotReservations(tx, now);

  // 2. check overlap
  const conflicts = await tx
    .select({ id: slotReservations.id })
    .from(slotReservations)
    .where(
      and(
        eq(slotReservations.clientId, clientId),
        inArray(slotReservations.status, ['active', 'submitted']),
        lt(slotReservations.slotStart, slotEnd),
        gt(slotReservations.slotEnd, slotStart)
      )
    )
    .limit(1);

  if (conflicts.length > 0) {
    return NextResponse.json({ error: "Bu slot şu an rezerve edilmiş." }, { status: 409 });
  }

  // 3. insert
  await tx.insert(slotReservations).values({ ... });
});
```

---

## 5. Reservation State Model

```
active    → slot selected, 10min TTL, blocks availability
submitted → booking submitted, 60min TTL, still blocks availability
released  → intentionally released (slot change, unmount)
expired   → TTL elapsed, no longer blocks
```

---

## 6. TTL Values

```typescript
const ACTIVE_TTL_MINUTES = 10;
const SUBMITTED_TTL_MINUTES = 60;
```

Define as constants at top of `slot-reservations.ts`. Do not add to client config.

---

## 7. Shared Helper: `apps/web/lib/slot-reservations.ts`

```typescript
import { and, eq, inArray, lte } from "drizzle-orm";
import { slotReservations } from "@beauty-booking/db";

export const ACTIVE_TTL_MINUTES = 10;
export const SUBMITTED_TTL_MINUTES = 60;

// Cryptographically safe token — works in both Node.js and edge runtime
export function generateReservationToken(): string {
  // crypto.randomUUID() is available in Node.js 14.17+ and all edge runtimes
  // Do NOT use crypto.randomBytes — not available in edge runtime
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  // Result: 64-char hex string, unpredictable
}

export function calculateReservationWindow(params: {
  appointmentAtUtc: Date;
  durationMinutes: number;
}): { slotStart: Date; slotEnd: Date } {
  const slotStart = params.appointmentAtUtc;
  const slotEnd = new Date(slotStart.getTime() + params.durationMinutes * 60 * 1000);
  return { slotStart, slotEnd };
}

export function createReservationExpiry(now: Date): Date {
  return new Date(now.getTime() + ACTIVE_TTL_MINUTES * 60 * 1000);
}

export function extendSubmittedExpiry(now: Date): Date {
  return new Date(now.getTime() + SUBMITTED_TTL_MINUTES * 60 * 1000);
}

// db param: Drizzle db instance or transaction
export async function expireStaleSlotReservations(
  db: ReturnType<typeof import("@beauty-booking/db").getDb>,
  now: Date
): Promise<void> {
  await db
    .update(slotReservations)
    .set({ status: "expired" })
    .where(
      and(
        inArray(slotReservations.status, ["active", "submitted"]),
        lte(slotReservations.expiresAt, now)
      )
    );
}
```

> **TypeScript note:** The `db` parameter type will depend on how `getDb` is
> typed in this project. After pre-read, adjust to match the actual return type.
> If Drizzle transactions have a different type, use `Parameters<typeof db.transaction>[0]`
> pattern or a shared type alias. Correctness over convenience here.

---

## 8. API Routes

### 8.1 `POST /api/booking/reservations`

**File:** `apps/web/app/api/booking/reservations/route.ts`

```typescript
export const dynamic = "force-dynamic";
```

**Zod schema:**
```typescript
const ReservationRequestSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  replaceToken: z.string().optional(),
});
```

**Flow:**
1. Parse + validate body with `ReservationRequestSchema.safeParse`
2. Load `clientId` from env
3. Query `services` for `serviceId` — verify `active: true` and get `durationMinutes`
4. Convert `date + time` Vienna wall-clock → UTC using `viennaWallClockToUTC` from `@/lib/vienna-helpers`
5. `calculateReservationWindow` → `slotStart`, `slotEnd`
6. `expireStaleSlotReservations(db, now)`
7. If `replaceToken`: best-effort release — `UPDATE slot_reservations SET status='released', released_at=now WHERE reservation_token=replaceToken AND status IN ('active','submitted')`
8. Check booking conflicts (reuse existing bookings overlap logic from slots route)
9. Check reservation conflicts — active/submitted for same client overlapping `[slotStart, slotEnd)`
10. Insert reservation — catch DB unique/exclusion violation → return `409`
11. Return success response

**Success response:**
```typescript
{
  success: true,
  reservationToken: string,
  expiresAt: string,        // ISO UTC
  appointmentAt: string,    // ISO UTC
  holdSeconds: number,      // ACTIVE_TTL_MINUTES * 60
}
```

**Error responses:**
- `400` — validation fail, invalid service, inactive service
- `409` — slot conflict (booking or reservation overlap)
- `500` — unexpected

---

### 8.2 `DELETE /api/booking/reservations/[token]/route.ts`

**File:** `apps/web/app/api/booking/reservations/[token]/route.ts`

```typescript
export const dynamic = "force-dynamic";
```

**Params pattern** — same as V2-9 `[id]` pattern:
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await params;
  // ...
}
```

**Behavior:**
- Idempotent — always returns `200`
- Only transitions `active` or `submitted` to `released`
- Sets `releasedAt = now`
- If token not found or already expired/released → still `200`

---

### 8.3 `POST /api/booking/submit`

**File:** `apps/web/app/api/booking/submit/route.ts`

```typescript
export const dynamic = "force-dynamic";
```

**Extended schema:**
```typescript
// Import existing schema, extend it
import { bookingFormSchema } from "@/lib/booking-form-schema";

const bookingSubmitSchema = bookingFormSchema.extend({
  reservationToken: z.string().min(20),
});
```

> If `bookingFormSchema` cannot be extended directly (e.g., it's a `z.object`
> wrapped in a transform), read the schema file first and determine the right
> approach. Do not duplicate the schema by hand.

**Flow:**
1. Validate body with `bookingSubmitSchema.safeParse`
2. `expireStaleSlotReservations(db, now)`
3. Find reservation: `WHERE reservation_token = token AND client_id = clientId`
4. Validate:
   - exists → else `409 "Rezervasyon bulunamadı."`
   - `status === 'active'` → else `409 "Rezervasyon süresi doldu. Lütfen yeniden slot seç."`
   - `expiresAt > now` → else `409 "Rezervasyon süresi doldu. Lütfen yeniden slot seç."`
   - `serviceId` matches → else `409`
   - `slotStart` matches `metadata.appointmentAt` (within 1 minute tolerance for clock drift)
5. Build forward payload — remove `reservationToken`, keep everything else unchanged
6. `const leadRes = await fetch(origin + "/api/lead", { method: "POST", body: JSON.stringify(forwardPayload), headers: { "Content-Type": "application/json" } })`
7. If `leadRes` not OK:
   - Log error
   - Do NOT release reservation — keep active until TTL
   - Return `502 "Gönderim başarısız oldu, rezervasyonun kısa süre daha korunuyor."`
8. If `leadRes` OK:
   - Parse response to get `leadId` if present
   - `UPDATE slot_reservations SET status='submitted', submitted_at=now, expires_at=extendSubmittedExpiry(now), lead_id=leadId WHERE id=reservation.id`
   - Forward the `leadRes` body back to the client

---

### 8.4 Update `GET /api/booking/slots`

**File:** `apps/web/app/api/booking/slots/route.ts`

**Read the current file fully before modifying.**

**Add after existing booking conflict query:**

```typescript
// Query active/submitted reservations for this day
const activeReservations = await db
  .select({
    slotStart: slotReservations.slotStart,
    slotEnd: slotReservations.slotEnd,
    reservationToken: slotReservations.reservationToken,
  })
  .from(slotReservations)
  .where(
    and(
      eq(slotReservations.clientId, clientId),
      inArray(slotReservations.status, ['active', 'submitted']),
      // Filter to relevant day
      gte(slotReservations.slotStart, dayStartUTC),
      lte(slotReservations.slotStart, dayEndUTC)
    )
  );

// Optional: if caller passes ?reservationToken=..., ignore their own lock
const callerToken = searchParams.get("reservationToken");
const reservationsToBlock = callerToken
  ? activeReservations.filter(r => r.reservationToken !== callerToken)
  : activeReservations;
```

**In slot loop — add reservation overlap check alongside existing booking check:**

```typescript
const blockedByReservation = reservationsToBlock.some(
  (r) =>
    slotStartUTC.getTime() < r.slotEnd.getTime() &&
    slotEndUTC.getTime() > r.slotStart.getTime()
);

// available = !blockedByBooking && !blockedByReservation && !isPast
```

**Also call `expireStaleSlotReservations(db, now)` at the start of the handler,
before the slot loop.**

Do not change any other existing logic in this route.

---

## 9. Frontend Integration

### 9.1 `DatePicker.tsx`
Do not modify.

### 9.2 `SlotPicker.tsx`

**Read the full file before modifying.**

**New state:**
```typescript
const [reservationToken, setReservationToken] = useState<string | null>(null);
const [reservationExpiresAt, setReservationExpiresAt] = useState<Date | null>(null);
const [reservationCountdownSeconds, setReservationCountdownSeconds] = useState<number>(0);
const [lockError, setLockError] = useState<string | null>(null);
```

**Countdown timer — useEffect with cleanup:**
```typescript
useEffect(() => {
  if (!reservationExpiresAt) return;

  const tick = () => {
    const remaining = Math.max(
      0,
      Math.floor((reservationExpiresAt.getTime() - Date.now()) / 1000)
    );
    setReservationCountdownSeconds(remaining);

    if (remaining === 0) {
      // TTL expired — clear state, refetch
      setReservationToken(null);
      setReservationExpiresAt(null);
      setSelectedSlot(null); // or whatever the slot selection state is called
      setLockError("Rezervasyon süresi doldu. Lütfen yeniden slot seç.");
      fetchSlots(); // refetch availability
    }
  };

  const interval = setInterval(tick, 1000);
  tick(); // immediate first tick

  return () => clearInterval(interval); // cleanup — prevents memory leak
}, [reservationExpiresAt]);
```

**On slot selection — call reservation API:**
```typescript
async function handleSlotSelect(slot: SlotItem) {
  setLockError(null);
  try {
    const res = await fetch("/api/booking/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        date,
        time: slot.time,
        replaceToken: reservationToken ?? undefined,
      }),
    });

    if (res.status === 409) {
      // Slot just taken — clear selection, refetch
      setLockError("Bu slot az önce doldu.");
      setReservationToken(null);
      setReservationExpiresAt(null);
      fetchSlots();
      return;
    }

    if (!res.ok) {
      setLockError("Slot rezerve edilemedi. Lütfen tekrar dene.");
      return;
    }

    const data = await res.json();
    setReservationToken(data.reservationToken);
    setReservationExpiresAt(new Date(data.expiresAt));
    onSlotSelect(slot.datetime, slot.time, data.reservationToken); // pass token up
  } catch {
    setLockError("Bağlantı hatası. Lütfen tekrar dene.");
  }
}
```

**On unmount / date or service change — best-effort release:**
```typescript
useEffect(() => {
  return () => {
    // Best-effort cleanup — do not block UI if fails
    if (reservationToken) {
      fetch(`/api/booking/reservations/${reservationToken}`, {
        method: "DELETE",
        keepalive: true, // survives page unload
      }).catch(() => {}); // intentionally silent
    }
  };
}, [reservationToken]);
```

**Fetch slots — pass token if exists:**
```typescript
const url = `/api/booking/slots?date=${date}&serviceId=${serviceId}` +
  (reservationToken ? `&reservationToken=${reservationToken}` : "");
```

**Countdown display (render):**
```typescript
{reservationToken && reservationCountdownSeconds > 0 && (
  <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
    Slot rezerve edildi — {Math.floor(reservationCountdownSeconds / 60)}:
    {String(reservationCountdownSeconds % 60).padStart(2, "0")} kaldı
  </p>
)}
{lockError && (
  <p style={{ fontSize: "13px", color: "var(--color-text)", padding: "8px",
    border: "1px solid var(--color-accent)", borderRadius: "6px" }}>
    ⚠ {lockError}
  </p>
)}
```

> **Note:** Match the exact state variable names and component structure found
> when reading `SlotPicker.tsx`. The above is a guide, not a literal paste.
> Adapt to the existing component shape.

### 9.3 `BookingForm.tsx`

**Read the full file before modifying.**

**Changes required:**
1. Accept `reservationToken` from `SlotPicker` — update `onSlotSelect` callback to include token
2. Store `reservationToken` in local state
3. Block slot-based submit if no token: show error, do not call API
4. Change submit endpoint: `POST /api/booking/submit` instead of `/api/lead`
5. Include `reservationToken` in submit body

**Preserved unchanged:**
- `metadata.appointmentAt`, `metadata.appointmentTime`, `metadata.appointmentDate`
- `metadata.bookingSource` (V2-8)
- Staff preference notes (V2-7)
- Waiting list behavior (V2-5)
- All three GDPR fields

**Submit guard:**
```typescript
// Before submit — if slot was selected but no token:
if (selectedSlotDatetime && !reservationToken) {
  setError("Lütfen geçerli bir slot seçin.");
  return;
}
```

---

## 10. Validation / Zod

Use `.extend()` on the existing schema:

```typescript
const bookingSubmitSchema = bookingFormSchema.extend({
  reservationToken: z.string().min(20),
});
```

If the schema uses `z.object(...)` at its base, `.extend()` works directly.
If it is wrapped in `.transform()` or `.superRefine()`, read the schema file and
create a small wrapper:

```typescript
// Option B — if extend fails:
const bookingSubmitSchema = z.object({
  ...bookingFormSchema.shape,
  reservationToken: z.string().min(20),
});
```

Choose the option that does not duplicate field definitions.

---

## 11. Error Handling

| Code | When |
|---|---|
| `409` | Slot unavailable, token expired, token invalid, service/slot mismatch |
| `400` | Malformed input, missing required field, inactive service |
| `502` | `/api/lead` downstream failure |
| `500` | True unexpected server error |

---

## 12. User-Facing Messages

```
"Bu slot az önce doldu."                         → 409 on reservation create
"Rezervasyon süresi doldu. Lütfen yeniden slot seç."  → TTL expiry or expired token on submit
"Gönderim başarısız oldu, rezervasyonun kısa süre daha korunuyor."  → 502 from submit
"Slot rezerve edilemedi. Lütfen tekrar dene."    → 500 on reservation create
"Bağlantı hatası. Lütfen tekrar dene."           → fetch network error
```

All messages: short, specific, CSS vars only for styling (no hex).

---

## 13. File Plan

### `packages/db/` (DB exception — this sprint only)
- `src/schema.ts` — add `reservationStatusEnum` + `slotReservations`
- `src/index.ts` — re-export new exports
- `migrations/003_slot_reservations.sql` — migration file

### `apps/web/lib/`
- `slot-reservations.ts` — shared helpers

### `apps/web/app/api/booking/`
- `reservations/route.ts` — POST create
- `reservations/[token]/route.ts` — DELETE release
- `submit/route.ts` — POST wrapper
- `slots/route.ts` — update: add reservation blocking + expiry call

### `apps/web/components/`
- `SlotPicker.tsx` — reservation lifecycle + countdown
- `BookingForm.tsx` — token forwarding + submit to wrapper

---

## 14. Acceptance Criteria

- [ ] `reservationStatusEnum` exists in schema
- [ ] `slotReservations` table exists in schema + migration
- [ ] DB-level overlap protection in place (exclusion or transaction fallback)
- [ ] RLS enabled — server-only access
- [ ] `packages/db` exports updated
- [ ] `crypto.randomUUID()` used (not `crypto.randomBytes`) — edge-runtime safe
- [ ] `slot-reservations.ts` helpers: 5 functions + 2 TTL constants
- [ ] `POST /api/booking/reservations` creates reservation, returns token + expiresAt
- [ ] `POST /api/booking/reservations` → 409 on overlap
- [ ] `DELETE /api/booking/reservations/[token]` idempotent, always 200
- [ ] `POST /api/booking/submit` → 409 on invalid/expired token
- [ ] `POST /api/booking/submit` → forwards to `/api/lead` on valid token
- [ ] Successful submit → reservation transitions to `submitted`, expiry extended
- [ ] Failed downstream submit does not release reservation
- [ ] `GET /api/booking/slots` expires stale reservations before computing availability
- [ ] `GET /api/booking/slots` blocks active/submitted reservations
- [ ] `?reservationToken=` query param → caller's own lock ignored
- [ ] SlotPicker: 409 on select → clears selection, refetches, shows message
- [ ] SlotPicker: TTL countdown renders, clears at 0, refetches
- [ ] SlotPicker: `setInterval` has `clearInterval` cleanup in `useEffect`
- [ ] SlotPicker: unmount releases reservation with `keepalive: true`
- [ ] BookingForm: cannot submit without token when slot selected
- [ ] BookingForm: submit goes to `/api/booking/submit`, not `/api/lead` directly
- [ ] `/api/lead` route untouched
- [ ] All metadata fields preserved (appointmentAt, bookingSource, staff notes, GDPR)
- [ ] No `toLocaleString`
- [ ] No localStorage
- [ ] All new routes: `export const dynamic = "force-dynamic"`
- [ ] `pnpm typecheck` → 0 errors
- [ ] `pnpm --filter @beauty/web build` → clean

---

## 15. Testing Policy

Full final test count increment is deferred to end-of-system validation.

**For this sprint:**
- `pnpm typecheck` after each file
- `pnpm --filter @beauty/web build` after full implementation
- Lightweight manual checks below

No fake test count claim.

---

## 16. Lightweight Manual Checks

```bash
# Start dev server
pnpm dev

# 1. Select a slot
# Expected: reservation created, token returned, countdown visible in UI

# 2. Parallel same-slot attempt (open two tabs simultaneously)
# Expected: second attempt returns 409, "Bu slot az önce doldu." shown

# 3. Change slot (select a different slot)
# Expected: previous token released (DELETE called), new token created

# 4. Wait 10 minutes (or reduce ACTIVE_TTL_MINUTES to 1 for testing)
# Expected: countdown reaches 0, slot reopens, "Rezervasyon süresi doldu." shown

# 5. Submit with valid token
# Expected: /api/booking/submit validates → forwards to /api/lead →
#           reservation transitions to submitted, expiresAt extended to +60min

# 6. Submit with expired/missing token
# Expected: 409 returned, user shown message
```

---

## 17. Implementation Order

Claude Code must implement in this exact order:

1. mandatory pre-read (confirm schema names, migration path, `[token]` param pattern)
2. DB schema enum + table + migration SQL + RLS
3. `packages/db` index re-exports
4. `apps/web/lib/slot-reservations.ts` helpers
5. `POST /api/booking/reservations`
6. `DELETE /api/booking/reservations/[token]`
7. `POST /api/booking/submit`
8. `GET /api/booking/slots` update
9. `SlotPicker.tsx` integration
10. `BookingForm.tsx` integration
11. `pnpm typecheck` + `pnpm build`
12. `CLAUDE.md` update

If any schema naming assumption fails at step 1, stop and report.

---

## 18. CLAUDE.md Update Block

Add only after implementation is complete and build passes.

```markdown
| V2-11 | Slot Reservation + Locking | ✅ DONE | final verification deferred |
```

```markdown
### V2-11: Slot Reservation + Locking — COMPLETED
- feat: slot_reservations table + reservationStatusEnum + migration + RLS
- feat: DB-level overlap protection (exclusion constraint OR transaction fallback)
- feat: POST /api/booking/reservations — 10min TTL lock, replaceToken support
- feat: DELETE /api/booking/reservations/[token] — idempotent release
- feat: POST /api/booking/submit — reservation validation wrapper before /api/lead
- feat: GET /api/booking/slots — blocks active/submitted reservations,
  expireStaleSlotReservations on each call, ?reservationToken ignore-own-lock
- feat: SlotPicker — reservation lifecycle, countdown timer (clearInterval cleanup),
  keepalive release on unmount
- feat: BookingForm — submit to /api/booking/submit, token guard
- /api/lead untouched
- DB exception: packages/db/src/schema.ts + migration (only touch in V2)
- crypto.randomUUID() used (edge-runtime safe)
- Test count deferred to end-of-system validation
```

---

## 19. Report Back

1. Was `btree_gist` available? Exclusion constraint used or transaction fallback?
2. Migration path — Drizzle generate or raw SQL?
3. `bookingFormSchema` — `.extend()` worked directly or wrapper needed?
4. `[token]` params pattern — same `Promise<{ token: string }>` as V2-9 `[id]`?
5. `SlotPicker` existing `onSlotSelect` callback signature — had to change it to pass token?
6. Commit hashes (schema, helpers, routes, frontend)
7. Any unexpected deviation — stop reason, what was found, what was changed

**V2 series is complete after this report is confirmed.**

---



```

```
