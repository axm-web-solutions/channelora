import { useMemo, useState } from 'react'
import { CircleAlert, Download, HandCoins, Moon, Percent, Wallet } from 'lucide-react'
import { addDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CHANNEL_LABEL, adr, buildReport, feeRate, money, percent, presetPeriod, reportCSV, type Period, type PeriodPreset } from '../lib/reports'
import { STATUS_LABEL } from './ReservationDetail'
import type { Property, Reservation } from '../types'

type Props = {
  reservations: Reservation[]; properties: Property[]; selectedProperty: string
  onSelectProperty: (id: string) => void; propertyName: (id: string) => string
  onOpenReservation: (id: string) => void; selectedId?: string
}

const shift = (d: string, days: number) => format(addDays(parseISO(d), days), 'yyyy-MM-dd')
const shortDate = (d: string) => format(parseISO(d), 'd MMM yyyy', { locale: es })

export function ReportsView({ reservations, properties, selectedProperty, onSelectProperty, propertyName, onOpenReservation, selectedId }: Props) {
  const [preset, setPreset] = useState<PeriodPreset>('last-3')
  const [period, setPeriod] = useState<Period>(() => presetPeriod('last-3'))
  const report = useMemo(() => buildReport(reservations, properties, period, selectedProperty), [reservations, properties, period, selectedProperty])
  const { total, rows, byProperty, byChannel, matrix, occupancy, channels, scope } = report
  const lastDay = shift(period.to, -1)

  function choosePreset(p: PeriodPreset) {
    setPreset(p)
    if (p !== 'custom') setPeriod(presetPeriod(p))
  }
  function exportCSV() {
    const blob = new Blob([reportCSV(rows, propertyName)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `channelora-ingresos_${period.from}_${lastDay}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return <div className="reports">
    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">REPORTES</span><h2>Ingresos y facturación</h2></div>
        <button className="button primary" onClick={exportCSV} disabled={!rows.length}><Download size={15}/> Exportar CSV</button></div>
      <div className="filter-row">
        <label>Periodo<select value={preset} onChange={e => choosePreset(e.target.value as PeriodPreset)}>
          <option value="this-month">Este mes</option><option value="last-month">Mes anterior</option>
          <option value="last-3">Últimos 3 meses</option><option value="year">Este año</option><option value="custom">Personalizado</option>
        </select></label>
        <label>Desde<input type="date" value={period.from} onChange={e => { if (!e.target.value) return; setPreset('custom'); setPeriod({ ...period, from: e.target.value }) }}/></label>
        <label>Hasta (incluido)<input type="date" value={lastDay} min={period.from} onChange={e => { if (!e.target.value) return; setPreset('custom'); setPeriod({ ...period, to: shift(e.target.value, 1) }) }}/></label>
        <label>Alojamiento<select value={selectedProperty} onChange={e => onSelectProperty(e.target.value)}>
          <option value="all">Todos los alojamientos</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>
      </div>
      <small className="hint">Del {shortDate(period.from)} al {shortDate(lastDay)} · ingresos atribuidos a la fecha de llegada · valores en COP. Comisiones de demo: Airbnb 15,5 %, Booking.com 15 %, Vrbo 8 %.</small>
    </section>

    <section className="stats">
      <article className="stat-card"><div className="stat-icon blue"><Wallet size={19}/></div><span>Ingreso bruto</span><strong className="money">{money(total.gross)}</strong><small>{total.count} reserva(s) en el periodo</small></article>
      <article className="stat-card"><div className="stat-icon amber"><Percent size={19}/></div><span>Comisiones plataformas</span><strong className="money">{money(total.fee)}</strong><small>{percent(feeRate(total))} efectivo sobre el bruto</small></article>
      <article className="stat-card"><div className="stat-icon green"><HandCoins size={19}/></div><span>Ingreso neto</span><strong className="money">{money(total.net)}</strong><small>Base para liquidar y facturar</small></article>
      <article className="stat-card"><div className="stat-icon violet"><Moon size={19}/></div><span>Noches vendidas</span><strong>{total.nights}</strong><small>Tarifa media {money(adr(total))} / noche</small></article>
    </section>

    {total.missing > 0 && <div className="notice"><CircleAlert size={18}/><div><strong>{total.missing} reserva(s) sin valores en este periodo.</strong><p>Las reservas importadas por iCal no traen precio. Complétalas desde la tabla de detalle antes de facturar; no suman en los totales de dinero.</p></div></div>}

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">POR ALOJAMIENTO</span><h2>¿Cuánto generó cada alojamiento?</h2></div></div>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Alojamiento</th><th className="num">Reservas</th><th className="num">Noches</th><th className="num">Ocupación</th><th className="num">Bruto</th><th className="num">Comisión</th><th className="num">Neto</th><th className="num">Tarifa media</th></tr></thead>
        <tbody>{scope.map(p => { const t = byProperty.get(p.id)!; return <tr key={p.id}>
          <td><strong>{p.name}</strong>{t.missing > 0 && <small className="missing-cell"> · {t.missing} sin valor</small>}</td>
          <td className="num">{t.count}</td><td className="num">{t.nights}</td><td className="num">{percent(occupancy.get(p.id) ?? 0)}</td>
          <td className="num">{money(t.gross)}</td><td className="num">{money(t.fee)}</td><td className="num"><strong>{money(t.net)}</strong></td><td className="num">{money(adr(t))}</td>
        </tr> })}</tbody>
        <tfoot><tr><td>Total</td><td className="num">{total.count}</td><td className="num">{total.nights}</td><td/><td className="num">{money(total.gross)}</td><td className="num">{money(total.fee)}</td><td className="num">{money(total.net)}</td><td className="num">{money(adr(total))}</td></tr></tfoot>
      </table></div>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">POR PLATAFORMA</span><h2>¿Cuánto deja cada canal?</h2></div></div>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Plataforma</th><th className="num">Reservas</th><th className="num">Noches</th><th className="num">Bruto</th><th className="num">Comisión</th><th className="num">% comisión</th><th className="num">Neto</th><th className="num">Tarifa media</th><th className="num">Neto por noche</th></tr></thead>
        <tbody>{channels.map(c => { const t = byChannel.get(c)!; return <tr key={c}>
          <td><strong>{CHANNEL_LABEL[c] ?? c}</strong>{t.missing > 0 && <small className="missing-cell"> · {t.missing} sin valor</small>}</td>
          <td className="num">{t.count}</td><td className="num">{t.nights}</td><td className="num">{money(t.gross)}</td><td className="num">{money(t.fee)}</td>
          <td className="num">{percent(feeRate(t))}</td><td className="num"><strong>{money(t.net)}</strong></td><td className="num">{money(adr(t))}</td>
          <td className="num">{t.pricedNights ? money(t.net / t.pricedNights) : '—'}</td>
        </tr> })}
        {!channels.length && <tr><td colSpan={9} className="empty">Sin reservas en el periodo.</td></tr>}</tbody>
      </table></div>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">ALOJAMIENTO × PLATAFORMA</span><h2>Tarifa media por noche en cada canal</h2></div></div>
      <div className="table-wrap"><table className="data-table matrix">
        <thead><tr><th>Alojamiento</th>{channels.map(c => <th key={c} className="num">{CHANNEL_LABEL[c] ?? c}</th>)}</tr></thead>
        <tbody>{scope.map(p => <tr key={p.id}><td><strong>{p.name}</strong></td>{channels.map(c => {
          const t = matrix.get(`${p.id}|${c}`)
          return <td key={c} className="num">{t ? <><strong>{money(adr(t))}</strong><small>{t.nights} noche(s) · {money(t.gross)}</small></> : '—'}</td>
        })}</tr>)}</tbody>
      </table></div>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><span className="eyebrow">DETALLE</span><h2>Reservas del periodo</h2></div><small className="muted-copy">{rows.length} registro(s)</small></div>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Entrada</th><th>Alojamiento</th><th>Plataforma</th><th>Huésped</th><th className="num">Noches</th><th className="num">Bruto</th><th className="num">Comisión</th><th className="num">Neto</th><th/></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id} className={r.id === selectedId ? 'row-selected' : ''}>
          <td>{shortDate(r.check_in)}</td><td>{propertyName(r.property_id)}</td><td>{CHANNEL_LABEL[r.channel] ?? r.channel}</td>
          <td>{r.guest_name || <span className="muted-copy">{STATUS_LABEL[r.status]}</span>}</td><td className="num">{r.nights}</td>
          <td className="num">{r.gross_amount == null ? <span className="missing-cell">Sin valor</span> : money(r.gross_amount)}</td>
          <td className="num">{money(r.platform_fee)}</td><td className="num">{money(r.net)}</td>
          <td className="num"><button className={`button ${r.gross_amount == null ? 'primary' : 'secondary'} small`} onClick={() => onOpenReservation(r.id)}>{r.gross_amount == null ? 'Completar' : 'Ver'}</button></td>
        </tr>)}
        {!rows.length && <tr><td colSpan={9} className="empty">Sin reservas en el periodo.</td></tr>}</tbody>
      </table></div>
    </section>
  </div>
}
