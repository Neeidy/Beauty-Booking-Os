# SPRINT 8 — GO-LIVE PREPARATION + FINAL VALIDATION

Sprint 7 tamamlandı. Şimdi Sprint 8 — final sprint.

## SPRINT 8 HEDEFİ
Sistem production'a deploy edilmiş, smoke test geçmiş, ilk gerçek müşteriye hazır. Full chain gerçek cihazda doğrulanmış.

## YAPILACAKLAR (BU SIRAYLA)

### ADIM 1: Production Environment Setup
**OBJECTIVE:** Production ortamını hazırla ve yapılandır.

**TASKS:**
1. Vercel production deploy kontrol:
   - Environment variables set (Vercel dashboard'dan)
   - Domain bağlama (varsa salon domain)
   - vercel.json cron job'lar aktif
2. Supabase production kontrol:
   - RLS (Row Level Security) kuralları aktif
   - Service role key sadece server-side'da
   - Anon key sadece client-safe operasyonlar için
3. Production .env değerlerini doğrula:
   - NODE_ENV=production
   - RATE_LIMIT uygun seviyede
   - WEBHOOK_SECRET güçlü
4. DNS + SSL kontrol (Vercel otomatik handle eder)

**ACCEPTANCE:**
- Production URL erişilebilir
- HTTPS aktif
- Environment variables set
- Cron job'lar aktif

**BİTİNCE:** `git add . && git commit -m "sprint8-step1: production environment setup" && git push`

---

### ADIM 2: Smoke Test — Full Chain
**OBJECTIVE:** Gerçek production'da tüm zinciri test et.
**FILE:** `scripts/smoke-test.ts`

**TASKS:**
1. Smoke test script (production URL'e karşı çalışır):
```
1. GET /api/health → status: healthy
2. POST /api/lead → lead oluştur (test data)
3. GET /api/admin/leads → lead listede görünüyor
4. POST /api/lead/:id/classify → intent dönüyor
5. POST /api/booking → booking oluşuyor
6. GET /api/admin/bookings → booking listede görünüyor
7. POST /api/jobs/reminders/run → reminder çalışıyor
8. GET /api/admin/logs → event log'lar görünüyor
9. PATCH /api/booking/:id/status → status değişiyor
10. GET /api/gdpr/export/:leadId → veri dönüyor
11. DELETE test data (temizle)
```
2. Her adımda pass/fail raporu
3. Fail'de hangi adımda kaldığını raporla
4. Test data temizleme (smoke test verilerini sil)

**ACCEPTANCE:**
- Smoke test tüm adımları geçiyor
- Test data temizleniyor
- Rapor net ve okunabilir

**BİTİNCE:** `git add . && git commit -m "sprint8-step2: production smoke test script" && git push`

---

### ADIM 3: Seed Production Demo Salon
**OBJECTIVE:** Production'da demo salon verisi ile sistemi hazırla.

**TASKS:**
1. Production DB'de demo-salon config'i oluştur:
   - clients tablosuna kayıt
   - services tablosuna hizmetler
   - Admin kullanıcı oluştur
2. Landing page'in production URL'de doğru render ettiğini kontrol et:
   - Hizmetler gösteriliyor
   - Booking formu açılıyor
   - GDPR checkboxlar çalışıyor
   - Thank-you sayfası çalışıyor
3. Admin panel'in production'da erişilebilir olduğunu doğrula:
   - Login çalışıyor
   - Dashboard yükleniyor
   - Lead/Booking listeleri boş ama çalışıyor

**ACCEPTANCE:**
- Demo salon production'da live
- Tüm sayfalar doğru render ediyor
- Admin panel erişilebilir

**BİTİNCE:** `git add . && git commit -m "sprint8-step3: production seed + ui verification" && git push`

---

### ADIM 4: Final Validation + Bug Fix
**OBJECTIVE:** Son kontrol, bulunan bug'ları düzelt, CLAUDE.md'yi final hale getir.

**TASKS:**
1. Manuel test checklist (tarayıcıda):
   - [ ] Landing page mobile'da doğru görünüyor
   - [ ] Booking form submit → thank-you
   - [ ] Admin login çalışıyor
   - [ ] Dashboard istatistikleri doğru
   - [ ] Lead listesi filtreleri çalışıyor
   - [ ] Booking aksiyon butonları çalışıyor
   - [ ] Log viewer yükleniyor
   - [ ] Escalation kuyruğu çalışıyor
2. Bulunan bug'ları düzelt
3. Tüm testleri son kez çalıştır
4. CLAUDE.md final güncelleme:
```markdown
## PROJECT STATUS: PRODUCTION READY
- 8 Sprint tamamlandı
- XX/XX test geçiyor
- 5 AI agent aktif
- 2 demo salon config
- GDPR uyumlu
- Multi-tenant isolation doğrulanmış
- Production deploy checklist tamamlanmış

## Sonraki Adımlar (Post-Launch)
- Premium website redesign
- WhatsApp Business API entegrasyonu
- Instagram DM otomasyonu
- Advanced analytics dashboard
- Payment integration
- Voice agent (gelecek faz)
```

**ACCEPTANCE:**
- Tüm testler geçiyor
- Production smoke test geçiyor
- CLAUDE.md final ve güncel
- Sistem ilk müşteriye hazır

**BİTİNCE:** `git add . && git commit -m "sprint8-final: production ready" && git push`

---

## SPRINT 8 BİTİŞ KRİTERLERİ (= PROJE BİTİŞ KRİTERLERİ)

- [ ] Production URL live ve erişilebilir
- [ ] Health check: healthy
- [ ] Smoke test: tüm adımlar pass
- [ ] Demo salon production'da çalışıyor
- [ ] Full chain: web form → lead → classify → booking → reminder
- [ ] Admin panel: login, dashboard, leads, bookings, logs, escalations
- [ ] GDPR: consent, export, deletion çalışıyor
- [ ] Clone: ikinci salon config ile test edilmiş
- [ ] Security: rate limit, CORS, auth, webhook verification
- [ ] Testler: tüm testler geçiyor
- [ ] Dokümantasyon: deployment checklist, client onboarding, API reference
- [ ] CLAUDE.md: final ve güncel

## 🎯 PROJE TAMAMLANDI SAYILMA KRİTERİ:
Tek bir salon için web → lead → intent → booking → reminder zinciri production'da çalışıyorsa,
admin panelden operasyon görünüyorsa,
ikinci salon config ile clone edilebiliyorsa,
GDPR uyumluysa,
tüm testler geçiyorsa
→ SİSTEM MÜŞTERİYE HAZIR.
