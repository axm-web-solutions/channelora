import { Building2, Trees, Waves } from 'lucide-react'

// Marcador visual mientras no hay fotos reales de los alojamientos.
const ICONS = [Waves, Building2, Trees]

export function PropertyPhoto({ index, label, large = false }: { index: number; label?: string; large?: boolean }) {
  const Icon = ICONS[index % ICONS.length]
  return <div className={`unit-photo photo-${index % 3} ${large ? 'large' : ''}`} role="img" aria-label={label ? `Foto de ${label}` : 'Foto del alojamiento'}>
    <Icon size={large ? 56 : 38} strokeWidth={1.4}/>
    {label && <span className="photo-chip">{label}</span>}
  </div>
}
