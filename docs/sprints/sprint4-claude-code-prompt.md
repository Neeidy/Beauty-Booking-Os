# SPRINT 4 — REMINDER SYSTEM + FOLLOW-UP AGENT

Sprint 3 tamamlandı (75/75 test). Şimdi Sprint 4'e geçiyoruz.

## SPRINT 4 HEDEFİ
Booking sonrası otomatik hatırlatmalar çalışıyor (24h + 3h). Follow-up Agent mesaj üretiyor. Job runner zamanında tetikleniyor. No-show ve iptal sonrası yeniden planlama akışı hazır.

## YAPILACAKLAR (BU SIRAYLA)

### ADIM 1: Follow-up Agent
**OBJECTIVE:** Hatırlatma ve geri kazanım mesajları üreten agent modülü.
**FILES:**
- `packages/agents/followup-agent/prompt.ts` — Prompt template
- `packages/agents/followup-agent/scheduler.ts` — Mesaj üretim logic
- `packages/agents/followup-agent/index.ts` — Public export
- `packages/agents/followup-agent/followup.test.ts` — Testler

**TASKS:**
1. Prompt template — CLAUDE.md'deki Follow-up Agent Prompt spec'ini kullan
2. Config injection: salonName, brandTone, timezone, messageTemplates
3. Trigger type'lara göre mesaj üret:
   - `reminder_24h`: 24 saat kala hatırlatma
   - `reminder_3h`: 3 saat kala son hatırlatma
   - `no_confirmation`: Onay vermeyen müşteri takibi
   - `cancellation`: İptal sonrası yeniden planlama teklifi
   - `no_show`: Gelmeyene geri kazanım mesajı
4. Output schema (Zod):
```typescript
const FollowUpOutputSchema = z.object({
  message: z.string().max(500),
  channel: z.enum(['whatsapp', 'email', 'sms']),
  action_type: z.enum(['remind', 'confirm_request', 'reschedule_offer', 'winback']),
  reschedule_link: z.string().nullable(),
  follow_up_scheduled: z.boolean(),
  next_follow_up_hours: z.number().nullable(),
});
```
5. Template-first yaklaşım: branding.json'daki messageTemplates varsa önce onu kullan, yoksa AI ile üret (maliyet optimizasyonu)
6. Dil desteği: lead'in language alanına göre DE/EN/TR
7. Event log kaydı
8. Test yaz (mocked Claude responses ile):
   - reminder_24h → kısa, net hatırlatma mesajı + channel: email
   - reminder_3h → son hatırlatma + tek CTA
   - cancellation → 48h sonrası reschedule teklifi
   - no_show → nazik winback mesajı
   - 2 cevapsız follow-up sonrası → follow_up_scheduled: false (spam yapma)
   - Türkçe müşteri → Türkçe mesaj

**ACCEPTANCE:**
- generateFollowUp() fonksiyonu çalışıyor
- 6 trigger type destekleniyor
- Template varsa template kullanıyor (AI çağrısı yapmıyor)
- Template yoksa AI ile üretiyor
- Output Zod schema'ya uyuyor
- Event log yazılıyor
- Min 6 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint4-step1: followup agent with templates + ai fallback" && git push`

---

### ADIM 2: Job Runner
**OBJECTIVE:** automation_jobs tablosundaki zamanı gelen job'ları çalıştıran runner.
**FILES:**
- `packages/core/jobs/job-runner.ts` — Ana job runner logic
- `packages/core/jobs/reminder-handler.ts` — Reminder job handler
- `packages/core/jobs/recovery-handler.ts` — Recovery/winback job handler
- `packages/core/jobs/index.ts` — Export
- `packages/core/jobs/job-runner.test.ts` — Testler

**TASKS:**
1. Job runner logic:
```typescript
async function runDueJobs(options: {
  clientId?: string;  // opsiyonel: sadece belirli salon
  jobType?: string;   // opsiyonel: sadece belirli tip
  batchSize?: number; // default: 10
}): Promise<JobRunResult> {
  // 1. automation_jobs'dan status='scheduled' ve scheduledAt <= now olanları al
  // 2. Her birini status='processing' yap (race condition önle)
  // 3. jobType'a göre doğru handler'ı çağır
  // 4. Başarı: status='completed', executedAt=now, result kaydet
  // 5. Hata: attempts++, maxAttempts'e ulaşıldıysa status='failed', değilse 'scheduled' bırak
  // 6. Event log her job için
}
```
2. Reminder handler:
   - Booking'i al, hala aktif mi kontrol et (iptal edilmişse skip)
   - Follow-up Agent'ı çağır → mesaj üret
   - Mesajı messages tablosuna kaydet
   - Email gönder (varsa Resend, yoksa log)
3. Recovery handler:
   - Booking status'ü cancelled veya no_show mu kontrol et
   - bookingRules.recoveryWaitHours geçmiş mi kontrol et
   - maxFollowUpAttempts aşılmış mı kontrol et (aşıldıysa skip)
   - Follow-up Agent ile winback mesajı üret
   - Mesajı kaydet ve gönder
4. Concurrency guard: Aynı job'ı 2 kez çalıştırma (SELECT FOR UPDATE veya status check)
5. Test yaz:
   - Zamanı gelen reminder job → çalıştırılıyor, completed oluyor
   - Zamanı gelmemiş job → skip ediliyor
   - İptal edilmiş booking'in reminder'ı → skip ediliyor
   - Max attempt aşılmış → failed olarak işaretleniyor
   - Recovery: 48h geçmemiş → skip ediliyor
   - Recovery: 48h geçmiş, aktif → winback mesajı üretiliyor

**ACCEPTANCE:**
- runDueJobs() zamanı gelen job'ları çalıştırıyor
- İptal edilmiş booking'lerin job'ları skip ediliyor
- Hata durumunda retry mekanizması çalışıyor
- maxAttempts'e ulaşılınca failed oluyor
- Her job event log'a yazılıyor
- Min 6 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint4-step2: job runner with reminder + recovery handlers" && git push`

---

### ADIM 3: Job Runner API Endpoint'leri
**OBJECTIVE:** Job runner'ı tetikleyen API endpoint'leri (cron veya manual trigger).
**FILES:**
- `apps/web/app/api/jobs/reminders/route.ts` — Reminder runner endpoint
- `apps/web/app/api/jobs/recovery/route.ts` — Recovery runner endpoint

**TASKS:**
1. POST /api/jobs/reminders/run:
   - runDueJobs({ jobType: 'reminder_24h' }) + runDueJobs({ jobType: 'reminder_3h' })
   - Response: `{ processed: number, succeeded: number, failed: number, skipped: number }`
   - Basit auth: header'da WEBHOOK_SECRET kontrolü (public erişim engelle)
2. POST /api/jobs/recovery/run:
   - runDueJobs({ jobType: 'recovery' }) + runDueJobs({ jobType: 'winback' })
   - Aynı response format ve auth
3. Her iki endpoint için error handling + event log

**CRON SETUP (Supabase veya Vercel Cron):**
```
# Reminders: her 15 dakikada bir
*/15 * * * * POST /api/jobs/reminders/run

# Recovery: günde 1 kez sabah 09:00
0 9 * * * POST /api/jobs/recovery/run
```
4. Vercel cron config (vercel.json) veya Supabase pg_cron — hangisi daha basitse onu kur

**ACCEPTANCE:**
- POST /api/jobs/reminders/run çalışıyor, auth kontrolü var
- POST /api/jobs/recovery/run çalışıyor, auth kontrolü var
- Cron config hazır (Vercel veya Supabase)
- Response'da processed/succeeded/failed sayıları doğru

**BİTİNCE:** `git add . && git commit -m "sprint4-step3: job runner api endpoints + cron config" && git push`

---

### ADIM 4: Booking Status Güncelleme + No-Show Flow
**OBJECTIVE:** Booking iptal/no-show/complete durumlarını yönet ve gerekli job'ları tetikle.
**FILES:**
- `apps/web/app/api/booking/[id]/status/route.ts` — PATCH endpoint
- `apps/web/app/api/booking/[id]/cancel/route.ts` — POST cancel endpoint

**TASKS:**
1. PATCH /api/booking/:id/status:
   - Allowed transitions:
     - pending → confirmed
     - pending → cancelled
     - confirmed → completed
     - confirmed → no_show
     - confirmed → cancelled
     - confirmed → rescheduled
   - Invalid transition → 400 error
   - Event log kaydet
2. POST /api/booking/:id/cancel:
   - cancelReason (opsiyonel) al
   - Booking status → cancelled, cancelledAt = now
   - Mevcut reminder job'ları → status: cancelled
   - Recovery job oluştur: scheduledAt = now + recoveryWaitHours
   - Event log kaydet
3. No-show handling:
   - Status no_show olduğunda:
     - Recovery job oluştur (winback)
     - Lead status güncelle
4. Test yaz:
   - pending → confirmed: başarılı
   - confirmed → completed: başarılı
   - completed → pending: hata (invalid transition)
   - Cancel: reminder job'lar cancelled, recovery job oluşuyor
   - No-show: winback job oluşuyor

**ACCEPTANCE:**
- Status geçişleri kurallara göre çalışıyor
- İptal → mevcut reminder'lar iptal, recovery planlanıyor
- No-show → winback planlanıyor
- Invalid transition reddediliyor
- Event log her değişiklikte yazılıyor
- Min 5 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint4-step4: booking status management + cancel/no-show flows" && git push`

---

### ADIM 5: End-to-End Flow Testi
**OBJECTIVE:** Tüm zinciri test et: lead → booking → reminder → cancel → recovery.
**FILE:** `packages/core/jobs/e2e-flow.test.ts`

**TASKS:**
1. Integration test (mocked Claude, gerçek DB logic):
   ```
   1. Lead oluştur (form submit simülasyonu)
   2. Classify et (Intake Agent mock)
   3. Booking oluştur
   4. Reminder job'ların DB'de olduğunu doğrula
   5. Job runner çalıştır → reminder mesajı oluşur
   6. Booking iptal et
   7. Reminder job'lar cancelled oldu mu doğrula
   8. Recovery job oluştu mu doğrula
   9. Recovery job runner çalıştır → winback mesajı oluşur
   10. Event log'da tüm adımlar var mı kontrol et
   ```
2. Bu tek test dosyası tüm Sprint 1-4 zincirini doğruluyor
3. Token count toplam doğrulaması: event_logs'dan toplam token > 0

**ACCEPTANCE:**
- Full chain test geçiyor
- Tüm mevcut testler hala geçiyor
- Event log'da tam izlenebilirlik var

**BİTİNCE:** `git add . && git commit -m "sprint4-step5: e2e flow test lead to recovery" && git push`

---

## SPRINT 4 BİTİŞ KRİTERLERİ

- [ ] Follow-up Agent 6 trigger type ile mesaj üretiyor
- [ ] Template-first: branding.json template varsa AI çağrısı yapmıyor
- [ ] Job runner zamanı gelen job'ları çalıştırıyor
- [ ] İptal edilmiş booking'lerin job'ları skip ediliyor
- [ ] Retry mekanizması çalışıyor (maxAttempts'e kadar)
- [ ] API endpoint'leri auth ile korunuyor
- [ ] Cron config hazır
- [ ] Booking status geçişleri kurallı
- [ ] Cancel → recovery chain çalışıyor
- [ ] No-show → winback chain çalışıyor
- [ ] E2E test tam zinciri doğruluyor
- [ ] Tüm testler geçiyor (75+ mevcut + yeni)
- [ ] CLAUDE.md güncellendi

## SPRINT 4 TAMAMLANINCA CLAUDE.md'YE EKLE:
```
## Sprint 4 Status: TAMAMLANDI
- Follow-up Agent: 6 trigger type, template-first + AI fallback, DE/EN/TR
- Job Runner: batch processing, retry, concurrency guard
- Reminder: 24h + 3h otomatik, iptal edilmişse skip
- Recovery: 48h sonra winback, max 2 attempt sonra dur
- Booking Status: kurallı geçişler, cancel + no-show flow
- Cron: reminder her 15dk, recovery günde 1x
- E2E Test: lead → booking → reminder → cancel → recovery zinciri
- Test: XX/XX geçiyor
```
