# SPRINT 2 — AI AGENTS CORE

Sprint 1 tamamlandı (29/29 test). Şimdi Sprint 2'ye geçiyoruz.

## SPRINT 2 HEDEFİ
Intake Agent intent sınıflandırması döndürüyor, Booking Agent sonraki aksiyonu üretiyor, Orchestrator doğru agent'a yönlendiriyor. Tümü loglanıyor, test edilebilir.

## YAPILACAKLAR (BU SIRAYLA, SIÇRAMA)

### ADIM 1: Supabase Kurulumu + DB Migration
**OBJECTIVE:** Drizzle schema'yı gerçek Supabase DB'ye push et.
**TASKS:**
1. Supabase projesini bağla (SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env'de olmalı)
2. `drizzle-kit push` ile 8 tabloyu Supabase'e yaz
3. Demo salon kaydını `clients` tablosuna seed et
4. Demo servisleri `services` tablosuna seed et
5. Verify: Supabase dashboard'dan tabloları ve seed data'yı gör

**ACCEPTANCE:**
- 8 tablo Supabase'de var
- demo-salon client kaydı var
- 8 servis kaydı var
- `event_logs` tablosu boş ama hazır

**BİTİNCE:** `git add . && git commit -m "sprint2-step1: supabase setup + db migration + seed" && git push`

---

### ADIM 2: Claude API Client Wrapper
**OBJECTIVE:** Retry, token logging, error handling ile production-grade Anthropic client yaz.
**FILE:** `packages/shared/clients/anthropic.ts`
**TASKS:**
1. Anthropic SDK'yı kur (`@anthropic-ai/sdk`)
2. Wrapper fonksiyonu yaz:
   - Model: `claude-sonnet-4-20250514` (hardcode ETME — config'den al ama default bu olsun)
   - Retry: max 2 retry, exponential backoff (packages/shared/utils/retry.ts'i kullan)
   - Her çağrıda input_tokens + output_tokens'ı return et
   - Timeout: 30 saniye
   - Hata durumunda structured error döndür (API error, timeout, invalid response)
3. Response'u parse eden helper: JSON extract + Zod validation
4. Test yaz: mock Anthropic client ile
   - Başarılı çağrı → doğru JSON + token count
   - API hatası → retry sonrası hata döner
   - Invalid JSON response → validation hatası döner
   - Timeout → structured timeout error döner

**INTERFACE:**
```typescript
interface AgentCallResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  tokenUsage: { input: number; output: number; total: number };
  durationMs: number;
  retryCount: number;
}

async function callAgent<T>(options: {
  systemPrompt: string;
  userMessage: string;
  outputSchema: ZodSchema<T>;
  clientId: string;
  agentName: string;
  maxTokens?: number;
}): Promise<AgentCallResult<T>>
```

**ACCEPTANCE:**
- callAgent fonksiyonu çalışıyor
- Token sayımı doğru dönüyor
- Retry mekanizması çalışıyor
- Zod validation ile output kontrol ediliyor
- Min 4 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint2-step2: claude api wrapper with retry + token tracking" && git push`

---

### ADIM 3: Intake Agent
**OBJECTIVE:** Müşteri mesajını alıp intent sınıflandırması yapan agent modülü.
**FILES:**
- `packages/agents/intake-agent/prompt.ts` — Prompt template (config injection ile)
- `packages/agents/intake-agent/classifier.ts` — Ana logic
- `packages/agents/intake-agent/index.ts` — Public export
- `packages/agents/intake-agent/intake.test.ts` — Testler

**TASKS:**
1. Prompt template'i yaz — CLAUDE.md'deki Intake Agent Prompt spec'ini kullan
2. Prompt'a salon config'den inject et: salonName, services listesi, languages
3. classifier.ts: callAgent wrapper'ını kullanarak classify fonksiyonu yaz
4. Output schema (Zod):
```typescript
const IntakeOutputSchema = z.object({
  intent: z.enum(['new_booking', 'price_inquiry', 'service_info', 'existing_booking_change', 'complaint', 'unclear']),
  confidence: z.number().min(0).max(1),
  needs_human_review: z.boolean(),
  next_step: z.string(),
  summary: z.string().max(200),
  detected_service: z.string().nullable(),
  language: z.enum(['de', 'en', 'tr']),
});
```
5. Event log kaydı: her classify çağrısı event_logs'a yazılsın
6. Test yaz (mocked Claude responses ile):
   - "Ich möchte einen Termin für Gel Maniküre" → intent: new_booking, confidence >= 0.8
   - "Was kostet HydraFacial?" → intent: price_inquiry
   - "asdfghjk random gibberish" → intent: unclear, needs_human_review: true
   - Türkçe mesaj → language: "tr"
   - Agresif mesaj → needs_human_review: true

**ACCEPTANCE:**
- classify() fonksiyonu çalışıyor
- Output Zod schema'ya uyuyor
- Event log kaydı oluşuyor
- Min 5 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint2-step3: intake agent with classifier + prompt + tests" && git push`

---

### ADIM 4: Booking Agent
**OBJECTIVE:** Intent sınıflandırması sonrası müşteriyi booking'e yönlendiren agent.
**FILES:**
- `packages/agents/booking-agent/prompt.ts`
- `packages/agents/booking-agent/flow.ts`
- `packages/agents/booking-agent/index.ts`
- `packages/agents/booking-agent/booking.test.ts`

**TASKS:**
1. Prompt template — CLAUDE.md'deki Booking Agent Prompt spec'ini kullan
2. Config injection: services listesi, booking rules, brand tone
3. flow.ts: callAgent ile nextStep fonksiyonu yaz
4. Output schema:
```typescript
const BookingOutputSchema = z.object({
  booking_stage: z.enum(['collecting_info', 'confirming_service', 'proposing_time', 'ready_to_book', 'needs_human']),
  required_fields: z.array(z.string()),
  customer_message: z.string().max(500),
  action: z.enum(['ask_question', 'propose_service', 'create_booking', 'escalate']),
  suggested_service_id: z.string().nullable(),
});
```
5. Event log kaydı
6. Test yaz:
   - intent: new_booking + "Gel Maniküre" → stage: confirming_service, suggested_service_id dolmuş
   - intent: new_booking + hiç bilgi yok → stage: collecting_info, action: ask_question
   - intent: price_inquiry → stage: collecting_info, uygun yanıt
   - 2 tur karışıklık sonrası → action: escalate

**ACCEPTANCE:**
- nextStep() fonksiyonu çalışıyor
- Output Zod'a uyuyor
- Event log yazılıyor
- Min 4 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint2-step4: booking agent with flow + prompt + tests" && git push`

---

### ADIM 5: Orchestrator
**OBJECTIVE:** Gelen event'i doğru agent'a yönlendiren merkezi router.
**FILES:**
- `packages/agents/orchestrator/router.ts`
- `packages/agents/orchestrator/index.ts`
- `packages/agents/orchestrator/orchestrator.test.ts`

**TASKS:**
1. Router logic — AI tabanlı değil, rule-based olsun (V1'de yeterli):
```typescript
function routeEvent(event: InboundEvent): RoutingDecision {
  // new lead → intake-agent
  // classified lead with intent → booking-agent
  // booking confirmed → schedule reminder jobs (followup-agent, Sprint 4'te)
  // unknown → log + human escalation
}
```
2. RoutingDecision type:
```typescript
interface RoutingDecision {
  targetAgent: 'intake-agent' | 'booking-agent' | 'followup-agent' | 'content-agent' | 'human';
  context: Record<string, unknown>;
  priority: 'normal' | 'high' | 'urgent';
  reason: string;
}
```
3. Feature flag kontrolü: client'ın paketi aiIntake desteklemiyorsa direkt human'a yönlendir
4. Event log kaydı
5. Test yaz:
   - Yeni lead → intake-agent'a yönlendir
   - Classified lead (intent: new_booking) → booking-agent'a yönlendir
   - Starter paket (aiIntake: false) → human'a yönlendir
   - Bilinmeyen event type → human + log

**ACCEPTANCE:**
- routeEvent() doğru yönlendiriyor
- Feature flag kontrolü çalışıyor
- Event log yazılıyor
- Min 4 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint2-step5: orchestrator routing logic + tests" && git push`

---

### ADIM 6: API Endpoint'leri Bağlama
**OBJECTIVE:** Classify ve next-step endpoint'lerini oluştur, orchestrator üzerinden agent'lara bağla.
**FILES:**
- `apps/web/app/api/lead/[id]/classify/route.ts`
- `apps/web/app/api/lead/[id]/next-step/route.ts`

**TASKS:**
1. POST /api/lead/:id/classify:
   - Lead'i DB'den al
   - Orchestrator'a gönder → intake-agent'a route
   - Intake Agent classify çalıştır
   - Sonucu lead kaydına yaz (intent, confidence, status güncelle)
   - Event log kaydet
   - Response: classified lead JSON
2. POST /api/lead/:id/next-step:
   - Lead'i + classify sonucunu al
   - Orchestrator → booking-agent'a route
   - Booking Agent nextStep çalıştır
   - Sonucu döndür
   - Event log kaydet
3. Error handling: Lead bulunamadı (404), Agent hatası (500 + structured error), validation hatası (400)
4. Test yaz:
   - Full flow: Create lead → classify → next-step (integration test)
   - Olmayan lead ID → 404
   - Classify edilmemiş lead'e next-step → uygun hata

**ACCEPTANCE:**
- POST /api/lead/:id/classify çalışıyor
- POST /api/lead/:id/next-step çalışıyor
- Full chain: lead → classify → next-step tamamlanıyor
- Event logs'da tüm adımlar görünüyor
- Min 3 test geçiyor

**BİTİNCE:** `git add . && git commit -m "sprint2-step6: classify + next-step endpoints wired to agents" && git push`

---

## SPRINT 2 BİTİŞ KRİTERLERİ

Tüm adımlar tamamlandığında şunlar doğru olmalı:
- [ ] Supabase'de 8 tablo + seed data var
- [ ] callAgent wrapper retry + token tracking ile çalışıyor
- [ ] Intake Agent intent sınıflandırması döndürüyor (Zod validated)
- [ ] Booking Agent next-step üretiyor (Zod validated)
- [ ] Orchestrator doğru agent'a yönlendiriyor (feature flag aware)
- [ ] API endpoint'leri chain olarak çalışıyor
- [ ] Her adım event_logs'a yazılıyor
- [ ] Tüm yeni testler geçiyor (minimum 20 yeni test)
- [ ] CLAUDE.md güncellendi (Sprint 2 tamamlandı notu)

## SPRINT 2 TAMAMLANINCA CLAUDE.md'YE EKLE:
```
## Sprint 2 Status: TAMAMLANDI
- Supabase bağlandı, 8 tablo live
- Claude API wrapper: retry 2x, token logging, Zod validation
- Intake Agent: 6 intent sınıfı, confidence scoring, human escalation
- Booking Agent: 5 stage flow, service matching, escalation
- Orchestrator: rule-based routing, feature flag aware
- API: /classify ve /next-step endpoint'leri aktif
- Test: XX/XX geçiyor
```
