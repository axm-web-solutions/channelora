// Alineados con los enums y checks de supabase/migrations/0001_initial_schema.sql
export type ReservationStatus = 'confirmed' | 'tentative' | 'cancelled'
export type ReservationSourceType = 'direct' | 'ical' | 'api' | 'manual'
export type ConnectionStatus = 'pending' | 'active' | 'error' | 'paused'
export type BlockReason = 'manual' | 'maintenance' | 'owner_use' | 'external_unclassified'

export type Property = {
  id: string; name: string; address: string | null; timezone: string; status: 'active' | 'inactive'
  // Ficha pública de la tienda: aún no existen en el esquema SQL (pendiente migración).
  description: string; max_guests: number; bedrooms: number; bathrooms: number; base_price: number; amenities: string[]
}
export type Reservation = {
  id: string; property_id: string; guest_name: string | null; check_in: string; check_out: string
  status: ReservationStatus; source_type: ReservationSourceType; source_name: string | null; external_uid: string | null
  notes: string | null
  // Facturación y contacto: pendientes de migración. iCal no trae valores ni datos del huésped.
  channel_id?: string | null
  gross_amount?: number | null   // valor total cobrado al huésped
  platform_fee?: number | null   // comisión retenida por la plataforma
  currency?: string
  guest_email?: string | null; guest_phone?: string | null; guests?: number | null
  created_at?: string
}
export type Block = { id: string; property_id: string; start_date: string; end_date: string; reason: BlockReason; notes: string | null }
export type Connection = {
  id: string; property_id: string; channel_id: string; status: ConnectionStatus
  last_synced_at: string | null; last_error: string | null
}
