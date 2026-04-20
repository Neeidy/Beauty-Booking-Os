# Sprint V2-4: Live Slot Selection (Customer-Facing)

**Backend status:** FROZEN. This sprint adds ONE new public API route and UI components. NO changes to `packages/**`, NO changes to `/api/lead` route, NO DB schema changes.

**Design decision:** Customer-selected slots are stored in `metadata.appointmentAt` on the lead (not as real bookings). No slot reservation/locking in this sprint — race condition handling is deferred to a dedicated post-V2-9 sprint. Pre-launch traffic is zero; race conditions are theoretical.

---

## Context

V2-1 through V2-3 added admin views. V2-4 changes the customer-facing booking form: instead of free-text "Preferred Date" and "Preferred Time" fields, customers get a visual date picker and a live slot grid that shows which times are available based on existing bookings.

**The key constraint:** `/api/lead` does NOT accept `appointmentAt` as a top-level field. Verified by reading `apps/web/app/api/lead/route.ts`. But it DOES accept `metadata: jsonb` which is passed through to `leads.metadata`. We embed the selected slot there.

**Already verified:**
- Booking form is at `apps/web/components/BookingForm.tsx` (NOT `apps/web/app/booking/`)
- Form schema at `apps/web/lib/booking-form-schema.ts` (uses react-hook-form + zod)
- Current form fields: Name, Email, Phone, Service dropdown, Preferred Date (free text), Preferred Time (free text), Notes, 3 GDPR checkboxes
- Lead endpoint accepts `metadata` field that flows into `leads.metadata` JSONB column
- `client.config.json` has `bookingRules.minAdvanceBookingHours` (value: 2 for demo-salon)
- Status enum uses underscore: `no_show` (not `noshow`)
- Timezone helpers must use `Date.UTC()` approach — V2-3 learned `toLocaleString`-based helpers leak machine timezone
- Existing CSS vars: `--color-background`, `--color-primary`, `--color-secondary`, `--color-accent`, `--color-text`, `--color-text-muted`
- No external libraries allowed (no date-fns, no react-datepicker, no calendar libs)

---

## Files To Create

1. `apps/web/app/api/booking/slots/route.ts` — public slot availability API
2. `apps/web/components/DatePicker.tsx` — custom month-grid date picker
3. `apps/web/components/SlotPicker.tsx` — fetches and renders slot grid
4. `apps/web/__tests__/booking-slots-api.test.ts` — 8 Vitest tests

## Files To Modify

1. `apps/web/components/BookingForm.tsx` — replace preferred date/time free-text with DatePicker + SlotPicker
2. `apps/web/lib/booking-form-schema.ts` — update zod schema to match

## Files That Must NOT Be Touched

- Anything under `packages/**`
- `apps/web/app/api/lead/route.ts`
- Any admin route or page
- Database schema or migrations
- `globals.css`, `tailwind.config.ts`

---

## Task 1 — Slots API Route

**File:** `apps/web/app/api/booking/slots/route.ts`

**Top of file:**
```typescript
export const dynamic = "force-dynamic";
```

**Handler:** `GET /api/booking/slots`

**Public — NO auth check.** This endpoint is reached by unauthenticated customers.

**Query params:**
- `date: string` — REQUIRED, `YYYY-MM-DD`
- `serviceId: string` — REQUIRED, UUID
- `clientId?: string` — Default: `process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000"`

**Validation:**
```typescript
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  return NextResponse.json({ error: "Missing or invalid date" }, { status: 400 });
}
if (!serviceId) {
  return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });
}
```

**Helpers at top of file (copy the machine-TZ-independent pattern from V2-3):**

```typescript
function formatDateVienna(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTimeVienna(date: Date): string {
  return new Intl.DateTimeFormat("de-AT", {
    timeZone: "Europe/Vienna",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getViennaOffsetMinutes(date: Date): number {
  // Use Date.UTC approach — machine-TZ-independent
  const utcFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const viennaFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vienna",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parseFormatted = (f: Intl.DateTimeFormat, d: Date) => {
    const parts = f.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    return Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour === "24" ? "0" : parts.hour), Number(parts.minute), Number(parts.second)
    );
  };
  const utcMs = parseFormatted(utcFormatter, date);
  const viennaMs = parseFormatted(viennaFormatter, date);
  return Math.round((viennaMs - utcMs) / 60000);
}

// Compute UTC Date for a given Vienna wall-clock time on a given date
function viennaWallClockToUTC(dateStr: string, hour: number, minute: number): Date {
  // Anchor: noon UTC on the date — safely mid-day, DST-proof
  const anchor = new Date(`${dateStr}T12:00:00Z`);
  const offsetMinutes = getViennaOffsetMinutes(anchor);
  // Construct Vienna wall-clock as if it were UTC, then subtract offset
  const [y, m, d] = dateStr.split("-").map(Number);
  const asIfUtcMs = Date.UTC(y, m - 1, d, hour, minute, 0);
  return new Date(asIfUtcMs - offsetMinutes * 60000);
}
```

**Main logic:**

### Step 1 — Load service duration + minAdvanceBookingHours

```typescript
const db = getDb();

// Service duration
let serviceDurationMinutes = 60;
let serviceName: string | null = null;
try {
  const svc = await db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
    })
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);
  if (svc[0]) {
    serviceDurationMinutes = svc[0].durationMinutes;
    serviceName = svc[0].name;
  }
} catch (err) {
  console.warn("services query failed, using default 60min", err);
}

// minAdvanceBookingHours from client config
// Read from clients/{slug}/client.config.json — match the pattern used by
// apps/web/lib/load-client-config.ts if it exists, otherwise read directly with fs.
// For simplicity here, hardcode to 2 hours as a safe default if config load fails.
let minAdvanceHours = 2;
try {
  const { loadClientConfig } = await import("@/lib/load-client-config");
  const cfg = loadClientConfig(); // uses NEXT_PUBLIC_DEFAULT_CLIENT_SLUG
  if (cfg?.bookingRules?.minAdvanceBookingHours != null) {
    minAdvanceHours = cfg.bookingRules.minAdvanceBookingHours;
  }
} catch {
  // Fallback to 2
}
```

If `loadClientConfig` has a different name or signature, read the file one step up and match it. Do not invent.

### Step 2 — Fetch existing bookings for the day

```typescript
const dayStartUTC = viennaWallClockToUTC(date, 0, 0);
const dayEndUTC = new Date(dayStartUTC.getTime() + 24 * 60 * 60 * 1000 - 1);

const existingBookings = await db
  .select({
    appointmentAt: bookings.appointmentAt,
    durationMinutes: bookings.durationMinutes,
    status: bookings.status,
  })
  .from(bookings)
  .where(
    and(
      eq(bookings.clientId, CLIENT_ID),
      gte(bookings.appointmentAt, dayStartUTC),
      lte(bookings.appointmentAt, dayEndUTC)
    )
  );

// cancelled and no_show do NOT block slots
const blocked = existingBookings.filter(
  (b) => b.status !== "cancelled" && b.status !== "no_show"
);
```

### Step 3 — Business hours (hardcoded, deferred to V2-5 config)

```typescript
// JS getUTCDay on noon-UTC anchor approximates Vienna weekday for mid-day dates
const anchor = new Date(`${date}T12:00:00Z`);
const weekday = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Vienna",
  weekday: "short",
}).format(anchor); // "Mon", "Tue", ..., "Sun"

const isSunday = weekday === "Sun";
const openHour = isSunday ? 10 : 9;
const closeHour = isSunday ? 16 : 18;
```

### Step 4 — Generate slots (step size = min(30, serviceDuration))

```typescript
const stepMinutes = Math.min(30, serviceDurationMinutes);
const now = new Date();
const minBookableTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);

type SlotItem = { time: string; datetime: string; available: boolean };
const slots: SlotItem[] = [];

for (let minuteOfDay = openHour * 60; minuteOfDay < closeHour * 60; minuteOfDay += stepMinutes) {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  const slotStartUTC = viennaWallClockToUTC(date, hour, minute);
  const slotEndUTC = new Date(slotStartUTC.getTime() + serviceDurationMinutes * 60000);
  const closingUTC = viennaWallClockToUTC(date, closeHour, 0);

  const fitsBeforeClose = slotEndUTC.getTime() <= closingUTC.getTime();
  const isInPast = slotStartUTC.getTime() < minBookableTime.getTime();

  const overlapsExisting = blocked.some((b) => {
    const bStart = new Date(b.appointmentAt);
    const bEnd = new Date(bStart.getTime() + b.durationMinutes * 60000);
    return slotStartUTC < bEnd && slotEndUTC > bStart;
  });

  slots.push({
    time: formatTimeVienna(slotStartUTC),
    datetime: slotStartUTC.toISOString(),
    available: fitsBeforeClose && !isInPast && !overlapsExisting,
  });
}
```

### Step 5 — Response (Zod-validated)

```typescript
{
  date: string,                    // "2026-04-10"
  serviceId: string,
  serviceName: string | null,
  serviceDurationMinutes: number,
  slots: SlotItem[]
}
```

Define a Zod schema and parse before returning. On parse failure → 500 + console.error.

**Error handling:** Wrap the DB section in try/catch. On DB error → `500 { error: "Internal server error" }` + `console.error`.

---

## Task 2 — DatePicker Component

**File:** `apps/web/components/DatePicker.tsx`

`"use client"` at top.

**Props:**
```typescript
{
  selectedDate: string | null;        // "YYYY-MM-DD"
  onDateChange: (date: string) => void;
  disabled?: boolean;                  // if true, entire picker is non-interactive
}
```

**State:**
```typescript
const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
const [viewMonth, setViewMonth] = useState(() => new Date().getMonth()); // 0-indexed
```

**Constraints:**
- Minimum date: today (Europe/Vienna). Past days: `opacity: 0.4`, `pointer-events: none`
- Maximum date: today + 60 days
- Today's cell: thin border in `var(--color-primary)`
- Selected cell: solid `var(--color-primary)` background, white text
- All other cells: hover effect with `var(--color-accent)` background

**Layout:**
- Header: `[←] Monat Jahr [→]` — month name in German (`Intl.DateTimeFormat("de-AT", { month: "long", year: "numeric" })`)
- Weekday row: `Mo Di Mi Do Fr Sa So` (ISO Monday-first)
- Day grid: 7 columns, CSS Grid, minimum cell size `44x44px` (touch target)
- Past months hidden if `viewYear/viewMonth < current`. The `[←]` button disables when current month is displayed.

**Month grid math (no library):**
```typescript
const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sunday
const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

// Render startOffset empty cells, then daysInMonth day cells
```

When a day is clicked, format as `YYYY-MM-DD` and call `onDateChange`. Use the en-CA trick or build manually — do NOT use `toISOString().slice(0, 10)` (that leaks UTC).

Day string construction (safe):
```typescript
function toDateString(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}
```

If `disabled` prop is true, entire component renders with `opacity: 0.5` and `pointer-events: none`.

---

## Task 3 — SlotPicker Component

**File:** `apps/web/components/SlotPicker.tsx`

`"use client"` at top.

**Props:**
```typescript
{
  date: string | null;                        // "YYYY-MM-DD"
  serviceId: string | null;                   // UUID
  clientId: string;                            // UUID
  selectedSlot: string | null;                 // datetime ISO
  onSlotSelect: (datetime: string, time: string) => void;
}
```

**Behavior:**

```typescript
const [slots, setSlots] = useState<SlotItem[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (!date || !serviceId) {
    setSlots([]);
    return;
  }
  const controller = new AbortController();
  setLoading(true);
  setError(null);
  fetch(
    `/api/booking/slots?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}&clientId=${encodeURIComponent(clientId)}`,
    { signal: controller.signal }
  )
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      setSlots(data.slots ?? []);
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        setError("Saatler yüklenemedi, lütfen tekrar deneyin");
      }
    })
    .finally(() => setLoading(false));
  return () => controller.abort();
}, [date, serviceId, clientId]);
```

**Render states:**
- No `date` or no `serviceId`: render nothing (or a muted hint "Önce tarih seçin")
- `loading === true`: skeleton / "Müsait saatler yükleniyor..." message
- `error !== null`: red error block + retry button that re-triggers the effect (lift `retryCounter` state and bump it)
- `slots.length === 0 && !loading && !error`: "Bu gün için müsait saat bulunmuyor"
- Otherwise: grid of slot buttons

**Slot grid:**
- 3 columns on mobile (`grid-cols-3`), 4-6 columns on md+ depending on space
- Each slot cell: `min-height: 44px` touch target
- Available slot: clickable, `var(--color-background)` background, `var(--color-primary)` border
- Unavailable slot: `opacity: 0.4`, `pointer-events: none`, subtle "Dolu" label overlay or strikethrough
- Selected slot: `var(--color-primary)` background, white text, thicker border
- On click: call `onSlotSelect(slot.datetime, slot.time)`

**Display only the time** (`slot.time`, e.g. "14:30"), not the date — date is already implied by the date picker above.

---

## Task 4 — Update BookingForm + Schema

**File:** `apps/web/components/BookingForm.tsx`

**Read the existing file first.** Understand exactly how it's structured — field order, submit handler, zod resolver, error rendering.

**Changes:**

1. **Remove** the free-text `preferredDate` and `preferredTime` fields from the JSX (or whatever they're called — match the actual field names). Keep all other fields (name, email, phone, service, notes, GDPR checkboxes) unchanged.

2. **Add state** for the new picker values:
   ```typescript
   const [selectedDate, setSelectedDate] = useState<string | null>(null);
   const [selectedSlotDatetime, setSelectedSlotDatetime] = useState<string | null>(null);
   const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
   ```

3. **Insert the pickers in the form** between the service dropdown and the notes field:
   ```tsx
   <DatePicker
     selectedDate={selectedDate}
     onDateChange={(d) => {
       setSelectedDate(d);
       setSelectedSlotDatetime(null); // reset slot when date changes
       setSelectedSlotTime(null);
     }}
     disabled={!watch("serviceId")}
   />
   <SlotPicker
     date={selectedDate}
     serviceId={watch("serviceId") ?? null}
     clientId={CLIENT_ID_CONSTANT}
     selectedSlot={selectedSlotDatetime}
     onSlotSelect={(dt, t) => {
       setSelectedSlotDatetime(dt);
       setSelectedSlotTime(t);
     }}
   />
   ```

   If the form uses `react-hook-form`'s `watch` or equivalent, use it to read the selected service. If not, use local state.

4. **Submit validation** — before submitting, ensure a slot is selected:
   ```typescript
   if (!selectedSlotDatetime) {
     setError("Lütfen randevu saati seçin");
     return;
   }
   ```
   Use whatever error-display pattern the form already uses.

5. **Inject metadata into the submit body:**
   ```typescript
   const submitBody = {
     ...existingFields,
     metadata: {
       appointmentAt: selectedSlotDatetime,     // ISO UTC
       appointmentTime: selectedSlotTime,       // "14:30"
       appointmentDate: selectedDate,            // "2026-04-10"
     },
   };
   ```

   **Do NOT change the endpoint URL.** Do NOT change the HTTP method. Only enrich the body.

6. **File:** `apps/web/lib/booking-form-schema.ts`

   - Remove `preferredDate` and `preferredTime` from the zod schema (or mark them optional if removal breaks other things — prefer removal)
   - Do NOT add `appointmentAt` to the schema — it goes through `metadata` which is passed as a JSON object, not a form field
   - If the schema has a `metadata` field, leave it. If not, don't add one here — metadata is constructed in the submit handler, not validated by react-hook-form

**Constraint:** The form must still work if the user doesn't have JS (though realistically this won't happen since it's `"use client"`). Submit validation is client-side only.

---

## Task 5 — Tests

**File:** `apps/web/__tests__/booking-slots-api.test.ts`

Mirror the mocking pattern from `apps/web/__tests__/calendar-api.test.ts` and `front-desk-api.test.ts`. Read both first.

**8 test cases:**

1. **Missing date → 400** — Request without `date` param → HTTP 400.

2. **Missing serviceId → 400** — Request without `serviceId` param → HTTP 400.

3. **Empty day, all slots available** — Mock bookings query returns `[]`, services query returns `durationMinutes: 60`. Use a future date well outside the `minAdvanceHours` window (e.g. 30 days ahead) to avoid past-slot filtering. Assert `slots.length > 0` and `slots.every(s => s.available === true)`.

4. **Confirmed booking blocks overlapping slot** — Mock 1 booking, `appointmentAt: "2026-05-10T07:00:00.000Z"`, `durationMinutes: 60`, `status: "confirmed"`. Vienna in May is UTC+2, so this is 09:00 local. Assert `slots.find(s => s.time === "09:00")?.available === false` and `slots.find(s => s.time === "10:00")?.available === true` (adjusting based on service duration).

5. **cancelled booking does NOT block** — Mock 1 booking with `status: "cancelled"` at the same time as test 4. Assert `slots.find(s => s.time === "09:00")?.available === true`.

6. **no_show does NOT block** — Mock 1 booking with `status: "no_show"`. Assert the corresponding slot is `available === true`. (Note the underscore — `no_show`, not `noshow`.)

7. **Service duration exceeds closing time** — Mock `services.durationMinutes: 120`, closing at 18:00. Assert the `17:00` slot is `available: false` (17:00 + 2h = 19:00 > 18:00). Use a weekday date (not Sunday).

8. **Response Zod shape** — Normal scenario. Assert response has `date`, `serviceId`, `serviceName`, `serviceDurationMinutes`, and `slots` array. Each slot has `time`, `datetime`, `available`.

No `.skip`, no `.todo`. All 8 must pass.

---

## Verification — Must Pass Before Commit

Stop on first failure. Do NOT commit if any check fails.

1. `pnpm typecheck` → 0 errors
2. `pnpm test` → **255/255 passing** (247 + 8 new). If different, report which tests were added or broken.
3. `pnpm --filter @beauty/web build` → clean build
4. `pnpm dev` → manual smoke checks:
   - `/booking` loads, existing fields visible
   - `preferredDate` and `preferredTime` free-text fields are GONE
   - Selecting a service enables DatePicker
   - DatePicker month navigation works, past days disabled
   - Today has a border highlight
   - Selecting a date triggers SlotPicker fetch
   - Loading state briefly visible
   - Slots render in grid, some available, some disabled (depending on DB state)
   - Clicking an available slot highlights it
   - Submit without slot → "Lütfen randevu saati seçin" error
   - Submit with slot → lead created, `metadata.appointmentAt` in DB (check with a quick query if possible, or verify in admin panel /admin/leads)
   - 375px mobile: all touch targets ≥44px, no horizontal overflow
   - `curl http://localhost:3030/api/booking/slots` (no params) → 400
   - `curl 'http://localhost:3030/api/booking/slots?date=2026-05-10&serviceId=<real-uuid>'` → 200 with slots array

If any check fails, stop and report. Do not commit.

---

## Commit — Two Commits

**Commit 1 — feature:**
```bash
git add .
git status
git commit -m "feat(booking): V2-4 live slot selection (DatePicker, SlotPicker, slots API, 8 tests)"
git push
```

**Commit 2 — CLAUDE.md:**

Append to the V2 Sprints section in `CLAUDE.md`:

```markdown
### V2-4: Live Slot Selection — COMPLETED
- New public endpoint: GET /api/booking/slots (no auth, customer-facing)
- New components: DatePicker (custom month grid), SlotPicker (live fetch)
- BookingForm: replaced free-text preferredDate/preferredTime with visual pickers
- Selected slot stored in leads.metadata.appointmentAt (backend unchanged)
- Step size = min(30, serviceDuration)
- Honors minAdvanceBookingHours from client.config.json
- Past slots and cancelled/no_show bookings do not block availability
- Business hours: Mo-Sa 09-18, Sun 10-16 (hardcoded; V2-5 will move to config)
- Race condition / slot reservation deferred to post-V2-9 dedicated sprint
- Tests: 255/255 (247 + 8 new)
- No schema changes, no packages/ changes
```

```bash
git add CLAUDE.md
git commit -m "docs: log V2-4 completion in CLAUDE.md"
git push
git log --oneline -5
```

---

## Acceptance Criteria — Report On Each

- [ ] `GET /api/booking/slots` returns Zod-validated response
- [ ] No auth (public endpoint) — returns 200 without any auth header on valid params
- [ ] 400 on missing date or serviceId
- [ ] Empty day: all slots available (assuming future date > minAdvanceHours)
- [ ] confirmed/pending/reminded bookings block overlapping slots
- [ ] cancelled and no_show do NOT block
- [ ] Past slots (before now + minAdvanceHours) marked unavailable
- [ ] Slots that don't fit before closing time marked unavailable
- [ ] Step size = min(30, serviceDuration) — verified by counting slots for a 60min service
- [ ] `export const dynamic = "force-dynamic"` set
- [ ] DatePicker: month navigation, past days disabled, today highlighted, max +60 days
- [ ] SlotPicker: loading/error/empty/success states all render
- [ ] BookingForm: preferredDate/preferredTime free-text removed
- [ ] BookingForm: submit blocked if no slot selected
- [ ] BookingForm: submit body includes metadata.appointmentAt, metadata.appointmentTime, metadata.appointmentDate
- [ ] booking-form-schema.ts updated (preferredDate/preferredTime removed)
- [ ] Mobile 375px: touch targets ≥44px, no horizontal scroll
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` → 255/255
- [ ] `pnpm --filter @beauty/web build` clean
- [ ] No `packages/**` modified
- [ ] `/api/lead` route NOT modified
- [ ] Both commits pushed

---

## Report Back

1. Exact test count
2. Any deviation from these instructions and why
3. Whether `loadClientConfig` was used successfully for `minAdvanceBookingHours`, or if fallback kicked in
4. Whether `services` query worked or fell back to 60min default
5. Confirmation that the submit body now includes `metadata.appointmentAt` (inspect network tab or add a console.log in the handler temporarily if unsure)
6. How the BookingForm's existing preferredDate/preferredTime were removed — schema changes, JSX changes, both
7. Any weird timezone/DST edge cases noticed
8. Both commit hashes
