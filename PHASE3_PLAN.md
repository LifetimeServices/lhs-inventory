# Phase 3 — Telnyx Phone System (Working Notes)

Captured for session continuity. Informal — not a spec doc.
Update as decisions change.

## Where we are right now
- **Branch:** `claude/lms-system-work-yCA1v`
- **Local commit:** `c234ab8 — Phase 3a checkpoint 1: Phone module scaffolding`
  (not yet pushed — git proxy 403 / stop-hook loop, fix pending)
- **Actively building:** Phase 3a (Foundation)
- **Next up after 3a commit 1:**
  - Per-number config modal
  - Voicemail greeting recorder (browser mic + MP3, store in R2)
  - Lock Integrations Telnyx card to config-only
  - Customer comm-bell fields in customer edit modal

## Scope — what Phase 3 covers
End-to-end phone system: inbound routing, outbound calls, shared-inbox
texting, automated SMS (WO/dispatch), voicemail, call recordings, call
center monitor with supervisor controls.

Replaces the current Telnyx blob that lives on Admin → Integrations.

## Phased breakdown (testing checkpoint between each)
- **3a — Foundation.** New Phone tab in nav, per-number config, schema,
  comm-bell enforcement, voicemail greeting recorder, lock down
  Integrations.
- **3b — Inbound & CRM.** Ring-all for call-center numbers, direct-rep
  routing, ~25s ring → voicemail, recording announcement + R2 storage,
  screen-pop, post-call notes + follow-up popup, calls on customer
  timeline.
- **3c — Call Center Monitor.** 6 presence states, auto on-call / wrap-up,
  supervisor listen/whisper/barge, voicemail close-out workflow.
- **3d — Texting.** Shared-inbox (1-to-1 outbound from rep's number,
  inbound fans into shared inbox ServiceTitan-style), MMS via R2,
  STOP/HELP + opt-out log, Conversation Monitor for managers.
- **3e — Automation.** Template library + merge fields, event triggers
  (WO created, tech en route, appt reminder), on/off per template,
  respect comm bells.

**Phase 4 (later):** 10DLC helper UI, satellite-office → call-center
overflow, "press 1 for office" IVR, holiday calendars per timezone,
reporting/analytics.

## Key decisions (captured from conversation)
- **Routing ring strategy:** all agents ring simultaneously (per-number
  config). Ring ~25s ("industry standard") then voicemail.
- **Direct-to-rep numbers:** option for "leave message, or press 1 to
  connect to office" (IVR piece — slide to Phase 4).
- **Voicemail:** per-number AND per-user. Custom greetings recorded
  in-app (primary) + MP3 upload (fallback). Voicemails "closed out" by
  a rep confirming follow-up. Email + in-app notification.
- **Business hours:** per-number, adjusted for national timezones.
- **Presence states (6):** Available, On Call, Wrap-Up, Break, Meeting,
  Away/DND. On-call auto-set from phone system. Returns to Available
  only after notes saved.
- **Supervisor features:** listen/whisper/barge — gated by
  `supervise_calls` + `listen_whisper_barge` perms.
- **Visibility dashboard:** visible to sales reps too (granular perm).
- **Texting model:** rep sends 1-to-1 from their assigned number;
  customer replies fan into a shared inbox so any rep can pick up.
  Same for inbound customer texts to a call-center number.
- **1-to-1 text monitoring:** "Conversation Monitor" view gated by
  `view_all_texts` perm.
- **No-reply / automated texts:** template library, editable, on/off
  toggles per template. MUST respect per-customer comm bells.
- **Communication bells:** per-customer `allow_calls`, `allow_sms`,
  `allow_email`, `do_not_contact`. If blocked, action is refused and
  user sees a "blocked" toast.
- **MMS:** yes, store in Cloudflare R2.
- **Recording:** record all calls, announce recording on every call,
  **5-year retention**, permission-gated playback.
- **Storage split:** recordings + voicemails + MMS → Cloudflare R2.
  Everything else → Supabase.
- **Screen-pop:** full customer record on inbound. Post-call popup
  prompts notes + follow-up date.
- **Timeline:** calls and texts appear in the customer timeline
  alongside notes, estimates, WOs.
- **Number management:** new **Phone** top-level tab (between Sales
  and Inventory). Integrations stays locked down (separate perm
  `manage_integrations`).
- **Nav permission:** Phone tab itself gated at module level; sub-tabs
  further gated by granular perms.

## 10DLC / A2P (action items outside code)
US local numbers used for A2P SMS require:
1. **Brand registration** — company info, EIN, address. ~1–3 days.
2. **Campaign registration** — use case "Mixed" or "Customer Care".
   ~1–3 weeks (the slow part).
3. **Assign numbers** to approved campaign. Instant.

Toll-free uses a separate Toll-Free Verification process.
STOP/HELP handling built in + logged in `lhs_sms_optouts`.

**Existing Telnyx number is NOT on a campaign** — texts from it will
be silently dropped until the campaign is registered. User submitting
Brand + Campaign via Telnyx Portal in parallel while I build.

## Schema added (Phase 3a, in `schema.sql`)
- `lhs_phone_numbers` — per-number routing + config
- `lhs_voicemail_greetings` — R2-stored audio, assignable to numbers
- `lhs_phone_calls` — call log (inbound + outbound), recording URLs,
  disposition, follow-up
- `lhs_voicemails` — voicemails left by callers, with close-out fields
- `lhs_sms_threads` / `lhs_sms_messages` — shared-inbox threading
- `lhs_phone_presence` — agent availability for Call Center Monitor
- `lhs_sms_optouts` — STOP compliance log
- `lhs_sms_templates` — outbound automation templates
- Added `allow_calls`, `allow_sms`, `allow_email`, `do_not_contact`,
  `sms_opted_out_at` to `lhs_customers`

## Granular permissions added (new `phone` module)
`view_monitor`, `manage_numbers`, `access_softphone`, `supervise_calls`,
`listen_whisper_barge`, `view_texts`, `view_all_texts`, `send_texts`,
`view_voicemail`, `close_voicemail`, `view_recordings`,
`manage_templates`, `manage_settings`, `manage_integrations_phone`

Default role access: all non-Technician roles get `phone:1`.

## Open / Pending
- Push is 403 through local git proxy; fix pending before remote gets
  the Phase 3a work.
- 10DLC Brand + Campaign registration in Telnyx Portal (user task).
- Per-number config modal (in progress).
- Lock Integrations Telnyx card to API-key-only config.
- Wire comm-bell fields into customer edit UI.
