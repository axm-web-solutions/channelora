// Supabase Edge Function: import an iCal/ICS calendar into normalized reservations.
// Deploy with: supabase functions deploy sync-ical
// Invoke as authenticated user with JSON { "connection_id": "<uuid>" }.
// For production, protect URLs as secrets and add stricter SSRF controls / provider allowlists.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import ICAL from 'https://esm.sh/ical.js@2.1.0'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors })
  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const auth = req.headers.get('Authorization') || ''
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: cors })
  const body = await req.json().catch(() => ({}))
  const connectionId = body.connection_id
  if (!connectionId) return Response.json({ error: 'connection_id required' }, { status: 400, headers: cors })
  const { data: connection, error: connErr } = await userClient.rpc('get_owned_connection', { p_connection_id: connectionId })
    .maybeSingle()
  if (connErr || !connection?.source_url) return Response.json({ error: 'Connection not found or no import URL configured' }, { status: 404, headers: cors })
  const run = await userClient.from('sync_runs').insert({ connection_id: connectionId, status: 'running' }).select('id').single()
  if (run.error) return Response.json({ error: run.error.message }, { status: 500, headers: cors })
  const started = Date.now()
  try {
    const parsedUrl = new URL(connection.source_url)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') throw new Error('Only HTTP(S) calendar URLs are supported')
    const response = await fetch(parsedUrl, { headers: { 'User-Agent': 'Channelora/0.1 calendar-sync' }, signal: AbortSignal.timeout(12000) })
    if (!response.ok) throw new Error(`Calendar server returned HTTP ${response.status}`)
    const raw = await response.text()
    if (raw.length > 2_000_000) throw new Error('Calendar file exceeds 2 MB limit')
    const jcal = ICAL.parse(raw)
    const calendar = new ICAL.Component(jcal)
    const vevents = calendar.getAllSubcomponents('vevent')
    let imported = 0, updated = 0, skipped = 0
    for (const ev of vevents) {
      const uid = String(ev.getFirstPropertyValue('uid') ?? '')
      const dtStart = ev.getFirstPropertyValue('dtstart')
      const dtEnd = ev.getFirstPropertyValue('dtend')
      if (!uid || !dtStart || !dtEnd) { skipped++; continue }
      const toDate = (v: any) => {
        if (v.isDate) return `${v.year}-${String(v.month).padStart(2,'0')}-${String(v.day).padStart(2,'0')}`
        if (v.toJSDate) return v.toJSDate().toISOString().slice(0,10)
        return ''
      }
      const checkIn = toDate(dtStart), checkOut = toDate(dtEnd)
      if (!checkIn || !checkOut || checkOut <= checkIn) { skipped++; continue }
      const summary = String(ev.getFirstPropertyValue('summary') ?? 'Reserva importada').slice(0,200)
      const { data: existing } = await userClient.from('reservations').select('id,status,check_in,check_out').eq('connection_id',connectionId).eq('external_uid',uid).maybeSingle()
      // ICS disappearance/cancellation handling varies by provider; do not auto-cancel missing events.
      const payload = { property_id: connection.property_id, guest_name: null, check_in: checkIn, check_out: checkOut, status: 'tentative', source_type: 'ical', source_name: connection.channel_id, external_uid: uid, connection_id: connectionId, notes: summary, last_seen_at: new Date().toISOString() }
      if (existing) {
        const { error } = await userClient.from('reservations').update(payload).eq('id',existing.id)
        if (error) { skipped++; continue }
        updated++
      } else {
        const { error } = await userClient.from('reservations').insert(payload)
        if (error) { skipped++; continue }
        imported++
      }
    }
    await userClient.from('calendar_connections').update({ status: 'active', last_synced_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_error: null }).eq('id',connectionId)
    await userClient.from('sync_runs').update({ finished_at: new Date().toISOString(), status: skipped ? 'partial' : 'success', imported_count: imported, updated_count: updated, error_message: skipped ? `${skipped} eventos omitidos o con conflicto` : null }).eq('id',run.data.id)
    return Response.json({ ok: true, imported, updated, skipped, duration_ms: Date.now()-started }, { headers: cors })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'
    await userClient.from('calendar_connections').update({ status: 'error', last_synced_at: new Date().toISOString(), last_error: error }).eq('id',connectionId)
    await userClient.from('sync_runs').update({ finished_at: new Date().toISOString(), status: 'error', error_message: error }).eq('id',run.data.id)
    return Response.json({ error }, { status: 502, headers: cors })
  }
})
