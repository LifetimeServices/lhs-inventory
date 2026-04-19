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
- **Last shipped:** Voicemails / Call Recordings / SMS Templates / Phone
  Settings tabs all built out (`d144466`). Phone module went 1/7 → 5/7
  real tabs.
- **Actively working on:** Autonomous research session on the inbound
  `user_busy` problem (Telnyx WebRTC routing). Goal: avoid 12 more
  hours of trial-and-error by reading docs end-to-end first.

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

- [ ] **Inbound call audio still broken.** Caller ID + routing now work
  (huge win), but after answering: no audio either direction, no ringtone
  alerting the rep that a call is coming in, and hangup from the caller's
  cell doesn't visually reset the browser panel. Active work.

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
