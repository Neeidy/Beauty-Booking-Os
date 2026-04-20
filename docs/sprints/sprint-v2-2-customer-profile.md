# Sprint V2-2: Customer Profile + History

**Backend status:** Mostly frozen. This sprint adds ONE new API route and ONE new admin page. Modify only `apps/web/components/admin/Sidebar.tsx` and `apps/web/app/admin/leads/page.tsx` (or its child components). Do NOT touch `packages/**` or DB schema.

---

## Context

V2-1 added the Front Desk kanban. V2-2 adds a customer profile page. From the leads list, clicking "Profili Gör" opens `/admin/clients/[identifier]` which shows that customer's info, lifetime stats, and full booking history.

The admin panel lives in `apps/web/app/admin`. Tests live in `apps/web/__tests__`.

**Schema verified (from `packages/db/src/schema.ts`):**

`leads` table fields used in this sprint:
- `id` (uuid, PK)
- `clientId` (uuid)
- `customerName` (text)
- `customerEmail` (text, nullable)
- `customerPhone` (text, nullable)
- `language` (text, default `"de"`)
- `createdAt` (timestamp)

`bookings` table fields used in this sprint:
- `id` (uuid, PK)
- `clientId` (uuid)
- `leadId` (uuid, references `leads.id`) — this is the join key
- `serviceId` (uuid, references `services.id`)
- `customerName` (text, denormalized)
- `customerContact` (text, denormalized)
- `appointmentAt` (timestamp)
- `durationMinutes` (integer)
- `status` (bookingStatusEnum)
- `notes` (text, nullable)
- `createdAt` (timestamp)

**Important:** Use `bookings.leadId → leads.id` as the join. Do NOT join on `customerPhone` directly — phone numbers can be edited and we want stable history.

**Already verified:**
- Auth: `import { isAdminApiAuthenticated } from "@/lib/admin-auth"`
- DB: `import { getDb, leads, bookings, services } from "@beauty-booking/db"` (or whatever the existing front-desk route imports — match it exactly)
- No timezone library — use native `Intl.DateTimeFormat` with `timeZone: "Europe/Vienna"`
- Existing CSS vars: `--color-background`, `--color-primary`, `--color-secondary`, `--color-accent`, `--color-text`, `--color-text-muted`. Do NOT invent new ones.

---

## Files To Create

1. `apps/web/app/api/admin/clients/[identifier]/route.ts`
2. `apps/web/app/admin/clients/[identifier]/page.tsx`
3. `apps/web/app/admin/clients/[identifier]/ClientProfileView.tsx`
4. `apps/web/__tests__/client-profile-api.test.ts`

## Files To Modify

1. `apps/web/components/admin/Sidebar.tsx` — add "Müşteriler" nav item linking to `/admin/leads`
2. `apps/web/app/admin/leads/page.tsx` (or its child table component if there is one) — add "Profili Gör" link to each row

## Files That Must NOT Be Touched

- Anything under `packages/**`
- `apps/web/app/api/admin/front-desk/route.ts`
- `apps/web/app/api/admin/bookings/route.ts`
- DB schema or migrations
- `globals.css`, `tailwind.config.ts`

---

## Identifier Resolution Strategy

The dynamic route segment `[identifier]` can be either:
- A UUID (lead.id) — matches `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- A phone number — anything else

When generating the link from the leads list:
- If `lead.customerPhone` is non-empty, use `encodeURIComponent(lead.customerPhone)`
- Else use `lead.id`

When the API receives `[identifier]`, it must:
1. `decodeURIComponent(identifier)` first
2. Test against the UUID regex
3. UUID → query `WHERE leads.id = decoded`
4. Non-UUID → query `WHERE leads.customerPhone = decoded`
5. Always lowercase phone digits-only normalization is NOT done in this sprint — use exact string match. Phone normalization is a future concern; document this in the final report.

---

## Task 1 — API Route

**File:** `apps/web/app/api/admin/clients/[identifier]/route.ts`

**Handler:** `GET /api/admin/clients/[identifier]`

**Force dynamic** at the top of the file:
```typescript
export const dynamic = "force-dynamic";
```

**Auth:** First line of handler:
```typescript
if (!isAdminApiAuthenticated(request)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Params shape (Next.js 15):**
```typescript
{ params }: { params: Promise<{ identifier: string }> }
```
Then `const { identifier } = await params;`

**Logic:**

1. `const decoded = decodeURIComponent(identifier);`
2. `const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded);`
3. **Customer lookup:**
   - UUID → `SELECT * FROM leads WHERE id = decoded ORDER BY createdAt ASC LIMIT 1`
   - Phone → `SELECT * FROM leads WHERE customerPhone = decoded ORDER BY createdAt ASC LIMIT 1`
   - If no rows: return the empty-customer response (see below). HTTP 200, NOT 404.
4. **Find all related lead ids:**
   - If we found a customer by phone, there may be multiple leads with the same phone (returning customer creates multiple leads over time). Get ALL of them:
     - `SELECT id FROM leads WHERE customerPhone = customer.customerPhone` (only if customer.customerPhone is non-empty)
   - If we found by UUID, just use `[customer.id]`
5. **Bookings query:**
   - `SELECT bookings.*, services.name AS serviceName FROM bookings LEFT JOIN services ON bookings.serviceId = services.id WHERE bookings.leadId IN (allLeadIds) ORDER BY appointmentAt DESC`
   - If services join fails (table missing or relation broken), fall back to `serviceName: null` for all rows. Catch the error, log to console, do not crash.
6. **Compute summary:**
   ```typescript
   const totalBookings = bookings.length;
   const completedBookings = bookings.filter(b => b.status === "completed").length;
   const cancelledBookings = bookings.filter(b => b.status === "cancelled").length;
   const noshowCount = bookings.filter(b => b.status === "noshow").length;
   const showRate = totalBookings === 0 ? 0 : completedBookings / totalBookings;
   ```
7. **firstSeenAt:** the earliest `createdAt` across all matched leads.

**Response shape (validate with Zod, then return):**

```typescript
{
  identifier: string,
  customer: {
    name: string | null,
    email: string | null,
    phone: string | null,
    language: string | null,
    firstSeenAt: string  // ISO
  } | null,
  summary: {
    totalBookings: number,
    completedBookings: number,
    cancelledBookings: number,
    noshowCount: number,
    showRate: number
  },
  bookings: ClientBooking[]
}

type ClientBooking = {
  id: string,
  appointmentAt: string,       // ISO UTC
  appointmentTime: string,     // "HH:mm" Europe/Vienna
  status: string,
  serviceName: string | null,
  durationMinutes: number,
  notes: string | null,
  createdAt: string             // ISO UTC
}
```

**Empty-customer response (when no customer found):**
```typescript
{
  identifier: <decoded>,
  customer: null,
  summary: { totalBookings: 0, completedBookings: 0, cancelledBookings: 0, noshowCount: 0, showRate: 0 },
  bookings: []
}
```

**Logging:** If the existing front-desk route logs to `event_logs`, do the same here. If not, skip and note it in the report. Match the pattern; do not invent.

**Errors:** Wrap the DB section in try/catch. On any DB error, return `500 { error: "Internal server error" }` and log to `console.error`.

---

## Task 2 — Leads Page "Profili Gör" Link

**File:** `apps/web/app/admin/leads/page.tsx` (and its child table component if one exists — read first to find out)

1. Read the file. Find the row rendering for each lead.
2. Add a new action button/link in the row's action area (the same area where existing actions like "Eskaliyere" or "Status ändern" might live):
   - Label: `"Profili Gör"`
   - Href:
     ```typescript
     lead.customerPhone && lead.customerPhone.length > 0
       ? `/admin/clients/${encodeURIComponent(lead.customerPhone)}`
       : `/admin/clients/${lead.id}`
     ```
   - Style: ghost / link button — match the visual weight of existing row actions, do NOT make it the primary action
3. Do NOT modify any existing column, sort, filter, or action.

---

## Task 3 — Client Profile Page (Server Component)

**File:** `apps/web/app/admin/clients/[identifier]/page.tsx`

```typescript
export const dynamic = "force-dynamic";
```

- Server component (no `"use client"`)
- Params: `{ params }: { params: Promise<{ identifier: string }> }` then `await params`
- Fetch `/api/admin/clients/${encodeURIComponent(identifier)}` server-side. Use the same fetch pattern as the existing `apps/web/app/admin/bookings/page.tsx` or `apps/web/app/admin/front-desk/page.tsx` — read one of them first and copy the pattern, including how it forwards admin auth to its own API.
- If fetch throws or returns non-2xx: render an error block "Profil yüklenemedi" and a back link to `/admin/leads`. Do not crash.
- If `data.customer === null`: render a centered message "Müşteri bulunamadı" and a back link.
- Otherwise render `<ClientProfileView data={data} />`.

---

## Task 4 — ClientProfileView (Client Component)

**File:** `apps/web/app/admin/clients/[identifier]/ClientProfileView.tsx`

`"use client"` at the top.

Props: `{ data: ClientProfileResponse }` (the same shape the API returns).

**Layout sections (top to bottom):**

### Back link (top-left)
```
← Müşterilere Dön
```
Links to `/admin/leads`.

### Section 1 — Customer info card
- Customer name (large, bold) — `data.customer.name ?? "Unbekannt"`
- Phone (if present)
- Email (if present)
- Language label (if present): `de → "Almanca"`, `tr → "Türkçe"`, `en → "İngilizce"`, fallback: raw value
- "Müşteri Since: {date}" where date is `data.customer.firstSeenAt` formatted via `Intl.DateTimeFormat("de-AT", { day: "numeric", month: "long", year: "numeric" })`

### Section 2 — Summary stat cards (4 cards)
Grid: 4 columns on `md+`, 2x2 on mobile.
- "Toplam Randevu" → `summary.totalBookings`
- "Tamamlanan" → `summary.completedBookings`
- "İptal" → `summary.cancelledBookings`
- "Gelmedi" → `summary.noshowCount`

Below the cards (small muted text): `"Show rate: {Math.round(summary.showRate * 100)}%"` — only if `totalBookings > 0`.

### Section 3 — Booking history table
Columns: `Tarih/Saat | Hizmet | Süre | Durum`

Date/time cell:
```
Intl.DateTimeFormat("de-AT", { day: "numeric", month: "short" }).format(new Date(b.appointmentAt))
+ " " + b.appointmentTime
```

Service cell: `b.serviceName ?? "—"`

Duration cell: `${b.durationMinutes} dk`

Status badge — German label + color (inline style or Tailwind):

| Status | Label | Color |
|---|---|---|
| pending | Bekliyor | #D97706 |
| reminded | Hatırlatıldı | #D97706 |
| confirmed | Onaylandı | #059669 |
| completed | Tamamlandı | #059669 |
| cancelled | İptal | #6B7280 |
| noshow | Gelmedi | #DC2626 |
| rescheduled | Yeniden Planlandı | #6B7280 |

Empty state (`bookings.length === 0`): centered "Henüz randevu bulunmuyor".

**Styling:** Match the visual language of the existing admin pages. Read `apps/web/components/admin/BookingTable.tsx` and use the same Tailwind/CSS approach. Use only the existing CSS vars. Do not invent new ones.

---

## Task 5 — Sidebar Nav Item

**File:** `apps/web/components/admin/Sidebar.tsx`

Add one item, in a sensible position (after "Front Desk", before "Logs" if it exists):
- Label: `"Müşteriler"`
- Href: `/admin/leads` (this is intentional — the customer list IS the leads page; the dedicated `/admin/clients/[id]` page is only reached via "Profili Gör")
- Icon: `Users` from `lucide-react` (or whatever icon library V2-1 used — match exactly)

Do not reorder existing items. Use the same active-state pattern.

---

## Task 6 — Tests

**File:** `apps/web/__tests__/client-profile-api.test.ts`

Mirror the mocking pattern in `apps/web/__tests__/front-desk-api.test.ts`. Read that file first.

**8 test cases:**

1. **Unknown identifier (UUID format)** — mock leads query returns `[]`. Assert `customer === null`, all summary fields are 0, `bookings === []`, HTTP 200.
2. **UUID identifier finds customer** — mock returns 1 lead `{ id: "...", customerName: "Anna Müller", ... }`. Assert `customer.name === "Anna Müller"`.
3. **Phone identifier finds customer** — mock returns 1 lead by phone. Assert `customer.phone` matches and customer is non-null.
4. **Summary computation** — mock bookings: 3 completed, 1 cancelled, 1 noshow. Assert `totalBookings === 5, completedBookings === 3, cancelledBookings === 1, noshowCount === 1`.
5. **showRate calculation** — mock 4 bookings, 2 completed. Assert `showRate === 0.5`.
6. **Zero division guard** — mock empty bookings. Assert `showRate === 0`, no exception.
7. **Timezone conversion for appointmentTime** — mock `appointmentAt: "2026-04-08T12:30:00.000Z"`. Vienna in April is UTC+2 → assert `appointmentTime === "14:30"`.
8. **Unauthorized** — call handler without admin auth. Assert HTTP 401.

No `.skip`, no `.todo`. All 8 must pass.

---

## Verification — Must Pass Before Commit

Run in this order. Stop on the first failure. Do NOT commit if any check fails.

1. `pnpm typecheck` → 0 errors
2. `pnpm test` → **239/239 passing** (231 existing + 8 new). If different, report which tests were added or broken.
3. `pnpm --filter @beauty/web build` → clean build
4. `pnpm dev` → manual smoke checks:
   - `GET http://localhost:3030/admin/leads` shows "Profili Gör" link on each row
   - Click → navigates to `/admin/clients/<encoded>`
   - Profile page renders customer info card, 4 stat cards, history table or empty state
   - Unknown identifier (`/admin/clients/00000000-0000-0000-0000-000000000000`) shows "Müşteri bulunamadı", no crash
   - "← Müşterilere Dön" returns to `/admin/leads`
   - 375px mobile: no horizontal overflow on profile page
   - `curl http://localhost:3030/api/admin/clients/test-id` (no auth) → 401
   - Sidebar shows "Müşteriler" link

If any manual check fails, stop and report. Do not commit.

---

## Commit (Two Commits)

**Commit 1 — feature:**
```bash
git add .
git status
git commit -m "feat(admin): V2-2 customer profile + history page + 8 tests"
git push
```

**Commit 2 — CLAUDE.md update:**

Append to the V2 Sprints section in `CLAUDE.md`:

```markdown
### V2-2: Customer Profile + History — COMPLETED
- New endpoint: GET /api/admin/clients/[identifier]
- New page: /admin/clients/[identifier]
- "Profili Gör" link added to leads list
- Multi-lead aggregation by phone (same customer, multiple leads over time)
- Tests: 239/239 (231 + 8 new)
- No schema changes, no packages/ changes
```

```bash
git add CLAUDE.md
git commit -m "docs: log V2-2 completion in CLAUDE.md"
git push
git log --oneline -5
```

---

## Acceptance Criteria — Report Back On Each

- [ ] `GET /api/admin/clients/[identifier]` returns Zod-validated response
- [ ] 401 without admin auth
- [ ] Unknown identifier → 200 with `customer: null`
- [ ] showRate has no division-by-zero
- [ ] UUID identifier path works
- [ ] Phone identifier path works (URL-decoded correctly)
- [ ] Multi-lead aggregation works (same phone, multiple leads → all bookings shown)
- [ ] `force-dynamic` set on both route and page
- [ ] `/admin/clients/[id]` page renders all 3 sections
- [ ] Customer info card shows correct labels and language translation
- [ ] 4 stat cards render with correct values
- [ ] Booking history table shows correct German status labels and colors
- [ ] Empty bookings → "Henüz randevu bulunmuyor"
- [ ] Unknown customer → "Müşteri bulunamadı"
- [ ] Back link works
- [ ] `/admin/leads` rows have "Profili Gör" link
- [ ] Sidebar has "Müşteriler" link
- [ ] Mobile 375px clean
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` → 239/239
- [ ] `pnpm --filter @beauty/web build` clean
- [ ] No `packages/**` modified
- [ ] No existing admin route modified
- [ ] Both commits pushed

---

## Report Back

1. Exact test count
2. Any deviation and why
3. Whether `event_logs` was wired (depends on existing route pattern)
4. Whether the `services` join worked
5. Manual smoke check results
6. Both commit hashes
7. Any phone-format edge case noticed (e.g. `+43 1 234 5678` vs `+4312345678` matching) — note for future normalization sprint
