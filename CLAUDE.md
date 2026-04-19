# CLAUDE.md — Session Context

> **Purpose:** persistent context for Claude Code sessions so you don't have to
> bring me up to speed every time. Claude auto-loads this file at session start.
> **Rule of thumb:** keep it curated, not verbatim. Summaries > transcripts.

---

## How to use this file

- **At the start of a session:** Claude reads this automatically. You can say
  "read CLAUDE.md" to be sure.
- **During a session:** when a real decision is made or direction changes,
  say "log that in CLAUDE.md" and I'll update the relevant section.
- **At the end of a session:** say "update CLAUDE.md and commit" and I'll
  refresh Current Status + Open Threads + append a Session Log entry.
- **Deep planning docs** (e.g. `PHASE3_PLAN.md`) live as separate files and
  are linked from the Planning Docs section below.

---

## Project Overview

**LHS Inventory & Field Service Management** — internal platform for Lifetime
Home Services. Runs at https://LifetimeServices.github.io/lhs-inventory

**Stack**
- Frontend: single-page `index.html` (vanilla JS, no build step), GitHub Pages
- Backend: Supabase (Postgres) — `schema.sql` is source of truth
- Storage: Cloudflare R2 (images, voicemail, call recordings)
- Telephony: Telnyx + Cloudflare Worker (`cloudflare/telephony-worker/`)
- Deploy: `deploy.sh` / `DEPLOY.ps1` / `DEPLOY_WINDOWS.bat`

**Key tables** (see `schema.sql`): users, divisions, vendors, locations, items,
location_stock, van_inventory, purchase_orders, po_lines, transfers, testers,
customers, work_orders, wo_materials, schedule, audit_log.

---

## Current Status

- **Active branch:** `claude/lms-system-planning-SO2EW`
- **Last shipped:** ✅ **Inbound calling end-to-end works** (Worker v12).
  Bridge audio both ways, clean hangup propagation, recording kicks in
  after bridge, caller ID + customer match, Safari autoplay cleared.
- **Actively working on:** TBD — inbound is done, pick next direction.

---

## Planning Docs (living, in-repo)

| File | Scope |
|---|---|
| `PHASE3_PLAN.md` | Telnyx phone system build (3a → 3e, Phase 4 backlog) |
| `README.md` | Setup + deploy |
| `Accounting_Research_Report.md` | Accounting integration research |
| `HR_Platform_Research_Report.md` | HR platform research |
| `SMS_API_Research_Report.md` | SMS provider research |
| `ServiceTitan_Technician_Workflow_Research.md` | Competitive reference |

---

## Key Decisions (standing — override only with explicit note)

- **No build step.** `index.html` stays a single editable file.
- **GitHub Pages for hosting.** Deploy via `deploy.sh` / `DEPLOY.ps1`.
- **Supabase is the DB of record.** `schema.sql` is checked in.
- **R2 for binaries.** Don't upload media into Supabase Storage.
- **Telephony via Telnyx Call Control API** (not TeXML) — see commit `66ab527`.
- **WebRTC targets dialed via `<Sip>`** (not `<Client>`) — see commit `be70196`.
- **Claude pushes to GitHub directly.** The user has authorized Claude to
  push commits to the working branch AND to fast-forward `main` so changes
  go live on `lifetimemanagementsystem.com` without the user running
  `deploy.sh` manually. Workflow: commit → `git push origin <branch>` →
  `git push origin <branch>:main`. Use force-push only if main has
  diverged (rare); otherwise fast-forward. Always tell the user to
  hard-refresh (⌥⌘R on Safari) after deploying.

---

## Open Threads

_Populate as items come up. Close out or move to "Shipped" when done._

- [ ] **Global search bar doesn't surface addresses from account pages.**
  Example: `129 North Beebe Street, Marshall, WI 53559` is on the Tyler Fish
  account page, but typing that address into the top-of-app search returns
  nothing. Search should match against customer addresses, not just names /
  WO numbers / phone numbers. Check whatever function powers the top search
  input (likely looks at a limited set of fields).

- [ ] **Invoice-from-dispatch-closeout flow regressed.** Previously when a
  dispatch user closed a work order, a popup offered "Create Invoice" that
  took them to the Invoice page with WO data pre-populated. User reports
  this used to work and doesn't now. Find the WO closeout handler, restore
  the prompt + autopopulate path. Should be preserved going forward — don't
  delete during phone/other refactors.

- [x] ~~**Inbound call audio broken.**~~ ✅ **RESOLVED 2026-04-19.** Root cause:
  Telnyx sends `direction: null` on `call.answered` webhooks, but the
  worker was checking `direction === 'outgoing'` before bridging — so
  the bridge call was being skipped entirely on every call. Fix: drop the
  direction check; `client_state` presence alone identifies the outbound
  leg we need to bridge (worker v12). Also moved `record_start` from
  pre-bridge to post-bridge so it doesn't interfere with the handshake.
  Client-side: audio attachment now uses `pc.getReceivers()` (standard
  WebRTC) rather than SDK-specific paths; works reliably in Safari.

- [ ] **Phone panel must be open to accept calls.** Currently the WebRTC
  client only initializes when the Phone panel is opened. Needs: init at
  app load, global incoming-call banner anywhere in the app, accept/decline
  without needing to open the panel first. Medium-sized refactor.

---

## Session Log

_Append newest first. One paragraph per session: what we did, what's next.
Keep each entry tight — this is a map, not the territory._

### 2026-04-18 evening — Phone tab build-out + research-mode setup
Inbound `user_busy` debug stalled out (Worker v9 + SIP-creds login both
shipped, neither fixed it — full notes in Open Threads). Pivoted to
building out the Phone module's coming-soon stubs. **Shipped tonight:**
Voicemails inbox (filter tabs, audio playback, close-out workflow);
Call Recordings (search, direction filter, audio playback, audit-logged
listens, download); SMS Templates (CRUD with trigger events, click-to-
insert merge fields, GSM segment counter); Phone Settings (recording
retention, new-number defaults including business hours, agent presence,
SMS opt-out auto-reply). Went from 1/7 real Phone sub-tabs to 5/7. Two
remaining stubs (Messages, Call Center Monitor) need infrastructure
(SMS pipeline, presence tracking) before they can be built. Set up
`.claude/settings.json` with research-mode permissions so Claude can do
multi-hour autonomous research on the inbound `user_busy` problem
without needing user permission grants.

### 2026-04-18 — CLAUDE.md bootstrapped
Stood up this file so future sessions start with context. No code changes
beyond adding this file. Next session should pick a direction (continue Phase 3
roadmap, or something new) and update Current Status + Open Threads.

---

## Things to remember about the user's preferences

- **Not an experienced coder/developer.** Explain in plain English, avoid
  jargon. When technical terms are unavoidable, define them briefly. Lead with
  what the user needs to *do* or *decide*, not with how the code works.
- Prefers short, direct answers over long explanations.
- Wants decisions/direction changes captured in writing, not just in chat.
- Works across multiple sessions — assume no memory between them.
- Uses Windows (`DEPLOY.ps1` / `.bat`) and a shell environment (`deploy.sh`).
