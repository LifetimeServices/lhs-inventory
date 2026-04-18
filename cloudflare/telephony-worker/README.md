# LMS Telephony Worker

Cloudflare Worker that handles Telnyx webhooks for inbound call routing,
call recording capture, and voicemail.

## Deploy (dashboard — no CLI)

1. Go to **Cloudflare Dashboard → Workers & Pages → Create → Worker**.
2. Name it `lms-telephony`. Click **Deploy** (accept the Hello World default).
3. Click **Edit code**. Select-all the default code and replace with the contents
   of `worker.js`. Click **Deploy**.
4. Go to **Settings → Variables** on this Worker and add:
   - **Variables:**
     - `SUPABASE_URL` = `https://vuwcnqvrgmdknvbajhtt.supabase.co`
     - `WORKER_URL` = `https://lms-telephony.<your-subdomain>.workers.dev`
     - `R2_PUBLIC_URL` = public R2 URL prefix (e.g. the `lhs-r2-proxy` domain)
   - **Secrets (encrypted):**
     - `SUPABASE_SERVICE_KEY` = service_role key from Supabase Dashboard → API
     - `TELNYX_API_KEY` = your Telnyx API key
5. **R2 Bucket binding:** Settings → Variables → **R2 Bucket Bindings → Add**.
   - Variable name: `R2_BUCKET`
   - Bucket: the same one the main app uses for product photos
6. **Redeploy** (Deployments tab → three-dot menu → Redeploy) so the new
   variables take effect.
7. Sanity check: visit `https://lms-telephony.<subdomain>.workers.dev/health` —
   should return `{"ok":true,"v":"phase3b-v1"}`.

## Telnyx configuration

1. Telnyx Portal → Voice → **TeXML Applications** → create new.
2. Name it **LMS Inbound**.
3. **Webhook URL**: `https://lms-telephony.<subdomain>.workers.dev/telnyx/texml/inbound`
4. **HTTP method**: POST
5. Voice Method, Status Callback Method: POST
6. Save.
7. Then: Telnyx Portal → Numbers → pick your number → **Connection or App**: select the `LMS Inbound` TeXML app you just created. Save.

Inbound calls to that number will now hit the Worker, which routes based on the
number's configuration in `lhs_phone_numbers`.

## Endpoints

| Path                         | Purpose                                       |
| ---------------------------- | --------------------------------------------- |
| `/health`                    | Health check                                  |
| `/telnyx/texml/inbound`      | Main inbound-call TeXML router                |
| `/telnyx/texml/voicemail`    | Voicemail prompt (fallthrough from Dial)      |
| `/telnyx/voicemail-done`     | After-recording handler for voicemail         |
| `/telnyx/recording`          | Call-recording status callback (from Dial)    |
| `/telnyx/status`             | Optional call-state updates                   |

## What this Worker does NOT do yet

- Per-user SIP credentials for true ring-all fanout (currently rings the shared
  `lmswebrtc` client — all logged-in users get the call simultaneously).
- Email voicemail notifications via Brevo (hook point left as TODO).
- "Press 1 to reach office" IVR.
- Satellite-office → call-center overflow.

These are scheduled for later phases.
