# Sprint V2-1: Admin Front Desk View (Kanban Board)

**Backend status:** Mostly frozen. This sprint adds ONE new API route and ONE new admin page. Do NOT modify `packages/**`, existing `/api/admin/bookings/route.ts`, or the database schema.

---

## Context

Admin panel currently has a bookings list view. We are adding a second view: a 3-column Kanban board at `/admin/front-desk` that groups today's bookings by status. The existing bookings list stays untouched — this is additive.

The admin panel lives inside `apps/web`, not a separate `apps/admin` package. All paths in this sprint are under `apps/web`.

**Already verified in the repo:**
- `PATCH /api/booking/[id]/status` exists — use it, do not modify it
- Admin auth: `import { isAdminApiAuthenticated } from "@/lib/admin-auth"` — call it at the top of every admin route
- Drizzle imports: `import { getDb, bookings } from "@beauty-booking/db"` and operators from `"drizzle-orm"`
- Default client id env var: `DEMO_CLIENT_ID` (fallback `"00000000-0000-0000-0000-000000000000"` — see existing `apps/web/app/api/admin/bookings/route.ts`)
- No timezone library installed — use native `Intl.DateTimeFormat` with `timeZone: "Europe/Vienna"`
- Existing CSS custom properties: `--color-background`, `--color-primary`, `--color-secondary`, `--color-accent`, `--color-text`, `--color-text-muted`. Do NOT invent new CSS vars.

---

## Files To Create

1. `apps/web/app/api/admin/front-desk/route.ts` — new API route
2. `apps/web/app/admin/front-desk/page.tsx` — server component, fetches data
3. `apps/web/app/admin/front-desk/FrontDeskBoard.tsx` — client component, 3-column board
4. `apps/web/app/admin/front-desk/BookingCard.tsx` — client component, individual card
5. `apps/web/__tests__/front-desk-api.test.ts` — Vitest unit tests (6 tests)

## Files To Modify

1. `apps/web/components/admin/Sidebar.tsx` — add "Front Desk" nav item

## Files That Must NOT Be Touched

- Anything under `packages/**`
- `apps/web/app/api/admin/bookings/route.ts`
- `apps/web/app/api/booking/[id]/status/route.ts`
- `apps/web/app/globals.css`
- `apps/web/tailwind.config.ts`
- Database schema or migrations

---

## Task 1 — API Route

**File:** `apps/web/app/api/admin/front-desk/route.ts`

**Handler:** `GET /api/admin/front-desk`

**Query params:**
- `date?: string` — ISO date like `"2026-04-08"`. Default: today in Europe/Vienna.
- `clientId?: string` — UUID. Default: `process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000"`.

**Auth:** First line of handler — `if (!isAdminApiAuthenticated(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });`

**Validation:** If `date` param is present, validate it's a `YYYY-MM-DD` format. If invalid, return `NextResponse.json({ error: "Invalid date format" }, { status: 400 })`.

**Query logic:**
- Compute start-of-day and end-of-day for the requested date in Europe/Vienna, converted to UTC for the DB query. Use native `Intl.DateTimeFormat` for timezone math. If this gets complex, a 10-line helper at the top of the file is fine — do NOT pull in a library.
- LEFT JOIN `bookings` with `services` on `bookings.serviceId = services.id` to get `serviceName`. Check the existing `packages/db/src/schema.ts` imports to confirm the `services` table and relation exist; if either is missing, return `serviceName: null` for all rows and log a warning in the response (do NOT crash).
- Filter: `clientId` match, `appointmentAt >= startOfDay`, `appointmentAt <= endOfDay`
- Order: `appointmentAt ASC`

**Response shape (return exactly this):**

```typescript
{
  date: string,          // "2026-04-08"
  totalBookings: number,
  columns: {
    unconfirmed: FrontDeskBooking[],  // status in ["pending", "reminded"]
    confirmed:   FrontDeskBooking[],  // status === "confirmed"
    completed:   FrontDeskBooking[]   // status in ["completed", "noshow", "cancelled"]
  }
}

type FrontDeskBooking = {
  id: string;
  customerName: string;
  customerContact: string;       // phone if present else email else ""
  appointmentAt: string;         // ISO UTC string from DB
  appointmentTime: string;       // "HH:mm" in Europe/Vienna — use Intl.DateTimeFormat
  durationMinutes: number;
  status: string;
  serviceName: string | null;
  notes: string | null;
  createdAt: string;
}
```

Empty columns must be `[]`, never `null` or `undefined`.

**Logging:**
- On success, write one row to `event_logs` with `eventType: "api_call"`, `agentName: "front-desk-api"`, short input summary (`{ date, clientId }`), output summary (`{ totalBookings }`), status `"success"`. Mirror the pattern used in `apps/web/app/api/admin/bookings/route.ts` — if that file doesn't log to `event_logs`, skip logging here too and note it in the final report.
- On DB error, write `eventType: "error"`, `status: "error"`, include error message, return `500 { error: "Internal server error" }`.

**Zod:** Define a Zod schema for the response and parse the final object through it before returning. If parse fails, return 500 and log the zod error.

---

## Task 2 — Sidebar Nav Item

**File:** `apps/web/components/admin/Sidebar.tsx`

1. Read the current file. Identify the existing nav items array (or JSX list, whichever pattern is used).
2. Add one new item **in a reasonable position** (after the main bookings/leads link, before logs/escalations if those exist):
   - Label: `"Front Desk"`
   - Href: `/admin/front-desk`
   - Icon: use the same icon library the existing items use. If it's `lucide-react`, use `LayoutGrid`. If it's something else, match it.
3. Do NOT reorder or modify existing items.
4. Active state must use the same pattern as the other items.

---

## Task 3 — Front Desk Page (Server Component)

**File:** `apps/web/app/admin/front-desk/page.tsx`

- Server component (no `"use client"`)
- Compute today's date in Europe/Vienna as `YYYY-MM-DD`
- Fetch `/api/admin/front-desk?date=<today>` server-side (use absolute URL from `process.env.NEXT_PUBLIC_APP_URL` or a relative fetch with proper config — match the pattern used by other admin pages like `apps/web/app/admin/bookings/page.tsx`)
- Forward the admin auth — whatever pattern the other admin pages use to call protected APIs, use the same
- Page title: `Front Desk — {formatted German date}` where the date is formatted with `Intl.DateTimeFormat("de-AT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })`
- If fetch fails, render a simple error block: "Daten konnten nicht geladen werden" — do NOT crash
- Pass the fetched data to `<FrontDeskBoard initialData={...} />`

---

## Task 4 — FrontDeskBoard Component

**File:** `apps/web/app/admin/front-desk/FrontDeskBoard.tsx`

- `"use client"`
- Props: `{ initialData: FrontDeskResponse }`
- State: `const [columns, setColumns] = useState(initialData.columns)`
- No drag-and-drop. No external libraries. Status changes happen via buttons on each card.

**Layout:**
- 3 columns side-by-side on `md+` screens, stacked vertically on mobile (`< md`)
- Each column has a header with title + count badge, then a scrollable list of cards
- Column headers:
  - `"Onaylanmadı"` — badge background `#D97706`
  - `"Onaylandı"` — badge background `#059669`
  - `"Tamamlandı"` — badge background `#6B7280`
- Column container background: `var(--color-accent)` (warm beige — existing token)
- Card background: `var(--color-background)` (near-white — existing token)
- Page background: use whatever the existing admin pages use (check `apps/web/app/admin/bookings/page.tsx`)

**Empty state:** If `initialData.totalBookings === 0`, show a single centered message "Heute keine Termine" instead of the board.

**Status update handler:**
- Prop drilled to `BookingCard`: `onStatusChange(bookingId: string, newStatus: string, fromColumn: "unconfirmed" | "confirmed" | "completed")`
- Optimistic: remove card from source column, insert into target column, re-render
- Fire `PATCH /api/booking/${bookingId}/status` with `{ status: newStatus }`
- On failure: rollback (revert the state), `console.error` the failure, show a brief inline error (a transient banner or simple alert — keep it lightweight)

---

## Task 5 — BookingCard Component

**File:** `apps/web/app/admin/front-desk/BookingCard.tsx`

- `"use client"`
- Props: `{ booking: FrontDeskBooking, column: "unconfirmed" | "confirmed" | "completed", onStatusChange: (...) => Promise<void> }`

**Card content:**
- Time (large, bold): `booking.appointmentTime`
- Customer name
- Service name if present, else italic muted `"Hizmet belirtilmemiş"`
- Duration: `{durationMinutes} dk`
- Contact (truncate with ellipsis if too long)
- Notes if present (small, muted, max 2 lines with ellipsis)

**Action buttons by column:**
- `unconfirmed` → `[Onayla]` (sets status to `"confirmed"`) + `[İptal]` ghost style (sets to `"cancelled"`)
- `confirmed` → `[Tamamlandı]` (sets to `"completed"`) + `[Gelmedi]` ghost style (sets to `"noshow"`)
- `completed` → no action buttons

**Loading state:** When a button is clicked, disable it and show a simple spinner or text "...". Re-enable after the parent's `onStatusChange` promise resolves.

**Styling:** Use existing CSS vars (`--color-primary`, `--color-secondary`, `--color-text`, `--color-text-muted`). Match the visual language of `apps/web/components/admin/BookingTable.tsx`.

---

## Task 6 — Tests

**File:** `apps/web/__tests__/front-desk-api.test.ts`

Mirror the mocking pattern used in the existing admin API tests (check `apps/web/__tests__/` for existing test files that mock Drizzle — use the same approach).

**6 test cases:**

1. **Empty day** — mock query returns `[]`. Assert `totalBookings === 0`, all three columns are `[]`.
2. **Status grouping** — mock returns 3 bookings with statuses `"pending"`, `"confirmed"`, `"completed"`. Assert each lands in the correct column.
3. **`"reminded"` → unconfirmed** — mock returns 1 booking with `status: "reminded"`. Assert it's in `columns.unconfirmed`, not in `confirmed`.
4. **`"noshow"` → completed** — mock returns 1 booking with `status: "noshow"`. Assert it's in `columns.completed`.
5. **`appointmentTime` timezone** — mock returns `appointmentAt: "2026-04-08T12:30:00.000Z"`. Europe/Vienna is UTC+2 in April → assert `appointmentTime === "14:30"`.
6. **Unauthorized** — call handler without admin auth. Assert response status is `401`.

All tests must pass. Do not use `.skip` or `.todo`.

---

## Verification — Must Pass Before Commit

Run in this order. Stop on the first failure.

1. `pnpm typecheck` → 0 errors
2. `pnpm test` → **231/231 passing** (225 existing + 6 new). If the count is different, report which tests were added or broken.
3. `pnpm --filter @beauty/web build` → clean build
4. Start dev server: `pnpm dev`
5. Manual smoke checks (report results in the final message):
   - `GET http://localhost:3030/admin/front-desk` renders without crashing
   - If DB has no bookings for today, empty state "Heute keine Termine" shows
   - If DB has bookings, 3 columns render with correct grouping
   - Sidebar shows the new "Front Desk" link, clicking it navigates correctly
   - `curl http://localhost:3030/api/admin/front-desk` without auth returns 401

If any manual check fails, stop and report. Do not commit.

---

## Commit

Single commit at the end:

```
git add .
git status
git commit -m "feat(admin): V2-1 front desk kanban board + API route + 6 tests"
git push
git log --oneline -3
```

---

## CLAUDE.md Update

After push succeeds, append this section to `CLAUDE.md` in the appropriate place (find the existing sprint log section and add to it):

```markdown
### V2-1: Admin Front Desk Kanban — COMPLETED
- New page: /admin/front-desk (3-column kanban)
- New endpoint: GET /api/admin/front-desk
- Columns: Onaylanmadı / Onaylandı / Tamamlandı
- Status updates via existing PATCH /api/booking/[id]/status
- Tests: 231/231 (225 + 6 new)
- No schema changes, no package/ changes
```

Commit the CLAUDE.md update as a separate tiny commit:

```
git add CLAUDE.md
git commit -m "docs: log V2-1 completion in CLAUDE.md"
git push
```

---

## Acceptance Criteria — Report Back On Each

- [ ] `GET /api/admin/front-desk` returns correctly shaped response, validated by Zod
- [ ] 401 without admin auth
- [ ] 400 on invalid date format
- [ ] Empty columns are `[]`, never null
- [ ] `serviceName` is null-safe
- [ ] `/admin/front-desk` page renders, 3 columns visible
- [ ] Optimistic status updates work, rollback on API failure
- [ ] Sidebar has Front Desk link, active state works
- [ ] Mobile (375px) stacks vertically without overflow
- [ ] `completed` column has no action buttons
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` → 231/231
- [ ] `pnpm --filter @beauty/web build` clean
- [ ] No file under `packages/**` modified
- [ ] No existing admin route modified
- [ ] Both commits pushed to origin

---

## What To Report After Execution

1. Test count (exact: X/X)
2. Any deviation from these instructions and why
3. Whether `event_logs` logging was wired (it depends on whether the existing bookings route logs — if not, you skipped it)
4. Whether the `services` table join worked or fell back to `serviceName: null`
5. Output of the manual smoke checks
6. Both commit hashes
