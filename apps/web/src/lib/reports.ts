// Cálculos de ingresos para facturación. Los ingresos se atribuyen al mes de LLEGADA (check-in).
import { addMonths, differenceInCalendarDays, format, parseISO, startOfMonth, startOfYear } from 'date-fns'
import { CHANNEL_NAMES } from './demoStore'
import type { Property, Reservation } from '../types'

export type Period = { from: string; to: string } // intervalo [from, to)
export type PeriodPreset = 'this-month' | 'last-month' | 'last-3' | 'year' | 'custom'

export const CHANNEL_LABEL: Record<string, string> = { ...CHANNEL_NAMES, direct: 'Directa', web: 'Web directa' }
export const REPORT_CHANNELS = ['airbnb', 'booking', 'vrbo', 'web', 'direct', 'other']

const iso = (d: Date) => format(d, 'yyyy-MM-dd')
const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
export const money = (n: number | null | undefined) => n == null ? '—' : cop.format(n)
export const percent = (n: number | null) => n == null ? '—' : `${(n * 100).toFixed(1)} %`

export function presetPeriod(preset: Exclude<PeriodPreset, 'custom'>, today = new Date()): Period {
  const month = startOfMonth(today)
  switch (preset) {
    case 'this-month': return { from: iso(month), to: iso(addMonths(month, 1)) }
    case 'last-month': return { from: iso(addMonths(month, -1)), to: iso(month) }
    case 'last-3': return { from: iso(addMonths(month, -3)), to: iso(month) }
    case 'year': return { from: iso(startOfYear(today)), to: iso(addMonths(month, 1)) }
  }
}

export function channelKey(r: Reservation) {
  if (r.channel_id) return r.channel_id
  if (r.source_type === 'direct') return 'direct'
  const match = Object.entries(CHANNEL_NAMES).find(([, name]) => name === r.source_name)
  return match ? match[0] : 'other'
}

export type Totals = { count: number; nights: number; pricedNights: number; gross: number; fee: number; net: number; missing: number }
const emptyTotals = (): Totals => ({ count: 0, nights: 0, pricedNights: 0, gross: 0, fee: 0, net: 0, missing: 0 })
export const adr = (t: Totals) => t.pricedNights ? t.gross / t.pricedNights : null
export const feeRate = (t: Totals) => t.gross ? t.fee / t.gross : null

export type ReportRow = Reservation & { nights: number; channel: string; net: number | null }

function add(t: Totals, r: ReportRow) {
  t.count++; t.nights += r.nights
  if (r.gross_amount == null) { t.missing++; return }
  t.pricedNights += r.nights; t.gross += r.gross_amount; t.fee += r.platform_fee ?? 0; t.net += r.net ?? 0
}

export function buildReport(reservations: Reservation[], properties: Property[], period: Period, propertyFilter: string) {
  const scope = properties.filter(p => propertyFilter === 'all' || p.id === propertyFilter)
  const ids = new Set(scope.map(p => p.id))
  const active = reservations.filter(r => r.status !== 'cancelled' && ids.has(r.property_id))
  const rows: ReportRow[] = active
    .filter(r => r.check_in >= period.from && r.check_in < period.to)
    .sort((a, b) => a.check_in.localeCompare(b.check_in))
    .map(r => ({
      ...r, channel: channelKey(r), nights: differenceInCalendarDays(parseISO(r.check_out), parseISO(r.check_in)),
      net: r.gross_amount == null ? null : r.gross_amount - (r.platform_fee ?? 0),
    }))

  const total = emptyTotals()
  const byProperty = new Map<string, Totals>(scope.map(p => [p.id, emptyTotals()]))
  const byChannel = new Map<string, Totals>()
  const matrix = new Map<string, Totals>() // clave `${property}|${channel}`
  for (const r of rows) {
    add(total, r)
    add(byProperty.get(r.property_id)!, r)
    if (!byChannel.has(r.channel)) byChannel.set(r.channel, emptyTotals())
    add(byChannel.get(r.channel)!, r)
    const key = `${r.property_id}|${r.channel}`
    if (!matrix.has(key)) matrix.set(key, emptyTotals())
    add(matrix.get(key)!, r)
  }

  // Ocupación: noches ocupadas dentro del periodo (sin importar el mes de llegada) / noches disponibles.
  const periodDays = Math.max(1, differenceInCalendarDays(parseISO(period.to), parseISO(period.from)))
  const occupancy = new Map<string, number>()
  for (const p of scope) {
    const occupied = active.filter(r => r.property_id === p.id).reduce((sum, r) => {
      const start = r.check_in > period.from ? r.check_in : period.from
      const end = r.check_out < period.to ? r.check_out : period.to
      return sum + Math.max(0, differenceInCalendarDays(parseISO(end), parseISO(start)))
    }, 0)
    occupancy.set(p.id, occupied / periodDays)
  }

  const channels = REPORT_CHANNELS.filter(c => byChannel.has(c)).concat([...byChannel.keys()].filter(c => !REPORT_CHANNELS.includes(c)))
  return { rows, total, byProperty, byChannel, matrix, occupancy, channels, scope }
}

export function reportCSV(rows: ReportRow[], propertyName: (id: string) => string) {
  const header = ['Alojamiento', 'Plataforma', 'Huésped', 'Entrada', 'Salida', 'Noches', 'Estado', 'Valor bruto', 'Comisión plataforma', 'Valor neto', 'Moneda']
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = rows.map(r => [
    propertyName(r.property_id), CHANNEL_LABEL[r.channel] ?? r.channel, r.guest_name, r.check_in, r.check_out, r.nights,
    r.status, r.gross_amount, r.platform_fee, r.net, r.currency ?? 'COP',
  ].map(cell).join(';'))
  return '﻿' + [header.join(';'), ...lines].join('\r\n')
}
