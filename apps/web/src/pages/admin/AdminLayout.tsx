import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { CalendarDays, ChartColumn, ClipboardList, ExternalLink, Home, Link2, LogOut, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { useAppData } from '../../context/AppData'
import { Toast } from '../../components/Toast'

const TABS = [
  { to: 'calendario', label: 'Calendario', icon: CalendarDays },
  { to: 'reservas', label: 'Reservas', icon: ClipboardList },
  { to: 'alojamientos', label: 'Alojamientos', icon: Home },
  { to: 'conexiones', label: 'Conexiones', icon: Link2 },
  { to: 'reportes', label: 'Reportes', icon: ChartColumn },
]

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle: string; actions?: ReactNode }) {
  return <header className="topbar"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="topbar-actions">{actions}</div>}</header>
}

export function AdminLayout() {
  const { user, logout, data, resetDemo } = useAppData()
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')
  const pending = data.reservations.filter(r => r.status === 'tentative' && r.check_out > today).length

  const tabs = TABS.map(({ to, label, icon: Icon }) =>
    <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={18}/> <span className="nav-label">{label}</span>{to === 'reservas' && pending > 0 && <span className="nav-badge">{pending}</span>}
    </NavLink>)

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img className="brand-logo" src="/brand/channelora-mark.svg" alt="Channelora"/><div><strong>Channelora</strong><span>CHANNEL SYNC PLATFORM</span></div></div>
      <div className="workspace"><span className="workspace-dot"/><div><strong>{user?.name}</strong><small>{user?.email}</small></div></div>
      <nav>{tabs}</nav>
      <div className="sidebar-bottom sidebar-actions">
        <Link to="/" className="nav-item"><ExternalLink size={16}/> Ver tienda</Link>
        <button type="button" className="nav-item" onClick={resetDemo}><RotateCcw size={16}/> Restablecer demo</button>
        <button type="button" className="nav-item" onClick={() => { logout(); navigate('/') }}><LogOut size={16}/> Cerrar sesión</button>
      </div>
    </aside>
    <main className="main">
      <nav className="mobile-tabs">{tabs}</nav>
      <Toast/>
      <Outlet/>
      <footer><span>Channelora · MVP 0.1 · boceto con datos ficticios</span><span>Diseñado para centralizar disponibilidad, con trazabilidad de sincronización.</span></footer>
    </main>
  </div>
}
