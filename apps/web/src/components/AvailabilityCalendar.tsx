import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

type Props = {
  isTaken: (date: string) => boolean
  checkIn: string; checkOut: string
  onPick: (date: string) => void
}

// Calendario público: solo muestra noches libres u ocupadas, nunca datos de otras reservas.
export function AvailabilityCalendar({ isTaken, checkIn, checkOut, onPick }: Props) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [month, setMonth] = useState(startOfMonth(checkIn ? new Date(`${checkIn}T00:00`) : new Date()))
  const days = eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) })
  const canGoBack = month > startOfMonth(new Date())

  return <div className="avail">
    <div className="avail-head">
      <button type="button" className="icon-button" onClick={() => setMonth(subMonths(month, 1))} disabled={!canGoBack} aria-label="Mes anterior"><ChevronLeft size={16}/></button>
      <strong>{format(month, 'MMMM yyyy', { locale: es })}</strong>
      <button type="button" className="icon-button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Mes siguiente"><ChevronRight size={16}/></button>
    </div>
    <div className="avail-grid">
      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span className="avail-weekday" key={i}>{d}</span>)}
      {days.map(day => {
        const ds = format(day, 'yyyy-MM-dd')
        const past = ds < today
        const taken = isTaken(ds)
        const inRange = checkIn && checkOut && ds > checkIn && ds < checkOut
        const edge = ds === checkIn || ds === checkOut
        const cls = ['avail-day', !isSameMonth(day, month) && 'outside', past && 'past', taken && 'taken', inRange && 'in-range', edge && 'edge'].filter(Boolean).join(' ')
        // Una noche ocupada aún puede ser día de salida de la estancia elegida.
        const selectable = !past && (!taken || (checkIn && !checkOut && ds > checkIn))
        return <button type="button" key={ds} className={cls} disabled={!selectable} onClick={() => onPick(ds)}>{format(day, 'd')}</button>
      })}
    </div>
    <div className="avail-legend"><span><i className="dot free"/> Disponible</span><span><i className="dot taken"/> Ocupado</span><span><i className="dot chosen"/> Tu estancia</span></div>
  </div>
}
