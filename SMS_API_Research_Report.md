# SMS / Texting API Research Report
**For: Safeguard Field Service Management Platform**
**Date: April 2026**
**Use Case: Automated customer notifications when a technician is dispatched**

---

## Executive Summary

All major SMS API providers now require **A2P 10DLC registration** for US business texting. This is a mandatory, non-optional compliance layer that adds ~$4–50 in one-time setup costs and $10–15/month per active campaign, but it is the same for every provider. Once registered, costs are primarily per-message. **Telnyx** is the top recommendation for this platform — it offers the lowest per-message rate ($0.004/SMS), strong developer experience, built-in webhook support, two-way SMS, MMS, and free 24/7 engineering support. Plivo is an excellent, lower-risk alternative at $0.0055/SMS.

---

## A2P 10DLC Registration — What You Must Know First

Before choosing a provider, understand that **A2P 10DLC (Application-to-Person, 10-digit long code)** registration is now mandatory for all US business SMS. Carriers (AT&T, T-Mobile, Verizon) block or heavily filter unregistered traffic.

### What It Is
A2P 10DLC is a system where US carriers require every business sending automated SMS from a standard 10-digit number (like a local phone number) to register:
1. Their **Brand** — who you are (company name, EIN, website, contact info)
2. Their **Campaign** — what type of messages you send (appointment reminders, notifications, etc.)

### Registration Process
1. Register your Brand with The Campaign Registry (TCR) — takes minutes to a few days
2. Register a Campaign use case (e.g., "Customer Notifications") — takes 3–7 business days
3. Link your phone number to the campaign

All major SMS providers handle this registration through their portal — you don't deal with TCR directly.

### Cost Breakdown (2025)
| Fee | Amount | Notes |
|-----|--------|-------|
| Brand registration (one-time) | $4–$49 | Sole proprietor ~$4; Standard brand ~$49 including Auth+ vetting (as of Aug 2025) |
| Campaign registration (one-time) | ~$16–$20 | Per campaign use case |
| Monthly campaign fee | ~$10–$15/month | Ongoing, per active campaign |
| Auth+ vetting (mandatory as of Aug 1, 2025) | $12.50 | Required for public/profit brands |

**Reality for this platform:** You register one brand + one campaign ("customer dispatch notifications"). One-time cost: ~$65–80 total. Ongoing: ~$10–15/month. Every provider charges roughly the same fees because they pass through TCR and carrier fees.

### Alternatives That Avoid 10DLC
- **Toll-Free Numbers (TFN):** Have their own simpler verification process ($0 registration, ~2–3 week approval). Slightly lower throughput but fine for dispatch notifications.
- **Short Codes:** $500–$1,000+/month. Overkill for this use case.

**Recommendation:** Register a standard 10DLC local number for the most professional appearance (local area code). Use a toll-free number as a faster-to-activate fallback during the registration period.

---

## Provider Comparison

### Pricing Summary

| Provider | Outbound SMS (US) | Inbound SMS (US) | MMS | Phone Number Cost |
|----------|-------------------|------------------|-----|-------------------|
| **Telnyx** | **$0.0040/msg** | $0.0040/msg | ~$0.01/msg | ~$1–2/month |
| **Plivo** | $0.0055/msg | $0.0055/msg | ~$0.015/msg | $0.80/month |
| **AWS SNS** | $0.00645/msg | N/A (no inbound) | Not supported | No number rental |
| **Twilio** | $0.0083/msg | $0.0075/msg | $0.0200/msg | $1.15/month |
| **Vonage (Nexmo)** | $0.00809/msg | $0.00649/msg | Not US-standard | ~$1/month |
| **Bird (MessageBird)** | $0.0080/msg | ~$0.008/msg | ~$0.02/msg | Included |
| **Sinch** | $0.0070/msg* | ~$0.007/msg | Available | ~$25/month† |

*Sinch pricing is opaque; the $0.07 figure from some sources appears to be per 10 messages or a platform tier fee — developer API rate is likely ~$0.006–0.008/msg. Confirm directly.
†Sinch's $25/month number cost is their enterprise platform price; developer API number rental is lower.

### Cost at Scale Example (1,000 dispatch notifications/month)

| Provider | Monthly SMS Cost | Annual SMS Cost |
|----------|-----------------|-----------------|
| Telnyx | $4.00 | $48 |
| Plivo | $5.50 | $66 |
| AWS SNS | $6.45 | $77 |
| Twilio | $8.30 | $99 |
| Vonage | $8.09 | $97 |
| Bird | $8.00 | $96 |

---

## Detailed Provider Profiles

### 1. Twilio SMS
**Website:** twilio.com

**Pricing:** $0.0083/outbound SMS, $0.0075/inbound. MMS $0.02/segment. Phone number: $1.15/month local.

**Free Trial:** $15–$15.50 in trial credits, no credit card required. Trial restricts sending to verified numbers only until upgraded.

**Developer Experience:** Industry gold standard. The most comprehensive REST API, best-in-class documentation, official SDKs for every language (Node.js, Python, PHP, etc.), Twilio Functions for serverless deployment, and a massive community. Supabase Edge Functions + Twilio is extremely well-documented with tutorials.

**Two-Way SMS:** Yes — full inbound webhook support. Customers can reply and you receive the message via webhook.

**MMS:** Yes — full MMS support for sending images, links, short videos.

**Webhooks:** Yes — delivery status callbacks (delivered, failed, undelivered) and inbound message webhooks.

**10DLC:** Full registration support through Twilio Console. They handle TCR coordination.

**Serverless/Browser Context:** Excellent. Twilio's API uses HTTP Basic Auth (Account SID + Auth Token). You must never expose credentials in browser-side code. The correct pattern is: Supabase Edge Function acts as the server-side proxy, calls Twilio API with credentials stored as Supabase secrets.

**Pros:**
- Most mature ecosystem and documentation
- Largest community — easy to find answers and examples
- Most integrations and partner apps
- Twilio Lookup API for number validation before sending
- Studio visual workflow builder

**Cons:**
- Most expensive per-message (~2x Telnyx)
- Support requires $1,500/month plan for dedicated help (community/email only on free tier)
- Can feel over-engineered for simple dispatch notifications

**Rating for this use case:** 8/10 (best docs, but overpriced)

---

### 2. Telnyx
**Website:** telnyx.com

**Pricing:** $0.004/SMS (outbound and inbound). MMS ~$0.01/message. Phone number: ~$1–2/month for a local US number.

**Free Trial:** $5 in testing credit for new accounts. Startup program offers $10,000 for qualifying companies.

**Developer Experience:** Strong. Modern REST API with JSON, official SDKs for Node.js, Python, Ruby, PHP, Go, Java. Documentation is good (not quite Twilio-level but close). Telnyx Mission Control Portal is developer-friendly with live testing tools.

**Two-Way SMS:** Yes — inbound messages delivered via webhooks. Full two-way conversation support.

**MMS:** Yes — MMS fully supported for US numbers.

**Webhooks:** Yes — delivery receipts and inbound message webhooks. Also supports TeXML (Twilio-compatible XML) for easy migration.

**10DLC:** Full support with registration tools in the portal. They actively guide you through the process.

**Serverless/Browser Context:** Excellent. Standard REST API with API key auth. Store key in Supabase secrets, call from Edge Functions. No special setup required.

**Pros:**
- Lowest per-message cost of major providers (~50% cheaper than Twilio)
- Free 24/7 engineering support for ALL customers (no paid tier required)
- High G2/Capterra rating (4.7/5, 500+ reviews)
- Twilio-compatible TeXML — easy migration later if needed
- Own CLEC (Carrier License) — direct carrier connections, better deliverability
- Transparent pricing, no surprise fees

**Cons:**
- Smaller community/ecosystem than Twilio
- Documentation is good but not as exhaustive as Twilio's
- Fewer third-party integrations

**Rating for this use case:** 9.5/10 (best overall value)

---

### 3. Plivo
**Website:** plivo.com

**Pricing:** $0.0045–$0.0055/SMS outbound, $0.0055/inbound. MMS ~$0.015/message. Phone number: $0.80/month.

**Free Trial:** $5–$10 in trial credits, no credit card required. Trial account never expires.

**Developer Experience:** Very strong. API design intentionally mirrors Twilio's — migration from Twilio is straightforward. Official SDKs for Node.js, Python, PHP, Java, Ruby, Go, .NET. Solid documentation.

**Two-Way SMS:** Yes — full webhook-based two-way messaging with auto-concatenation.

**MMS:** Yes — US MMS support included.

**Webhooks:** Yes — delivery receipts and inbound message webhooks, bulk sending support.

**10DLC:** Full 10DLC registration support through Plivo Console.

**Serverless/Browser Context:** Excellent. Standard REST API with Auth ID + Auth Token (similar to Twilio). Easy to integrate with Supabase Edge Functions.

**Pros:**
- Very competitive pricing — cheaper than Twilio, close to Telnyx
- Twilio-compatible API — minimal learning curve if you've used Twilio
- Cheapest phone number rental ($0.80/month)
- Solid deliverability and uptime history
- Good documentation and examples

**Cons:**
- Support is email-based; slower than Telnyx's engineering support
- Smaller community than Twilio
- Some reports of occasional US delivery delays

**Rating for this use case:** 8.5/10 (great Twilio alternative, easy migration path)

---

### 4. Sinch
**Website:** sinch.com

**Pricing:** ~$0.006–$0.008/SMS for developer API. The $0.07 figure from some sources applies to their MessageMedia business platform, not the raw API. Confirm current API pricing at sinch.com/pricing/sms.

**Free Trial:** 14-day free trial, no credit card. Some trial credits (limited to a sample message until topped up).

**Developer Experience:** Adequate. REST API, SDKs for major languages. Sinch acquired MessageMedia, CLX, and others — their developer portal can feel fragmented between product lines. The core SMS API is solid.

**Two-Way SMS:** Yes.

**MMS:** Yes.

**Webhooks:** Yes — delivery receipts, inbound webhooks.

**10DLC:** Supported.

**Serverless/Browser Context:** Works fine via REST API from Supabase Edge Functions.

**Pros:**
- Global carrier relationships (they own network infrastructure in many markets)
- Good for international expansion
- Voice + SMS + Verification in one platform

**Cons:**
- Pricing less transparent than Telnyx/Plivo — requires account to see real rates
- Platform fragmentation from multiple acquisitions
- Developer experience inconsistent across their product portfolio
- Overkill for a single-country deployment

**Rating for this use case:** 6.5/10 (good enterprise option, not ideal for lean startup)

---

### 5. Bird (formerly MessageBird)
**Website:** bird.com

**Pricing:** $0.008/SMS outbound in US. Pricing less transparent than Telnyx/Plivo.

**Free Trial:** Free plan includes 5 SMS/day, 10 emails/day — useful for development testing but not production.

**Developer Experience:** Good. REST API, webhooks, SDKs. Bird has pivoted toward being a full CRM/marketing platform, so their API-first developer experience has deprioritized somewhat. The rebranding from MessageBird to Bird in 2024 came with major restructuring.

**Two-Way SMS:** Yes.

**MMS:** Yes.

**Webhooks:** Yes — delivery receipts and inbound.

**10DLC:** Supported.

**Serverless/Browser Context:** Works via REST API.

**Pros:**
- Competitive pricing claim (slashed prices 90% in 2024 per TechCrunch)
- WhatsApp Business API access included
- Good for omnichannel (SMS + email + WhatsApp in one)

**Cons:**
- Company went through major restructuring/layoffs in 2023-2024 — some reliability and support concerns
- Pivot to full CRM platform means API-only use is less of a focus
- Pricing opaque without an account
- Less community resources than Twilio/Plivo

**Rating for this use case:** 6/10 (watch-and-wait given recent company turbulence)

---

### 6. Vonage (now Ericsson/CPAAS)
**Website:** vonage.com (APIs)

**Pricing:** $0.00809/outbound SMS, $0.00649/inbound in US. No monthly minimum.

**Free Trial:** Free trial account that sends test messages with "[FREE SMS DEMO, TEST MESSAGE]" appended. Restricted to verified numbers until upgraded.

**Developer Experience:** Solid. Vonage has good REST APIs (formerly Nexmo), SDKs for major languages, and reasonable documentation. Their Messages API supports SMS, WhatsApp, Viber, and MMS in a unified interface.

**Two-Way SMS:** Yes.

**MMS:** Available through their Messages API.

**Webhooks:** Yes — delivery receipts and inbound messages.

**10DLC:** Supported.

**Serverless/Browser Context:** Works fine via REST API.

**Pros:**
- Unified Messages API (SMS + WhatsApp + Viber + MMS)
- Established enterprise player with SLAs
- Good global coverage

**Cons:**
- More expensive than Telnyx/Plivo without clear advantage
- Ericsson acquisition created uncertainty about product direction
- Support can be slow for smaller accounts
- Free trial leaves "[FREE SMS DEMO]" text in messages — annoying for testing

**Rating for this use case:** 6.5/10 (solid but no price advantage)

---

### 7. AWS SNS (Simple Notification Service)
**Website:** aws.amazon.com/sns

**Pricing:** $0.00645/SMS in US. No phone number rental fee (uses a shared AWS number pool by default, or you can provision dedicated numbers separately via AWS Pinpoint).

**Free Trial:** 100 SNS publishes/month free forever, but SMS costs apply immediately. Generous AWS Free Tier for other services.

**Developer Experience:** Functional but not SMS-first. AWS SNS is primarily a pub/sub notification system — SMS is one delivery channel. Configuration via IAM, SDK, or CloudFormation. No dedicated SMS-focused portal. Requires more infrastructure knowledge than dedicated SMS providers.

**Two-Way SMS:** Limited — basic inbound via SNS subscriptions, not a full two-way messaging experience. Requires AWS Pinpoint for proper two-way SMS management.

**MMS:** Not natively supported.

**Webhooks:** Yes — SNS subscriptions can trigger Lambda, HTTP endpoints, etc.

**10DLC:** Supported via AWS Pinpoint for dedicated numbers.

**Serverless/Browser Context:** Works from Supabase Edge Functions using AWS SDK or plain HTTP API. Requires AWS IAM credentials.

**Pros:**
- Competitive pricing
- Already in AWS ecosystem if you use other AWS services
- Scales infinitely

**Cons:**
- No MMS support
- Limited two-way SMS (need Pinpoint for real inbound management)
- No dedicated SMS developer experience
- Requires AWS account and IAM setup — additional complexity
- Poor fit if not already on AWS

**Rating for this use case:** 5/10 (good if AWS-native, otherwise unnecessary complexity)

---

## Feature Comparison Matrix

| Feature | Telnyx | Plivo | Twilio | Sinch | Bird | Vonage | AWS SNS |
|---------|--------|-------|--------|-------|------|--------|---------|
| US SMS price (outbound) | $0.004 | $0.0055 | $0.0083 | ~$0.007 | $0.008 | $0.0081 | $0.0065 |
| US SMS price (inbound) | $0.004 | $0.0055 | $0.0075 | ~$0.007 | ~$0.008 | $0.0065 | N/A |
| Free trial credits | $5 | $5–10 | $15 | Limited | 5 SMS/day | Demo only | AWS Free Tier |
| Two-way SMS | Yes | Yes | Yes | Yes | Yes | Yes | Limited |
| MMS support | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Delivery webhooks | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| 10DLC registration | Yes | Yes | Yes | Yes | Yes | Yes | Via Pinpoint |
| Supabase Edge Fn ready | Yes | Yes | Yes | Yes | Yes | Yes | Yes (complex) |
| Node.js SDK | Yes | Yes | Yes | Yes | Yes | Yes | Yes (AWS SDK) |
| Free 24/7 support | Yes | No | No | No | No | No | No |
| Twilio-compatible API | Yes (TeXML) | Yes (similar) | — | No | No | No | No |
| Developer rating (G2) | 4.7/5 | 4.5/5 | 4.2/5 | 4.0/5 | 3.8/5 | 4.1/5 | 4.0/5 |

---

## Implementation Architecture for This Platform

Since the app is a GitHub Pages SPA with Supabase backend, the correct integration pattern is:

```
Customer browser (GitHub Pages SPA)
    |
    | triggers dispatch event
    v
Supabase Edge Function (server-side, secrets stored securely)
    |
    | HTTP POST to SMS API (Telnyx/Plivo/Twilio)
    |   - uses API key from Supabase secrets (never exposed to browser)
    |   - sends "Your technician is on the way!" message
    v
SMS delivered to customer phone
    |
    | customer replies (optional)
    v
SMS provider webhook → Supabase Edge Function → updates database
```

**Key principle:** API credentials must NEVER be in browser-side JavaScript. Always proxy through a Supabase Edge Function.

### Supabase Edge Function Example (Telnyx)

```typescript
// supabase/functions/send-dispatch-sms/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  const { customerPhone, technicianName, eta } = await req.json()

  const message = `Hi! Your ${technicianName} is on the way and should arrive around ${eta}. Reply STOP to opt out.`

  const response = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('TELNYX_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('TELNYX_PHONE_NUMBER'),
      to: customerPhone,
      text: message,
    }),
  })

  const data = await response.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

Store `TELNYX_API_KEY` and `TELNYX_PHONE_NUMBER` as Supabase secrets via:
```bash
supabase secrets set TELNYX_API_KEY=your_key_here
supabase secrets set TELNYX_PHONE_NUMBER=+1XXXXXXXXXX
```

---

## Top Recommendation: Telnyx

### Why Telnyx Wins for This Platform

1. **Cost**: At $0.004/SMS, Telnyx is ~50% cheaper than Twilio. At 1,000 messages/month that's $4 vs $8.30 — not huge now, but meaningful at scale. At 10,000 messages/month you save $430/year just on SMS.

2. **Free 24/7 Engineering Support**: Every Telnyx customer gets free access to engineers around the clock. Twilio charges $1,500/month for comparable support. For a lean team building this platform, this is a significant advantage when you hit an edge case.

3. **Deliverability**: Telnyx is a licensed carrier (CLEC) with direct connections to US carriers. This means better deliverability and fewer messages filtered as spam vs. providers that resell capacity.

4. **Developer Experience**: Modern REST API, good SDKs, solid documentation. Not quite Twilio's ecosystem but more than adequate for this use case.

5. **Twilio-Compatible**: Telnyx supports TeXML (Twilio's markup language), making future migration trivial if you ever started with Twilio.

6. **Two-way SMS + MMS + Webhooks**: All needed features fully supported.

7. **10DLC Support**: Full registration flow in their portal.

### Why Not Twilio (Despite Being #1 in Market Share)

Twilio is excellent, but for this specific use case (a lean field service platform, not a Fortune 500 enterprise):
- 2x the per-message cost with no meaningful feature advantage
- Support requires paid plans
- The "Twilio tax" is well-known in the developer community

### Runner-Up: Plivo

If Telnyx feels unfamiliar, Plivo is the best alternative:
- $0.0055/SMS (still cheaper than Twilio)
- API intentionally mirrors Twilio's — lowest learning curve
- Solid reliability track record
- Good documentation

### Getting Started Steps

1. **Sign up for Telnyx** at telnyx.com (get $5 test credit)
2. **Buy a US local phone number** in their Mission Control portal (~$1–2/month)
3. **Complete A2P 10DLC registration**:
   - Register brand (your company info)
   - Register campaign ("Customer Notifications — field service dispatch alerts")
   - Expect ~1–2 week approval
4. **Create Supabase Edge Function** to proxy SMS calls (see code above)
5. **Set secrets** in Supabase for API key and phone number
6. **Wire dispatch event** in your app to call the Edge Function

**Timeline to first SMS in production:** 2–3 weeks (mostly waiting on 10DLC approval)

**Timeline to first test SMS in development:** Under 1 hour

---

## Message Template Recommendation

For the dispatch notification, keep it concise and compliant:

```
Hi [First Name]! Your [Company Name] technician [Tech Name] is on the way
to [Address] and should arrive between [Time Window]. Questions? Call us
at [Phone]. Reply STOP to opt out.
```

This stays under 160 characters if you abbreviate, keeping it as a single SMS segment and avoiding extra charges.

---

## Sources

- [Twilio SMS Pricing](https://www.twilio.com/en-us/pricing/messaging)
- [Twilio Free Trial](https://help.twilio.com/articles/223136107-How-does-Twilio-s-Free-Trial-work-)
- [Telnyx SMS Pricing](https://telnyx.com/pricing/messaging)
- [Telnyx Trial Account](https://developers.telnyx.com/docs/account-setup/levels-and-capabilities/trial)
- [Plivo SMS Pricing US](https://www.plivo.com/sms/pricing/us/)
- [Sinch SMS Pricing](https://sinch.com/pricing/sms/)
- [Bird SMS Pricing](https://bird.com/en/pricing/sms)
- [Vonage SMS Pricing](https://www.vonage.com/communications-apis/sms/pricing/)
- [AWS SNS SMS Pricing](https://repost.aws/questions/QUbggQc5guRoiZXuoxVjJ3aw/aws-sns-sms-pricing)
- [10DLC Registration Guide 2025](https://www.sent.dm/resources/10dlc-sms-registration)
- [10DLC Registration Cost 2025 Guide](https://www.telgorithm.com/news/how-much-does-10dlc-registration-cost-2025-guide-for-isvs)
- [A2P 10DLC Fees Increasing August 2025](https://aloware.com/blog/a2p-10dlc-fee-update-what-you-need-to-know-before-august-1-2025)
- [Telnyx vs Twilio SMS Comparison](https://telnyx.com/resources/telnyx-vs-twilio-sms)
- [SMS & Voice API Pricing Comparison](https://www.buildmvpfast.com/api-costs/sms)
- [Top SMS Providers for Developers 2026](https://knock.app/blog/the-top-sms-providers-for-developers)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [US SMS Pricing 2025 Complete Guide](https://www.sent.dm/resources/united-states-sms-pricing)
