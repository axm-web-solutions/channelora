import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAppData, usePropertyName } from '../../context/AppData'
import { nightsBetween } from '../../lib/demoStore'
import { CHANNEL_LABEL, REPORT_CHANNELS, channelKey, money } from '../../lib/reports'
import { ReservationDetail, STATUS_LABEL } from '../../components/ReservationDetail'
import { bookingCode } from '../store/BookingConfirmation'
import { PageHeader } from './AdminLayout'

const shortDate = (d: string) => format(parseISO(d), 'd MMM yyyy', { locale: es })

export function ReservationsPage() {
  const { data, propertyFilter, setPropertyFilter } = useAppData()
  const propertyName = usePropertyName()
  const [when, setWhen] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [status, setStatus] = useState('all')
  const [channel, setChannel] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const today = format(new Date(), 'yyyy-MM-dd')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.reservations
      .filter(r => propertyFilter === 'all' || r.property_id === propertyFilter)
      .filter(r => when === 'all' || (when === 'upcoming' ? r.check_out > today : r.check_out <= today))
      .filter(r => status === 'all' || r.status === status)
      .filter(r => channel === 'all' || channelKey(r) === channel)
      .filter(r => !q || [r.guest_name, r.guest_email, bookingCode(r.id)].some(v => v?.toLowerCase().includes(q)))
      .sort((a, b) => when === 'past' ? b.check_in.localeCompare(a.check_in) : a.check_in.localeCompare(b.check_in))
  }, [data.reservations, propertyFilter, when, status, channel, search, today])

  return <>
    <PageHeader eyebrow="GESTIÓN" title="Reservas" subtitle="Todas las reservas de tus canales y de la tienda web. Confirma solicitudes, completa valores o cancela."/>
    <div className="reports-layout">
      <section className="panel">
        <div className="filter-row five">
          <label>Periodo<select value={when} onChange={e => setWhen(e.target.value as typeof when)}><option value="upcoming">Próximas y en curso</option><option value="past">Pasadas</option><option value="all">Todas</option></select></label>
          <label>Estado<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todos</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Canal<select value={channel} onChange={e => setChannel(e.target.value)}><option value="all">Todos</option>{REPORT_CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</select></label>
          <label>Alojamiento<select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}><option value="all">Todos</option>{data.properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>Buscar<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Huésped, correo o código"/></label>
        </div>
        <div className="table-wrap"><table className="data-table">
          <thead><tr><th>Código</th><th>Huésped</th><th>Alojamiento</th><th>Canal</th><th>Entrada</th><th>Salida</th><th className="num">Noches</th><th className="num">Valor</th><th>Estado</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id} className={`clickable-row ${r.id === selectedId ? 'row-selected' : ''}`} onClick={() => setSelectedId(r.id)}>
            <td className="mono">{bookingCode(r.id)}</td>
            <td>{r.guest_name ? <><strong>{r.guest_name}</strong>{r.guest_email && <small className="cell-sub">{r.guest_email}</small>}</> : <span className="muted-copy">Huésped de {CHANNEL_LABEL[channelKey(r)]}</span>}</td>
            <td>{propertyName(r.property_id)}</td><td>{CHANNEL_LABEL[channelKey(r)] ?? r.source_name}</td>
            <td>{shortDate(r.check_in)}</td><td>{shortDate(r.check_out)}</td><td className="num">{nightsBetween(r.check_in, r.check_out)}</td>
            <td className="num">{r.gross_amount == null ? <span className="missing-cell">Sin valor</span> : money(r.gross_amount)}</td>
            <td><span className={`status-badge status-${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={9} className="empty">No hay reservas con estos filtros.</td></tr>}</tbody>
        </table></div>
        <small className="hint">{rows.length} reserva(s) · clic en una fila para ver el detalle.</small>
      </section>
      {selectedId && <aside className="detail-drawer"><ReservationDetail key={selectedId} selection={{ kind: 'reservation', id: selectedId }} onClose={() => setSelectedId(null)}/></aside>}
    </div>
  </>
}
