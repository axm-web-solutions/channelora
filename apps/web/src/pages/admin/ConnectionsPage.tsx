import { useState } from 'react'
import { FileSpreadsheet, Plug, Plus, RefreshCw, Rss } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAppData, usePropertyName } from '../../context/AppData'
import { CHANNEL_NAMES } from '../../lib/demoStore'
import { PageHeader } from './AdminLayout'
import type { ConnectionStatus } from '../../types'

const CHANNEL_ORDER = ['airbnb', 'booking', 'vrbo', 'other']
const CONNECTION_LABEL: Record<ConnectionStatus, string> = { active: 'Activa', error: 'Error', pending: 'Pendiente', paused: 'Pausada' }

export function ConnectionsPage() {
  const { data, propertyFilter, setPropertyFilter, syncing, syncConnections, addConnection, notify } = useAppData()
  const propertyName = usePropertyName()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ property_id: '', channel_id: 'airbnb', url: '' })
  const visible = data.connections.filter(c => propertyFilter === 'all' || c.property_id === propertyFilter)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.property_id) { notify('Selecciona un alojamiento.'); return }
    if (!/^https:\/\/\S+$/i.test(form.url.trim())) { notify('La URL iCal debe empezar por https://'); return }
    setShowForm(false); setForm({ property_id: '', channel_id: 'airbnb', url: '' })
    await addConnection(form.property_id, form.channel_id)
  }

  return <>
    <PageHeader eyebrow="CANALES EXTERNOS" title="Conexiones" subtitle="Calendarios iCal de Airbnb, Booking.com y Vrbo sincronizados con tu disponibilidad."
      actions={<>
        <button className="button secondary" onClick={() => syncConnections(visible.map(c => c.id))} disabled={Boolean(syncing) || !visible.length}><RefreshCw size={15} className={syncing === 'all' ? 'spin' : ''}/> Sincronizar todo</button>
        <button className="button primary" onClick={() => { setForm(f => ({ ...f, property_id: propertyFilter !== 'all' ? propertyFilter : data.properties[0]?.id || '' })); setShowForm(true) }}><Plus size={15}/> Conectar calendario</button>
      </>}/>
    <section className="content-grid">
      <div>
        {showForm && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">NUEVA CONEXIÓN</span><h2>Conectar calendario iCal</h2></div></div>
          <form className="stack-form" onSubmit={submit}>
            <div className="two-fields">
              <label>Alojamiento<select required value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })}><option value="">Selecciona…</option>{data.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label>Plataforma<select value={form.channel_id} onChange={e => setForm({ ...form, channel_id: e.target.value })}>{CHANNEL_ORDER.map(id => <option key={id} value={id}>{CHANNEL_NAMES[id]}</option>)}</select></label>
            </div>
            <label>Enlace iCal de exportación<input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://www.airbnb.com/calendar/ical/123.ics" required/></label>
            <small className="hint">Demo: el enlace no se descarga; la sincronización genera reservas ficticias sin valores, igual que un iCal real.</small>
            <div className="auth-actions"><button className="button primary" type="submit">Conectar y sincronizar</button><button className="button secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>
        </section>}
        <section className="panel">
          <div className="panel-heading"><div><span className="eyebrow">CALENDARIOS</span><h2>{visible.length} conexión(es)</h2></div>
            <select className="compact-select" value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}><option value="all">Todos los alojamientos</option>{data.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="channel-list">
            {visible.map(c => <div className="channel-row" key={c.id}>
              <div className={`channel-badge channel-${Math.max(0, CHANNEL_ORDER.indexOf(c.channel_id))}`}>{(CHANNEL_NAMES[c.channel_id] ?? '?').slice(0, 1)}</div>
              <div><strong>{CHANNEL_NAMES[c.channel_id] ?? c.channel_id} · {propertyName(c.property_id)}</strong><small>{c.status === 'error' ? c.last_error : c.last_synced_at ? `Sincronizado ${formatDistanceToNow(parseISO(c.last_synced_at), { addSuffix: true, locale: es })}` : 'Pendiente de primera sincronización'}</small></div>
              <span className={`connection-state state-${c.status}`}>{CONNECTION_LABEL[c.status]}</span>
              <button className="icon-button" onClick={() => syncConnections([c.id])} disabled={Boolean(syncing)} title="Sincronizar ahora"><RefreshCw size={14} className={syncing === c.id || syncing === 'all' ? 'spin' : ''}/></button>
            </div>)}
            {!visible.length && <p className="empty">Sin conexiones para este alojamiento.</p>}
          </div>
        </section>
      </div>
      <div className="right-column">
        <section className="panel"><div className="panel-heading"><div><span className="eyebrow">CÓMO FUNCIONA</span><h2>Fuentes de datos</h2></div></div>
          <div className="source-list">
            <div><Rss size={18}/><div><strong>iCal · disponible</strong><p>Fechas ocupadas y bloqueos de cada anuncio. No incluye precios ni datos del huésped.</p></div></div>
            <div><FileSpreadsheet size={18}/><div><strong>CSV de plataformas · siguiente fase</strong><p>Ganancias de Airbnb y estados de reservas de Booking.com para completar valores y comisiones.</p></div></div>
            <div><Plug size={18}/><div><strong>API vía channel manager · futuro</strong><p>Reservas con precio en tiempo real (por ejemplo, Channex). La API directa de Airbnb y Booking requiere ser socio certificado.</p></div></div>
          </div>
          <small className="hint">Tripadvisor no ofrece iCal estándar: sus reservas se registran como directas o bloqueos.</small>
        </section>
      </div>
    </section>
  </>
}
