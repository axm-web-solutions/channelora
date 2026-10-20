import { useMemo, useState } from 'react'
import { Ban, CalendarDays, ChevronLeft, ChevronRight, CircleCheck, Clock3, Home, Plus } from 'lucide-react'
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAppData, usePropertyName } from '../../context/AppData'
import { CHANNEL_LABEL, channelKey } from '../../lib/reports'
import { REASONS, ReservationDetail, STATUS_LABEL, type Selection } from '../../components/ReservationDetail'
import { PageHeader } from './AdminLayout'
import type { BlockReason } from '../../types'

const emptyForm = { kind: 'reservation' as 'reservation' | 'block', property_id: '', guest_name: '', check_in: '', check_out: '', reason: 'maintenance' as BlockReason, notes: '', amount: '' }

export function CalendarPage() {
  const { data, propertyFilter, setPropertyFilter, createEntry, notify } = useAppData()
  const propertyName = usePropertyName()
  const { properties, reservations, blocks, connections } = data
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [selected, setSelected] = useState<Selection | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const inScope = (id: string) => propertyFilter === 'all' || id === propertyFilter
  const visibleReservations = useMemo(() => reservations.filter(r => r.status !== 'cancelled' && (propertyFilter === 'all' || r.property_id === propertyFilter)), [reservations, propertyFilter])
  const visibleBlocks = blocks.filter(b => inScope(b.property_id))
  const scopeConnections = connections.filter(c => inScope(c.property_id))
  const monthDays = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) })
  const t = format(new Date(), 'yyyy-MM-dd')
  const occupiedToday = new Set(visibleReservations.filter(r => r.check_in <= t && r.check_out > t).map(r => r.property_id)).size
  const arrivals = visibleReservations.filter(r => r.check_in >= t).length
  const pending = visibleReservations.filter(r => r.status === 'tentative' && r.check_out > t).length

  function openForm(checkIn = '', kind: 'reservation' | 'block' = 'reservation') {
    const propertyId = propertyFilter !== 'all' ? propertyFilter : properties[0]?.id || ''
    const checkOut = checkIn ? format(addDays(parseISO(checkIn), 1), 'yyyy-MM-dd') : ''
    setForm({ ...emptyForm, kind, property_id: propertyId, check_in: checkIn, check_out: checkOut })
    setShowForm(true); setSelected(null)
    setTimeout(() => document.getElementById('registrar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0)
  }
  function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = createEntry({ ...form, amount: Number(form.amount) || null })
    if (!res.ok) { notify(res.error); return }
    notify(form.kind === 'reservation' ? 'Reserva directa registrada.' : 'Fechas bloqueadas.')
    setShowForm(false); setMonth(startOfMonth(parseISO(form.check_in))); setForm(emptyForm)
  }

  return <>
    <PageHeader eyebrow="CENTRO DE OPERACIONES" title="Tu disponibilidad, en un solo lugar." subtitle="Consulta la ocupación de todos tus alojamientos y registra reservas o bloqueos."/>
    <section className="stats">
      <article className="stat-card"><div className="stat-icon blue"><Home size={19}/></div><span>Ocupados hoy</span><strong>{occupiedToday}/{propertyFilter === 'all' ? properties.length : 1}</strong><small>Alojamientos con huésped esta noche</small></article>
      <article className="stat-card"><div className="stat-icon violet"><CalendarDays size={19}/></div><span>Próximas llegadas</span><strong>{arrivals}</strong><small>Desde hoy en adelante</small></article>
      <article className="stat-card"><div className="stat-icon amber"><Clock3 size={19}/></div><span>Por confirmar</span><strong>{pending}</strong><small>Solicitudes web e importaciones iCal</small></article>
      <article className="stat-card"><div className="stat-icon green"><CircleCheck size={19}/></div><span>Conexiones activas</span><strong>{scopeConnections.filter(c => c.status === 'active').length}/{scopeConnections.length}</strong><small>{scopeConnections.some(c => c.status === 'error') ? 'Hay conexiones con error' : 'Calendarios al día'}</small></article>
    </section>

    <section className="content-grid">
      <div className="panel calendar-panel">
        <div className="panel-heading"><div><span className="eyebrow">PLANIFICACIÓN</span><h2>Calendario de reservas</h2></div><div className="month-controls"><button className="icon-button" onClick={() => setMonth(subMonths(month, 1))} aria-label="Mes anterior"><ChevronLeft size={18}/></button><strong>{format(month, 'MMMM yyyy', { locale: es })}</strong><button className="icon-button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Mes siguiente"><ChevronRight size={18}/></button></div></div>
        <div className="calendar-toolbar"><select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}><option value="all">Todos los alojamientos</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><div className="legend"><span><i className="legend-dot external"/> Plataforma</span><span><i className="legend-dot direct"/> Directa / web</span><span><i className="legend-dot block"/> Bloqueo</span></div></div>
        <div className="calendar-grid">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div className="weekday" key={d}>{d}</div>)}{monthDays.map(day => {
          const ds = format(day, 'yyyy-MM-dd')
          const items = [
            ...visibleReservations.filter(r => r.check_in <= ds && r.check_out > ds).map(r => ({
              id: r.id, kind: 'reservation' as const, label: r.guest_name || CHANNEL_LABEL[channelKey(r)] || 'Reservado',
              cls: `${r.source_type === 'direct' ? 'event-direct' : 'event-external'} ${r.status === 'tentative' ? 'event-tentative' : ''}`,
              title: `${propertyName(r.property_id)} · ${r.guest_name || 'Reserva'} · ${CHANNEL_LABEL[channelKey(r)] ?? r.source_name} · ${STATUS_LABEL[r.status]}`,
            })),
            ...visibleBlocks.filter(b => b.start_date <= ds && b.end_date > ds).map(b => ({
              id: b.id, kind: 'block' as const, label: REASONS[b.reason], cls: 'event-block', title: `${propertyName(b.property_id)} · ${REASONS[b.reason]}`,
            })),
          ]
          return <div className={`day-cell clickable ${!isSameMonth(day, month) ? 'muted' : ''} ${isToday(day) ? 'today' : ''}`} key={ds} onClick={() => openForm(ds)} title="Clic para registrar desde este día">
            <span className="day-number">{format(day, 'd')}</span>
            {items.slice(0, 2).map(it => <button type="button" key={it.id} title={it.title} className={`event ${it.cls}`} onClick={ev => { ev.stopPropagation(); setSelected({ kind: it.kind, id: it.id }); setShowForm(false) }}>{it.label}</button>)}
            {items.length > 2 && <small>+{items.length - 2} más</small>}
          </div>
        })}</div>
        <div className="calendar-footer"><span><i className="legend-dot available"/> Clic en un día para registrar · clic en un evento para ver detalle</span><span>La fecha de salida no ocupa la noche de salida.</span></div>
      </div>

      <div className="right-column">
        {selected && <ReservationDetail key={selected.id} selection={selected} onClose={() => setSelected(null)}/>}
        <section className="panel" id="registrar"><div className="panel-heading"><div><span className="eyebrow">ACCIÓN RÁPIDA</span><h2>Registrar</h2></div><div className="round-icon"><Plus size={18}/></div></div>
          <p className="muted-copy">Registra una reserva que llegó por teléfono o WhatsApp, o bloquea fechas por mantenimiento o uso propio.</p>
          {!showForm && <div className="two-fields full">
            <button className="button primary" onClick={() => openForm('', 'reservation')}><Plus size={16}/> Reserva directa</button>
            <button className="button secondary" onClick={() => openForm('', 'block')}><Ban size={15}/> Bloquear fechas</button>
          </div>}
          {showForm && <form className="stack-form" onSubmit={submit}>
            <div className="segmented" role="tablist">
              <button type="button" className={form.kind === 'reservation' ? 'active' : ''} onClick={() => setForm({ ...form, kind: 'reservation' })}>Reserva directa</button>
              <button type="button" className={form.kind === 'block' ? 'active' : ''} onClick={() => setForm({ ...form, kind: 'block' })}>Bloqueo</button>
            </div>
            <label>Alojamiento<select required value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })}><option value="">Selecciona…</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            {form.kind === 'reservation'
              ? <><label>Nombre del huésped<input value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} placeholder="Opcional"/></label>
                <label>Valor total cobrado (COP)<input type="number" min="0" step="1000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Para los reportes de facturación"/></label></>
              : <label>Motivo<select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value as BlockReason })}>{(['maintenance', 'owner_use', 'manual'] as BlockReason[]).map(r => <option key={r} value={r}>{REASONS[r]}</option>)}</select></label>}
            <div className="two-fields"><label>{form.kind === 'reservation' ? 'Entrada' : 'Desde'}<input type="date" required value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })}/></label><label>{form.kind === 'reservation' ? 'Salida' : 'Hasta'}<input type="date" required value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })}/></label></div>
            <label>Notas<textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Detalles opcionales"/></label>
            <div className="auth-actions"><button className="button primary" type="submit">{form.kind === 'reservation' ? 'Guardar reserva' : 'Bloquear fechas'}</button><button className="button secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>}
        </section>
      </div>
    </section>
  </>
}
