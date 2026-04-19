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

- **Active branch:** `claude/review-claude-md-czd9X`
- **Last shipped:**
  1. ✅ **Comm bells end-to-end** — checkboxes in custForm and Account
     hub edit form, persisted to Supabase, enforced on outbound call
     (softphone) and outbound email (Estimate + Invoice). Pills shown
     on customer modal, Account hub header, Account hub Details tab,
     and Opportunity detail modal. `commBellPills(c,size)` helper.
  2. ✅ **Brevo verification workflow** — added "Test Key" button that
     calls Brevo `/v3/account` to validate the stored API key without
     sending mail. Actionable 401 toast directs user to Integrations.
  3. ✅ **Account hub save hardened** — `acctHubSave` now catches
     Supabase column-not-exists errors, parses the offending column
     out of the error message, retries without it, and reports dropped
     columns in the toast. Cache only mirrors what the DB accepted.
  4. ✅ **Account hub WO rows clickable.**
- **Actively working on:** TBD — pick next Phase 3 item (per-number
  config modal is next per plan; SMS pipeline is the other big item).

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

- [x] ~~**Global search bar doesn't surface addresses from account pages.**~~
  ✅ **RESOLVED 2026-04-19.** Three fixes in the top-of-app search (`globalSearch`
  / `_gsAsync` / `_gsRender`) plus the Customers and Properties list filters:
  (1) also query `lhs_properties` in Supabase, not just customers/WOs;
  (2) loose-pattern address ilike (`%129%N%Beebe%` matches "129 North Beebe
  Street" even with gaps between tokens); (3) drop single-letter words from
  name/company/city clauses so "N" and "St" don't match the entire table;
  (4) re-ordered results so Properties → Customers → WOs, and address-shaped
  queries skip WO-number substring hits.

- [x] ~~**Invoice-from-dispatch-closeout flow regressed.**~~ ✅ **RESOLVED
  (commit `5271a28`).** Two code paths were setting a WO to "Closed with
  Dispatch": the Dispatch board's Close button (which routed through
  `closeoutWO()` and showed the Create-Invoice prompt — worked), and
  the WO detail page's status buttons (which called `updateWOStatus`
  directly — silently flipped status, no prompt, no estimate lock).
  Fix: route the detail-page path through `closeoutWO()` too, so every
  close-with-dispatch gets the same treatment regardless of where the
  user triggered it. Follow-up in commit `418a45e` handled single-char
  search queries and no-estimate WOs so the path is robust.

- [x] ~~**Inbound call audio broken.**~~ ✅ **RESOLVED 2026-04-19.** Root cause:
  Telnyx sends `direction: null` on `call.answered` webhooks, but the
  worker was checking `direction === 'outgoing'` before bridging — so
  the bridge call was being skipped entirely on every call. Fix: drop the
  direction check; `client_state` presence alone identifies the outbound
  leg we need to bridge (worker v12). Also moved `record_start` from
  pre-bridge to post-bridge so it doesn't interfere with the handshake.
  Client-side: audio attachment now uses `pc.getReceivers()` (standard
  WebRTC) rather than SDK-specific paths; works reliably in Safari.

- [x] ~~**Phone panel must be open to accept calls.**~~ ✅ **RESOLVED
  2026-04-19.** Turned out to be a tiny change — the incoming-call
  banner, ringer and remote-audio element were already globally
  mounted. Only reason the panel had to be open was that
  `initTelnyxClient()` was gated behind `togglePhonePanel`. Moved the
  init into `startApp()` (after `warmCache`), gated on
  `DEFAULT_PERMS[CU.role]?.phone` + `lhs:telnyx_api_key`. Also updated
  `phoneAnswer()` to auto-open the panel if the user answers from the
  global banner while the panel was closed.

---

## Session Log

_Append newest first. One paragraph per session: what we did, what's next.
Keep each entry tight — this is a map, not the territory._

### 2026-04-19 night — Comm bells end-to-end + Brevo validation + schema drift
Phase 3a comm-bell work closed out. UI: added `commBellPills(c,size)`
helper and rendered pills in four surfaces (customer modal Contact Info
card, Account hub header, Account hub Details tab, Opportunity detail
modal). Toggles: added the four checkboxes (allow_calls / allow_sms /
allow_email / do_not_contact) to the Account hub edit form. Enforcement:
`svEmailEstimate` and `svEmailInvoice` now call `commBlockIfDisabled`
before sending, matching the `phoneInitiateCall` behavior shipped
earlier. **Brevo side-quest:** user hit "Email failed: Key not found"
on first estimate send — turned out the stored API key was invalid.
Added a Test Key button to Integrations that pings `/v3/account` to
validate without sending, and rewrote the 401 error to direct the user
to regenerate. User generated a new key, tested, confirmed send works.
**Account hub save bug:** user edited phone/email, toast said "Account
updated", but re-render showed old values. Root cause: `acctHubSave`
swallowed Supabase errors silently. Rewrote with a recursive `attempt()`
that parses missing-column errors from the Supabase response, drops
just that column, retries — so on schema-drift DBs, the core fields
still save and the toast names the dropped columns. User's Supabase
was missing the comm-bell columns entirely; gave them the `alter table
if not exists` SQL from schema.sql to run once. Confirmed working
end-to-end. **Also small:** Account hub Work Orders table rows are now
clickable (matches Opportunities/Locations/Activity tabs). Next: per-
number config modal (unlocks Phase 3b ring-all routing) or SMS
pipeline (Phase 3d).

### 2026-04-19 late evening — Phone auto-init + cross-user data parity
Two shipped. **(1) Phone panel must be open to accept calls** — turned
out to be a five-line fix, not the medium refactor we thought. The
incoming-call banner and audio element were already globally mounted;
only `initTelnyxClient()` was gated behind opening the panel. Moved
init into `startApp()` after `warmCache` (guarded on the user's role
having phone perms + an API key in settings), and made `phoneAnswer()`
auto-open the panel if the user answers from the banner while it was
closed. Calls now ring anywhere in the app.
**(2) Cross-user data parity on detail views** — user George saw the
property address on Tyler Fish's opportunity but teammate Scott saw
blank. Root cause: `lhs_customers` is on-demand (not bulk-loaded at
login) and the opportunity modal reads the customer's address from
local cache only. A user who'd already searched/loaded that customer
this session had the data; others didn't. Fix: `openOpportunity` now
pre-fetches the customer from Supabase if missing. Extended the same
pattern across `openWO`, `openProperty`, `openLead`, `openEstimate`,
`openBusiness`, `openCommercial` — all now pre-fetch self (where they
can be outside a row-limit cap) + linked customer before rendering.
Next: pick next open thread (invoice-from-closeout regression is the
biggest remaining item).

### 2026-04-19 evening — Estimate blank-ghost save bug fixed (confirmed)
User reported estimates weren't saving — opening a saved estimate showed
no customer, no lines, $0, blank estimate number. Traced it to a single
bad wiring: the "Open" button on the Opportunity detail page's linked-
estimates row called `svEstimate` (the SAVE function) instead of
`openEstimate`. `svEstimate` reads every field from DOM IDs inside the
estimate form; on the Opportunity page none of those exist, so every
click inserted a new row full of empties. Real estimates were fine —
users were looking at ghost rows that the Open button had manufactured.
Two fixes: (1) change onclick at line 45220 to `openEstimate`;
(2) defensive guard at the top of `svEstimate` that bails with a toast
if the est-num input isn't in the DOM, so similar wiring mistakes can't
silently corrupt data in the future. User ran the SQL cleanup to purge
ghost rows (empty estimate_number + null customer_id + total_price=0)
and confirmed the fix works end-to-end.

### 2026-04-19 — Address search fixed across top-search + list filters
User reported "129 N Beebe" not finding "129 North Beebe Street" (Tyler
Fish's property). Root causes were stacked: the top-of-app search wasn't
querying `lhs_properties` at all; the ilike patterns used the literal
query as a substring, so "N" had to sit adjacent to "Beebe" (it doesn't
— "North" is between); and the Customers/Properties list filters ORed
single-letter words like "N" and "St" across every name field, matching
50k+ customers. Fixes: added a Supabase property query to the global
search, switched address patterns to `%129%N%Beebe%` so word gaps are
allowed, restricted name/company/city clauses to words of length ≥2,
and re-ordered global-search results to Properties → Customers → WOs
with WO-number substring hits demoted on address-shaped queries. Next:
pick another open thread (invoice-from-closeout regression, or phone
panel must-be-open to accept calls).

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
