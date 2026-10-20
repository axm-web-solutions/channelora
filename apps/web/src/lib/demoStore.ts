// Almacén local para el modo demo: datos ficticios persistidos en localStorage de este navegador.
import { addDays, format } from 'date-fns'
import type { Block, Connection, Property, Reservation, ReservationStatus } from '../types'

export type DemoState = { properties: Property[]; reservations: Reservation[]; blocks: Block[]; connections: Connection[] }

export const CHANNEL_NAMES: Record<string, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', vrbo: 'Vrbo / Expedia', tripadvisor: 'Tripadvisor', other: 'Otra plataforma',
}

// Supuestos de demo, no tarifas oficiales: comisión que retiene cada canal y sobreprecio frente a la tarifa base.
export const PLATFORM_COMMISSION: Record<string, number> = { airbnb: 0.155, booking: 0.15, vrbo: 0.08, other: 0.1, direct: 0, web: 0 }
const CHANNEL_MARKUP: Record<string, number> = { airbnb: 1, booking: 1.08, vrbo: 1.05, other: 1, direct: 0.92 }

const KEY = 'channelora-demo-v3'
const day = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd')
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

export const newId = () => crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`

export function suggestedFee(channel: string, gross: number) {
  return Math.round(gross * (PLATFORM_COMMISSION[channel] ?? 0) / 100) * 100
}
function pricing(channel: string, nightly: number | undefined, nights: number) {
  if (!nightly) return { gross_amount: null, platform_fee: null, currency: 'COP' }
  const gross = Math.round(nightly * (CHANNEL_MARKUP[channel] ?? 1) * nights / 1000) * 1000
  return { gross_amount: gross, platform_fee: suggestedFee(channel, gross), currency: 'COP' }
}

function ical(id: string, propertyId: string, channel: string, from: number, to: number, status: ReservationStatus = 'confirmed', nightly?: number): Reservation {
  return {
    id, property_id: propertyId, guest_name: null, check_in: day(from), check_out: day(to), status,
    source_type: 'ical', source_name: CHANNEL_NAMES[channel] ?? channel, external_uid: `demo-${id}`, notes: 'Importada por iCal (demo)',
    channel_id: channel, ...pricing(channel, nightly, to - from),
  }
}
function direct(id: string, propertyId: string, guest: string, from: number, to: number, notes: string | null, nightly?: number): Reservation {
  return {
    id, property_id: propertyId, guest_name: guest, check_in: day(from), check_out: day(to), status: 'confirmed',
    source_type: 'direct', source_name: 'Directa', external_uid: null, notes,
    channel_id: 'direct', ...pricing('direct', nightly, to - from),
  }
}
function conn(id: string, propertyId: string, channel: string, minutes: number): Connection {
  return { id, property_id: propertyId, channel_id: channel, status: 'active', last_synced_at: minutesAgo(minutes), last_error: null }
}

// Generador pseudoaleatorio con semilla para que el historial demo sea estable.
function seeded(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const GUESTS = ['María Fernanda Ruiz', 'Andrés Castillo', 'Juliana Ospina', 'Santiago Mejía', 'Valentina Rojas', 'Camilo Herrera', 'Daniela López', 'Felipe Vargas']

// Historial pagado de los últimos ~4 meses, con valores, para alimentar los reportes.
function history(prefix: string, propertyId: string, nightly: number, rand: () => number): Reservation[] {
  const channels = ['airbnb', 'booking', 'direct', 'airbnb', 'vrbo', 'booking', 'airbnb']
  const out: Reservation[] = []
  for (let d = -125, i = 0; ; i++) {
    d += 1 + Math.floor(rand() * 4)
    const n = 2 + Math.floor(rand() * 4)
    if (d + n > -22) break
    const channel = channels[Math.floor(rand() * channels.length)]
    const rate = nightly * (0.9 + rand() * 0.2)
    out.push(channel === 'direct'
      ? direct(`${prefix}-h${i}`, propertyId, GUESTS[Math.floor(rand() * GUESTS.length)], d, d + n, null, rate)
      : ical(`${prefix}-h${i}`, propertyId, channel, d, d + n, 'confirmed', rate))
    d += n
  }
  return out
}

export function seedDemo(): DemoState {
  const [lago, central, roble] = ['demo-casa-lago', 'demo-apto-central', 'demo-cabana-roble']
  const properties: Property[] = [
    {
      id: lago, name: 'Casa del Lago', address: 'Guatapé, Antioquia', timezone: 'America/Bogota', status: 'active',
      description: 'Casa frente al embalse de Guatapé con muelle privado, kayaks y zona de BBQ. Amplios espacios para familias y grupos, a 10 minutos de la Piedra del Peñol.',
      max_guests: 8, bedrooms: 4, bathrooms: 3, base_price: 450_000, amenities: ['Wifi', 'Muelle privado', 'Kayaks', 'BBQ', 'Parqueadero', 'Cocina equipada'],
    },
    {
      id: central, name: 'Apartamento Central', address: 'Chapinero, Bogotá', timezone: 'America/Bogota', status: 'active',
      description: 'Apartamento moderno a pasos de la Zona G y el Parque 93. Escritorio de trabajo, wifi de alta velocidad y portería 24 horas: ideal para viajes de negocios.',
      max_guests: 3, bedrooms: 1, bathrooms: 1, base_price: 220_000, amenities: ['Wifi rápido', 'Escritorio', 'Gimnasio', 'Portería 24 h', 'Lavadora'],
    },
    {
      id: roble, name: 'Cabaña El Roble', address: 'Salento, Quindío', timezone: 'America/Bogota', status: 'active',
      description: 'Cabaña de madera entre cafetales con vista al Valle de Cocora. Chimenea, jacuzzi exterior y desayuno típico incluido cada mañana.',
      max_guests: 4, bedrooms: 2, bathrooms: 1, base_price: 320_000, amenities: ['Chimenea', 'Jacuzzi', 'Desayuno incluido', 'Vista al valle', 'Wifi'],
    },
  ]
  const rate = Object.fromEntries(properties.map(p => [p.id, p.base_price]))
  const rand = seeded(2026)
  return {
    properties,
    reservations: [
      ...history('lago', lago, rate[lago], rand),
      ...history('central', central, rate[central], rand),
      ...history('roble', roble, rate[roble], rand),
      ical('r1', lago, 'airbnb', -3, 2, 'confirmed', rate[lago]),
      direct('r2', lago, 'Laura Gómez', 5, 8, 'Llega en bus, check-in 3 p. m.', rate[lago]),
      ical('r3', lago, 'booking', 12, 15, 'tentative'),
      ical('r4', lago, 'airbnb', 30, 34),
      ical('r5', central, 'booking', -1, 4, 'confirmed', rate[central]),
      direct('r6', central, 'Carlos Pérez', 9, 11, 'Reserva por WhatsApp, pagó 50 %', rate[central]),
      ical('r7', central, 'airbnb', 18, 22),
      direct('r8', central, 'Ana Martínez', -20, -16, null, rate[central]),
      ical('r9', roble, 'vrbo', 3, 7, 'confirmed', rate[roble]),
      direct('r10', roble, 'Familia Restrepo', 25, 28, '4 adultos y 2 niños', rate[roble]),
      { ...direct('r11', roble, 'Sofía Cárdenas', 40, 43, 'Reserva desde la tienda web', rate[roble]), status: 'tentative', source_name: 'Web directa', channel_id: 'web', guest_email: 'sofia.cardenas@example.com', guest_phone: '+57 300 000 0000', guests: 2 },
    ],
    blocks: [
      { id: 'b1', property_id: roble, start_date: day(14), end_date: day(17), reason: 'maintenance', notes: 'Pintura de fachada' },
      { id: 'b2', property_id: lago, start_date: day(20), end_date: day(23), reason: 'owner_use', notes: null },
    ],
    connections: [
      conn('c1', lago, 'airbnb', 12), conn('c2', lago, 'booking', 25), conn('c3', central, 'booking', 8),
      conn('c4', central, 'airbnb', 40), conn('c5', roble, 'vrbo', 15),
      { id: 'c6', property_id: roble, channel_id: 'airbnb', status: 'error', last_synced_at: minutesAgo(90), last_error: 'El calendario respondió HTTP 404 (demo)' },
    ],
  }
}

export const nightsBetween = (checkIn: string, checkOut: string) =>
  Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000)

// Precio que ve el huésped en la tienda: tarifa base por noche (sin cargos extra en el boceto).
export function quoteStay(property: Property, checkIn: string, checkOut: string) {
  const nights = nightsBetween(checkIn, checkOut)
  return { nights, total: nights > 0 ? nights * property.base_price : 0 }
}

// ¿La noche `date` está ocupada por una reserva activa o un bloqueo?
export function isNightTaken(state: DemoState, propertyId: string, date: string) {
  return state.reservations.some(r => r.property_id === propertyId && r.status !== 'cancelled' && r.check_in <= date && date < r.check_out)
    || state.blocks.some(b => b.property_id === propertyId && b.start_date <= date && date < b.end_date)
}

export function loadDemo(): DemoState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (Array.isArray(s.properties) && Array.isArray(s.reservations) && Array.isArray(s.blocks) && Array.isArray(s.connections)) return s
    }
  } catch { /* almacenamiento no disponible: usar semilla */ }
  return seedDemo()
}

export function saveDemo(state: DemoState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignorar */ }
}

// Devuelve un mensaje si [checkIn, checkOut) se cruza con una reserva activa o un bloqueo del alojamiento.
export function findConflict(state: DemoState, propertyId: string, checkIn: string, checkOut: string): string | null {
  const r = state.reservations.find(r => r.property_id === propertyId && r.status !== 'cancelled' && r.check_in < checkOut && checkIn < r.check_out)
  if (r) return `Conflicto: se cruza con ${r.guest_name || r.source_name || 'otra reserva'} (${r.check_in} → ${r.check_out}).`
  const b = state.blocks.find(b => b.property_id === propertyId && b.start_date < checkOut && checkIn < b.end_date)
  if (b) return `Conflicto: las fechas se cruzan con un bloqueo (${b.start_date} → ${b.end_date}).`
  return null
}

// Simula una lectura iCal: añade 0–2 reservas (sin valores, como iCal real) y marca la conexión como sincronizada.
export function simulateSync(state: DemoState, connectionId: string): { state: DemoState; imported: number } {
  const connection = state.connections.find(c => c.id === connectionId)
  if (!connection) return { state, imported: 0 }
  const target = Math.random() < 0.3 ? 0 : Math.random() < 0.6 ? 1 : 2
  let working = state, imported = 0
  for (let attempt = 0; attempt < 40 && imported < target; attempt++) {
    const start = 3 + Math.floor(Math.random() * 75), nights = 2 + Math.floor(Math.random() * 4)
    if (findConflict(working, connection.property_id, day(start), day(start + nights))) continue
    const r = ical(newId(), connection.property_id, connection.channel_id, start, start + nights, 'tentative')
    working = { ...working, reservations: [...working.reservations, r] }
    imported++
  }
  const connections = working.connections.map(c => c.id === connectionId
    ? { ...c, status: 'active' as const, last_synced_at: new Date().toISOString(), last_error: null }
    : c)
  return { state: { ...working, connections }, imported }
}
