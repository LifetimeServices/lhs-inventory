// ─── LMS Telephony Worker ───────────────────────────────────────────────────
// Handles Telnyx webhooks for:
//   • Inbound call routing (TeXML) — ring config, voicemail fallback
//   • Call recording capture → Cloudflare R2 + Supabase
//   • Voicemail capture → Cloudflare R2 + Supabase
//
// Environment bindings (set in Cloudflare dashboard → Settings → Variables):
//   SUPABASE_URL           — e.g. https://vuwcnqvrgmdknvbajhtt.supabase.co
//   SUPABASE_SERVICE_KEY   — service_role key (secret)
//   TELNYX_API_KEY         — Telnyx API key (secret, for recording fetch)
//   WORKER_URL             — this Worker's public URL (e.g. https://lms-telephony.<acct>.workers.dev)
//   R2_PUBLIC_URL          — public R2 URL prefix, OR empty to use lhs-r2-proxy
//
// R2 binding (set in Cloudflare dashboard → Settings → Variables → R2 Bindings):
//   R2_BUCKET              — bound to your R2 bucket (same one the main app uses)
// ─────────────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (request.method === 'OPTIONS') return cors(new Response(null));
      switch (url.pathname) {
        case '/health':               return json({ ok: true, v: 'phase3b-v3' });
        case '/telnyx/texml/inbound': return await handleInbound(request, env);
        case '/telnyx/texml/voicemail': return await handleVoicemailPrompt(request, env);
        case '/telnyx/recording':     return await handleRecording(request, env);
        case '/telnyx/voicemail-done': return await handleVoicemailDone(request, env);
        case '/telnyx/status':        return await handleStatus(request, env);
        default:                      return new Response('Not found', { status: 404 });
      }
    } catch (err) {
      // Always return valid TeXML for call-control endpoints so Telnyx doesn't
      // play its default "application error" message — instead the error is
      // spoken to the caller so we can debug over the phone.
      console.error('Worker error:', err.stack || err.message);
      const msg = (err.message || 'Unknown error').slice(0, 180).replace(/[<>&"']/g, ' ');
      if (url.pathname.startsWith('/telnyx/')) {
        return texml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Debug message. ${msg}</Say>
  <Hangup/>
</Response>`);
      }
      return new Response('Internal error: ' + err.message, { status: 500 });
    }
  },
};

// ─── INBOUND CALL ROUTING (TeXML) ────────────────────────────────────────────
async function handleInbound(request, env) {
  const p = await parseBody(request);
  const toNumber = p.To || p.to;
  const fromNumber = p.From || p.from;
  const callControlId = p.CallControlId || p.call_control_id || p.CallSid;

  // Look up the number's config
  const rows = await supa(env, `/lhs_phone_numbers?e164=eq.${encodeURIComponent(toNumber)}&select=*`);
  const cfg = rows?.[0];
  if (!cfg || !cfg.active) {
    return texml(`<?xml version="1.0"?><Response><Reject reason="rejected"/></Response>`);
  }

  // Log call start (fire-and-forget)
  await supa(env, '/lhs_phone_calls', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      direction: 'inbound',
      from_number: fromNumber,
      to_number: toNumber,
      phone_number_id: cfg.id,
      status: 'ringing',
      started_at: new Date().toISOString(),
      telnyx_call_control_id: callControlId,
    }),
  }).catch(() => {});

  const voicemailUrl = `${env.WORKER_URL}/telnyx/texml/voicemail?number_id=${cfg.id}`;

  // After business hours → straight to voicemail
  if (!isWithinBusinessHours(cfg)) {
    return texml(await voicemailXml(env, cfg));
  }

  // Ring configured target(s). If none → voicemail.
  const targets = await getRingTargets(env, cfg);
  if (!targets.length) return texml(await voicemailXml(env, cfg));

  const ringSecs = cfg.ring_seconds || 25;
  const recordAttrs = cfg.record_calls
    ? ` record="record-from-answer" recordingStatusCallback="${env.WORKER_URL}/telnyx/recording"`
    : '';
  const announce = (cfg.record_calls && cfg.recording_announcement)
    ? `<Say voice="alice">This call may be recorded for quality assurance.</Say>`
    : '';
  // SIP credential-based WebRTC clients are dialed with <Sip>user@sip.telnyx.com</Sip>.
  // Call Control client-SDK targets would use <Client>, but this app uses credential login.
  const dialList = targets.map(t => {
    if (t.includes('@')) return `<Sip>${t}</Sip>`;           // already a full SIP URI
    if (/^\+?[0-9]+$/.test(t)) return `<Number>${t}</Number>`;// PSTN forwarding
    return `<Sip>${t}@sip.telnyx.com</Sip>`;                  // bare SIP username
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${announce}
  <Dial timeout="${ringSecs}" action="${voicemailUrl}"${recordAttrs}>${dialList}</Dial>
</Response>`;
  return texml(xml);
}

// ─── VOICEMAIL PROMPT (TeXML) ────────────────────────────────────────────────
async function handleVoicemailPrompt(request, env) {
  const url = new URL(request.url);
  const numberId = url.searchParams.get('number_id');
  const cfg = numberId
    ? (await supa(env, `/lhs_phone_numbers?id=eq.${numberId}&select=*`))?.[0]
    : null;
  return texml(await voicemailXml(env, cfg || {}));
}

async function voicemailXml(env, cfg) {
  let greeting = `<Say voice="alice">You've reached ${cfg.label || 'our office'}. Please leave a message after the beep.</Say>`;
  if (cfg.voicemail_greeting_id) {
    const g = await supa(env, `/lhs_voicemail_greetings?id=eq.${cfg.voicemail_greeting_id}&select=r2_url`);
    if (g?.[0]?.r2_url) greeting = `<Play>${g[0].r2_url}</Play>`;
  }
  const doneUrl = `${env.WORKER_URL}/telnyx/voicemail-done?number_id=${cfg.id || ''}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${greeting}
  <Record maxLength="180" playBeep="true" action="${doneUrl}" recordingStatusCallback="${doneUrl}" />
  <Say voice="alice">We didn't receive a message. Goodbye.</Say>
  <Hangup/>
</Response>`;
}

// ─── RECORDING CAPTURE (call recording from <Dial record>) ───────────────────
async function handleRecording(request, env) {
  const body = await request.json().catch(() => ({}));
  const payload = body.data?.payload || body;
  const recordingUrl = payload.recording_urls?.mp3 || payload.public_recording_urls?.mp3 || payload.RecordingUrl || payload.url;
  const callControlId = payload.call_control_id || payload.CallSid;
  if (!recordingUrl || !callControlId) return json({ skipped: true });

  const key = `call-recordings/${new Date().toISOString().slice(0, 10)}/${callControlId}.mp3`;
  const publicUrl = await downloadToR2(env, recordingUrl, key, 'audio/mpeg');

  await supa(env, `/lhs_phone_calls?telnyx_call_control_id=eq.${callControlId}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ recording_r2_path: key, recording_url: publicUrl }),
  });

  return json({ ok: true });
}

// ─── VOICEMAIL DONE (after <Record>) ─────────────────────────────────────────
async function handleVoicemailDone(request, env) {
  const url = new URL(request.url);
  const numberId = url.searchParams.get('number_id');
  const p = await parseBody(request);
  const recordingUrl = p.RecordingUrl || p.recording_url || p.public_recording_urls?.mp3;
  const duration = parseInt(p.RecordingDuration || p.duration || '0', 10);
  const fromNumber = p.From || p.from;

  if (recordingUrl) {
    const ts = Date.now();
    const key = `voicemails/${new Date().toISOString().slice(0, 10)}/${numberId || 'unknown'}-${ts}.mp3`;
    const publicUrl = await downloadToR2(env, recordingUrl, key, 'audio/mpeg');

    await supa(env, '/lhs_voicemails', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        phone_number_id: numberId || null,
        from_number: fromNumber || null,
        r2_path: key,
        r2_url: publicUrl,
        duration_seconds: duration || null,
        status: 'new',
      }),
    });

    // TODO: email notify via Brevo using cfg.voicemail_notify_emails
  }

  return texml(`<?xml version="1.0"?><Response><Say voice="alice">Thank you. Goodbye.</Say><Hangup/></Response>`);
}

// ─── STATUS CALLBACK (optional) ──────────────────────────────────────────────
async function handleStatus(request, env) {
  const body = await request.json().catch(() => ({}));
  const payload = body.data?.payload || body;
  const callControlId = payload.call_control_id;
  const state = payload.state || payload.CallStatus;

  if (!callControlId) return json({ skipped: true });

  const patch = {};
  if (state === 'answered') patch.answered_at = new Date().toISOString();
  if (state === 'hangup' || state === 'completed') {
    patch.ended_at = new Date().toISOString();
    patch.status = state === 'hangup' ? 'completed' : state;
    if (payload.call_duration_secs) patch.duration_seconds = payload.call_duration_secs;
  }
  if (Object.keys(patch).length) {
    await supa(env, `/lhs_phone_calls?telnyx_call_control_id=eq.${callControlId}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify(patch),
    }).catch(() => {});
  }
  return json({ ok: true });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function getRingTargets(env, cfg) {
  // direct_rep → the assigned user's SIP credential (derived from email local-part)
  if (cfg.route_type === 'direct_rep' && cfg.assigned_user_id) {
    const u = await supa(env, `/lhs_users?id=eq.${cfg.assigned_user_id}&select=email,id`);
    if (u?.[0]) return [sipIdForUser(u[0])];
    return [];
  }
  // call_center → for now, the shared "lmswebrtc" credential (multi-registered clients
  // will all ring). Replace with per-user credentials in a future pass for true
  // fanout accounting.
  return ['lmswebrtc'];
}

function sipIdForUser(u) {
  // Use email local-part, alphanumeric only, lowercased
  return (u.email || '').split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase() || 'lmswebrtc';
}

function isWithinBusinessHours(cfg) {
  if (!cfg.business_hours) return true;
  const tz = cfg.timezone || 'America/Chicago';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', hour12: false, hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date());
  const weekday = parts.find(p => p.type === 'weekday').value.toLowerCase().slice(0, 3);
  const h = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const m = parseInt(parts.find(p => p.type === 'minute').value, 10);
  const day = cfg.business_hours[weekday];
  if (!day || day.closed) return false;
  const [sh, sm] = (day.start || '08:00').split(':').map(Number);
  const [eh, em] = (day.end || '17:00').split(':').map(Number);
  const cur = h * 60 + m;
  return cur >= (sh * 60 + sm) && cur <= (eh * 60 + em);
}

async function downloadToR2(env, srcUrl, key, contentType) {
  const res = await fetch(srcUrl, {
    headers: env.TELNYX_API_KEY ? { Authorization: `Bearer ${env.TELNYX_API_KEY}` } : {},
  });
  if (!res.ok) throw new Error(`Fetch ${srcUrl}: ${res.status}`);
  const buf = await res.arrayBuffer();
  await env.R2_BUCKET.put(key, buf, { httpMetadata: { contentType } });
  return (env.R2_PUBLIC_URL || '').replace(/\/$/, '') + '/' + key;
}

async function supa(env, path, opts = {}) {
  const url = env.SUPABASE_URL + '/rest/v1' + path;
  const headers = {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json',
    Prefer: opts.prefer || 'return=representation',
    ...(opts.headers || {}),
  };
  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function parseBody(request) {
  const ctype = request.headers.get('content-type') || '';
  if (ctype.includes('application/json')) return await request.json().catch(() => ({}));
  const text = await request.text();
  const out = {};
  text.split('&').forEach(pair => {
    const [k, v = ''] = pair.split('=');
    if (k) out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
  });
  return out;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function cors(res) {
  Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
function texml(xml) {
  return cors(new Response(xml, { headers: { 'Content-Type': 'application/xml' } }));
}
function json(obj) {
  return cors(new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } }));
}
