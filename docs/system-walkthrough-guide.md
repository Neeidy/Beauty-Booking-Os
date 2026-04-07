# BEAUTY BOOKING OS — SİSTEM KULLANIM REHBERİ
## Kendin Görmek + Müşteriye Göstermek İçin

---

## SİSTEMİ BAŞLATMA

```bash
cd c:\Users\yigit\Desktop\beauty-booking-os
pnpm dev
```
Tarayıcıda aç: **http://localhost:3030**

---

## 1. MÜŞTERİ TARAFI (Salon Websitesi)

### 1.1 Landing Page → localhost:3030/
Burası salonun müşterisinin gördüğü ana sayfa.
- Salon adı, hizmetler, CTA butonları
- "Jetzt Termin buchen" butonu → booking formuna yönlendirir
- Alt kısımda: iletişim, adres, Datenschutz linki

### 1.2 Booking Formu → localhost:3030/booking
Müşteri buradan randevu talebi gönderir.
**Test için doldur:**
- Ad Soyad: Maria Testkundin
- E-posta: maria@test.at
- Telefon: +43 660 1234567
- Hizmet: Gel Manikür (dropdown'dan seç)
- Tercih edilen tarih: yarın
- GDPR checkbox'ları:
  - ☑ Datenverarbeitung (ZORUNLU — işaretlemeden submit edilemez)
  - ☑ Terminerinnerungen (reminder almak için)
  - ☐ Marketing (opsiyonel)
- Submit et

### 1.3 Thank You Page → localhost:3030/booking/thank-you
Form submit sonrası müşteri bunu görür:
- "Vielen Dank!" mesajı
- "Wir melden uns innerhalb von X Stunden"
- Salon iletişim bilgileri

---

## 2. ADMIN PANELİ (Salon Yöneticisi Tarafı)

### 2.1 Giriş → localhost:3030/admin/login
- Admin şifresi: .env dosyasındaki ADMIN_SECRET değeri
- Giriş yaptıktan sonra dashboard'a yönlendirilirsin

### 2.2 Dashboard → localhost:3030/admin/dashboard
Tek bakışta operasyon özeti:
- **Bugün:** Yeni lead sayısı, bugünkü booking, bekleyen aksiyonlar, planlı reminder'lar
- **Bu hafta:** Toplam lead, toplam booking, conversion rate, no-show, iptal
- **AI Maliyeti:** Bugün kullanılan token, bu hafta token, tahmini maliyet (EUR)
- **Escalation Alert:** İnsan müdahalesi gerektiren lead varsa kırmızı badge

### 2.3 Leads → localhost:3030/admin/leads
Tüm gelen talepler burada:
- **Kolonlar:** Tarih, İsim, İletişim, Kaynak (web/whatsapp/instagram), Intent, Confidence, Status
- **Filtreler:** Status, kaynak, tarih aralığı, arama
- **Renk kodları:**
  - Yeşil confidence (>0.8) = AI emin
  - Sarı (0.5-0.8) = AI belirsiz
  - Kırmızı (<0.5) = AI anlamadı, insan gerekli
- **Sarı satırlar** = needs_human_review — bunlar escalation kuyruğuna düşer
- Satıra tıkla → detay: raw mesaj, AI sınıflandırma sonucu, mesaj geçmişi

### 2.4 Bookings → localhost:3030/admin/bookings
Tüm randevular burada:
- **Kolonlar:** Randevu tarihi/saati, müşteri, hizmet, durum, reminder durumu
- **Status badge'leri:**
  - 🟡 Pending = bekliyor
  - 🟢 Confirmed = onaylandı
  - ✅ Completed = tamamlandı
  - 🔴 No-show = gelmedi
  - ⚪ Cancelled = iptal edildi
- **Aksiyon butonları:** Onayla, İptal Et, No-show İşaretle
- Bugünün randevuları vurgulu gösterilir

### 2.5 Logs → localhost:3030/admin/logs
Sistemde olan her şeyin kaydı:
- Her AI agent çağrısı loglanır
- **Kolonlar:** Zaman, Event Type, Agent, Status, Süre (ms), Token, Özet
- **Filtreler:** Agent adı, event type, status, tarih
- Tıkla → detay: input ne verildi, output ne döndü, hata varsa ne
- **Neden önemli:** Sistem tıkandığında sorunun nerede olduğunu buradan bulursun

### 2.6 Escalations → localhost:3030/admin/escalations
AI'ın emin olamadığı talepler buraya düşer:
- Düşük confidence → "AI anlayamadı, siz bakın"
- Bilinmeyen hizmet talebi → "Hizmet listesinde yok"
- Agresif/karmaşık mesaj → "İnsan müdahalesi gerekli"
- **Aksiyonlar:** Qualify Et (ilerlet), Spam İşaretle, Manuel Takip

---

## 3. ARKA PLANDA NE OLUYOR? (Akış)

### Bir müşteri form doldurduğunda:
```
Müşteri form doldurup gönderir
    ↓
POST /api/lead → Lead kaydı DB'ye yazılır
    ↓
GDPR consent kayıtları ayrı tabloya yazılır
    ↓
Orchestrator devreye girer → "Bu yeni bir lead, Intake Agent'a gönder"
    ↓
Intake Agent (AI) mesajı analiz eder:
  - Intent: yeni randevu talebi
  - Confidence: 0.92
  - Dil: Almanca
    ↓
Booking Agent (AI) devreye girer:
  - Hizmet eşleştirmesi yapar
  - Sonraki adımı belirler
    ↓
Booking kaydı oluşturulur
    ↓
Otomatik job'lar planlanır:
  - 24 saat kala hatırlatma
  - 3 saat kala son hatırlatma
    ↓
Onay e-postası gönderilir (Resend API varsa)
```

### Hatırlatma sistemi:
```
Randevuya 24 saat kala:
  → Follow-up Agent kısa mesaj üretir
  → "Hallo Maria, wir möchten Sie an Ihren morgigen Termin erinnern..."
  → E-posta gönderilir

Randevuya 3 saat kala:
  → Son hatırlatma: "Ihr Termin ist heute um 14:00. Wir freuen uns!"
```

### Müşteri iptal ederse:
```
Admin panelden "İptal Et" tıklanır
    ↓
Mevcut hatırlatma job'ları iptal edilir
    ↓
48 saat sonraya recovery job planlanır
    ↓
Follow-up Agent nazik geri kazanım mesajı üretir:
  "Wir würden uns freuen, Sie bald wieder bei uns zu begrüßen..."
    ↓
2 kez cevap yoksa → mesaj göndermeyi durdurur (spam yapmaz)
```

### Müşteri gelmezse (no-show):
```
Admin panelden "No-show" tıklanır
    ↓
Recovery job planlanır
    ↓
Winback mesajı gönderilir
    ↓
Max 2 deneme — sonra durur
```

---

## 4. ÇOK KİRACILI (MULTI-TENANT) SİSTEM

### Yeni salon ekleme:
```bash
# 1. Yeni salon config dosyaları oluştur
clients/yeni-salon/client.config.json
clients/yeni-salon/services.json
clients/yeni-salon/branding.json

# 2. Clone script çalıştır
pnpm tsx scripts/clone-client.ts yeni-salon

# 3. Bitti — yeni salon kendi config'i ile çalışıyor
```

### Her salon neyi farklı yapabilir?
- Farklı hizmetler (nail, hair, skin...)
- Farklı diller (DE, EN, TR kombinasyonu)
- Farklı marka tonu (Sie-Form vs Du-Form, emoji var/yok)
- Farklı renkler ve CTA'lar
- Farklı paket (Starter / Growth / Premium)
- Farklı çalışma saatleri
- Farklı hatırlatma kuralları

### Kod değişikliği: SIFIR
Yeni salon = yeni JSON dosyaları. Hepsi config'den.

---

## 5. PAKETLER

| Özellik | Starter | Growth | Premium |
|---------|---------|--------|---------|
| Website + form | ✅ | ✅ | ✅ |
| Temel booking | ✅ | ✅ | ✅ |
| AI intent sınıflandırma | ❌ | ✅ | ✅ |
| AI booking akışı | ❌ | ✅ | ✅ |
| AI follow-up | ❌ | ✅ | ✅ |
| WhatsApp yönlendirme | ❌ | ✅ | ✅ |
| Geri kazanım akışı | ❌ | ✅ | ✅ |
| Çoklu dil | ❌ | ✅ | ✅ |
| Instagram DM | ❌ | ❌ | ✅ |
| Detaylı raporlama | ❌ | ❌ | ✅ |
| Hatırlatma sayısı | 1 | 2 | 3 |

---

## 6. GDPR (VERİ KORUMA)

Sistem Avusturya/AB GDPR yasalarına uyumlu:
- ✅ Açık onay toplama (pre-checked box YOK)
- ✅ Ayrı ayrı consent: veri işleme, hatırlatma, pazarlama
- ✅ Consent kayıtları DB'de saklanıyor (ne zaman, nasıl, neye onay verildi)
- ✅ Veri dışa aktarma: müşteri isterse tüm verileri JSON olarak verebilirsin
- ✅ Veri silme: müşteri isterse tüm kişisel veriler anonimleştiriliyor
- ✅ Otomatik veri temizliği: 2 yıl sonra eski veriler otomatik anonimleştirilir
- ✅ Datenschutzerklärung sayfası linki footer'da

---

## 7. GÜVENLİK

- Rate limiting: spam form submit engeli
- Input sanitization: XSS ve injection koruması
- Webhook doğrulama: HMAC-SHA256 imza kontrolü
- CORS: sadece izin verilen domain'ler
- Security headers: CSP, X-Frame-Options, HSTS
- Admin auth: korumalı panel
- Audit trail: her işlem loglanır

---

## 8. MALİYET YAPISI

### AI Maliyeti (Claude API):
- Her lead sınıflandırma: ~200-400 token (~$0.001)
- Her booking akış adımı: ~300-500 token (~$0.002)
- Her mesaj üretimi: ~200-300 token (~$0.001)
- Template-first yaklaşım: hatırlatmalar template'den gelirse AI çağrısı SIFIR
- **Tahmini: salon başına günde ~$0.05-0.20 AI maliyeti**

### Altyapı:
- Supabase Free Tier: 500MB DB, 50K auth requests → başlangıç için yeterli
- Vercel Free/Hobby: otomatik deploy → başlangıç için yeterli
- Resend Free: 100 email/gün → başlangıç için yeterli

### Salon başına tahmini aylık maliyet: ~$5-15
(Yüksek hacimli salonlarda: ~$20-30)

---

## 9. TEST KOMUTU

Tüm testleri çalıştırmak için:
```bash
cd c:\Users\yigit\Desktop\beauty-booking-os
pnpm test
```
Beklenen: 197/197 passing

---

## 10. DEMO SENARYOSU (MÜŞTERİYE GÖSTERİRKEN)

### Adım 1: "Bakın, müşteriniz böyle görüyor"
→ Landing page'i göster, hizmetleri göster

### Adım 2: "Randevu talebi geliyor"
→ Booking formu doldur, submit et

### Adım 3: "Talep anında sisteme düşüyor"
→ Admin panele geç, lead listesinde göster

### Adım 4: "AI otomatik sınıflandırıyor"
→ Lead detayında intent ve confidence göster

### Adım 5: "Hatırlatmalar otomatik"
→ Automation jobs tablosunu göster (veya açıkla)

### Adım 6: "İptal olursa geri kazanım çalışıyor"
→ İptal et, recovery job'un oluştuğunu göster

### Adım 7: "İkinci salonu 5 dakikada ekleriz"
→ Clone scriptini açıkla, sıfır kod değişikliği

### Adım 8: "GDPR uyumlu, Avusturya yasalarına hazır"
→ Consent checkbox'ları ve privacy linkini göster

### Kapanış: "Her şey tek panelden yönetiliyor"
→ Dashboard'u göster: lead, booking, log, maliyet
