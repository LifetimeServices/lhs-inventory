// ─── LMS Telephony Worker v5 — Call Control API ─────────────────────────────
// Call flow (Call Control API, not TeXML):
//   1. Caller dials the LMS number → Telnyx Call Control App webhook → this
//      Worker's /telnyx/call-events endpoint (JSON event payloads).
//   2. On call.initiated: answer the inbound leg, log to lhs_phone_calls,
//      check business hours, optionally start recording, then originate a
//      parallel call to the WebRTC credential via /v2/calls using the
//      credential connection_id. The outbound call's client_state carries
//      the inbound call_control_id so we can bridge them when the WebRTC
//      client answers.
//   3. On call.answered (outgoing leg): bridge to the inbound leg.
//   4. If the WebRTC client doesn't answer within ring_seconds (or outside
//      business hours): play the voicemail greeting + start a single-channel
//      record for up to 3 minutes.
//   5. On call.recording.saved: download from Telnyx, upload to R2, patch
//      lhs_phone_calls.recording_url (or insert lhs_voicemails if the call
//      was not bridged).
//   6. On call.hangup: finalize lhs_phone_calls (status, ended_at, duration).
//
// Environment bindings (Cloudflare Dashboard → Settings → Variables):
//   SUPABASE_URL           — https://vuwcnqvrgmdknvbajhtt.supabase.co
//   SUPABASE_SERVICE_KEY   — service_role key (secret)
//   TELNYX_API_KEY         — Telnyx API key (secret)
//   WORKER_URL             — public URL of this Worker
//   R2_PUBLIC_URL          — public R2 URL prefix (or lhs-r2-proxy domain)
//   WEBRTC_CONNECTION_ID   — Telnyx Connection ID of the "LMS WebRTC"
//                            credential connection (e.g. 2940059800060298749).
// R2 binding:
//   R2_BUCKET              — bound to the main app's R2 bucket.
// ─────────────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (request.method === 'OPTIONS') return cors(new Response(null));
      switch (url.pathname) {
        case '/health':             return json({ ok: true, v: 'phase3b-v5' });
        case '/telnyx/call-events': return await handleCallEvent(request, env);
        case '/telnyx/recording':   return await handleRecording(request, env);
        default:                    return new Response('Not found', { status: 404 });
      }
    } catch (err) {
      console.error('Worker error:', err.stack || err.message);
      return new Response('Internal error: ' + err.message, { status: 500 });
    }
  },
};

// ─── EVENT DISPATCH ──────────────────────────────────────────────────────────
async function handleCallEvent(request, env) {
  const body = await request.json().catch(() => ({}));
  const event = body.data || body;
  const eventType = event.event_type;
  const payload = event.payload || {};
  console.log('📞', eventType, payload.call_control_id || '', payload.to || '', payload.direction || '');
  try {
    switch (eventType) {
      case 'call.initiated':        return await onCallInitiated(payload, env);
      case 'call.answered':         return await onCallAnswered(payload, env);
      case 'call.hangup':           return await onCallHangup(payload, env);
      case 'call.recording.saved':  return await onRecordingSaved(payload, env);
      // Acks — just 200 OK so Telnyx doesn't retry
      default:                      return json({ ok: true, ignored: eventType });
    }
  } catch (err) {
    console.error('Event handler error for', eventType, ':', err.stack || err.message);
    return json({ ok: false, error: err.message });
  }
}

// ─── call.initiated ──────────────────────────────────────────────────────────
async function onCallInitiated(p, env) {
  const callControlId = p.call_control_id;
  const toNumber   = p.to;
  const fromNumber = p.from;
  if (p.direction !== 'incoming') return json({ ok: true });

  // Look up number config
  const rows = await supa(env, `/lhs_phone_numbers?e164=eq.${encodeURIComponent(toNumber)}&select=*`);
  const cfg = rows?.[0];
  if (!cfg || !cfg.active) {
    await ctl(env, callControlId, 'hangup');
    return json({ ok: true, reason: 'no-config-or-inactive' });
  }

  // Match customer by caller digits
  const customerId = await lookupCustomerId(env, fromNumber);

  // Log inbound call
  await supa(env, '/lhs_phone_calls', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify({
      direction: 'inbound',
      from_number: fromNumber,
      to_number: toNumber,
      phone_number_id: cfg.id,
      customer_id: customerId,
      status: 'ringing',
      started_at: new Date().toISOString(),
      telnyx_call_control_id: callControlId,
    }),
  }).catch(e => console.warn('Call row insert failed:', e.message));

  // Answer inbound leg
  await ctl(env, callControlId, 'answer');

  // Outside business hours → straight to voicemail
  if (!isWithinBusinessHours(cfg)) {
    await playVoicemailPrompt(env, callControlId, cfg);
    return json({ ok: true, branch: 'after-hours-vm' });
  }

  // Recording announcement (if enabled)
  if (cfg.record_calls && cfg.recording_announcement) {
    await ctl(env, callControlId, 'speak', {
      language: 'en-US', voice: 'female',
      payload: 'This call may be recorded for quality assurance.',
    });
  }
  // Start dual-channel recording if enabled — captures both legs once bridged
  if (cfg.record_calls) {
    await ctl(env, callControlId, 'record_start', { format: 'mp3', channels: 'dual' });
  }

  // Originate outbound leg to the WebRTC client via the credential connection
  const webrtcConnId = env.WEBRTC_CONNECTION_ID;
  if (!webrtcConnId) {
    console.error('WEBRTC_CONNECTION_ID env var missing');
    await playVoicemailPrompt(env, callControlId, cfg);
    return json({ ok: true, branch: 'no-webrtc-conn' });
  }
  const result = await telnyxApi(env, 'POST', '/v2/calls', {
    connection_id: webrtcConnId,
    to:   `sip:lmswebrtc@sip.telnyx.com`,
    from: fromNumber,
    timeout_secs: cfg.ring_seconds || 25,
    answering_machine_detection: 'disabled',
    client_state: b64(callControlId),         // carries inbound-leg id
    webhook_url: `${env.WORKER_URL}/telnyx/call-events`,
  });
  if (result?.error) {
    console.error('Originate failed:', result.error);
    await playVoicemailPrompt(env, callControlId, cfg);
    return json({ ok: true, branch: 'originate-failed' });
  }

  // Store outbound call_control_id so we can cancel it if the caller hangs up
  const outboundId = result?.data?.call_control_id;
  if (outboundId) {
    await supa(env, `/lhs_phone_calls?telnyx_call_control_id=eq.${callControlId}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: JSON.stringify({ telnyx_leg_id: outboundId }),
    }).catch(() => {});
  }

  return json({ ok: true, branch: 'dialing-webrtc' });
}

// ─── call.answered ───────────────────────────────────────────────────────────
// Fires on BOTH legs. Only the outbound (WebRTC) answered event triggers a bridge.
async function onCallAnswered(p, env) {
  const callControlId = p.call_control_id;
  if (p.direction !== 'outgoing' || !p.client_state) return json({ ok: true });

  const inboundId = unb64(p.client_state);
  if (!inboundId) return json({ ok: true });

  // Bridge the two call legs
  const res = await ctl(env, callControlId, 'bridge', { call_control_id: inboundId });
  if (res?.error) console.error('Bridge failed:', res.error);

  // Mark inbound call as answered
  await supa(env, `/lhs_phone_calls?telnyx_call_control_id=eq.${inboundId}`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: JSON.stringify({ status: 'answered', answered_at: new Date().toISOString() }),
  }).catch(() => {});
  return json({ ok: true });
}

// ─── call.hangup ─────────────────────────────────────────────────────────────
async function onCallHangup(p, env) {
  const callControlId = p.call_control_id;
  const direction = p.direction;
  const cause = p.hangup_cause || '';

  // Only finalize on the inbound leg hangup
  if (direction !== 'incoming') return json({ ok: true });

  // Look up call row to compute duration
  const rows = await supa(env, `/lhs_phone_calls?telnyx_call_control_id=eq.${callControlId}&select=*`);
  const row = rows?.[0];
  const started = row?.started_at ? new Date(row.started_at) : null;
  const answered = row?.answered_at ? new Date(row.answered_at) : null;
  const now = new Date();
  const duration = answered ? Math.max(0, Math.round((now - answered) / 1000)) : 0;
  const wasAnswered = !!answered;
  const finalStatus = wasAnswered ? 'completed'
                    : cause === 'call_rejected' ? 'missed'
                    : cause === 'normal_clearing' ? 'missed'
                    : 'missed';

  await supa(env, `/lhs_phone_calls?telnyx_call_control_id=eq.${callControlId}`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: JSON.stringify({
      status: finalStatus,
      ended_at: now.toISOString(),
      duration_seconds: duration,
    }),
  }).catch(() => {});
  return json({ ok: true });
}

// ─── call.recording.saved ────────────────────────────────────────────────────
async function onRecordingSaved(p, env) {
  const callControlId = p.call_control_id;
  const recUrl = p.recording_urls?.mp3 || p.public_recording_urls?.mp3 || p.recording_url;
  if (!recUrl || !callControlId) return json({ ok: true });

  // Check whether this recording belongs to a bridged call or a voicemail
  const rows = await supa(env, `/lhs_phone_calls?telnyx_call_control_id=eq.${callControlId}&select=*`);
  const row = rows?.[0];
  const wasAnswered = !!row?.answered_at;

  const key = `${wasAnswered ? 'call-recordings' : 'voicemails'}/${new Date().toISOString().slice(0,10)}/${callControlId}.mp3`;
  const publicUrl = await downloadToR2(env, recUrl, key, 'audio/mpeg');

  if (wasAnswered) {
    await supa(env, `/lhs_phone_calls?telnyx_call_control_id=eq.${callControlId}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: JSON.stringify({ recording_r2_path: key, recording_url: publicUrl }),
    });
  } else if (row) {
    await supa(env, '/lhs_voicemails', {
      method: 'POST', prefer: 'return=minimal',
      body: JSON.stringify({
        call_id: row.id,
        phone_number_id: row.phone_number_id,
        from_number: row.from_number,
        customer_id: row.customer_id,
        r2_path: key,
        r2_url: publicUrl,
        duration_seconds: p.recording_duration_millis ? Math.round(p.recording_duration_millis / 1000) : null,
        status: 'new',
      }),
    });
  }
  return json({ ok: true });
}

// ─── /telnyx/recording (kept as a legacy fallback) ───────────────────────────
async function handleRecording(request, env) {
  const body = await request.json().catch(() => ({}));
  const payload = body.data?.payload || body;
  return await onRecordingSaved(payload, env);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function playVoicemailPrompt(env, callControlId, cfg) {
  let greetingUrl = null;
  if (cfg.voicemail_greeting_id) {
    const g = await supa(env, `/lhs_voicemail_greetings?id=eq.${cfg.voicemail_greeting_id}&select=r2_url`);
    greetingUrl = g?.[0]?.r2_url;
  }
  if (greetingUrl) {
    await ctl(env, callControlId, 'playback_start', { audio_url: greetingUrl });
  } else {
    await ctl(env, callControlId, 'speak', {
      language: 'en-US', voice: 'female',
      payload: `You've reached ${cfg.label || 'our office'}. Please leave a message after the beep.`,
    });
  }
  // Record the voicemail. record_start before the tone so beep is captured.
  await ctl(env, callControlId, 'record_start', {
    format: 'mp3', channels: 'single', max_length: 180,
  });
}

async function lookupCustomerId(env, fromNumber) {
  if (!fromNumber) return null;
  const digits = String(fromNumber).replace(/\D/g, '').replace(/^1/, '');
  if (digits.length < 10) return null;
  // Match against the last 10 digits of the customer's phone field
  const rows = await supa(env, `/lhs_customers?select=id,phone&phone=ilike.*${digits}*&limit=5`).catch(() => []);
  if (!rows?.length) return null;
  const exact = rows.find(r => String(r.phone || '').replace(/\D/g, '').replace(/^1/, '') === digits);
  return (exact || rows[0]).id || null;
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
  const [eh, em] = (day.end   || '17:00').split(':').map(Number);
  const cur = h * 60 + m;
  return cur >= (sh * 60 + sm) && cur <= (eh * 60 + em);
}

async function downloadToR2(env, srcUrl, key, contentType) {
  const res = await fetch(srcUrl, {
    headers: env.TELNYX_API_KEY ? { Authorization: `Bearer ${env.TELNYX_API_KEY}` } : {},
  });
  if (!res.ok) throw new Error(`R2 fetch ${srcUrl}: ${res.status}`);
  const buf = await res.arrayBuffer();
  await env.R2_BUCKET.put(key, buf, { httpMetadata: { contentType } });
  return (env.R2_PUBLIC_URL || '').replace(/\/$/, '') + '/' + key;
}

// Telnyx Call Control action shorthand: POST /v2/calls/{id}/actions/{action}
async function ctl(env, callControlId, action, body = {}) {
  return await telnyxApi(env, 'POST', `/v2/calls/${callControlId}/actions/${action}`, body);
}
async function telnyxApi(env, method, path, body) {
  if (!env.TELNYX_API_KEY) return { error: 'TELNYX_API_KEY missing' };
  const res = await fetch(`https://api.telnyx.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.TELNYX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Telnyx ${method} ${path} → ${res.status}:`, text.slice(0, 500));
    return { error: `${res.status}: ${text.slice(0, 200)}` };
  }
  return text ? JSON.parse(text) : {};
}

async function supa(env, path, opts = {}) {
  const res = await fetch(env.SUPABASE_URL + '/rest/v1' + path, {
    method: opts.method || 'GET',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
    body: opts.body,
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function b64(s) { return btoa(String(s)); }
function unb64(s) { try { return atob(String(s)); } catch { return ''; } }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function cors(res) {
  Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
function json(obj) {
  return cors(new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } }));
}
