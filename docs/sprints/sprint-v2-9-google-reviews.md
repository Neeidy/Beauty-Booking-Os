# Sprint V2-9: Google Reviews Otomasyonu

**Backend status:** `packages/**` FROZEN. `apps/web/**` only.
**DB schema:** NO changes. No migrations.
**Test baseline:** 278/278 (V2-8 complete)
**Hedef:** 282/282 (+4 yeni test)

---

## CURRENT STATE

```
apps/web/lib/load-client-config.ts              → MEVCUT — reviewUrl type eklenecek
clients/demo-salon/client.config.json           → MEVCUT — reviewUrl field eklenecek
apps/web/app/api/admin/bookings/[id]/reviews/   → YOK — yeni oluşturulacak
apps/web/app/api/jobs/reviews/route.ts          → YOK — yeni oluşturulacak
apps/web/__tests__/reviews-api.test.ts          → YOK — yeni oluşturulacak
```

**Doğrulanmış:**
- `automation_jobs` tablosu mevcut — `jobType: text`, `status: jobStatusEnum`, `result: jsonb`, `clientId`, `bookingId`, `scheduledAt`, `executedAt`, `attempts`, `maxAttempts` field'ları var
- `bookings.status = "completed"` enum'da mevcut
- `/api/jobs/reminders` ve `/api/jobs/recovery` `WEBHOOK_SECRET` header auth kullanıyor — review job aynı pattern'i takip edecek
- V2-8'de `googleBusiness.profileUrl` eklendi — `reviewUrl` ayrı field olacak (review ≠ booking URL)

**Risk noktaları:**
- `automation_jobs` insert'te `id` vermek gerekmez — schema `defaultRandom()` kullanıyor
- `automation_jobs` insert'te `attempts`, `maxAttempts` zorunlu (schema'da notNull, default var ama Drizzle strict modda explicit gerekebilir — okuduktan sonra karar ver)
- `bookings.updatedAt` completed zamanını güvenilir temsil etmez — job varlığı kontrolü yeterli, zaman filtresi kaldırıldı
- Test mock'ları `select` + `insert` zincirini her ikisini de cover etmeli

---

## MANDATORY PRE-READ (bu sırayla, atlamadan)

```bash
# 1. automation_jobs tam schema — zorunlu field'lar, default'lar, enum değerleri
grep -A30 "automation_jobs\|jobStatusEnum" packages/db/src/schema.ts

# 2. Mevcut job route pattern — WEBHOOK_SECRET auth nasıl yapılıyor?
cat apps/web/app/api/jobs/reminders/route.ts 2>/dev/null || \
  cat apps/web/app/api/jobs/reminders/run/route.ts 2>/dev/null || \
  echo "reminders route NOT FOUND"

# 3. Mevcut bookings [id] route pattern — params Promise<{id}> kullanımı
ls apps/web/app/api/booking/
cat apps/web/app/api/booking/\[id\]/status/route.ts | head -40

# 4. client.config.json mevcut googleBusiness field'ı
cat clients/demo-salon/client.config.json | grep -A10 googleBusiness

# 5. load-client-config.ts — ClientConfig type mevcut hali
cat apps/web/lib/load-client-config.ts

# 6. Mevcut test mock pattern — getDb zinciri nasıl mock'lanıyor?
cat apps/web/__tests__/front-desk-api.test.ts | head -60
```

> **HER DOSYAYI OKU, TAHMİN ETME.** Özellikle `automation_jobs` field listesini
> ve job route auth pattern'ini okumadan kod yazma.

---

## IMPLEMENTATION PLAN

| Adım | Dosya | Durum | Dokunulmayacak |
|---|---|---|---|
| 1 | `apps/web/lib/load-client-config.ts` | MODİFİYE | fonksiyon mantığı |
| 2 | `clients/demo-salon/client.config.json` | MODİFİYE | googleBusiness diğer field'lar |
| 3 | `apps/web/app/api/admin/bookings/[id]/reviews/route.ts` | YENİ | — |
| 4 | `apps/web/app/api/jobs/reviews/route.ts` | YENİ | reminders/route.ts |
| 5 | `apps/web/__tests__/reviews-api.test.ts` | YENİ | — |

---

## DOSYA 1 — `apps/web/lib/load-client-config.ts` (TİP GÜNCELLEMESİ)

**Önce oku:** `cat apps/web/lib/load-client-config.ts`

V2-8'de eklenen `googleBusiness` field'ına `reviewUrl` ekle:

```typescript
// Mevcut ClientConfig interface'indeki googleBusiness field'ını bul ve güncelle:
googleBusiness?: {
  profileUrl?: string;
  bookingButtonText?: Record<string, string>;
  reviewUrl?: string;  // ← YENİ: Google Reviews sayfası URL'i
};
```

**KRİTİK:** Sadece type tanımına ekle. Fonksiyon mantığına dokunma. Optional (`?`) — V2-8 config bozulmaz.

---

## DOSYA 2 — `clients/demo-salon/client.config.json` (DEĞİŞİKLİK)

**Önce oku:** `cat clients/demo-salon/client.config.json`

Mevcut `googleBusiness` objesine `reviewUrl` ekle:

```json
"googleBusiness": {
  "profileUrl": "https://booking.google.com/business/vienna-glow-studio",
  "bookingButtonText": {
    "de": "Jetzt buchen",
    "en": "Book now",
    "tr": "Şimdi rezervasyon yap"
  },
  "reviewUrl": "https://g.page/vienna-glow-studio/review"
}
```

> `reviewUrl` (review sayfası) ile `profileUrl` (booking sayfası) kasıtlı olarak
> ayrı tutulmuştur. Bunlar Google'da farklı URL'lerdir.

---

## DOSYA 3 — `apps/web/app/api/admin/bookings/[id]/reviews/route.ts`

Admin'in tamamlanmış bir booking için review linki göndermesini sağlayan
manuel trigger endpoint.

```typescript
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { getDb, bookings } from "@beauty-booking/db";
import { eq } from "drizzle-orm";
import { loadClientConfig } from "@/lib/load-client-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!isAdminApiAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: bookingId } = await params;

  try {
    const db = getDb();

    // Booking'i bul ve status'ünü doğrula
    const result = await db
      .select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (result[0].status !== "completed") {
      return NextResponse.json(
        { error: "Booking is not completed" },
        { status: 400 }
      );
    }

    // Config'den review URL'ini al
    let reviewUrl = "";
    try {
      const cfg = loadClientConfig();
      reviewUrl = cfg.googleBusiness?.reviewUrl ?? "";
    } catch {
      // Config hatası — reviewUrl boş kalır
    }

    if (!reviewUrl) {
      return NextResponse.json(
        { error: "No review URL configured for this salon" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      bookingId,
      reviewUrl,
      message: "Review link ready to send",
    });
  } catch (err) {
    console.error("[/api/admin/bookings/[id]/reviews] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Notlar:**
- Admin auth — ilk satır
- `select({ id, status })` — explicit field selection, gereksiz veri çekilmez
- 404 (bulunamadı) ve 400 (completed değil) ayrı hata kodları
- Config hatası graceful — review URL yoksa 400

---

## DOSYA 4 — `apps/web/app/api/jobs/reviews/route.ts`

Tamamlanmış booking'ler için review job'u oluşturan scheduler endpoint.
Vercel cron veya manuel trigger ile çalışır.

```typescript
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb, bookings, automationJobs } from "@beauty-booking/db";
import { and, eq } from "drizzle-orm";
import { loadClientConfig } from "@/lib/load-client-config";

// WEBHOOK_SECRET auth — reminders/recovery route'larıyla tutarlı
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-webhook-secret");
  return header === secret;
}

const CLIENT_ID =
  process.env.DEMO_CLIENT_ID ?? "00000000-0000-0000-0000-000000000000";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Config'den review URL'ini al — yoksa erken çık
    let reviewUrl = "";
    try {
      const cfg = loadClientConfig();
      reviewUrl = cfg.googleBusiness?.reviewUrl ?? "";
    } catch {
      // Config yüklenemedi
    }

    if (!reviewUrl) {
      return NextResponse.json(
        { error: "No review URL configured" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Tüm completed booking'leri al
    const completedBookings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.clientId, CLIENT_ID),
          eq(bookings.status, "completed")
        )
      );

    const processed: string[] = [];
    const now = new Date();

    for (const booking of completedBookings) {
      // Bu booking için daha önce review job'u oluşturulmuş mu?
      const existingJob = await db
        .select({ id: automationJobs.id })
        .from(automationJobs)
        .where(
          and(
            eq(automationJobs.bookingId, booking.id),
            eq(automationJobs.jobType, "send_review_link")
          )
        )
        .limit(1);

      if (existingJob.length > 0) continue; // Duplicate önleme

      // Yeni review job'u oluştur
      // automation_jobs schema field'larını okuduktan sonra
      // zorunlu field'ları eksiksiz doldur:
      await db.insert(automationJobs).values({
        clientId: CLIENT_ID,
        bookingId: booking.id,
        jobType: "send_review_link",
        scheduledAt: now,
        executedAt: now,
        status: "completed",
        attempts: 1,
        maxAttempts: 1,
        result: { reviewUrl, sentAt: now.toISOString() },
        // id: schema defaultRandom() kullanıyor — verme
        // leadId: bu job lead'e bağlı değil — verme (nullable)
      });

      processed.push(booking.id);
    }

    return NextResponse.json({
      success: true,
      processed: processed.length,
      bookingIds: processed,
    });
  } catch (err) {
    console.error("[/api/jobs/reviews] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Notlar:**
- `WEBHOOK_SECRET` auth — reminders/recovery ile tutarlı
- `id` insert'e verilmiyor — `defaultRandom()` schema'da tanımlı
- `automationJobs` (camelCase) — Drizzle export adı ne ise onu kullan; pre-read'de `grep "automationJobs\|automation_jobs" packages/db/src/index.ts` ile doğrula
- `leadId` verilmiyor — review job doğrudan booking'e bağlı, lead optional
- Duplicate kontrolü job varlığına göre — zaman filtresi yok (güvenilir)

> **ÖNEMLİ:** `automationJobs` Drizzle export adını pre-read sırasında doğrula.
> Schema'da `automation_jobs` tablo adı ama TypeScript export'u farklı olabilir.
> `packages/db/src/index.ts` veya `schema.ts` dosyasında `export const` satırını bul.

---

## DOSYA 5 — `apps/web/__tests__/reviews-api.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as POST_ADMIN_REVIEW } from "../app/api/admin/bookings/[id]/reviews/route";
import { POST as POST_JOBS_REVIEWS } from "../app/api/jobs/reviews/route";

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
}));

import { isAdminApiAuthenticated } from "@/lib/admin-auth";
import { loadClientConfig } from "@/lib/load-client-config";
import { getDb } from "@beauty-booking/db";

const MOCK_REVIEW_URL = "https://g.page/vienna-glow-studio/review";

// Drizzle query chain mock helper — select → where → limit zincirini simüle eder
function makeDbMock(selectResult: unknown[], insertOk = true) {
  const chainMock = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(selectResult),
  };
  return {
    select: vi.fn().mockReturnValue(chainMock),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(insertOk ? [{ id: "new-job" }] : undefined),
    }),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isAdminApiAuthenticated).mockReturnValue(true);
  vi.mocked(loadClientConfig).mockReturnValue({
    googleBusiness: { reviewUrl: MOCK_REVIEW_URL },
  } as any);
});

describe("POST /api/admin/bookings/[id]/reviews", () => {
  it("returns reviewUrl for completed booking", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeDbMock([{ id: "b-1", status: "completed" }]) as any
    );

    const request = new Request(
      "http://localhost/api/admin/bookings/b-1/reviews",
      { method: "POST" }
    );
    const response = await POST_ADMIN_REVIEW(request as any, {
      params: Promise.resolve({ id: "b-1" }),
    } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.reviewUrl).toBe(MOCK_REVIEW_URL);
    expect(body.bookingId).toBe("b-1");
  });

  it("returns 400 for non-completed booking", async () => {
    vi.mocked(getDb).mockReturnValue(
      makeDbMock([{ id: "b-2", status: "confirmed" }]) as any
    );

    const request = new Request(
      "http://localhost/api/admin/bookings/b-2/reviews",
      { method: "POST" }
    );
    const response = await POST_ADMIN_REVIEW(request as any, {
      params: Promise.resolve({ id: "b-2" }),
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("not completed");
  });

  it("returns 401 without admin auth", async () => {
    vi.mocked(isAdminApiAuthenticated).mockReturnValue(false);

    const request = new Request(
      "http://localhost/api/admin/bookings/b-1/reviews",
      { method: "POST" }
    );
    const response = await POST_ADMIN_REVIEW(request as any, {
      params: Promise.resolve({ id: "b-1" }),
    } as any);

    expect(response.status).toBe(401);
  });

  it("returns 400 when reviewUrl not configured", async () => {
    vi.mocked(loadClientConfig).mockReturnValue({
      googleBusiness: { profileUrl: "https://example.com" },
      // reviewUrl yok
    } as any);
    vi.mocked(getDb).mockReturnValue(
      makeDbMock([{ id: "b-1", status: "completed" }]) as any
    );

    const request = new Request(
      "http://localhost/api/admin/bookings/b-1/reviews",
      { method: "POST" }
    );
    const response = await POST_ADMIN_REVIEW(request as any, {
      params: Promise.resolve({ id: "b-1" }),
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("No review URL");
  });
});
```

**4 test — no `.skip`, no `.todo`. Hepsi gerçek assertion içeriyor.**

> **NOT:** `POST /api/jobs/reviews` testi WEBHOOK_SECRET auth gerektirdiğinden
> ve `process.env` mock'laması test ortamında karmaşık olduğundan bu sprint'te
> admin endpoint testleriyle sınırlı tutuldu. Job route'un integration'ı
> manuel curl testi ile doğrulanacak (aşağıda).

---

## ACCEPTANCE CRITERIA

- [ ] `ClientConfig.googleBusiness.reviewUrl?` type eklendi
- [ ] `client.config.json` → `googleBusiness.reviewUrl` mevcut
- [ ] `POST /api/admin/bookings/[id]/reviews` → completed booking → 200 + reviewUrl
- [ ] `POST /api/admin/bookings/[id]/reviews` → non-completed → 400
- [ ] `POST /api/admin/bookings/[id]/reviews` → auth yok → 401
- [ ] `POST /api/admin/bookings/[id]/reviews` → reviewUrl config yok → 400
- [ ] `POST /api/jobs/reviews` → `WEBHOOK_SECRET` header yok → 401
- [ ] `POST /api/jobs/reviews` → completed booking'ler için job insert edildi
- [ ] Aynı booking için duplicate job oluşturulmuyor (idempotent)
- [ ] `automation_jobs` insert'te `id` verilmiyor — schema `defaultRandom()` kullanıyor
- [ ] `automationJobs` export adı pre-read'de doğrulandı
- [ ] `/api/lead` DOKUNULMADI
- [ ] `packages/**` DOKUNULMADI
- [ ] `pnpm typecheck` → 0 hata
- [ ] `pnpm test` → **282/282** (278 + 4 yeni)
- [ ] `pnpm --filter @beauty/web build` → temiz

---

## VERIFICATION

```bash
pnpm typecheck
# Beklenen: 0 errors

pnpm test
# Beklenen: 282/282 passing

pnpm --filter @beauty/web build
# Beklenen: ✓ Compiled successfully
```

**Manuel kontroller (dev server çalışırken):**

```bash
# 1. Admin review trigger — auth ile
curl -X POST http://localhost:3030/api/admin/bookings/{COMPLETED_BOOKING_ID}/reviews \
  -H "Cookie: admin_token=YOUR_TOKEN"
# → { "success": true, "reviewUrl": "https://g.page/...", "bookingId": "..." }

# 2. Non-completed booking
curl -X POST http://localhost:3030/api/admin/bookings/{PENDING_BOOKING_ID}/reviews \
  -H "Cookie: admin_token=YOUR_TOKEN"
# → 400 { "error": "Booking is not completed" }

# 3. Jobs endpoint — WEBHOOK_SECRET ile
curl -X POST http://localhost:3030/api/jobs/reviews \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET"
# → { "success": true, "processed": N, "bookingIds": [...] }

# 4. Auth yok → 401
curl -X POST http://localhost:3030/api/jobs/reviews
# → 401

# 5. Duplicate önleme — ikinci kez çalıştır
curl -X POST http://localhost:3030/api/jobs/reviews \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET"
# → { "success": true, "processed": 0 }  ← aynı booking'ler tekrar işlenmez
```

---

## REPORT BACK

1. Exact test sayısı (282 olmalı)
2. `automationJobs` Drizzle export adı ne? (`automation_jobs` mi, `automationJobs` mi?)
3. `automation_jobs` insert'te `attempts`, `maxAttempts` explicit verilmesi gerekti mi yoksa default yeterli miydi?
4. `POST /api/jobs/reviews` curl testi — `processed: N` döndü mü?
5. Duplicate önleme çalıştı mı? (ikinci çalıştırmada `processed: 0`)
6. `bookings.status = "completed"` enum'dan geldiği doğrulandı mı?
7. Her adımın commit hash'i
8. Beklenmedik durum varsa detaylı raporla

**Sprint V2-10'a geçmeden önce bu rapor onaylanacak.**

---

## CLAUDE.md Güncellemesi (sprint bittikten sonra)

V2 Sprint Sequence tablosunu güncelle:

```
| V2-9 | Google Reviews Automation | ✅ DONE | 282/282 |
```

Sprint completion bloğu:

```markdown
### V2-9: Google Reviews Otomasyonu — COMPLETED
- feat: ClientConfig.googleBusiness.reviewUrl? type eklendi
- feat: client.config.json → googleBusiness.reviewUrl (demo placeholder)
- feat: POST /api/admin/bookings/[id]/reviews — admin manuel trigger (auth required)
  completed booking için reviewUrl döner, config yoksa 400
- feat: POST /api/jobs/reviews — scheduler endpoint (WEBHOOK_SECRET auth)
  completed booking'ler için send_review_link job'u oluşturur
  duplicate önleme: aynı booking için ikinci job oluşturulmaz
- test: 282/282 (+4 yeni — admin trigger 4 case)
- automationJobs insert: id verilmez (defaultRandom), duplicate idempotent
- Schema değişikliği YOK, packages değişikliği YOK
```

---

## GIT

```bash
# Commit 1 — implementation + tests
git add \
  apps/web/lib/load-client-config.ts \
  clients/demo-salon/client.config.json \
  "apps/web/app/api/admin/bookings/[id]/reviews/route.ts" \
  apps/web/app/api/jobs/reviews/route.ts \
  apps/web/__tests__/reviews-api.test.ts
git status
git commit -m "feat(v2-9): Google Reviews automation — admin trigger + job queue, 4 tests 282/282"
git push

# Commit 2 — documentation
git add CLAUDE.md
git commit -m "docs: log V2-9 Google Reviews completion in CLAUDE.md"
git push

git log --oneline -5
```
