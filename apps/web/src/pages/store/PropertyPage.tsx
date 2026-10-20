import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Bath, BedDouble, Check, MapPin, Users } from 'lucide-react'
import { useAppData } from '../../context/AppData'
import { findConflict, isNightTaken, quoteStay } from '../../lib/demoStore'
import { money } from '../../lib/reports'
import { PropertyPhoto } from '../../components/PropertyPhoto'
import { AvailabilityCalendar } from '../../components/AvailabilityCalendar'

export function PropertyPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data, bookFromStore } = useAppData()
  const index = data.properties.findIndex(p => p.id === id)
  const property = data.properties[index]
  const [form, setForm] = useState({
    check_in: params.get('llegada') ?? '', check_out: params.get('salida') ?? '',
    guests: Math.min(Number(params.get('huespedes') ?? 2), property?.max_guests ?? 2),
    guest_name: '', guest_email: '', guest_phone: '', notes: '',
  })
  const [error, setError] = useState('')

  if (!property || property.status !== 'active') return <Navigate to="/" replace/>

  const validDates = Boolean(form.check_in && form.check_out && form.check_out > form.check_in)
  const conflict = validDates ? findConflict(data, property.id, form.check_in, form.check_out) : null
  const quote = validDates ? quoteStay(property, form.check_in, form.check_out) : null

  function pick(date: string) {
    setError('')
    if (!form.check_in || form.check_out || date <= form.check_in) setForm({ ...form, check_in: date, check_out: '' })
    else setForm({ ...form, check_out: date })
  }
  function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = bookFromStore({ ...form, property_id: property.id })
    if (!res.ok) { setError(res.error); return }
    navigate(`/reserva/${res.value.id}`)
  }

  return <main className="store-section property-page">
    <Link to={`/${params.toString() ? `?${params}` : ''}#alojamientos`} className="back-link"><ArrowLeft size={15}/> Ver todos los alojamientos</Link>
    <PropertyPhoto index={index} label={property.address ?? undefined} large/>
    <div className="property-layout">
      <div className="property-main">
        <h1>{property.name}</h1>
        <p className="unit-location"><MapPin size={14}/> {property.address}</p>
        <div className="spec-row">
          <span><Users size={16}/> Hasta {property.max_guests} huéspedes</span>
          <span><BedDouble size={16}/> {property.bedrooms} habitación(es)</span>
          <span><Bath size={16}/> {property.bathrooms} baño(s)</span>
        </div>
        <p className="property-description">{property.description}</p>
        <h2>Lo que ofrece</h2>
        <ul className="amenity-list">{property.amenities.map(a => <li key={a}><Check size={15}/> {a}</li>)}</ul>
        <h2>Disponibilidad</h2>
        <p className="muted-copy">Elige la fecha de llegada y luego la de salida.</p>
        <AvailabilityCalendar isTaken={d => isNightTaken(data, property.id, d)} checkIn={form.check_in} checkOut={form.check_out} onPick={pick}/>
      </div>

      <aside className="booking-card">
        <div className="booking-price"><strong>{money(property.base_price)}</strong><span>/ noche</span></div>
        <form className="stack-form" onSubmit={submit}>
          <div className="two-fields">
            <label>Llegada<input type="date" required value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })}/></label>
            <label>Salida<input type="date" required min={form.check_in} value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })}/></label>
          </div>
          <label>Huéspedes<select value={form.guests} onChange={e => setForm({ ...form, guests: Number(e.target.value) })}>{Array.from({ length: property.max_guests }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}</select></label>
          <label>Nombre completo<input required value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} autoComplete="name"/></label>
          <label>Correo electrónico<input required type="email" value={form.guest_email} onChange={e => setForm({ ...form, guest_email: e.target.value })} autoComplete="email"/></label>
          <label>Teléfono / WhatsApp<input type="tel" value={form.guest_phone} onChange={e => setForm({ ...form, guest_phone: e.target.value })} autoComplete="tel" placeholder="Opcional"/></label>
          <label>Comentarios<textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Hora de llegada, mascotas, celebraciones…"/></label>
          {quote && !conflict && <dl className="quote">
            <div><dt>{money(property.base_price)} × {quote.nights} noche(s)</dt><dd>{money(quote.total)}</dd></div>
            <div className="quote-total"><dt>Total</dt><dd>{money(quote.total)}</dd></div>
          </dl>}
          {conflict && <p className="form-error">Esas fechas no están disponibles. Elige otras en el calendario.</p>}
          {error && <p className="form-error">{error}</p>}
          <button className="button primary" type="submit" disabled={!validDates || Boolean(conflict)}>Solicitar reserva</button>
          <small className="hint">No se realiza ningún cobro en el boceto. El anfitrión confirma la reserva desde su panel.</small>
        </form>
      </aside>
    </div>
  </main>
}
