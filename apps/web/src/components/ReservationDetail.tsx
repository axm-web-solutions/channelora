import { useState } from 'react'
import { Ban, CircleCheck, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAppData, usePropertyName } from '../context/AppData'
import { nightsBetween, suggestedFee } from '../lib/demoStore'
import { CHANNEL_LABEL, channelKey, money } from '../lib/reports'
import { bookingCode } from '../pages/store/BookingConfirmation'
import type { BlockReason, ReservationStatus } from '../types'

export const REASONS: Record<BlockReason, string> = { manual: 'Bloqueo manual', maintenance: 'Mantenimiento', owner_use: 'Uso del propietario', external_unclassified: 'Bloqueo externo' }
export const STATUS_LABEL: Record<ReservationStatus, string> = { confirmed: 'Confirmada', tentative: 'Por confirmar', cancelled: 'Cancelada' }
const longDate = (d: string) => format(parseISO(d), "EEEE d 'de' MMMM yyyy", { locale: es })

export type Selection = { kind: 'reservation' | 'block'; id: string }

export function ReservationDetail({ selection, onClose }: { selection: Selection; onClose: () => void }) {
  const { data, updateReservation, removeBlock, notify } = useAppData()
  const propertyName = usePropertyName()
  const reservation = selection.kind === 'reservation' ? data.reservations.find(r => r.id === selection.id) : undefined
  const block = selection.kind === 'block' ? data.blocks.find(b => b.id === selection.id) : undefined
  const [gross, setGross] = useState(reservation?.gross_amount?.toString() ?? '')
  const [fee, setFee] = useState(reservation?.platform_fee?.toString() ?? '')
  if (!reservation && !block) return null

  const channel = reservation ? channelKey(reservation) : ''
  const grossNum = Number(gross), feeNum = Number(fee || 0)
  const validPrices = gross !== '' && grossNum > 0 && feeNum >= 0 && feeNum <= grossNum

  function remove() {
    if (reservation) { updateReservation(reservation.id, { status: 'cancelled' }); notify('Reserva cancelada: las fechas vuelven a estar disponibles.') }
    else if (block) { removeBlock(block.id); notify('Bloqueo eliminado.') }
    onClose()
  }

  return <section className="panel detail-panel">
    <div className="panel-heading"><div><span className="eyebrow">{reservation ? `RESERVA · ${bookingCode(reservation.id)}` : 'BLOQUEO'}</span><h2>{reservation ? (reservation.guest_name || `Reserva ${CHANNEL_LABEL[channel] ?? reservation.source_name}`) : REASONS[block!.reason]}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar detalle"><X size={16}/></button></div>
    {reservation && <dl className="detail-list">
      <div><dt>Alojamiento</dt><dd>{propertyName(reservation.property_id)}</dd></div>
      <div><dt>Entrada</dt><dd>{longDate(reservation.check_in)}</dd></div>
      <div><dt>Salida</dt><dd>{longDate(reservation.check_out)}</dd></div>
      <div><dt>Noches</dt><dd>{nightsBetween(reservation.check_in, reservation.check_out)}{reservation.guests ? ` · ${reservation.guests} huésped(es)` : ''}</dd></div>
      <div><dt>Origen</dt><dd>{CHANNEL_LABEL[channel] ?? reservation.source_name}</dd></div>
      <div><dt>Estado</dt><dd><span className={`status-badge status-${reservation.status}`}>{STATUS_LABEL[reservation.status]}</span></dd></div>
      {reservation.guest_email && <div><dt>Correo</dt><dd>{reservation.guest_email}</dd></div>}
      {reservation.guest_phone && <div><dt>Teléfono</dt><dd>{reservation.guest_phone}</dd></div>}
      {reservation.notes && <div><dt>Notas</dt><dd>{reservation.notes}</dd></div>}
      <div><dt>Valor bruto</dt><dd>{money(reservation.gross_amount)}</dd></div>
      <div><dt>Comisión plataforma</dt><dd>{money(reservation.platform_fee)}</dd></div>
      <div><dt>Valor neto</dt><dd>{reservation.gross_amount == null ? '—' : money(reservation.gross_amount - (reservation.platform_fee ?? 0))}</dd></div>
    </dl>}
    {block && <dl className="detail-list">
      <div><dt>Alojamiento</dt><dd>{propertyName(block.property_id)}</dd></div>
      <div><dt>Desde</dt><dd>{longDate(block.start_date)}</dd></div>
      <div><dt>Hasta</dt><dd>{longDate(block.end_date)}</dd></div>
      {block.notes && <div><dt>Notas</dt><dd>{block.notes}</dd></div>}
    </dl>}

    {reservation?.status === 'tentative' && <button className="button primary full" onClick={() => { updateReservation(reservation.id, { status: 'confirmed' }); notify('Reserva confirmada.') }}><CircleCheck size={15}/> Confirmar reserva</button>}

    {reservation && reservation.status !== 'cancelled' && <form className="stack-form" onSubmit={e => { e.preventDefault(); if (!validPrices) return; updateReservation(reservation.id, { gross_amount: grossNum, platform_fee: feeNum, currency: 'COP' }); notify('Valores guardados: la reserva ya cuenta en los reportes.') }}>
      <strong className="form-title">{reservation.gross_amount == null ? 'Completar valores para facturar' : 'Editar valores'}</strong>
      <div className="two-fields">
        <label>Valor bruto (COP)<input type="number" min="0" step="1000" value={gross} onChange={e => setGross(e.target.value)} placeholder="Total pagado"/></label>
        <label>Comisión (COP)<input type="number" min="0" step="100" value={fee} onChange={e => setFee(e.target.value)} placeholder="Retenida por canal"/></label>
      </div>
      {!['direct', 'web'].includes(channel) && <button type="button" className="link-button" disabled={!(grossNum > 0)} onClick={() => setFee(String(suggestedFee(channel, grossNum)))}>Calcular comisión estimada de {CHANNEL_LABEL[channel] ?? 'la plataforma'}</button>}
      <button className="button secondary" type="submit" disabled={!validPrices}>Guardar valores</button>
    </form>}
    {reservation?.source_type === 'ical' && <small className="hint">iCal no envía precios: tómalos del reporte de la plataforma (CSV de ganancias de Airbnb, estado de reservas de Booking).</small>}
    {(block || reservation?.status !== 'cancelled') && <button className="button danger full" onClick={remove}><Ban size={15}/> {reservation ? 'Cancelar reserva' : 'Eliminar bloqueo'}</button>}
  </section>
}
