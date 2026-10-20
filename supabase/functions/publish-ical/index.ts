// Public iCal export: GET ?token=<secret>. Configure an export_token_hash in DB using SHA-256.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' }
const encoder = new TextEncoder()
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,'0')).join('')
}
function escapeICS(s: string) { return s.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n') }
Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token')
  if (!token || token.length < 24) return new Response('Not found', { status: 404 })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const hash = await sha256(token)
  const { data: conn } = await supabase.from('calendar_connections').select('id,property_id').eq('export_token_hash',hash).eq('direction','export').eq('status','active').maybeSingle()
  if (!conn) return new Response('Not found', { status: 404 })
  const { data: rows, error } = await supabase.from('reservations').select('id,check_in,check_out,status,source_type,external_uid').eq('property_id',conn.property_id).neq('status','cancelled')
  if (error) return new Response('Calendar unavailable', { status: 503 })
  const now = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
  const events = (rows || []).map((r:any) => {
    const start = r.check_in.replaceAll('-','')
    const end = r.check_out.replaceAll('-','')
    return ['BEGIN:VEVENT',`UID:${r.id}@channelora`,`DTSTAMP:${now}`,`DTSTART;VALUE=DATE:${start}`,`DTEND;VALUE=DATE:${end}`,`SUMMARY:${escapeICS(r.source_type === 'direct' ? 'Unavailable' : 'Reserved')}`,'END:VEVENT'].join('\r\n')
  }).join('\r\n')
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Channelora//Availability Calendar 0.1//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH',events,'END:VCALENDAR',''].join('\r\n')
  return new Response(ics, { headers: cors })
})
