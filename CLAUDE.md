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
- **Last shipped:** Phase 3b Track B — Cloudflare Worker + Account Hub phone tab
  (commit `3e3a422` — voicemail fallback + hangup-cause logging)
- **Actively working on:** TBD — pending user direction for this session

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

---

## Open Threads

_Populate as items come up. Close out or move to "Shipped" when done._

- [ ] (placeholder — add real items as they come up)

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

- Prefers short, direct answers over long explanations.
- Wants decisions/direction changes captured in writing, not just in chat.
- Works across multiple sessions — assume no memory between them.
- Uses Windows (`DEPLOY.ps1` / `.bat`) and a shell environment (`deploy.sh`).
