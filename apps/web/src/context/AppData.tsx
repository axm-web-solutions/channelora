// Estado compartido del boceto: datos demo, acciones y sesión de administración.
// Todo vive en el navegador. Al conectar Supabase, estas acciones se sustituyen por llamadas a la API.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { findConflict, loadDemo, newId, quoteStay, saveDemo, seedDemo, simulateSync, type DemoState } from '../lib/demoStore'
import type { Block, BlockReason, Connection, Property, Reservation } from '../types'

export type DemoUser = { email: string; name: string; role: string }

// Usuario de demostración. NO es autenticación real: en producción se usa Supabase Auth.
const DEMO_USERS = [{ email: 'admin@refugios.co', password: 'Demo2026!', name: 'Administración', role: 'Administrador' }]
export const DEMO_CREDENTIALS = { email: DEMO_USERS[0].email, password: DEMO_USERS[0].password }
const SESSION_KEY = 'channelora-demo-session'

type Result<T> = { ok: true; value: T } | { ok: false; error: string }
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })

export type EntryInput = {
  kind: 'reservation' | 'block'; property_id: string; check_in: string; check_out: string
  guest_name?: string; notes?: string; reason?: BlockReason; amount?: number | null
}
export type BookingInput = {
  property_id: string; check_in: string; check_out: string; guests: number
  guest_name: string; guest_email: string; guest_phone: string; notes: string
}

type AppData = {
  data: DemoState
  propertyFilter: string; setPropertyFilter: (id: string) => void
  message: string; notify: (msg: string) => void; clearMessage: () => void
  syncing: string | null
  user: DemoUser | null; login: (email: string, password: string) => boolean; logout: () => void
  createEntry: (input: EntryInput) => Result<string>
  bookFromStore: (input: BookingInput) => Result<Reservation>
  updateReservation: (id: string, patch: Partial<Reservation>) => void
  removeBlock: (id: string) => void
  addProperty: (p: Omit<Property, 'id'>) => string
  updateProperty: (id: string, patch: Partial<Property>) => void
  addConnection: (propertyId: string, channelId: string) => Promise<void>
  syncConnections: (ids: string[]) => Promise<void>
  resetDemo: () => void
}

const Ctx = createContext<AppData | null>(null)

function readSession(): DemoUser | null {
  try { const raw = sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DemoState>(loadDemo)
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)
  const [user, setUser] = useState<DemoUser | null>(readSession)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => { saveDemo(data) }, [data])
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 6000)
    return () => clearTimeout(t)
  }, [message])

  function login(email: string, password: string) {
    const match = DEMO_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password)
    if (!match) return false
    const u = { email: match.email, name: match.name, role: match.role }
    setUser(u)
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)) } catch { /* ignorar */ }
    return true
  }
  function logout() {
    setUser(null)
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignorar */ }
  }

  function createEntry(input: EntryInput): Result<string> {
    const { kind, property_id, check_in, check_out } = input
    if (!property_id || !check_in || !check_out || check_out <= check_in) return fail('Revisa el alojamiento y las fechas. La salida debe ser posterior a la entrada.')
    const conflict = findConflict(dataRef.current, property_id, check_in, check_out)
    if (conflict) return fail(conflict)
    const id = newId(), notes = input.notes?.trim() || null
    if (kind === 'reservation') {
      const amount = input.amount && input.amount > 0 ? input.amount : null
      const r: Reservation = {
        id, property_id, guest_name: input.guest_name?.trim() || null, check_in, check_out, status: 'confirmed', source_type: 'direct',
        source_name: 'Directa', external_uid: null, notes, channel_id: 'direct', gross_amount: amount, platform_fee: amount == null ? null : 0,
        currency: 'COP', created_at: new Date().toISOString(),
      }
      setData(d => ({ ...d, reservations: [...d.reservations, r] }))
    } else {
      const b: Block = { id, property_id, start_date: check_in, end_date: check_out, reason: input.reason ?? 'manual', notes }
      setData(d => ({ ...d, blocks: [...d.blocks, b] }))
    }
    return { ok: true, value: id }
  }

  function bookFromStore(input: BookingInput): Result<Reservation> {
    const property = dataRef.current.properties.find(p => p.id === input.property_id && p.status === 'active')
    if (!property) return fail('Este alojamiento no está disponible para reservas.')
    if (!input.check_in || !input.check_out || input.check_out <= input.check_in) return fail('Elige fechas válidas: la salida debe ser posterior a la llegada.')
    if (input.guests < 1 || input.guests > property.max_guests) return fail(`Este alojamiento admite máximo ${property.max_guests} huésped(es).`)
    if (!input.guest_name.trim() || !/^\S+@\S+\.\S+$/.test(input.guest_email.trim())) return fail('Escribe tu nombre y un correo válido.')
    if (findConflict(dataRef.current, property.id, input.check_in, input.check_out)) return fail('Lo sentimos, esas fechas ya no están disponibles. Prueba con otras.')
    const { total } = quoteStay(property, input.check_in, input.check_out)
    const r: Reservation = {
      id: newId(), property_id: property.id, guest_name: input.guest_name.trim(), check_in: input.check_in, check_out: input.check_out,
      status: 'tentative', source_type: 'direct', source_name: 'Web directa', external_uid: null, notes: input.notes.trim() || null,
      channel_id: 'web', gross_amount: total, platform_fee: 0, currency: 'COP',
      guest_email: input.guest_email.trim(), guest_phone: input.guest_phone.trim() || null, guests: input.guests, created_at: new Date().toISOString(),
    }
    setData(d => ({ ...d, reservations: [...d.reservations, r] }))
    return { ok: true, value: r }
  }

  function updateReservation(id: string, patch: Partial<Reservation>) {
    setData(d => ({ ...d, reservations: d.reservations.map(r => r.id === id ? { ...r, ...patch } : r) }))
  }
  function removeBlock(id: string) {
    setData(d => ({ ...d, blocks: d.blocks.filter(b => b.id !== id) }))
  }
  function addProperty(p: Omit<Property, 'id'>) {
    const id = newId()
    setData(d => ({ ...d, properties: [...d.properties, { ...p, id }] }))
    return id
  }
  function updateProperty(id: string, patch: Partial<Property>) {
    setData(d => ({ ...d, properties: d.properties.map(p => p.id === id ? { ...p, ...patch } : p) }))
  }

  async function syncConnections(ids: string[]) {
    if (!ids.length || syncing) return
    setSyncing(ids.length > 1 ? 'all' : ids[0])
    await new Promise(resolve => setTimeout(resolve, 900))
    let state = dataRef.current, total = 0
    for (const id of ids) { const res = simulateSync(state, id); state = res.state; total += res.imported }
    setData(state); setSyncing(null)
    setMessage(total ? `Sincronización completada: ${total} reserva(s) nueva(s) importada(s) como "por confirmar".` : 'Sincronización completada: sin cambios en los calendarios.')
  }
  async function addConnection(propertyId: string, channelId: string) {
    const c: Connection = { id: newId(), property_id: propertyId, channel_id: channelId, status: 'pending', last_synced_at: null, last_error: null }
    dataRef.current = { ...dataRef.current, connections: [...dataRef.current.connections, c] }
    setData(dataRef.current)
    await syncConnections([c.id])
  }

  function resetDemo() {
    setData(seedDemo()); setPropertyFilter('all')
    setMessage('Datos de demostración restablecidos.')
  }

  const value: AppData = {
    data, propertyFilter, setPropertyFilter, message, notify: setMessage, clearMessage: () => setMessage(''), syncing,
    user, login, logout, createEntry, bookFromStore, updateReservation, removeBlock, addProperty, updateProperty,
    addConnection, syncConnections, resetDemo,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppData() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppData debe usarse dentro de <AppDataProvider>')
  return ctx
}

export function usePropertyName() {
  const { data } = useAppData()
  return (id: string) => data.properties.find(p => p.id === id)?.name ?? 'Alojamiento'
}
