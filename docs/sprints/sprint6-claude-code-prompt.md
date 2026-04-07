# SPRINT 6 — CONTENT AGENT + RECOVERY FLOW + CLONE TEST

Sprint 5 tamamlandı (119/119 test). Şimdi Sprint 6'ya geçiyoruz.

## SPRINT 6 HEDEFİ
Content Agent salon marka dilinde mesaj yazıyor. Cancellation recovery akışı çalışıyor. İkinci salon config ile clone test başarılı. Sistem ikinci müşteriye hazır.

## YAPILACAKLAR (BU SIRAYLA)

### ADIM 1: Content Agent
**OBJECTIVE:** Salon marka dilinde müşteri mesajları üreten agent.
**FILES:**
- `packages/agents/content-agent/prompt.ts`
- `packages/agents/content-agent/writer.ts`
- `packages/agents/content-agent/index.ts`
- `packages/agents/content-agent/content.test.ts`

**TASKS:**
1. Prompt template — CLAUDE.md'deki Content Agent Prompt spec'ini kullan
2. Config injection: brandTone (style, personality, avoid, formalityLevel, allowEmojis), salonName, colors
3. writer.ts: generateMessage() fonksiyonu:
```typescript
async function generateMessage(options: {
  purpose: string;            // "booking_confirmation" | "reminder" | "winback" | "dm_reply" | "campaign"
  language: 'de' | 'en' | 'tr';
  context: Record<string, string>;  // customerName, serviceName, date, time, etc.
  clientConfig: ClientConfig;
  maxLength?: number;
}): Promise<ContentOutput>
```
4. Output schema:
```typescript
const ContentOutputSchema = z.object({
  message: z.string(),
  tone_check: z.enum(['on_brand', 'needs_review']),
  language: z.enum(['de', 'en', 'tr']),
  character_count: z.number(),
});
```
5. Brand rules enforcement:
   - formalityLevel: "Sie-Form" → Almanca mesajlarda Sie kullan
   - allowEmojis: false → emoji kullanma
   - avoid listesindeki kelimeleri kullanma
   - style'a uy: "premium, warm, direct"
6. Follow-up Agent entegrasyonu: Follow-up Agent template yoksa Content Agent'ı çağırsın
7. Test yaz:
   - booking_confirmation DE → Sie-Form, emoji yok, premium ton
   - reminder EN → kısa, net, tek CTA
   - winback TR → nazik, baskıcı değil
   - dm_reply → brand tone'a uygun
   - allowEmojis: false ama mesajda emoji var → tone_check: needs_review

**ACCEPTANCE:**
- generateMessage() çalışıyor
- 5 purpose type destekleniyor
- Brand rules enforce ediliyor
- Follow-up Agent entegrasyonu çalışıyor
- Min 5 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint6-step1: content agent with brand voice enforcement" && git push`

---

### ADIM 2: Cancellation Recovery Flow Tamamlama
**OBJECTIVE:** İptal ve no-show sonrası tam geri kazanım akışı.
**FILES:**
- `packages/core/flows/cancellation-recovery.ts`
- `packages/core/flows/cancellation-recovery.test.ts`

**TASKS:**
1. Recovery flow logic:
```typescript
async function executeCancellationRecovery(options: {
  bookingId: string;
  clientId: string;
  triggerType: 'cancellation' | 'no_show';
}): Promise<RecoveryResult> {
  // 1. Booking'i al, status kontrol et (cancelled veya no_show)
  // 2. recoveryWaitHours geçmiş mi? (config'den)
  // 3. Bu lead için kaç recovery attempt yapılmış? (maxFollowUpAttempts)
  // 4. Limit aşılmışsa → dur, lead'i inactive yap
  // 5. Content Agent ile winback mesajı üret
  // 6. Mesajı gönder (email/whatsapp)
  // 7. Sonraki follow-up job planla (7 gün sonra final mesaj)
  // 8. Event log kaydet
}
```
2. Recovery kuralları:
   - İlk recovery: iptalden 48h sonra (config: recoveryWaitHours)
   - İkinci recovery: ilkinden 7 gün sonra (final mesaj)
   - Üçüncü yok: 2 cevapsız sonrası dur (config: maxFollowUpAttempts)
   - Müşteri opt-out ettiyse (GDPR reminder consent revoked) → kesinlikle dur
3. GDPR kontrolü: recovery mesajı göndermeden önce reminder consent var mı kontrol et
4. Job runner entegrasyonu: recovery handler bu flow'u çağırsın
5. Test yaz:
   - Cancellation → 48h sonra winback mesajı
   - No-show → 48h sonra winback mesajı
   - 2 attempt sonrası → dur, lead inactive
   - GDPR consent yok → mesaj gönderme
   - recoveryWaitHours geçmemiş → skip

**ACCEPTANCE:**
- Recovery flow tam çalışıyor
- GDPR consent kontrolü var
- Max attempt limiti çalışıyor
- Job runner ile entegre
- Min 5 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint6-step2: cancellation recovery flow with gdpr checks" && git push`

---

### ADIM 3: Clone Script + İkinci Demo Salon
**OBJECTIVE:** İkinci salon config ile sistemi ayağa kaldıran clone script.
**FILES:**
- `scripts/clone-client.ts`
- `clients/elegant-nails-vienna/client.config.json`
- `clients/elegant-nails-vienna/services.json`
- `clients/elegant-nails-vienna/branding.json`
- `clients/elegant-nails-vienna/prompts.json`

**TASKS:**
1. clone-client.ts script:
```typescript
// Kullanım: npx tsx scripts/clone-client.ts elegant-nails-vienna
// 1. clients/{slug}/ klasöründeki config dosyalarını oku
// 2. Config'leri Zod ile validate et
// 3. clients tablosuna yeni kayıt ekle
// 4. services tablosuna hizmetleri ekle
// 5. Feature flag'leri pakete göre ayarla
// 6. Doğrulama: lead oluştur → classify et → booking oluştur (dry-run)
// 7. Sonuç raporu yazdır
```
2. İkinci demo salon config:
```json
{
  "clientName": "Elegant Nails Vienna",
  "slug": "elegant-nails-vienna",
  "timezone": "Europe/Vienna",
  "packageType": "starter",
  "languages": ["de", "tr"],
  "defaultLanguage": "de",
  "brandTone": {
    "style": "modern, friendly, professional",
    "personality": "Junge, trendige Nagel-Expertin",
    "avoid": ["too formal", "medical terms"],
    "allowEmojis": true,
    "formalityLevel": "Du-Form"
  }
}
```
3. Farklı hizmetler: Sadece nail services (gel, acryl, nail art, pedicure)
4. Farklı branding: Du-Form (informal), emoji allowed, farklı renkler
5. Farklı paket: starter (aiIntake: false → human'a yönlendir)

**ACCEPTANCE:**
- Clone script çalışıyor
- İkinci salon DB'de oluşuyor
- Config validation geçiyor
- Starter paket feature flag'leri doğru
- Landing page ikinci salon için farklı render edebilir (slug bazlı)

**BİTİNCE:** `git add . && git commit -m "sprint6-step3: clone script + second demo salon" && git push`

---

### ADIM 4: Clone Doğrulama — Full Flow Test
**OBJECTIVE:** İkinci salon için tüm akışı test et, hard-coded değer ara.
**FILES:**
- `scripts/test-clone-flow.ts` — Clone doğrulama script
- `packages/core/flows/clone-validation.test.ts`

**TASKS:**
1. Clone doğrulama testi:
```
1. Elegant Nails Vienna config'i yükle
2. Lead oluştur (source: web_form)
3. Starter pakette aiIntake: false → orchestrator human'a yönlendirmeli
4. Manuel classify simülasyonu (intent: new_booking)
5. Booking oluştur → nail art service
6. Reminder job'lar oluştu mu kontrol et
7. Content Agent mesaj üretsin → Du-Form + emoji kullanmalı
8. Event log'larda client_id = elegant-nails-vienna olduğunu doğrula
9. demo-salon'un verileri bozulmamış mı kontrol et (isolation)
```
2. Hard-coded tarama:
   - Tüm kod dosyalarında "demo-salon", "Vienna Glow" string'lerini ara
   - Config'den gelmesi gereken ama hard-coded olan değerleri raporla
   - Bulursa düzelt
3. Multi-tenant isolation testi:
   - Salon A'nın lead'i Salon B'de görünmemeli
   - Salon A'nın config'i Salon B'yi etkilememeli

**ACCEPTANCE:**
- İkinci salon full flow çalışıyor
- Starter paket kuralları uygulanıyor (no AI intake)
- Brand tone farklı (Du-Form + emoji)
- Hard-coded değer yok
- Multi-tenant isolation sağlam
- Demo-salon verileri bozulmamış

**BİTİNCE:** `git add . && git commit -m "sprint6-step4: clone validation + hard-coded cleanup + isolation test" && git push`

---

## SPRINT 6 BİTİŞ KRİTERLERİ

- [ ] Content Agent marka dilinde mesaj üretiyor (5 purpose, 3 dil)
- [ ] Brand rules enforce ediliyor (Sie/Du, emoji, ton)
- [ ] Recovery flow GDPR kontrolü ile çalışıyor
- [ ] Max follow-up limiti çalışıyor (2 attempt sonra dur)
- [ ] Clone script ikinci salonu oluşturuyor
- [ ] İkinci salon farklı config ile farklı davranıyor
- [ ] Hard-coded değer yok
- [ ] Multi-tenant isolation doğrulanmış
- [ ] Tüm testler geçiyor (119+ mevcut + yeni)
- [ ] CLAUDE.md güncellendi

## SPRINT 6 TAMAMLANINCA CLAUDE.md'YE EKLE:
```
## Sprint 6 Status: TAMAMLANDI
- Content Agent: 5 purpose type, brand voice enforcement, Sie/Du-Form, emoji control
- Recovery Flow: cancellation + no-show, GDPR consent check, max 2 attempt
- Clone: script çalışıyor, 2. salon (Elegant Nails Vienna) aktif
- Multi-tenant: isolation doğrulanmış, hard-coded temizlenmiş
- 2. salon: starter paket, Du-Form, emoji, farklı hizmetler
- Test: XX/XX geçiyor
```
