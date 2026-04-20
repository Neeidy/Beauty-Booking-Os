# Sprint V2-10: Rebooking Hatırlatması

**Backend status:** `packages/**` FROZEN. `apps/web/**` only.
**DB schema:** NO changes. No migrations.
**Test baseline:** 282/282 (V2-9 complete)
**Hedef:** 290/290 (+8 yeni test)

---

## CURRENT STATE

```
apps/web/lib/load-client-config.ts              → MEVCUT — rebookingWeeks type eklenecek
clients/demo-salon/client.config.json           → MEVCUT — rebookingWeeks field eklenecek
apps/web/app/api/jobs/rebooking/route.ts        → YOK — yeni
apps/web/app/api/admin/rebooking/route.ts       → YOK — yeni
apps/web/app/admin/rebooking/page.tsx           → YOK — yeni (server component shell)
apps/web/app/admin/rebooking/RebookingView.tsx  → YOK — yeni (client component)
apps/web/components/admin/Sidebar.tsx           → MEVCUT — nav item eklenecek
apps/web/__tests__/rebooking-api.test.ts        → YOK — yeni (8 test)
```

**Schema'dan doğrulanmış (CLAUDE.md):**

```
bookings tablosu:
  id, clientId, leadId, serviceId, customerName, customerContact,
  appointmentAt, durationMinutes, status, reminderSentAt (jsonb),
  notes, cancelledAt, cancelReason, createdAt, updatedAt
  ← metadata field YOK — bookings.metadata diye bir şey yok

gdprConsents tablosu:
  id, clientId, leadId, consentType, granted (boolean),
  method, ipAddress, consentText, grantedAt, revokedAt (nullable)
  ← consentType values: "data_processing", "marketing", "reminder_messages"
  ← GDPR reminder kontrolü buradan — leadId join ile

automationJobs tablosu:
  id (defaultRandom), clientId, bookingId, leadId, jobType,
  scheduledAt, executedAt (nullable), status (jobStatusEnum default "scheduled"),
  attempts (default 0), maxAttempts (default 3), result (jsonb), error, createdAt
  ← executedAt nullable: scheduled job'larda null
  ← status default: "scheduled" — completed değil
```

**Kritik kararlar:**
- `bookings.metadata` yok → GDPR kontrolü `gdprConsents` tablosundan yapılır
- Join zinciri: `bookings.leadId` → `gdprConsents.leadId` (where ile)
- Job lifecycle: `status: "scheduled"`, `scheduledAt: now + weeks`, `executedAt: undefined/null`
- Bu sprint job planlar, mesaj göndermez — gönderim email entegrasyonunda olacak

---

## MANDATORY PRE-READ (bu sırayla, atlamadan)

```bash
# 1. automationJobs + gdprConsents export adları — camelCase mi?
grep -n "export const" packages/db/src/schema.ts | grep -i "gdpr\|automation\|jobs"

# 2. isNull Drizzle operator — mevcut kullanım var mı?
grep -rn "isNull" apps/web/app/api/ 2>/dev/null | head -5

# 3. Mevcut job route auth pattern — exact isAuthorized impl
cat apps/web/app/api/jobs/reviews/route.ts

# 4. V2-9 test mock pattern — makeSelectChain referans
cat apps/web/__tests__/reviews-api.test.ts | head -70

# 5. Sidebar mevcut son item
cat apps/web/components/admin/Sidebar.tsx

# 6. WaitingListView client component pattern referans
cat apps/web/app/admin/waiting-list/WaitingListView.tsx | head -50

# 7. client.config.json tam içerik
cat clients/demo-salon/client.config.json
```

> Dosya bulunamazsa STOP. Tahmin etme.

---

## IMPLEMENTATION PLAN

| Adım | Dosya | Durum |
|---|---|---|
| 1 | `apps/web/lib/load-client-config.ts` | MODİFİYE |
| 2 | `clients/demo-salon/client.config.json` | MODİFİYE |
| 3 | `apps/web/app/api/jobs/rebooking/route.ts` | YENİ |
| 4 | `apps/web/app/api/admin/rebooking/route.ts` | YENİ |
| 5 | `apps/web/app/admin/rebooking/page.tsx` | YENİ |
| 6 | `apps/web/app/admin/rebooking/RebookingView.tsx` | YENİ |
| 7 | `apps/web/components/admin/Sidebar.tsx` | MODİFİYE |
| 8 | `apps/web/__tests__/rebooking-api.test.ts` | YENİ |

---

## DOSYA 1 — `apps/web/lib/load-client-config.ts`

`ClientConfig` interface'ine ekle:

```typescript
rebookingWeeks?: number; // Default 4, runtime'da clamp(2, 12) uygulanır
```

---

## DOSYA 2 — `clients/demo-salon/client.config.json`

Mevcut JSON'a ekle:

```json
"rebookingWeeks": 4
```

---

## DOSYA 3 — `apps/web/app/api/jobs/rebooking/route.ts`

```typescript
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb, bookings, automationJobs, gdprConsents } from "@beauty-booking/db";
import { and, eq, isNull } from "drizzle-orm";
import { loadClientConfig } from "@/lib/load-client-config";

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // dev mode — V2-9 pattern
  return request.headers.get("x-webhook-secret") === secret;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let weeks = 4;
  try {
    const cfg = loadClientConfig();
    weeks = Math.max(2, Math.min(12, cfg.rebookingWeeks ?? 4));
  } catch {
    // config yüklenemezse default 4
  }

  // scheduledAt = şu an + rebookingWeeks — job gelecekteki bir hatırlatmayı temsil eder
  const scheduledAt = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  try {
    const db = getDb();

    const completedBookings = await db
      .select({
        id: bookings.id,
        leadId: bookings.leadId,
        customerName: bookings.customerName,
        customerContact: bookings.customerContact,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.clientId, CLIENT_ID),
          eq(bookings.status, "completed")
        )
      );

    const processed: string[] = [];
    const skippedConsent: string[] = [];
    const skippedDuplicate: string[] = [];
    const skippedNoLead: string[] = [];

    for (const b of completedBookings) {
      // leadId yoksa GDPR kontrolü yapılamaz
      if (!b.leadId) {
        skippedNoLead.push(b.id);
        continue;
      }

      // GDPR: gdprConsents tablosundan reminder_messages consent kontrolü
      const consent = await db
        .select({ id: gdprConsents.id })
        .from(gdprConsents)
        .where(
          and(
            eq(gdprConsents.leadId, b.leadId),
            eq(gdprConsents.consentType, "reminder_messages"),
            eq(gdprConsents.granted, true),
            isNull(gdprConsents.revokedAt)
          )
        )
        .limit(1);

      if (consent.length === 0) {
        skippedConsent.push(b.id);
        continue;
      }

      // Duplicate kontrolü
      const existing = await db
        .select({ id: automationJobs.id })
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.bookingId, b.id),
            eq(automationJobs.jobType, "rebooking_reminder")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        skippedDuplicate.push(b.id);
        continue;
      }

      // Insert: status="scheduled", executedAt=null (henüz çalışmadı)
      await db.insert(automationJobs).values({
        clientId: CLIENT_ID,
        bookingId: b.id,
        leadId: b.leadId,
        jobType: "rebooking_reminder",
        scheduledAt,
        status: "scheduled",
        attempts: 0,
        maxAttempts: 3,
        result: {
          rebookingWeeks: weeks,
          customerContact: b.customerContact,
          scheduledFor: scheduledAt.toISOString(),
          createdAt: now.toISOString(),
        },
      });

      processed.push(b.id);
    }

    return NextResponse.json({
      success: true,
      summary: {
        eligible: completedBookings.length,
        processed: processed.length,
        processedIds: processed,
        skippedConsent: skippedConsent.length,
        skippedDuplicate: skippedDuplicate.length,
        skippedNoLead: skippedNoLead.length,
        rebookingWeeks: weeks,
        scheduledFor: scheduledAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[/api/jobs/rebooking]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## DOSYA 4 — `apps/web/app/api/admin/rebooking/route.ts`

```typescript
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, automationJobs, bookings } from "@beauty-booking/db";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();

    const jobs = await db
      .select({
        id: automationJobs.id,
        bookingId: automationJobs.bookingId,
        scheduledAt: automationJobs.scheduledAt,
        executedAt: automationJobs.executedAt,
        status: automationJobs.status,
        result: automationJobs.result,
        customerName: bookings.customerName,
        customerContact: bookings.customerContact,
      })
      .from(automationJobs)
      .leftJoin(bookings, eq(automationJobs.bookingId, bookings.id))
      .where(eq(automationJobs.jobType, "rebooking_reminder"))
      .orderBy(desc(automationJobs.scheduledAt))
      .limit(50);

    return NextResponse.json({ success: true, jobs, count: jobs.length });
  } catch (err) {
    console.error("[GET /api/admin/rebooking]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const origin = request.nextUrl.origin;
    const res = await fetch(`${origin}/api/jobs/rebooking`, {
      method: "POST",
      headers: { "x-webhook-secret": process.env.WEBHOOK_SECRET ?? "" },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Job trigger failed", details: err },
        { status: 502 }
      );
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("[POST /api/admin/rebooking]", err);
    return NextResponse.json({ error: "Job trigger failed" }, { status: 500 });
  }
}
```

---

## DOSYA 5 — `apps/web/app/admin/rebooking/page.tsx`

Server component shell — interactivity `RebookingView`'de.

```typescript
export const dynamic = "force-dynamic";

import RebookingView from "./RebookingView";

export default function AdminRebookingPage(): JSX.Element {
  return (
    <main style={{ padding: "2rem", maxWidth: "1200px" }}>
      <h1
        style={{
          color: "var(--color-text)",
          fontSize: "1.5rem",
          fontWeight: 600,
          marginBottom: "2rem",
        }}
      >
        Rebooking Hatırlatmaları
      </h1>
      <RebookingView />
    </main>
  );
}
```

---

## DOSYA 6 — `apps/web/app/admin/rebooking/RebookingView.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";

interface RebookingJob {
  id: string;
  bookingId: string;
  scheduledAt: string;
  executedAt: string | null;
  status: string;
  result: Record<string, unknown> | null;
  customerName: string | null;
  customerContact: string | null;
}

export default function RebookingView(): JSX.Element {
  const [jobs, setJobs] = useState<RebookingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchJobs() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rebooking");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch {
      setError("Job listesi yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRunNow() {
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/admin/rebooking", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const s = data.summary;
      setRunResult(
        `${s?.processed ?? 0} planlandı · ` +
          `${s?.skippedConsent ?? 0} consent eksik · ` +
          `${s?.skippedDuplicate ?? 0} duplicate`
      );
      await fetchJobs();
    } catch {
      setRunResult("Çalıştırma başarısız.");
    } finally {
      setIsRunning(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={handleRunNow}
          disabled={isRunning}
          style={{
            background: "var(--color-primary)",
            color: "var(--color-background)",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "13px",
            cursor: isRunning ? "not-allowed" : "pointer",
            opacity: isRunning ? 0.6 : 1,
            minHeight: "36px",
          }}
        >
          {isRunning ? "Çalışıyor..." : "Şimdi Çalıştır"}
        </button>

        {runResult && (
          <span
            style={{
              fontSize: "13px",
              color: "var(--color-text-muted)",
              padding: "6px 10px",
              border: "1px solid var(--color-accent)",
              borderRadius: "6px",
            }}
          >
            {runResult}
          </span>
        )}
      </div>

      {isLoading && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          Yükleniyor...
        </p>
      )}

      {error && !isLoading && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          ⚠ {error}
        </p>
      )}

      {!isLoading && !error && jobs.length === 0 && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          Henüz rebooking hatırlatması yok.
        </p>
      )}

      {!isLoading && jobs.length > 0 && (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                border: "1px solid var(--color-accent)",
                borderRadius: "8px",
                padding: "1rem",
                background: "var(--color-background)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: "0.5rem",
                alignItems: "start",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    color: "var(--color-text)",
                    fontSize: "14px",
                  }}
                >
                  {job.customerName ?? "—"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {job.customerContact ?? "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "var(--color-text)" }}>
                  {new Intl.DateTimeFormat("de-AT", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    timeZone: "Europe/Vienna",
                  }).format(new Date(job.scheduledAt))}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Booking: ...{job.bookingId.slice(-6)}
                </div>
              </div>
              <span
                style={{
                  fontSize: "12px",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  border:
                    job.status === "completed"
                      ? "1px solid var(--color-primary)"
                      : "1px solid var(--color-secondary)",
                  color:
                    job.status === "completed"
                      ? "var(--color-primary)"
                      : "var(--color-text)",
                }}
              >
                {job.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## DOSYA 7 — `apps/web/components/admin/Sidebar.tsx`

**Önce oku.** Mevcut son item'dan sonra ekle, sıralamayı değiştirme:

```typescript
// lucide-react kullanılıyorsa:
import { RefreshCw } from "lucide-react";
{ href: "/admin/rebooking", label: "Rebooking", icon: <RefreshCw size={16} /> }

// emoji kullanılıyorsa:
{ href: "/admin/rebooking", label: "🔄 Rebooking" }
```

Aktif state pattern'ini birebir kopyala.

---

## DOSYA 8 — `apps/web/__tests__/rebooking-api.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as POST_JOB } from "../app/api/jobs/rebooking/route";
import { GET as GET_ADMIN, POST as POST_ADMIN } from "../app/api/admin/rebooking/route";

vi.mock("@/lib/admin-auth", () => ({
  isAdminApiAuthenticated: vi.fn(),
}));

vi.mock("@/lib/load-client-config", () => ({
  loadClientConfig: vi.fn(),
}));

vi.mock("@beauty-booking/db", () => ({
  getDb: vi.fn(),
  bookings: {},
  automationJobs: {},
  gdprConsents: {},
}));

import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { loadClientConfig } from "@/lib/load-client-config";
import { getDb } from "@beauty-booking/db";

// Drizzle chain mock — V2-9 pattern
function makeSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
}

// Multi-call mock:
// select call 1 → completedBookings
// select call 2 → gdprConsent check
// select call 3 → duplicate check
function makeJobDbMock(opts: {
  completedBookings?: unknown[];
  hasConsent?: boolean;
  hasDuplicate?: boolean;
}) {
  const {
    completedBookings = [],
    hasConsent = true,
    hasDuplicate = false,
  } = opts;
  let callCount = 0;
  return {
    select: vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSelectChain(completedBookings);
      if (callCount === 2)
        return makeSelectChain(hasConsent ? [{ id: "consent-id" }] : []);
      if (callCount === 3)
        return makeSelectChain(hasDuplicate ? [{ id: "job-id" }] : []);
      return makeSelectChain([]);
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ id: "new-job-id" }]),
    }),
  };
}

const MOCK_BOOKING = {
  id: "b-1",
  leadId: "lead-1",
  customerName: "Anna M.",
  customerContact: "anna@example.com",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isAdminApiAuthenticated).mockReturnValue(true);
  vi.mocked(loadClientConfig).mockReturnValue({ rebookingWeeks: 4 } as any);
  process.env.WEBHOOK_SECRET = "test-secret";
});

function makeJobRequest() {
  return new Request("http://localhost/api/jobs/rebooking", {
    method: "POST",
    headers: { "x-webhook-secret": "test-secret" },
  });
}

describe("POST /api/jobs/rebooking", () => {
  it("returns 401 without WEBHOOK_SECRET header", async () => {
    const req = new Request("http://localhost/api/jobs/rebooking", {
      method: "POST",
    });
    const res = await POST_JOB(req as any);
    expect(res.status).toBe(401);
  });

  it("processes booking with consent — job inserted as scheduled", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeJobDbMock({
        completedBookings: [MOCK_BOOKING],
        hasConsent: true,
        hasDuplicate: false,
      }) as any
    );

    const res = await POST_JOB(makeJobRequest() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.summary.processed).toBe(1);
    expect(body.summary.skippedConsent).toBe(0);
    // scheduledFor gelecekte olmalı
    expect(new Date(body.summary.scheduledFor).getTime()).toBeGreaterThan(
      Date.now()
    );
  });

  it("skips booking without reminder_messages consent", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeJobDbMock({
        completedBookings: [MOCK_BOOKING],
        hasConsent: false,
      }) as any
    );

    const res = await POST_JOB(makeJobRequest() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.processed).toBe(0);
    expect(body.summary.skippedConsent).toBe(1);
  });

  it("skips duplicate — existing rebooking_reminder for same booking", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeJobDbMock({
        completedBookings: [MOCK_BOOKING],
        hasConsent: true,
        hasDuplicate: true,
      }) as any
    );

    const res = await POST_JOB(makeJobRequest() as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.processed).toBe(0);
    expect(body.summary.skippedDuplicate).toBe(1);
  });

  it("clamps rebookingWeeks — value 1 → 2, value 15 → 12", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeJobDbMock({ completedBookings: [] }) as any
    );

    vi.mocked(loadClientConfig).mockReturnValue({ rebookingWeeks: 1 } as any);
    const res1 = await POST_JOB(makeJobRequest() as any);
    expect((await res1.json()).summary.rebookingWeeks).toBe(2);

    vi.mocked(loadClientConfig).mockReturnValue({ rebookingWeeks: 15 } as any);
    const res2 = await POST_JOB(makeJobRequest() as any);
    expect((await res2.json()).summary.rebookingWeeks).toBe(12);
  });
});

describe("GET /api/admin/rebooking", () => {
  it("returns 401 without admin auth", async () => {
    vi.mocked(isAdminApiAuthenticated).mockReturnValue(false);
    const res = await GET_ADMIN(
      new Request("http://localhost/api/admin/rebooking") as any
    );
    expect(res.status).toBe(401);
  });

  it("returns scheduled job list with customerName from leftJoin", async () => {
    const mockJob = {
      id: "job-1",
      bookingId: "b-1",
      scheduledAt: new Date(Date.now() + 28 * 86400000).toISOString(),
      executedAt: null,
      status: "scheduled",
      result: { rebookingWeeks: 4 },
      customerName: "Anna M.",
      customerContact: "anna@example.com",
    };
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValue(makeSelectChain([mockJob])),
    } as any);

    const res = await GET_ADMIN(
      new Request("http://localhost/api/admin/rebooking") as any
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].status).toBe("scheduled");
    expect(body.jobs[0].executedAt).toBeNull();
    expect(body.jobs[0].customerName).toBe("Anna M.");
    expect(body.count).toBe(1);
  });
});

describe("POST /api/admin/rebooking", () => {
  it("returns 401 without admin auth", async () => {
    vi.mocked(isAdminApiAuthenticated).mockReturnValue(false);
    const res = await POST_ADMIN(
      new Request("http://localhost/api/admin/rebooking", {
        method: "POST",
      }) as any
    );
    expect(res.status).toBe(401);
  });
});
```

**8 test. Tümü gerçek assertion.**

---

## ACCEPTANCE CRITERIA

- [ ] `ClientConfig.rebookingWeeks?` type eklendi
- [ ] `client.config.json` → `rebookingWeeks: 4`
- [ ] `POST /api/jobs/rebooking` → header yok → 401
- [ ] Job insert: `status: "scheduled"`, `scheduledAt` gelecekte, `executedAt` null
- [ ] GDPR: `gdprConsents` tablosundan — `consentType: "reminder_messages"`, `granted: true`, `revokedAt IS NULL`
- [ ] `bookings.metadata` KULLANILMIYOR (field yok)
- [ ] Consent yok → `skippedConsent` artar, insert yok
- [ ] Duplicate → `skippedDuplicate` artar, insert yok
- [ ] `rebookingWeeks: 1` → clamp → 2
- [ ] `rebookingWeeks: 15` → clamp → 12
- [ ] `GET /api/admin/rebooking` → 401 auth yok
- [ ] `GET /api/admin/rebooking` → `jobs`, `count`, leftJoin customerName
- [ ] `POST /api/admin/rebooking` → 401 auth yok
- [ ] `/admin/rebooking` render oluyor
- [ ] `RebookingView` → "Şimdi Çalıştır" çalışıyor, sonuç gösteriliyor, liste yenileniyor
- [ ] Status badge CSS vars — hex yok
- [ ] Tarih: `Intl.DateTimeFormat` Vienna timezone
- [ ] Sidebar "Rebooking" nav, aktif state doğru
- [ ] `packages/**` DOKUNULMADI
- [ ] `pnpm typecheck` → 0 hata
- [ ] `pnpm test` → **290/290**
- [ ] `pnpm --filter @beauty/web build` → temiz

---

## VERIFICATION

```bash
pnpm typecheck && pnpm test && pnpm --filter @beauty/web build
```

**Manuel:**

```bash
# Job scheduler — ilk çalıştırma
curl -X POST http://localhost:3030/api/jobs/rebooking \
  -H "x-webhook-secret: $WEBHOOK_SECRET"
# → summary.processed > 0, status: "scheduled", scheduledFor gelecekte

# İkinci çalıştırma — duplicate önleme
curl -X POST http://localhost:3030/api/jobs/rebooking \
  -H "x-webhook-secret: $WEBHOOK_SECRET"
# → processed: 0, skippedDuplicate arttı

# Admin list
curl http://localhost:3030/api/admin/rebooking \
  -H "Cookie: admin_token=TOKEN"
# → jobs[0].status: "scheduled", executedAt: null
```

---

## REPORT BACK

1. Exact test sayısı (290)
2. `gdprConsents` Drizzle export adı — `gdprConsents` mı, başka mı?
3. `isNull` operator `drizzle-orm`'den import edildi mi?
4. `executedAt` undefined/null olarak yazıldı — schema nullable doğrulandı mı?
5. Duplicate curl testi — ikinci çalıştırmada `processed: 0` döndü mü?
6. Her adımın commit hash'i
7. Beklenmedik durum varsa detaylı raporla

**V2-11'e geçmeden önce bu rapor onaylanacak.**

---

## CLAUDE.md Güncellemesi

```
| V2-10 | Rebooking Hatırlatması | ✅ DONE | 290/290 |
```

```markdown
### V2-10: Rebooking Hatırlatması — COMPLETED
- feat: ClientConfig.rebookingWeeks? (default 4, clamp 2-12)
- feat: POST /api/jobs/rebooking — WEBHOOK_SECRET auth
  GDPR: gdprConsents tablosu (consentType="reminder_messages", granted=true, revokedAt IS NULL)
  Job: status="scheduled", scheduledAt=now+weeks, executedAt=null
  Duplicate önleme, no-lead skip
- feat: GET /api/admin/rebooking — job listesi, leftJoin customerName
- feat: POST /api/admin/rebooking — admin manuel trigger
- feat: /admin/rebooking — server shell + RebookingView client component
- feat: Sidebar "Rebooking" nav
- test: 290/290 (+8: auth, consent, duplicate, clamp×2, GET list, GET auth, POST auth)
- bookings.metadata KULLANILMADI — field yok, GDPR gdprConsents'ten
- Schema değişikliği YOK, packages değişikliği YOK
```

---

## GIT

```bash
git add \
  apps/web/lib/load-client-config.ts \
  clients/demo-salon/client.config.json \
  apps/web/app/api/jobs/rebooking/route.ts \
  apps/web/app/api/admin/rebooking/route.ts \
  apps/web/app/admin/rebooking/page.tsx \
  apps/web/app/admin/rebooking/RebookingView.tsx \
  apps/web/components/admin/Sidebar.tsx \
  apps/web/__tests__/rebooking-api.test.ts
git commit -m "feat(v2-10): rebooking scheduler + admin dashboard, gdprConsents GDPR check, 8 tests 290/290"
git push

git add CLAUDE.md
git commit -m "docs: log V2-10 completion in CLAUDE.md"
git push
git log --oneline -5
```
