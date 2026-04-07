# SPRINT 3 — BOOKING FLOW + UI

Sprint 2 tamamlandı (75/75 test). Şimdi Sprint 3'e geçiyoruz.

## SPRINT 3 HEDEFİ
Müşteri web formu doldurup booking akışını tetikleyebiliyor. Landing page, booking form (GDPR checkboxları dahil), thank-you page, booking kaydı, onay mesajı ve GDPR consent kaydı çalışıyor.

## YAPILACAKLAR (BU SIRAYLA)

### ADIM 1: Layout + Landing Page
**OBJECTIVE:** Salon landing page — responsive, brand config'den renk/ton alıyor.
**FILES:**
- `apps/web/app/layout.tsx` — Root layout (font, meta, global styles)
- `apps/web/app/page.tsx` — Landing page
- `apps/web/components/Header.tsx`
- `apps/web/components/HeroSection.tsx`
- `apps/web/components/ServicesSection.tsx`
- `apps/web/components/CTASection.tsx`
- `apps/web/components/Footer.tsx`

**TASKS:**
1. Root layout: metadata, viewport, font (Google Fonts — salon brand'a uygun premium font)
2. Landing page bileşenleri:
   - Header: Salon adı + navigasyon (Hizmetler, Randevu Al, İletişim)
   - Hero: Başlık + alt başlık + CTA butonu ("Jetzt Termin buchen")
   - Services: demo-salon services.json'dan kategoriler ve hizmetler listesi
   - CTA: WhatsApp butonu + booking form linki
   - Footer: Adres, iletişim, sosyal medya, Datenschutz linki
3. Responsive: Mobile-first, 3 breakpoint (mobile, tablet, desktop)
4. Branding: clients/demo-salon/branding.json'daki renkleri CSS variables olarak kullan
5. Tailwind CSS ile styling — generic AI görünümünden kaçın, premium salon hissi ver

**ACCEPTANCE:**
- Landing page render ediliyor
- Hizmetler services.json'dan geliyor
- CTA butonları /booking'e yönlendiriyor
- Mobile responsive çalışıyor
- Datenschutz linki footer'da var

**BİTİNCE:** `git add . && git commit -m "sprint3-step1: landing page with brand styling" && git push`

---

### ADIM 2: Booking Form + GDPR Checkboxlar
**OBJECTIVE:** Lead toplama formu — GDPR uyumlu, Zod validated.
**FILES:**
- `apps/web/app/booking/page.tsx` — Booking form sayfası
- `apps/web/components/BookingForm.tsx` — Form bileşeni
- `apps/web/lib/booking-form-schema.ts` — Zod validation schema

**TASKS:**
1. Form alanları:
   - Ad Soyad (zorunlu)
   - E-posta VEYA Telefon (en az biri zorunlu)
   - Hizmet seçimi (dropdown — services.json'dan)
   - Tercih edilen tarih/saat aralığı (basit date+time picker veya text input V1)
   - Notlar (opsiyonel, max 500 karakter)
2. GDPR Checkbox'ları (ZORUNLU — Avusturya/AB hukuku):
   ```
   ☐ Ich stimme der Verarbeitung meiner Daten für die Terminvereinbarung zu. * (ZORUNLU)
     → Link: Datenschutzerklärung lesen
   ☐ Ich möchte Terminerinnerungen per E-Mail/WhatsApp erhalten. * (ZORUNLU for reminders)
   ☐ Ich möchte über Angebote und Neuigkeiten informiert werden. (OPSIYONEL)
   ```
3. Client-side validation: Zod schema ile
4. Form submit: POST /api/lead endpoint'ine gönder
5. Loading state + error handling (API hatası durumunda kullanıcıya mesaj)
6. Dil: Almanca (varsayılan), brand config'den

**VALIDATION SCHEMA:**
```typescript
const bookingFormSchema = z.object({
  customerName: z.string().min(2, "Name ist erforderlich"),
  customerEmail: z.string().email("Ungültige E-Mail").optional().or(z.literal("")),
  customerPhone: z.string().min(6, "Ungültige Telefonnummer").optional().or(z.literal("")),
  serviceId: z.string().min(1, "Bitte wählen Sie eine Leistung"),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  notes: z.string().max(500).optional(),
  gdprDataProcessing: z.literal(true, { errorMap: () => ({ message: "Zustimmung erforderlich" }) }),
  gdprReminders: z.boolean(),
  gdprMarketing: z.boolean(),
}).refine(data => data.customerEmail || data.customerPhone, {
  message: "E-Mail oder Telefonnummer ist erforderlich",
  path: ["customerEmail"],
});
```

**ACCEPTANCE:**
- Form render ediliyor, tüm alanlar çalışıyor
- GDPR zorunlu checkbox işaretlenmeden submit edilemiyor
- E-posta veya telefon — en az biri olmadan submit edilemiyor
- Validation hataları Almanca gösteriliyor
- Submit POST /api/lead'e gidiyor
- Loading ve error state'leri çalışıyor

**BİTİNCE:** `git add . && git commit -m "sprint3-step2: booking form with GDPR checkboxes + validation" && git push`

---

### ADIM 3: Thank You Page
**OBJECTIVE:** Form submit sonrası güven veren onay sayfası.
**FILE:** `apps/web/app/booking/thank-you/page.tsx`

**TASKS:**
1. Basit ama güven veren sayfa:
   - ✓ ikonu + "Vielen Dank, Ihre Anfrage wurde empfangen!"
   - "Wir melden uns innerhalb von [X] Stunden bei Ihnen."
   - Salon iletişim bilgileri (telefon, WhatsApp, e-posta)
   - "Zurück zur Startseite" butonu
2. Brand renkleri ile styling
3. URL: /booking/thank-you

**ACCEPTANCE:**
- Sayfa render ediliyor
- Brand renkleri uygulanmış
- İletişim bilgileri doğru
- Ana sayfaya dönüş linki çalışıyor

**BİTİNCE:** `git add . && git commit -m "sprint3-step3: thank you page" && git push`

---

### ADIM 4: Lead API → Classify Zinciri Güncelleme
**OBJECTIVE:** Form submit → lead oluştur → otomatik classify tetikle → GDPR consent kaydet.
**FILES:**
- `apps/web/app/api/lead/route.ts` — Güncelle: GDPR consent kaydı ekle
- `apps/web/app/api/gdpr/consent/route.ts` — Yeni: GDPR consent endpoint

**TASKS:**
1. POST /api/lead güncellemesi:
   - Form verisini al ve validate et
   - Lead kaydı oluştur (mevcut logic)
   - GDPR consent kayıtlarını gdpr_consents tablosuna yaz:
     - data_processing consent (zorunlu)
     - reminder consent (opsiyonel)
     - marketing consent (opsiyonel)
   - Feature flag kontrolü: aiIntake aktifse → otomatik classify tetikle
   - Event log kaydet
   - Response: `{ success: true, leadId: "...", redirectTo: "/booking/thank-you" }`
2. POST /api/gdpr/consent:
   - Yeni consent kaydı oluştur
   - Validate: consentType, granted, method zorunlu
3. Booking form'u güncelle: API response'dan redirectTo'ya yönlendir

**ACCEPTANCE:**
- Form submit → lead + GDPR consent kayıtları DB'de
- aiIntake feature aktifse classify otomatik çalışıyor
- /booking/thank-you'ya redirect oluyor
- Event log'da tüm adımlar görünüyor

**BİTİNCE:** `git add . && git commit -m "sprint3-step4: lead api with gdpr consent + auto classify" && git push`

---

### ADIM 5: Booking Endpoint
**OBJECTIVE:** Qualify edilmiş lead'den booking kaydı oluştur.
**FILE:** `apps/web/app/api/booking/route.ts`

**TASKS:**
1. POST /api/booking:
   - Input: leadId, serviceId, appointmentAt, customerName, customerContact
   - Validate: Zod schema
   - Lead'in var olduğunu ve status'ünün uygun olduğunu kontrol et
   - Service'in var ve active olduğunu kontrol et
   - Booking kaydı oluştur (status: pending)
   - Lead status'ünü 'booked' olarak güncelle
   - Reminder job'ları oluştur: reminder_24h ve reminder_3h (automation_jobs tablosuna, status: scheduled)
   - Event log kaydet
   - Response: `{ success: true, bookingId: "...", booking: {...} }`
2. Error cases: lead bulunamadı (404), service bulunamadı (404), validation hatası (400)

**ACCEPTANCE:**
- Booking kaydı oluşuyor
- Lead status güncelleniyor
- 2 reminder job (24h + 3h) automation_jobs'da oluşuyor
- Event log yazılıyor
- Error case'leri doğru HTTP status dönüyor

**BİTİNCE:** `git add . && git commit -m "sprint3-step5: booking endpoint with reminder job scheduling" && git push`

---

### ADIM 6: Email Confirmation Template
**OBJECTIVE:** Booking sonrası onay e-postası gönderim altyapısı.
**FILES:**
- `packages/integrations/email/client.ts` — Email client (Resend veya Nodemailer)
- `packages/integrations/email/templates/booking-confirmation.ts` — Template

**TASKS:**
1. Email client:
   - Eğer RESEND_API_KEY varsa Resend kullan
   - Yoksa console.log ile "email gönderilecekti" log'la (V1 fallback)
   - Send fonksiyonu: `sendEmail({ to, subject, html })`
2. Booking confirmation template:
   - branding.json'daki messageTemplates.bookingConfirmation'dan al
   - Placeholder'ları doldur: {customerName}, {serviceName}, {date}, {time}, {salonName}
   - Dil: lead'in language alanına göre (de/en/tr)
   - Basit HTML email — inline CSS, salon renkleri
3. POST /api/booking endpoint'ine email gönderimini ekle (booking oluştuktan sonra)
4. Email gönderim hatası booking'i bloke etmemeli — try/catch ile log'la, devam et

**ACCEPTANCE:**
- Email template 3 dilde çalışıyor
- Placeholder'lar doğru dolduruluyor
- RESEND_API_KEY yoksa hata vermeden log'luyor
- Booking endpoint email tetikliyor
- Email hatası booking'i bozmuyor

**BİTİNCE:** `git add . && git commit -m "sprint3-step6: email confirmation with multilingual template" && git push`

---

## SPRINT 3 BİTİŞ KRİTERLERİ

- [ ] Landing page responsive ve brand renkleri ile çalışıyor
- [ ] Booking form GDPR checkboxları ile submit ediliyor
- [ ] Thank-you page gösteriliyor
- [ ] Lead + GDPR consent kayıtları DB'de oluşuyor
- [ ] aiIntake aktifse classify otomatik çalışıyor
- [ ] Booking kaydı oluşuyor + reminder job'ları planlanıyor
- [ ] Email onay template'i 3 dilde çalışıyor
- [ ] Tüm mevcut testler hala geçiyor (75+ Sprint 2 testleri)
- [ ] Yeni testler eklendi ve geçiyor
- [ ] CLAUDE.md güncellendi

## SPRINT 3 TAMAMLANINCA CLAUDE.md'YE EKLE:
```
## Sprint 3 Status: TAMAMLANDI
- Landing page: responsive, brand-styled, services.json entegrasyonu
- Booking form: GDPR checkboxları, Zod validation, Almanca
- Thank-you page: güven veren onay sayfası
- Lead API: GDPR consent kaydı + auto-classify zinciri
- Booking API: kayıt oluşturma + reminder job scheduling
- Email: multilingual confirmation template (DE/EN/TR)
- Test: XX/XX geçiyor
```
