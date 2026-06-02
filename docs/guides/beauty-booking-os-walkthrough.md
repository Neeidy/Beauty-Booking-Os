# BEAUTY BOOKING OS — CANLI SİSTEM REHBERİ
## Sistemi Tanı, Test Et, Müşteriye Anlat

---

## BAŞLAMADAN ÖNCE

Terminal'de proje klasöründe şunu çalıştır:
```
cd beauty-booking-os
pnpm dev
```
Tarayıcıda aç: **http://localhost:3030**

---

## BÖLÜM 1: MÜŞTERİNİN GÖRECEĞİ (Customer-Facing)

### 1.1 Landing Page → localhost:3030
Bunu gör:
- Salon adı ve açıklaması
- Hizmet listesi (services.json'dan geliyor)
- "Jetzt Termin buchen" CTA butonu
- WhatsApp / iletişim bilgileri
- Footer'da Datenschutz (GDPR) linki

**Müşteriye anlatırken:** "Bu sizin müşterilerinizin ilk göreceği sayfa. Hizmetleriniz otomatik listelenir, randevu butonu direkt forma yönlendirir."

### 1.2 Booking Form → localhost:3030/booking
Şunu doldur (test data):
```
Ad Soyad: Maria Testkundin
E-posta: maria@test.at
Telefon: +43 660 1234567
Hizmet: Gel Maniküre (dropdown'dan seç)
Tarih: yarının tarihi
Notlar: Ich möchte eine helle Farbe
```

GDPR Checkboxları:
- ☑ Datenverarbeitung (ZORUNLU — işaretlemeden submit edilemez!)
- ☑ Terminerinnerungen (hatırlatma izni)
- ☐ Marketing (opsiyonel — işaretleme)

**Submit et** → Thank-you sayfasına yönleneceksin.

**Müşteriye anlatırken:** "Müşteriniz formu doldurduğunda 3 şey otomatik olur: talep kaydedilir, AI sistemi niyeti anlar, ve GDPR rızası kaydedilir. Hiçbir veri izinsiz işlenmez."

### 1.3 Thank You Page → localhost:3030/booking/thank-you
Bunu gör:
- Onay mesajı: "Vielen Dank, Ihre Anfrage wurde empfangen!"
- Geri dönüş süresi bilgisi
- İletişim bilgileri

**Müşteriye anlatırken:** "Müşteriniz talebinin alındığını hemen görür. Güven verir, rakibe gitmesini önler."

---

## BÖLÜM 2: ARKA PLANDA NE OLDU? (Sistem İç Görünümü)

Form submit edildiğinde sistem şunları yaptı (saniyeler içinde):

```
1. Lead kaydı oluşturuldu (leads tablosu)
2. GDPR rıza kaydı yazıldı (gdpr_consents tablosu)
3. AI Intake Agent devreye girdi → müşterinin niyetini analiz etti
4. Intent: "new_booking" (yeni randevu talebi)
5. Confidence: 0.85+ (yüksek güven)
6. Tüm adımlar event_logs tablosuna yazıldı
```

Bunu doğrulamak için admin panele geç →

---

## BÖLÜM 3: ADMİN PANELİ (Operatör Görünümü)

### 3.1 Admin Login → localhost:3030/admin
- Giriş yap (login bilgileri .env'de ADMIN_EMAIL ile ayarlanmış)
- Admin şifresi: Sprint 7'de oluşturulmuş

### 3.2 Dashboard → localhost:3030/admin/dashboard
Bunu gör:
- **Bugün yeni lead**: 1 (az önce oluşturduğun)
- **Bugün booking**: 0 (henüz onaylanmadı)
- **Bekleyen aksiyon**: escalation kuyruğu
- **AI maliyet**: Bugün kullanılan token sayısı + tahmini maliyet

**Müşteriye anlatırken:** "Salonunuzun tüm operasyonunu tek ekrandan görürsünüz. Kaç talep geldi, kaç randevu oluştu, AI ne kadar maliyet üretti — hepsi burada."

### 3.3 Lead Listesi → localhost:3030/admin/leads
Bunu gör:
- Maria Testkundin'in lead kaydı
- Source: web_form
- Intent: new_booking (AI tarafından belirlendi)
- Confidence: yeşil badge (0.85+)
- Status: new

**Satıra tıkla** → detay açılır:
- Raw mesaj: "Ich möchte eine helle Farbe"
- AI özeti
- GDPR consent durumu
- Booking varsa link

**Filtre dene:**
- Status dropdown: new, qualified, booked
- Source: web_form, whatsapp, instagram_dm

**Müşteriye anlatırken:** "Her gelen talep burada listelenir. AI otomatik olarak 'bu randevu talebi mi, fiyat sorusu mu, bilgi talebi mi' ayrımını yapar. Emin olamadığında sizin kuyruğunuza düşer."

### 3.4 Booking Listesi → localhost:3030/admin/bookings
- Henüz booking oluşmamış olabilir — lead'den booking oluşturmak için API gerekiyor
- Ama yapısını gör: Randevu tarihi, müşteri, hizmet, durum, reminder durumu
- Aksiyon butonları: Onayla, İptal Et, No-show İşaretle

**Müşteriye anlatırken:** "Tüm randevularınız burada. Onaylama, iptal etme, gelmeyeni işaretleme — tek tıkla. Hatırlatma mesajları otomatik planlanır."

### 3.5 Event Logs → localhost:3030/admin/logs
Bunu gör:
- agent_call kayıtları: intake-agent çağrıldı
- flow_step kayıtları: lead oluşturuldu
- Token kullanımı: her AI çağrısında kaç token harcandı

**Filtreler:**
- Agent: intake-agent, booking-agent, orchestrator
- Status: success, failure, escalated
- Tarih aralığı

**Müşteriye anlatırken:** "Sistem ne yaptı, ne zaman yaptı, nerede tıkandı — her şeyin kaydı tutulur. Hata olursa saniyeler içinde buluruz."

### 3.6 Escalation Kuyruğu → localhost:3030/admin/escalations
- Eğer AI emin olamadığı bir talep varsa burada görünür
- Aksiyonlar: Qualify Et, Spam İşaretle, Manuel Takip

**Müşteriye anlatırken:** "AI her şeyi otomatik yapmaz. Emin olmadığında talep size düşer. Bu sayede müşteriniz asla yanlış yönlendirilmez."

---

## BÖLÜM 4: OTOMATİK HATIRLATMA SİSTEMİ (Demo)

Hatırlatma sistemini test etmek için terminal'de:
```
curl -X POST http://localhost:3030/api/jobs/reminders/run \
  -H "x-webhook-secret: YOUR_WEBHOOK_SECRET"
```

Bu komutu çalıştırınca:
- automation_jobs tablosundaki zamanı gelmiş job'lar çalışır
- 24 saat kala / 3 saat kala hatırlatma mesajları üretilir
- Mesajlar messages tablosuna yazılır
- Event log'a kaydedilir

**Müşteriye anlatırken:** "Randevu onaylandığında sistem otomatik olarak 24 saat ve 3 saat kala hatırlatma gönderir. No-show oranınızı %30-40 düşürür."

---

## BÖLÜM 5: İPTAL + GERİ KAZANIM (Demo)

İptal testi:
```
curl -X POST http://localhost:3030/api/booking/BOOKING_ID/cancel \
  -H "Content-Type: application/json" \
  -d '{"cancelReason": "Zeitlich nicht möglich"}'
```

Ne olur:
1. Booking status → cancelled
2. Mevcut reminder job'ları iptal edilir
3. 48 saat sonra için recovery job planlanır
4. Recovery çalıştığında nazik geri kazanım mesajı üretilir
5. 2 kez cevap gelmezse sistem durur (spam yapmaz)

**Müşteriye anlatırken:** "Müşteri iptal ettiğinde kaybetmezsiniz. Sistem uygun zamanda nazik bir geri dönüş mesajı gönderir. Baskıcı değil, profesyonel."

---

## BÖLÜM 6: GDPR (Veri Koruma)

### Veri Dışa Aktarma (müşteri hakkı):
```
curl http://localhost:3030/api/gdpr/export/LEAD_ID \
  -H "Cookie: admin-session=YOUR_SESSION"
```
→ O müşterinin TÜM verisi JSON olarak döner

### Veri Silme (müşteri hakkı):
```
curl -X DELETE http://localhost:3030/api/gdpr/data/LEAD_ID \
  -H "Cookie: admin-session=YOUR_SESSION"
```
→ Kişisel veriler anonymize edilir, istatistiksel veriler korunur

**Müşteriye anlatırken:** "Avusturya'da GDPR zorunlu. Sisteminiz tamamen uyumlu: rıza kaydı, veri dışa aktarma, silme hakkı — hepsi hazır. 4%'e varan cezalardan korunursunuz."

---

## BÖLÜM 7: KLONLAMA (İkinci Müşteri Demo)

Supabase'de `clients` tablosuna bak:
- demo-salon: Vienna Glow Studio (Growth paket, Sie-Form, emoji yok)
- elegant-nails-vienna: Elegant Nails Vienna (Starter paket, Du-Form, emoji var)

**İki salonun farkları:**
| Özellik | Vienna Glow Studio | Elegant Nails Vienna |
|---|---|---|
| Paket | Growth | Starter |
| Hitap | Sie-Form (resmi) | Du-Form (samimi) |
| Emoji | Hayır | Evet |
| AI Intake | Aktif | Kapalı (human'a düşer) |
| Diller | DE, EN, TR | DE, TR |
| Hizmetler | Nail + Skin | Sadece Nail |

**Müşteriye anlatırken:** "Her salon için ayrı kod yazmıyoruz. Ayar dosyasını değiştiriyoruz — hizmetler, renkler, dil, hitap tarzı, paket özellikleri. Yeni salon = yeni config dosyası, hepsi bu."

---

## BÖLÜM 8: MÜŞTERİYE SATIŞ SUNUMU ÖZETİ

### Problem (müşterinin acısı):
"Gelen mesajlara geç dönüyorsunuz. Müşteri rakibe gidiyor. No-show yüzünden boş koltuk kalıyor. Instagram DM'de kayıp talep var."

### Çözüm (senin ürünün):
"Beauty Booking OS 7/24 çalışır. Gelen talebi saniyede anlar, doğru akışa yönlendirir, randevuyu oluşturur, hatırlatma gönderir, iptal olursa geri kazanır."

### Nasıl çalışır (3 adım):
1. **Müşteri yazar** → Web, WhatsApp veya Instagram'dan
2. **AI anlar ve yönlendirir** → Randevu talebi mi, fiyat sorusu mu, bilgi mi?
3. **Sistem otomatik yönetir** → Onay, hatırlatma, iptal takibi, geri kazanım

### Paketler:
| | Başlangıç | Büyüme | Premium |
|---|---|---|---|
| Website + Form | ✓ | ✓ | ✓ |
| AI Sınıflandırma | — | ✓ | ✓ |
| AI Booking Akışı | — | ✓ | ✓ |
| Hatırlatma | 1 | 2 | 3 |
| WhatsApp | — | ✓ | ✓ |
| Instagram DM | — | — | ✓ |
| Geri Kazanım | — | ✓ | ✓ |
| Çoklu Dil | — | ✓ | ✓ |
| Detaylı Rapor | — | — | ✓ |

### Rakip farkı:
"Booksy, Treatwell gibi platformlar komisyon keser ve müşteriyi kendi platformunda tutar. Beauty Booking OS sizin sisteminizdir — müşteri sizin, veri sizin, kontrol sizin."

### GDPR güvencesi:
"Avusturya'da GDPR uyumsuzluk cezası cironuzun %4'üne kadar çıkabilir. Sistemimiz tam uyumlu: rıza kaydı, veri silme, dışa aktarma — hepsi hazır."

---

## HIZLI TEST CHECKLIST

Bunları kendin tarayıcıda yap ve gözünle doğrula:

```
□ localhost:3030 açılıyor, hizmetler görünüyor
□ /booking formu açılıyor, alanlar çalışıyor  
□ GDPR checkbox olmadan submit edilemiyor
□ Form submit → /booking/thank-you'ya gidiyor
□ /admin login çalışıyor
□ /admin/dashboard istatistikler görünüyor
□ /admin/leads → az önceki lead listede
□ /admin/leads → lead detayı açılıyor
□ /admin/bookings → tablo çalışıyor
□ /admin/logs → event log'lar var
□ /admin/escalations → kuyruk çalışıyor
□ /api/health → {"status":"ok"} dönüyor
```
