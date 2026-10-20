import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Pencil, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useAppData } from '../../context/AppData'
import { money } from '../../lib/reports'
import { PropertyPhoto } from '../../components/PropertyPhoto'
import { PageHeader } from './AdminLayout'
import type { Property } from '../../types'

type Draft = { name: string; address: string; description: string; max_guests: string; bedrooms: string; bathrooms: string; base_price: string; amenities: string; status: Property['status'] }
const blank: Draft = { name: '', address: '', description: '', max_guests: '2', bedrooms: '1', bathrooms: '1', base_price: '200000', amenities: 'Wifi', status: 'active' }
const toDraft = (p: Property): Draft => ({ name: p.name, address: p.address ?? '', description: p.description, max_guests: String(p.max_guests), bedrooms: String(p.bedrooms), bathrooms: String(p.bathrooms), base_price: String(p.base_price), amenities: p.amenities.join(', '), status: p.status })

export function PropertiesPage() {
  const { data, addProperty, updateProperty, notify } = useAppData()
  const [editing, setEditing] = useState<string | null>(null) // id, 'new' o null
  const [draft, setDraft] = useState<Draft>(blank)
  const today = format(new Date(), 'yyyy-MM-dd')

  function start(id: string | 'new') {
    const p = data.properties.find(p => p.id === id)
    setDraft(p ? toDraft(p) : blank); setEditing(id)
  }
  function save(e: React.FormEvent) {
    e.preventDefault()
    const values = {
      name: draft.name.trim(), address: draft.address.trim() || null, description: draft.description.trim(), status: draft.status,
      max_guests: Math.max(1, Number(draft.max_guests) || 1), bedrooms: Math.max(0, Number(draft.bedrooms) || 0), bathrooms: Math.max(0, Number(draft.bathrooms) || 0),
      base_price: Math.max(0, Number(draft.base_price) || 0), amenities: draft.amenities.split(',').map(a => a.trim()).filter(Boolean),
    }
    if (!values.name) return
    if (editing === 'new') { addProperty({ ...values, timezone: 'America/Bogota' }); notify('Alojamiento creado y publicado en la tienda.') }
    else if (editing) { updateProperty(editing, values); notify('Alojamiento actualizado.') }
    setEditing(null)
  }

  const formEl = <form className="stack-form property-editor" onSubmit={save}>
    <div className="two-fields"><label>Nombre<input required maxLength={120} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}/></label><label>Ubicación<input value={draft.address} onChange={e => setDraft({ ...draft, address: e.target.value })} placeholder="Ciudad, departamento"/></label></div>
    <label>Descripción para la tienda<textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></label>
    <div className="filter-row">
      <label>Huéspedes<input type="number" min="1" value={draft.max_guests} onChange={e => setDraft({ ...draft, max_guests: e.target.value })}/></label>
      <label>Habitaciones<input type="number" min="0" value={draft.bedrooms} onChange={e => setDraft({ ...draft, bedrooms: e.target.value })}/></label>
      <label>Baños<input type="number" min="0" value={draft.bathrooms} onChange={e => setDraft({ ...draft, bathrooms: e.target.value })}/></label>
      <label>Tarifa / noche (COP)<input type="number" min="0" step="1000" value={draft.base_price} onChange={e => setDraft({ ...draft, base_price: e.target.value })}/></label>
    </div>
    <label>Servicios (separados por coma)<input value={draft.amenities} onChange={e => setDraft({ ...draft, amenities: e.target.value })}/></label>
    <label>Estado<select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Property['status'] })}><option value="active">Activo · visible en la tienda</option><option value="inactive">Inactivo · oculto en la tienda</option></select></label>
    <div className="auth-actions"><button className="button primary" type="submit">Guardar</button><button className="button secondary" type="button" onClick={() => setEditing(null)}>Cancelar</button></div>
  </form>

  return <>
    <PageHeader eyebrow="INVENTARIO" title="Alojamientos" subtitle="Lo que configures aquí es lo que ven los huéspedes en la tienda: descripción, capacidad, servicios y tarifa."
      actions={<button className="button primary" onClick={() => start('new')}><Plus size={16}/> Nuevo alojamiento</button>}/>
    {editing === 'new' && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">NUEVO</span><h2>Crear alojamiento</h2></div></div>{formEl}</section>}
    <div className="admin-unit-grid">{data.properties.map((p, i) => {
      const upcoming = data.reservations.filter(r => r.property_id === p.id && r.status !== 'cancelled' && r.check_out > today).length
      const conns = data.connections.filter(c => c.property_id === p.id)
      return <section className="panel admin-unit" key={p.id}>
        <PropertyPhoto index={i} label={p.status === 'active' ? 'Publicado' : 'Oculto'}/>
        {editing === p.id ? formEl : <>
          <div className="panel-heading"><div><span className="eyebrow">{p.address ?? 'SIN UBICACIÓN'}</span><h2>{p.name}</h2></div><button className="icon-button" onClick={() => start(p.id)} title="Editar"><Pencil size={15}/></button></div>
          <p className="muted-copy">{p.description || 'Sin descripción.'}</p>
          <dl className="detail-list">
            <div><dt>Tarifa base</dt><dd>{money(p.base_price)} / noche</dd></div>
            <div><dt>Capacidad</dt><dd>{p.max_guests} huéspedes · {p.bedrooms} hab. · {p.bathrooms} baño(s)</dd></div>
            <div><dt>Próximas estancias</dt><dd>{upcoming}</dd></div>
            <div><dt>Conexiones</dt><dd>{conns.length} ({conns.filter(c => c.status === 'error').length} con error)</dd></div>
          </dl>
          <div className="chips">{p.amenities.map(a => <span className="chip" key={a}>{a}</span>)}</div>
          {p.status === 'active' && <Link to={`/alojamientos/${p.id}`} className="link-button inline"><ExternalLink size={13}/> Ver en la tienda</Link>}
        </>}
      </section>
    })}</div>
  </>
}
