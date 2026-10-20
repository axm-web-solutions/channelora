import { useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { BadgePercent, BedDouble, CalendarCheck, Headset, MapPin, Search, Users } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { useAppData } from '../../context/AppData'
import { findConflict, quoteStay } from '../../lib/demoStore'
import { money } from '../../lib/reports'
import { PropertyPhoto } from '../../components/PropertyPhoto'

export function StoreHome() {
  const { data } = useAppData()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const checkIn = params.get('llegada') ?? ''
  const checkOut = params.get('salida') ?? ''
  const guests = Number(params.get('huespedes') ?? 2)
  const hasDates = Boolean(checkIn && checkOut && checkOut > checkIn)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (location.hash === '#alojamientos') document.getElementById('alojamientos')?.scrollIntoView({ behavior: 'smooth' })
  }, [location])

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (key === 'llegada' && value && (!checkOut || checkOut <= value)) next.set('salida', format(addDays(new Date(`${value}T00:00`), 2), 'yyyy-MM-dd'))
    setParams(next, { replace: true })
  }

  const units = data.properties.filter(p => p.status === 'active').map((p, index) => ({
    p, index,
    fits: guests <= p.max_guests,
    available: hasDates ? !findConflict(data, p.id, checkIn, checkOut) : true,
    quote: hasDates ? quoteStay(p, checkIn, checkOut) : null,
  }))
  const query = params.toString()

  return <main>
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow light">RESERVA DIRECTO CON EL ANFITRIÓN</span>
        <h1>Refugios para descansar en el corazón de Colombia.</h1>
        <p>Casas de lago, cabañas cafeteras y apartamentos en la ciudad. Sin comisiones de intermediarios y con atención directa.</p>
      </div>
      <form className="search-bar" onSubmit={e => { e.preventDefault(); document.getElementById('alojamientos')?.scrollIntoView({ behavior: 'smooth' }) }}>
        <label>Llegada<input type="date" min={today} value={checkIn} onChange={e => update('llegada', e.target.value)}/></label>
        <label>Salida<input type="date" min={checkIn || today} value={checkOut} onChange={e => update('salida', e.target.value)}/></label>
        <label>Huéspedes<select value={guests} onChange={e => update('huespedes', e.target.value)}>{[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} {n === 1 ? 'huésped' : 'huéspedes'}</option>)}</select></label>
        <button className="button primary" type="submit"><Search size={16}/> Buscar</button>
      </form>
    </section>

    <section className="store-section" id="alojamientos">
      <div className="section-head">
        <div><span className="eyebrow">NUESTROS ALOJAMIENTOS</span><h2>{hasDates ? 'Disponibilidad para tus fechas' : 'Elige tu próximo refugio'}</h2></div>
        {hasDates && <button className="button secondary" onClick={() => setParams({}, { replace: true })}>Limpiar búsqueda</button>}
      </div>
      <div className="unit-grid">
        {units.map(({ p, index, fits, available, quote }) => {
          const bookable = fits && available
          return <article className={`unit-card ${bookable ? '' : 'unavailable'}`} key={p.id}>
            <Link to={`/alojamientos/${p.id}${query ? `?${query}` : ''}`} className="unit-photo-link"><PropertyPhoto index={index} label={p.address ?? undefined}/></Link>
            <div className="unit-body">
              <h3><Link to={`/alojamientos/${p.id}${query ? `?${query}` : ''}`}>{p.name}</Link></h3>
              <p className="unit-location"><MapPin size={13}/> {p.address}</p>
              <p className="unit-specs"><span><Users size={13}/> Hasta {p.max_guests}</span><span><BedDouble size={13}/> {p.bedrooms} hab.</span><span>{p.bathrooms} baño(s)</span></p>
              <div className="chips">{p.amenities.slice(0, 3).map(a => <span className="chip" key={a}>{a}</span>)}</div>
              <div className="unit-footer">
                {quote && bookable
                  ? <div className="price"><strong>{money(quote.total)}</strong><small>{quote.nights} noche(s) · {money(p.base_price)} / noche</small></div>
                  : <div className="price"><small>Desde</small><strong>{money(p.base_price)}</strong><small>por noche</small></div>}
                {!fits ? <span className="badge warn">Máx. {p.max_guests} huéspedes</span>
                  : !available ? <span className="badge warn">No disponible</span>
                  : <Link className="button primary" to={`/alojamientos/${p.id}${query ? `?${query}` : ''}`}>{hasDates ? 'Reservar' : 'Ver disponibilidad'}</Link>}
              </div>
            </div>
          </article>
        })}
        {!units.length && <p className="empty">Pronto publicaremos nuevos alojamientos.</p>}
      </div>
    </section>

    <section className="store-section benefits">
      <div><BadgePercent size={22}/><strong>Mejor precio directo</strong><p>Sin tarifas de servicio de plataformas intermediarias.</p></div>
      <div><CalendarCheck size={22}/><strong>Disponibilidad real</strong><p>Calendario sincronizado con Airbnb, Booking.com y Vrbo.</p></div>
      <div><Headset size={22}/><strong>Atención del anfitrión</strong><p>Te confirmamos la reserva y coordinamos tu llegada.</p></div>
    </section>
  </main>
}
