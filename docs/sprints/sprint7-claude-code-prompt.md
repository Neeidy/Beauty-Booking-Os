# SPRINT 7 — HARDENING + SECURITY + DOCUMENTATION

Sprint 6 tamamlandı (114/114 test). Şimdi Sprint 7'ye geçiyoruz.

## SPRINT 7 HEDEFİ
Sistem production-ready: rate limiting, input sanitization, güvenlik review, GDPR endpoint'leri tamamlanmış, dokümantasyon hazır. İlk gerçek müşteri için güvenle deploy edilebilir durumda.

## YAPILACAKLAR (BU SIRAYLA)

### ADIM 1: Rate Limiting + Input Sanitization
**OBJECTIVE:** Public endpoint'leri kötüye kullanıma karşı koru.
**FILES:**
- `packages/shared/utils/rate-limiter.ts`
- `apps/web/middleware.ts` — Next.js middleware
- `packages/shared/utils/sanitizer.ts`

**TASKS:**
1. Rate limiter:
   - In-memory store (V1 yeterli, Redis gerekirse sonra eklenebilir)
   - Config: RATE_LIMIT_REQUESTS_PER_MINUTE env'den
   - Per-IP limiting: `/api/lead` ve `/api/booking` endpoint'lerinde
   - Admin endpoint'lerde ayrı limit (daha yüksek)
   - Rate limit aşılınca: 429 Too Many Requests + `Retry-After` header
2. Input sanitization:
   - XSS temizleme: tüm string input'larda HTML tag strip
   - SQL injection: Drizzle zaten parameterized ama double-check
   - Max length enforcement: mesaj alanları max 2000 karakter
   - Email format validation: Zod + regex
   - Phone format validation: uluslararası format desteği
3. Next.js middleware: rate limiter'ı public API route'larına uygula
4. Test yaz:
   - 30 request/dakika → ilk 30 geçer, 31. → 429
   - XSS payload (`<script>alert(1)</script>`) → strip edilmiş çıktı
   - Çok uzun input → reject
   - Valid email → geçer, invalid → reject

**ACCEPTANCE:**
- Rate limiting çalışıyor, 429 dönüyor
- XSS payload'lar temizleniyor
- Uzun input'lar reddediliyor
- Min 4 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint7-step1: rate limiting + input sanitization" && git push`

---

### ADIM 2: GDPR Endpoint'leri — Export + Deletion
**OBJECTIVE:** Müşteri veri hakları: dışa aktarma ve silme endpoint'leri.
**FILES:**
- `apps/web/app/api/gdpr/export/[leadId]/route.ts`
- `apps/web/app/api/gdpr/data/[leadId]/route.ts`
- `packages/core/gdpr/data-export.ts`
- `packages/core/gdpr/data-deletion.ts`
- `packages/core/gdpr/gdpr.test.ts`

**TASKS:**
1. GET /api/gdpr/export/:leadId — Right to Data Portability:
   - Auth kontrolü (admin only)
   - Lead'in tüm verilerini topla: lead kaydı, bookings, messages, consents, event_logs
   - JSON olarak döndür
   - Kişisel veri alanlarını açıkça işaretle
   - Event log: "gdpr_export" kaydı
2. DELETE /api/gdpr/data/:leadId — Right to Erasure:
   - Auth kontrolü (admin only)
   - Soft delete DEĞİL, gerçek anonymization:
     - customerName → "ANONYMIZED"
     - customerEmail → "anonymized@deleted.local"
     - customerPhone → "0000000000"
     - rawMessage → "ANONYMIZED"
     - IP adresleri → null
   - Booking ve message kayıtlarında da aynı anonymization
   - consent kayıtları: revokedAt = now
   - Yapısal veri kalır (istatistik için): tarih, status, service_id
   - Event log: "gdpr_deletion" kaydı
   - Response: `{ anonymized: true, recordsAffected: number }`
3. Test yaz:
   - Export: tüm ilgili veriler döndürülüyor
   - Deletion: kişisel veriler anonymized, yapısal veriler sağlam
   - Deletion sonrası export: anonymized veri dönüyor
   - Auth yoksa 401

**ACCEPTANCE:**
- Export tüm müşteri verisini JSON olarak döndürüyor
- Deletion kişisel verileri anonymize ediyor
- Yapısal veriler korunuyor (istatistik bozulmaz)
- Auth koruması var
- Min 4 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint7-step2: gdpr export + deletion endpoints" && git push`

---

### ADIM 3: Webhook Güvenliği + CORS
**OBJECTIVE:** Webhook'ları ve CORS'u güvenli hale getir.
**FILES:**
- `packages/shared/utils/webhook-verifier.ts`
- `apps/web/next.config.ts` — CORS headers güncelle

**TASKS:**
1. Webhook signature verification:
   - WhatsApp webhook: X-Hub-Signature header doğrulama (HMAC-SHA256)
   - Instagram webhook: aynı Meta signature formatı
   - Job runner endpoint'leri: WEBHOOK_SECRET header kontrolü
   - Geçersiz signature → 403 + event log
2. CORS configuration:
   - Production: sadece salon domain'lerine izin ver
   - Development: localhost izin ver
   - next.config.ts'de headers() ile ayarla
   - OPTIONS preflight handling
3. Security headers (next.config.ts):
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Strict-Transport-Security: max-age=31536000
   - Content-Security-Policy: temel policy
4. Test yaz:
   - Valid webhook signature → geçer
   - Invalid signature → 403
   - CORS: allowed domain → geçer, random domain → blocked

**ACCEPTANCE:**
- Webhook signature doğrulama çalışıyor
- CORS kısıtlaması aktif
- Security headers eklendi
- Min 3 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint7-step3: webhook verification + cors + security headers" && git push`

---

### ADIM 4: Error Alerting + Health Check
**OBJECTIVE:** Sistem sağlığını izleme ve hata bildirimi.
**FILES:**
- `apps/web/app/api/health/route.ts`
- `packages/shared/utils/alerter.ts`

**TASKS:**
1. GET /api/health — Health check endpoint:
```typescript
{
  status: "healthy" | "degraded" | "unhealthy",
  checks: {
    database: "ok" | "error",
    supabase: "ok" | "error",
    lastJobRun: "2025-01-01T00:00:00Z" | null,
    pendingJobs: number,
    failedJobsLast24h: number,
    escalationQueueSize: number,
  },
  version: string,  // package.json version
  uptime: number,
}
```
2. Alerter utility:
   - failedJobsLast24h > 5 → alert
   - escalationQueueSize > 10 → alert
   - V1: alert = admin email (Resend) veya console.log
   - Her alert event_log'a yazılır
3. Health check'i Vercel cron ile her 5 dakikada çalıştır (opsiyonel)

**ACCEPTANCE:**
- /api/health çalışıyor, doğru status dönüyor
- DB bağlantı hatası → status: unhealthy
- Alert mekanizması çalışıyor (log'a yazıyor)

**BİTİNCE:** `git add . && git commit -m "sprint7-step4: health check + error alerting" && git push`

---

### ADIM 5: Data Retention + Cleanup Job
**OBJECTIVE:** GDPR uyumlu otomatik veri temizliği.
**FILES:**
- `packages/core/gdpr/data-retention.ts`
- `packages/core/gdpr/data-retention.test.ts`

**TASKS:**
1. Data retention job:
   - Config'den dataRetentionDays al (default: 730 = 2 yıl)
   - createdAt + dataRetentionDays < now olan kayıtları bul
   - Anonymization uygula (GDPR deletion ile aynı logic)
   - Sadece lead/booking/message tabloları — event_logs ve config kalır
   - Dry-run modu: ne silineceğini raporla ama silme
   - Event log: "data_retention_cleanup" kaydı
2. API endpoint veya cron trigger:
   - POST /api/jobs/cleanup/run (admin auth)
   - Veya aylık cron
3. Test yaz:
   - 730 günden eski lead → anonymized
   - 730 günden yeni lead → dokunulmaz
   - Dry-run → rapor üretir ama silmez

**ACCEPTANCE:**
- Retention job eski verileri anonymize ediyor
- Yeni veriler korunuyor
- Dry-run çalışıyor
- Min 3 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint7-step5: gdpr data retention + cleanup job" && git push`

---

### ADIM 6: CLAUDE.md Final Update + Deployment Checklist
**OBJECTIVE:** Proje dokümantasyonunu tamamla.
**FILES:**
- `CLAUDE.md` — Final güncelleme
- `docs/deployment-checklist.md`
- `docs/client-onboarding.md`
- `docs/api-reference.md`

**TASKS:**
1. CLAUDE.md final update:
   - Tüm sprint durumları
   - Mevcut dosya yapısı özeti
   - Çalışan endpoint'ler listesi
   - Test coverage özeti
   - Bilinen sınırlamalar
   - Sonraki adımlar (Sprint 8: Go-Live)
2. deployment-checklist.md:
```markdown
# Deployment Checklist
## Pre-Deploy
- [ ] .env dosyası tüm key'ler dolu
- [ ] .env.example'da placeholder'lar var (gerçek key yok!)
- [ ] Config dosyaları validate ediliyor
- [ ] Demo salon config production config'den ayrı
- [ ] Tüm testler geçiyor
- [ ] DB migration'lar uygulanmış
## Deploy
- [ ] Vercel'e push
- [ ] Supabase migration kontrol
- [ ] vercel.json cron config aktif
- [ ] CORS domain'leri production domain ile güncelle
## Post-Deploy
- [ ] /api/health kontrol et
- [ ] Test lead oluştur → full chain doğrula
- [ ] Test reminder job çalıştır
- [ ] Admin panel erişimini doğrula
- [ ] GDPR: privacy policy sayfası live
```
3. client-onboarding.md: Yeni salon ekleme adımları
4. api-reference.md: Tüm endpoint'ler, request/response formatları

**ACCEPTANCE:**
- CLAUDE.md güncel ve tam
- Deployment checklist detaylı
- Client onboarding rehberi hazır
- API referans dokümanı hazır

**BİTİNCE:** `git add . && git commit -m "sprint7-step6: documentation + deployment checklist" && git push`

---

## SPRINT 7 BİTİŞ KRİTERLERİ

- [ ] Rate limiting public endpoint'lerde aktif
- [ ] Input sanitization XSS/uzun input koruması
- [ ] GDPR export endpoint çalışıyor
- [ ] GDPR deletion/anonymization çalışıyor
- [ ] Webhook signature doğrulama aktif
- [ ] CORS kısıtlaması aktif
- [ ] Security headers eklendi
- [ ] Health check endpoint çalışıyor
- [ ] Data retention job çalışıyor
- [ ] Deployment checklist hazır
- [ ] Client onboarding rehberi hazır
- [ ] Tüm testler geçiyor (114+ mevcut + yeni)
- [ ] CLAUDE.md güncellendi

## SPRINT 7 TAMAMLANINCA CLAUDE.md'YE EKLE:
```
## Sprint 7 Status: TAMAMLANDI
- Rate Limiting: per-IP, configurable, 429 response
- Input Sanitization: XSS strip, max length, email/phone validation
- GDPR: export (JSON), deletion (anonymization), data retention (730 gün)
- Webhook Security: HMAC-SHA256 signature verification
- CORS: production domain-only, security headers
- Health Check: DB + jobs + escalation monitoring
- Alerting: failed jobs + queue size alerts
- Documentation: deployment checklist, client onboarding, API reference
- Test: XX/XX geçiyor
```
