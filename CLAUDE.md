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
- **Last shipped:** Worker v9 (`bca48ca`) + SIP login swap (`3538de2`) —
  neither fixed the inbound `user_busy`. See Open Threads.
- **Actively working on:** Shifting to other Phone-tab features while
  inbound routing is parked.

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

- [ ] **Inbound WebRTC calls return `user_busy`** — parked 2026-04-18 evening.
  - **Symptom:** call to `+12629560031` answers the recording announcement,
    then Telnyx returns `user_busy` / source: `unknown` on the outbound dial
    to `sip:lmswebrtc@sip.telnyx.com`. Phone panel never rings. Voicemail
    fallback also not firing after the busy.
  - **Outbound still works** (can dial out from the Phone panel).
  - **Tried:**
    1. Worker v9 (`bca48ca`) — added `hangup_cause`/`hangup_source` to the
       main log line so we could see why. Confirmed `user_busy`.
    2. SIP login fix (`3538de2`) — swapped WebRTC SDK login from
       `login_token` (JWT) to SIP user/password so the session registers as
       `lmswebrtc` on the credential connection. **Did not fix it.**
  - **Next ideas to try tomorrow:**
    - Check Telnyx dashboard → Credential Connection "LMS WebRTC": is there
      a live registration for `lmswebrtc`? If yes, is it ours or stale?
    - Confirm `WEBRTC_CONNECTION_ID` in the Cloudflare Worker env vars
      matches the ID of the credential connection the SDK is using.
    - Try originating with `to: "lmswebrtc"` (bare username) instead of
      `to: "sip:lmswebrtc@sip.telnyx.com"` on the credential connection.
    - Check browser console on the LMS Phone panel for any
      `[Telnyx] call state: ...` lines during the test call — would tell us
      if the SDK saw the INVITE at all.
    - Fix voicemail fallback separately: `onCallHangup` should play VM on
      the inbound leg after `user_busy`, but it didn't. Check if
      `client_state` was actually present on that hangup payload.

---

## Session Log

_Append newest first. One paragraph per session: what we did, what's next.
Keep each entry tight — this is a map, not the territory._

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
