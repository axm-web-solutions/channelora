import { Link, Navigate, useParams } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAppData } from '../../context/AppData'
import { nightsBetween } from '../../lib/demoStore'
import { money } from '../../lib/reports'

export const bookingCode = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase()
const longDate = (d: string) => format(parseISO(d), "EEEE d 'de' MMMM yyyy", { locale: es })

export function BookingConfirmation() {
  const { id } = useParams()
  const { data } = useAppData()
  const r = data.reservations.find(r => r.id === id)
  if (!r) return <Navigate to="/" replace/>
  const property = data.properties.find(p => p.id === r.property_id)
  const status = r.status === 'confirmed' ? 'Confirmada por el anfitrión' : r.status === 'cancelled' ? 'Cancelada' : 'Pendiente de confirmación'

  return <main className="store-section confirmation">
    <div className="panel confirmation-card">
      <CircleCheck size={42} className="confirm-icon"/>
      <span className="eyebrow">SOLICITUD RECIBIDA</span>
      <h1>¡Gracias, {r.guest_name?.split(' ')[0]}!</h1>
      <p className="muted-copy">Te escribiremos a <strong>{r.guest_email}</strong> para confirmar tu reserva y coordinar el pago y la llegada.</p>
      <dl className="detail-list">
        <div><dt>Código</dt><dd>{bookingCode(r.id)}</dd></div>
        <div><dt>Alojamiento</dt><dd>{property?.name}</dd></div>
        <div><dt>Llegada</dt><dd>{longDate(r.check_in)}</dd></div>
        <div><dt>Salida</dt><dd>{longDate(r.check_out)}</dd></div>
        <div><dt>Noches · huéspedes</dt><dd>{nightsBetween(r.check_in, r.check_out)} · {r.guests}</dd></div>
        <div><dt>Total</dt><dd>{money(r.gross_amount)}</dd></div>
        <div><dt>Estado</dt><dd>{status}</dd></div>
      </dl>
      <Link to="/" className="button primary full">Volver a la tienda</Link>
    </div>
  </main>
}
