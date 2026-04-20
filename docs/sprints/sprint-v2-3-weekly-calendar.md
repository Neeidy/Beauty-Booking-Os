# Sprint V2-3: Admin Weekly Calendar View

**Backend status:** Mostly frozen. This sprint adds ONE new API route and ONE new admin page. Modify only `apps/web/components/admin/Sidebar.tsx`. Do NOT touch `packages/**` or DB schema.

---

## Context

V2-1 and V2-2 added the Front Desk kanban and customer profile. V2-3 adds a 7-day weekly calendar grid at `/admin/calendar`. No external calendar libraries (no FullCalendar, react-big-calendar, etc.) — pure CSS Grid + React state.

**Staff note:** V2-6 will add staff profiles and multi-staff columns. For now, bookings are grouped by day only, no staff dimension. Don't pre-optimize for staff; V2-6 will extend this cleanly.

**Already verified (from previous sprints):**
- Admin panel lives in `apps/web/app/admin`
- Auth: `import { isAdminApiAuthenticated } from "@/lib/admin-auth"`
- DB: `import { getDb, bookings } from "@beauty-booking/db"` (match the exact imports used in front-desk route)
- Operators: `import { eq, and, gte, lte } from "drizzle-orm"`
- Default client id: `process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000"`
- No timezone library — use native `Intl.DateTimeFormat` with `timeZone: "Europe/Vienna"`
- Existing CSS vars: `--color-background`, `--color-primary`, `--color-secondary`, `--color-accent`, `--color-text`, `--color-text-muted`
- Existing front-desk route does NOT log to `event_logs` — this route should also skip logging to stay consistent
- Bookings status enum: `pending`, `reminded`, `confirmed`, `completed`, `cancelled`, `no_show` (underscore, verified in V2-2), `rescheduled`

---

## Files To Create

1. `apps/web/app/api/admin/calendar/route.ts`
2. `apps/web/app/admin/calendar/page.tsx`
3. `apps/web/app/admin/calendar/WeeklyCalendar.tsx`
4. `apps/web/app/admin/calendar/CalendarCell.tsx`
5. `apps/web/__tests__/calendar-api.test.ts`

## Files To Modify

1. `apps/web/components/admin/Sidebar.tsx` — add "Takvim" nav item

## Files That Must NOT Be Touched

- Anything under `packages/**`
- Any existing admin route or page
- `globals.css`, `tailwind.config.ts`
- DB schema

---

## Task 1 — Calendar API Route

**File:** `apps/web/app/api/admin/calendar/route.ts`

**Force dynamic at top:**
```typescript
export const dynamic = "force-dynamic";
```

**Handler:** `GET /api/admin/calendar`

**Query params:**
- `weekStart?: string` — ISO date `YYYY-MM-DD`, must be a Monday. Default: current week's Monday in Europe/Vienna.
- `clientId?: string` — UUID. Default: `process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000"`

**Auth:** First line:
```typescript
if (!isAdminApiAuthenticated(request)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Validation:**
- If `weekStart` present, check it matches `/^\d{4}-\d{2}-\d{2}$/` AND `new Date(weekStart)` is a valid date
- If invalid: `return NextResponse.json({ error: "Invalid date format" }, { status: 400 })`
- Do NOT require that `weekStart` is actually a Monday — if the client sends a Thursday, compute the Monday of that week and use it. This is more forgiving.

**Helper — Vienna offset (put at top of file):**

```typescript
function getViennaOffsetMinutes(date: Date): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const vienna = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Vienna" }));
  return Math.round((vienna.getTime() - utc.getTime()) / 60000);
}
```

**Helper — find Monday of a given date's week (put at top of file):**

```typescript
function getMondayOfWeek(date: Date): Date {
  // ISO 8601: Monday = 1, Sunday = 7. JS getDay(): Sunday = 0.
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // if Sunday, go back 6 days
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
```

**Helper — format date as YYYY-MM-DD in Vienna:**

```typescript
function formatDateVienna(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
```

(`en-CA` gives `YYYY-MM-DD` format, which is ISO-compatible.)

**Week boundary computation:**

```typescript
// Determine target week
let baseDate: Date;
if (weekStartParam) {
  baseDate = new Date(`${weekStartParam}T12:00:00Z`); // noon UTC to avoid DST edges
} else {
  baseDate = new Date();
}

const mondayLocal = getMondayOfWeek(
  new Date(baseDate.toLocaleString("en-US", { timeZone: "Europe/Vienna" }))
);
// mondayLocal is Monday 00:00 in Vienna wall clock (but stored as a JS Date in local offset)

// Convert Vienna wall clock to UTC bounds
const offsetMinutes = getViennaOffsetMinutes(mondayLocal);
const startUTC = new Date(mondayLocal.getTime() - offsetMinutes * 60000);
const endUTC = new Date(startUTC.getTime() + 7 * 24 * 60 * 60 * 1000 - 1); // next Monday minus 1ms

const weekStartStr = formatDateVienna(startUTC);
```

**Drizzle query:**

```typescript
const db = getDb();
const rows = await db
  .select({
    id: bookings.id,
    customerName: bookings.customerName,
    customerContact: bookings.customerContact,
    appointmentAt: bookings.appointmentAt,
    durationMinutes: bookings.durationMinutes,
    status: bookings.status,
    notes: bookings.notes,
    serviceName: services.name, // null if join fails
  })
  .from(bookings)
  .leftJoin(services, eq(bookings.serviceId, services.id))
  .where(
    and(
      eq(bookings.clientId, CLIENT_ID),
      gte(bookings.appointmentAt, startUTC),
      lte(bookings.appointmentAt, endUTC)
    )
  )
  .orderBy(bookings.appointmentAt);
```

If the `services` import or join causes a type/runtime error (services table might not exist or have a different relation), wrap the JOIN section in try/catch and fall back to a plain `bookings` select with `serviceName: null` for all rows. Log the fallback to `console.warn`. Do not crash.

**Build 7-day response:**

```typescript
const dayNamesLong = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const dayNamesShort = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const days: CalendarDay[] = [];
const todayVienna = formatDateVienna(new Date());

for (let i = 0; i < 7; i++) {
  const dayDate = new Date(startUTC.getTime() + i * 24 * 60 * 60 * 1000);
  const dateStr = formatDateVienna(dayDate);

  const dayBookings = rows
    .filter(r => formatDateVienna(new Date(r.appointmentAt)) === dateStr)
    .map(r => ({
      id: r.id,
      customerName: r.customerName,
      customerContact: r.customerContact,
      appointmentAt: new Date(r.appointmentAt).toISOString(),
      appointmentTime: new Intl.DateTimeFormat("de-AT", {
        timeZone: "Europe/Vienna",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(r.appointmentAt)),
      durationMinutes: r.durationMinutes,
      status: r.status,
      serviceName: r.serviceName ?? null,
      notes: r.notes ?? null,
    }));

  days.push({
    date: dateStr,
    dayName: dayNamesLong[i],
    dayShort: dayNamesShort[i],
    isToday: dateStr === todayVienna,
    bookings: dayBookings,
  });
}
```

**Response shape (validate with Zod before returning):**

```typescript
{
  weekStart: string,        // "2026-04-06"
  weekEnd: string,          // "2026-04-12"
  totalBookings: number,
  days: CalendarDay[]       // EXACTLY 7, Monday to Sunday
}

type CalendarDay = {
  date: string,             // "2026-04-06"
  dayName: string,          // "Montag"
  dayShort: string,         // "Mo"
  isToday: boolean,
  bookings: CalendarBooking[]
}

type CalendarBooking = {
  id: string,
  customerName: string,
  customerContact: string,
  appointmentAt: string,    // ISO UTC
  appointmentTime: string,  // "HH:mm" Vienna
  durationMinutes: number,
  status: string,
  serviceName: string | null,
  notes: string | null
}
```

Empty days must have `bookings: []`, never null.

**Errors:** Wrap DB block in try/catch. On error → `500 { error: "Internal server error" }` + `console.error`.

---

## Task 2 — Calendar Page (Server Component)

**File:** `apps/web/app/admin/calendar/page.tsx`

```typescript
export const dynamic = "force-dynamic";
```

- Server component, no `"use client"`
- Read `weekStart` from `searchParams` if present:
  ```typescript
  { searchParams }: { searchParams: Promise<{ weekStart?: string }> }
  ```
  then `const { weekStart } = await searchParams;`
- Build fetch URL: `/api/admin/calendar${weekStart ? `?weekStart=${weekStart}` : ""}`
- Use the same fetch pattern as `apps/web/app/admin/front-desk/page.tsx` — read that file first and copy verbatim (including auth forwarding)
- On fetch failure: render "Takvim yüklenemedi" error block, do not crash
- On success: render `<WeeklyCalendar initialData={data} />`

---

## Task 3 — WeeklyCalendar Component

**File:** `apps/web/app/admin/calendar/WeeklyCalendar.tsx`

`"use client"` at top.

Props: `{ initialData: CalendarResponse }`

**State:**
```typescript
const [data, setData] = useState(initialData);
const [isLoading, setIsLoading] = useState(false);
const router = useRouter(); // from next/navigation
const searchParams = useSearchParams();
```

**Navigation handler (URL-synced):**

When user clicks previous/next/today, update the URL via `router.push("/admin/calendar?weekStart=...")`. The server component re-fetches and re-renders. This gives us URL state for free, supports browser back button, and shareable links.

Pseudocode:
```typescript
function navigateToWeek(newWeekStart: string) {
  setIsLoading(true);
  router.push(`/admin/calendar?weekStart=${newWeekStart}`);
  // setIsLoading(false) happens naturally on re-render with new initialData via useEffect
}

useEffect(() => {
  setData(initialData);
  setIsLoading(false);
}, [initialData]);
```

**Previous/next computation (pure date math, no library):**

```typescript
function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const prevWeek = addDays(data.weekStart, -7);
const nextWeek = addDays(data.weekStart, 7);
```

**"Heute" button:**

Compute current Monday locally and compare to `data.weekStart`. If they match, the button should be disabled (or hidden). Otherwise, clicking it navigates to the current week.

```typescript
const todayMondayStr = /* compute current week Monday YYYY-MM-DD in Vienna */;
const isCurrentWeek = data.weekStart === todayMondayStr;
```

For computing the current Monday client-side, use the same logic as the API (Vienna timezone + getMondayOfWeek). Put the helper inline in this component or in a small `lib/` file if it already exists. Do not duplicate into `packages/`.

**Layout — Desktop (md+):**
- Header row: `[←]  Mo 7  Di 8  Mi 9  Do 10  Fr 11  Sa 12  So 13  [→]  [Heute]`
- Under the header: 7 columns via CSS Grid (`grid-template-columns: repeat(7, 1fr)`)
- Each column is a `<CalendarCell day={day} />`
- Column header shows: `dayShort` + day number (large if `isToday`)
- `isToday` column: background `var(--color-accent)`, header text `var(--color-primary)` bold

**Layout — Mobile (<md):**
- Vertical stack: 7 days stacked top-to-bottom (no horizontal scroll, no 3-column weirdness)
- Each day row shows: day name + date on top, booking list below
- Navigation (←/→/Heute) stays at top, compact

**Loading state:** When `isLoading === true`, the grid wrapper gets `opacity: 0.5` and `pointer-events: none`.

**Top bar:**
```
[←]  KW {weekNumber}  {weekStart} – {weekEnd}  [→]  [Heute]
```
(Week number is nice-to-have; if computing ISO week number is painful, just show the date range.)

---

## Task 4 — CalendarCell Component

**File:** `apps/web/app/admin/calendar/CalendarCell.tsx`

`"use client"` at top.

Props: `{ day: CalendarDay }`

**Local state:**
```typescript
const [expanded, setExpanded] = useState(false);
```

**Content:**
- If `day.bookings.length === 0`: render muted "—" or empty placeholder
- Otherwise: booking cards list

**Booking card:**
- Left border 3px in status color (see color table below)
- Top: `appointmentTime` bold
- Middle: `customerName` truncated to 1 line
- Bottom: `serviceName ?? ""` small, muted, truncated
- If `status === "cancelled"`: text gets `line-through`
- Card is clickable but no handler in this sprint (no `onClick` prop, no console.log — V2-4 will wire it)

**Status colors (only in this component, not shared):**

| Status | Color |
|---|---|
| confirmed | `#059669` |
| pending | `#D97706` |
| reminded | `#D97706` |
| completed | `#6B7280` |
| cancelled | `#6B7280` |
| no_show | `#DC2626` |
| rescheduled | `#6B7280` |

**Overflow handling:**
- Cell has `max-height: 400px` on desktop, `overflow-y: auto`
- If `day.bookings.length > 3` and `!expanded`: show first 3 + a button `+{count - 3} daha`
- Clicking the button: `setExpanded(true)` → all bookings render in the cell
- When `expanded === true`: no button, all bookings visible

---

## Task 5 — Sidebar Nav Item

**File:** `apps/web/components/admin/Sidebar.tsx`

Read the file. Add one item right after "Front Desk":
- Label: `"Takvim"`
- Href: `/admin/calendar`
- Icon: match the icon style V2-1 and V2-2 used (text icon like 📅 if lucide-react is not installed, otherwise `Calendar` from lucide-react). V2-2 used text icons — follow that.

Do not reorder existing items. Use the same active-state pattern.

---

## Task 6 — Tests

**File:** `apps/web/__tests__/calendar-api.test.ts`

Mirror the mocking pattern in `apps/web/__tests__/front-desk-api.test.ts` and `client-profile-api.test.ts`. Read both first.

**8 test cases:**

1. **Empty week** — mock query returns `[]`. Assert `totalBookings === 0`, `days.length === 7`, every day has `bookings: []`.

2. **Always 7 days** — even with empty bookings, assert `days.length === 7` exactly.

3. **Booking assigned to correct day** — mock 1 booking with `appointmentAt: "2026-04-08T10:00:00.000Z"` (Wednesday in Vienna). Assert `days[2].bookings.length === 1` and `days[0].bookings.length === 0`.

4. **isToday calculation** — use `vi.useFakeTimers()` + `vi.setSystemTime(new Date("2026-04-08T12:00:00Z"))`. Call handler with no `weekStart`. Assert `days[2].isToday === true` (Wednesday) and other days `isToday === false`. Clean up with `vi.useRealTimers()` in `afterEach`.

   **Note on timezone robustness:** `vi.setSystemTime` affects `Date.now()` but not timezone. Since the test is run on any machine, use the returned `days[2].date` to verify it's "2026-04-08" (the mocked today in Vienna). If the test runs in a machine whose local timezone causes the Vienna date to shift, the test should still pass because we compare against `formatDateVienna(new Date())` internally. If this is fragile in CI, use a fixed UTC time (like `12:00:00Z`) which is safely mid-day in Vienna regardless of DST.

5. **appointmentTime timezone** — mock `appointmentAt: "2026-04-08T12:30:00.000Z"`. Vienna UTC+2 in April → assert the resulting booking has `appointmentTime === "14:30"`.

6. **weekEnd correct** — call with `weekStart: "2026-04-06"` (Monday). Assert `weekStart === "2026-04-06"` and `weekEnd === "2026-04-12"` (Sunday).

7. **Unauthorized** — call handler without admin auth. Assert HTTP 401.

8. **Invalid weekStart** — call with `weekStart: "not-a-date"`. Assert HTTP 400.

No `.skip`, no `.todo`. All 8 must pass.

---

## Verification — Must Pass Before Commit

Run in this order. Stop on first failure. Do NOT commit if any check fails.

1. `pnpm typecheck` → 0 errors
2. `pnpm test` → **247/247 passing** (239 + 8 new). If different, report which tests were added or broken.
3. `pnpm --filter @beauty/web build` → clean build
4. `pnpm dev` → manual smoke checks:
   - `http://localhost:3030/admin/calendar` renders, 7 day columns visible
   - Today's column highlighted
   - `[←]` navigates to previous week, URL updates to `?weekStart=...`
   - `[→]` navigates to next week, URL updates
   - `[Heute]` button navigates back to current week (or disabled if already there)
   - Loading state briefly shows during navigation
   - If DB has bookings for the week, they appear in correct day columns with correct times
   - Empty week renders without crashing
   - 375px mobile view: days stack vertically, no horizontal scroll
   - `curl http://localhost:3030/api/admin/calendar` without auth → 401
   - Sidebar has "Takvim" link, active state works

If any manual check fails, stop and report. Do not commit.

---

## Commit — Two Commits

**Commit 1 — feature:**
```bash
git add .
git status
git commit -m "feat(admin): V2-3 weekly calendar view + API route + 8 tests"
git push
```

**Commit 2 — CLAUDE.md:**

Append to the V2 Sprints section in `CLAUDE.md`:

```markdown
### V2-3: Admin Weekly Calendar — COMPLETED
- New endpoint: GET /api/admin/calendar
- New page: /admin/calendar (7-day grid, URL-synced navigation)
- No external calendar libraries — pure CSS Grid
- Mobile: vertical day stack
- Staff dimension deferred to V2-6
- Tests: 247/247 (239 + 8 new)
- No schema changes, no packages/ changes
```

```bash
git add CLAUDE.md
git commit -m "docs: log V2-3 completion in CLAUDE.md"
git push
git log --oneline -5
```

---

## Acceptance Criteria — Report Back On Each

- [ ] `GET /api/admin/calendar` returns Zod-validated response with exactly 7 days
- [ ] 401 without admin auth
- [ ] 400 on invalid weekStart
- [ ] Empty days have `bookings: []`, never null
- [ ] `isToday` correctly flagged on today's day
- [ ] `weekStart`/`weekEnd` correctly computed (Mon–Sun)
- [ ] `force-dynamic` set on route AND page
- [ ] `/admin/calendar` page renders 7-column grid on desktop
- [ ] Mobile stacks vertically, no horizontal overflow
- [ ] `[←]` / `[→]` navigate with URL sync
- [ ] `[Heute]` button works (or disabled when on current week)
- [ ] Loading state visible during navigation
- [ ] Booking cards show time, name, service, status color border
- [ ] Cancelled bookings have line-through
- [ ] Day cells with >3 bookings show `+X daha` expand button
- [ ] Expand state persists per cell until page change
- [ ] Sidebar has "Takvim" link, active state works
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` → 247/247
- [ ] `pnpm --filter @beauty/web build` clean
- [ ] No `packages/**` modified
- [ ] No existing admin route/page modified
- [ ] Both commits pushed

---

## Report Back

1. Exact test count
2. Any deviation from these instructions and why
3. Whether the `services` join worked or fell back to `null`
4. How ISO week computation edge cases were handled (Sunday at week boundary)
5. Manual smoke check results
6. Both commit hashes
7. Any fragility noticed in Test 4 (`isToday`) timezone mocking — especially if it might break in a different CI timezone
