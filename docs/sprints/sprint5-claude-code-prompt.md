# SPRINT 5 — ADMIN PANEL + OBSERVABILITY

Sprint 4 tamamlandı (119/119 test). Şimdi Sprint 5'e geçiyoruz.

## SPRINT 5 HEDEFİ
Salon operatörü admin panelden lead'leri, booking'leri ve logları görebiliyor. Temel istatistikler var. Human escalation kuyruğu çalışıyor. AI maliyet takibi görünür.

## YAPILACAKLAR (BU SIRAYLA)

### ADIM 1: Admin Layout + Auth
**OBJECTIVE:** Admin paneli için korumalı layout + basit auth.
**FILES:**
- `apps/web/app/admin/layout.tsx` — Admin layout (sidebar + header)
- `apps/web/app/admin/page.tsx` — Dashboard redirect
- `apps/web/lib/admin-auth.ts` — Basit auth middleware
- `apps/web/components/admin/Sidebar.tsx`
- `apps/web/components/admin/AdminHeader.tsx`

**TASKS:**
1. Auth: V1'de basit çözüm — Supabase Auth VEYA environment variable ile shared secret
   - Eğer Supabase Auth karmaşık gelirse: header'da `ADMIN_SECRET` kontrolü yeterli V1 için
   - Orta yol: basit login sayfası + cookie-based session
2. Admin layout:
   - Sol sidebar: Dashboard, Leads, Bookings, Logs, Settings
   - Üst header: Salon adı (config'den), logout butonu
   - Responsive: tablet+ (mobile admin panel V1'de şart değil)
3. Dashboard sayfası: Adım 2'de doldurulacak, şimdilik placeholder
4. UI: Temiz, fonksiyonel, Tailwind — premium görünüm şart değil, okunabilirlik şart

**ACCEPTANCE:**
- /admin auth kontrolü var, yetkisiz erişim engelleniyor
- Sidebar navigasyonu çalışıyor
- Tüm admin sayfalar layout içinde render ediliyor
- Salon adı config'den geliyor

**BİTİNCE:** `git add . && git commit -m "sprint5-step1: admin layout + auth" && git push`

---

### ADIM 2: Dashboard + İstatistikler
**OBJECTIVE:** Temel operasyon metrikleri tek bakışta görünsün.
**FILES:**
- `apps/web/app/admin/dashboard/page.tsx`
- `apps/web/app/api/admin/stats/route.ts`
- `apps/web/components/admin/StatCard.tsx`

**TASKS:**
1. GET /api/admin/stats endpoint:
   - Auth kontrolü
   - clientId bazlı istatistikler:
```typescript
interface DashboardStats {
  today: {
    newLeads: number;
    bookingsToday: number;
    pendingActions: number;      // needs_human_review leads
    remindersScheduled: number;
  };
  thisWeek: {
    totalLeads: number;
    totalBookings: number;
    conversionRate: number;      // bookings / leads * 100
    noShows: number;
    cancellations: number;
  };
  aiCosts: {
    totalTokensToday: number;
    totalTokensThisWeek: number;
    estimatedCostEur: number;    // tokens * rate
  };
  escalationQueue: number;        // needs_human_review count
}
```
2. Dashboard sayfası:
   - 4 stat kartı üst sıra: Bugün yeni lead, bugün booking, bekleyen aksiyon, planlı reminder
   - Haftalık özet: toplam lead, toplam booking, conversion rate, no-show, iptal
   - AI maliyet kutusu: bugün token, bu hafta token, tahmini maliyet
   - Escalation alert: bekleyen human review varsa kırmızı badge
3. Veriler API'dan client-side fetch ile

**ACCEPTANCE:**
- Dashboard gerçek verilerle yükleniyor
- Stat kartları doğru sayıları gösteriyor
- AI token maliyeti görünür
- Escalation varsa belirgin uyarı var

**BİTİNCE:** `git add . && git commit -m "sprint5-step2: admin dashboard with stats + ai cost tracking" && git push`

---

### ADIM 3: Lead Listesi
**OBJECTIVE:** Tüm lead'leri filtrelenebilir tablo olarak göster.
**FILES:**
- `apps/web/app/admin/leads/page.tsx`
- `apps/web/app/api/admin/leads/route.ts`
- `apps/web/components/admin/LeadTable.tsx`

**TASKS:**
1. GET /api/admin/leads:
   - Auth kontrolü
   - Query params: status, source, dateFrom, dateTo, search (isim/email/telefon)
   - Pagination: page, limit (default 20)
   - Sort: createdAt desc (default)
   - Response: `{ leads: Lead[], total: number, page: number, totalPages: number }`
2. Lead tablosu:
   - Kolonlar: Tarih, İsim, İletişim, Kaynak (icon: web/whatsapp/instagram), Intent, Confidence, Status, Aksiyon
   - Status badge renkleri: new=mavi, qualified=yeşil, booked=yeşil-koyu, lost=gri, spam=kırmızı
   - Confidence: renk kodlu (>0.8 yeşil, 0.5-0.8 sarı, <0.5 kırmızı)
   - needs_human_review olan satırlar sarı arka plan ile belirgin
3. Filtreler: Status dropdown, Source dropdown, tarih aralığı, arama kutusu
4. Tıklama: lead detay modal veya genişleyen satır (V1'de basit genişleme yeterli)
   - Detayda: raw mesaj, classify sonucu, booking varsa link, mesaj geçmişi

**ACCEPTANCE:**
- Lead listesi yükleniyor, pagination çalışıyor
- Filtreler çalışıyor
- needs_human_review olanlar belirgin
- Lead detayları görüntülenebiliyor
- Boş state güzel görünüyor ("Henüz lead yok")

**BİTİNCE:** `git add . && git commit -m "sprint5-step3: admin lead list with filters + detail view" && git push`

---

### ADIM 4: Booking Listesi
**OBJECTIVE:** Tüm booking'leri filtrelenebilir tablo olarak göster.
**FILES:**
- `apps/web/app/admin/bookings/page.tsx`
- `apps/web/app/api/admin/bookings/route.ts`
- `apps/web/components/admin/BookingTable.tsx`

**TASKS:**
1. GET /api/admin/bookings:
   - Auth kontrolü
   - Query params: status, dateFrom, dateTo, search
   - Pagination + sort (appointmentAt asc — yaklaşan randevular üstte)
2. Booking tablosu:
   - Kolonlar: Randevu Tarihi/Saati, Müşteri, Hizmet, Durum, Reminder Status, Aksiyonlar
   - Status badge: pending=sarı, confirmed=yeşil, completed=gri, no_show=kırmızı, cancelled=gri-çizgili
   - Reminder status: kaç reminder gönderildi / kaçı planlanmış
   - Aksiyonlar: "Onayla", "İptal Et", "No-show İşaretle" butonları
3. Aksiyon butonları:
   - Onayla → PATCH /api/booking/:id/status { status: 'confirmed' }
   - İptal → POST /api/booking/:id/cancel
   - No-show → PATCH /api/booking/:id/status { status: 'no_show' }
   - Her aksiyondan sonra tabloyu refresh et
4. Bugünün randevuları üstte, vurgulu

**ACCEPTANCE:**
- Booking listesi yükleniyor
- Filtreler ve pagination çalışıyor
- Aksiyon butonları çalışıyor (status değişiyor)
- Bugünün randevuları vurgulu

**BİTİNCE:** `git add . && git commit -m "sprint5-step4: admin booking list with actions" && git push`

---

### ADIM 5: Event Log Viewer
**OBJECTIVE:** Sistem olaylarını filtrelenebilir log akışı olarak göster.
**FILES:**
- `apps/web/app/admin/logs/page.tsx`
- `apps/web/app/api/admin/logs/route.ts`
- `apps/web/components/admin/LogViewer.tsx`

**TASKS:**
1. GET /api/admin/logs:
   - Auth kontrolü
   - Query params: event_type, agent_name, status, dateFrom, dateTo, leadId, bookingId
   - Pagination: page, limit (default 50)
   - Sort: createdAt desc (en yeni üstte)
2. Log viewer:
   - Kolonlar: Zaman, Event Type, Agent, Status, Süre (ms), Token, Özet
   - Status renkleri: success=yeşil, failure=kırmızı, timeout=turuncu, escalated=sarı
   - Agent renkleri: her agent farklı renk badge
   - Token kolonu: maliyet farkındalığı için
   - Tıklama: detay genişlemesi — input_summary, output_summary, error_message, full payload
3. Filtreler: Event type, agent, status, tarih aralığı, lead/booking ID arama
4. Auto-refresh toggle: her 30 saniye yenile (opsiyonel)
5. Maliyet özeti: sayfanın üstünde filtrelenen log'ların toplam token kullanımı

**ACCEPTANCE:**
- Log listesi yükleniyor
- Filtreler çalışıyor
- Detay görüntülenebiliyor
- Token maliyeti görünür
- Hatalı log'lar kırmızı ile belirgin

**BİTİNCE:** `git add . && git commit -m "sprint5-step5: event log viewer with filters" && git push`

---

### ADIM 6: Human Escalation Queue
**OBJECTIVE:** Human review gerektiren lead'ler için özel kuyruk görünümü.
**FILES:**
- `apps/web/app/admin/escalations/page.tsx`
- `apps/web/app/api/admin/escalations/route.ts`
- `apps/web/components/admin/EscalationCard.tsx`

**TASKS:**
1. GET /api/admin/escalations:
   - needs_human_review = true olan lead'ler
   - Öncelik sırası: en eski üstte (FIFO)
   - Her lead için: raw mesaj, intent (varsa), confidence, kaynak, tarih
2. Escalation kartları:
   - Müşteri bilgisi + raw mesaj gösterimi
   - Neden escalate oldu: "Düşük confidence (0.4)", "Agresif dil", "Bilinmeyen hizmet"
   - Aksiyon butonları:
     - "Qualify Et" → lead status: qualified, needs_human_review: false
     - "Spam İşaretle" → lead status: spam, needs_human_review: false
     - "Manuel Takip" → assignedTo alanına operator adı yaz
3. Sayfa: Dashboard sidebar'da escalation sayısı badge olarak göster
4. Boş state: "Tüm talepler işlendi ✓"

**ACCEPTANCE:**
- Escalation kuyruğu yükleniyor
- Aksiyon butonları çalışıyor (lead güncelleniyor)
- İşlem sonrası kart listeden kalkıyor
- Sidebar'da escalation sayısı badge gösteriyor
- Boş state temiz görünüyor

**BİTİNCE:** `git add . && git commit -m "sprint5-step6: human escalation queue" && git push`

---

## SPRINT 5 BİTİŞ KRİTERLERİ

- [ ] Admin panel auth ile korunuyor
- [ ] Dashboard gerçek istatistiklerle yükleniyor
- [ ] AI token maliyeti görünür
- [ ] Lead listesi filtrelenebilir, needs_human_review belirgin
- [ ] Booking listesi aksiyonlarla çalışıyor (onayla/iptal/no-show)
- [ ] Event log viewer filtreleme + detay ile çalışıyor
- [ ] Human escalation kuyruğu fonksiyonel
- [ ] Sidebar'da escalation badge
- [ ] Tüm testler geçiyor (119+ mevcut + yeni)
- [ ] CLAUDE.md güncellendi

## SPRINT 5 TAMAMLANINCA CLAUDE.md'YE EKLE:
```
## Sprint 5 Status: TAMAMLANDI
- Admin Auth: [yöntem] ile korumalı
- Dashboard: 4 stat kart + haftalık özet + AI maliyet + escalation alert
- Lead List: filtreleme, pagination, detail view, human review vurgusu
- Booking List: filtreleme, onayla/iptal/no-show aksiyonları
- Event Logs: agent/type/status filtre, token tracking, detay görünümü
- Escalation Queue: FIFO kuyruk, qualify/spam/takip aksiyonları
- Test: XX/XX geçiyor
```
