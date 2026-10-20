import { Link, Outlet } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { useAppData } from '../../context/AppData'
import { Toast } from '../../components/Toast'

export const STORE_NAME = 'Refugios Colombia'

export function StoreLayout() {
  const { user } = useAppData()
  return <div className="store">
    <header className="store-header">
      <Link to="/" className="store-brand"><img src="/brand/channelora-mark.svg" alt=""/><div><strong>{STORE_NAME}</strong><span>Reservas directas</span></div></Link>
      <nav className="store-nav">
        <Link to="/#alojamientos">Alojamientos</Link>
        <Link to={user ? '/admin/calendario' : '/admin/login'} className="button secondary"><LockKeyhole size={14}/> {user ? 'Ir al panel' : 'Acceso administración'}</Link>
      </nav>
    </header>
    <Toast/>
    <Outlet/>
    <footer className="store-footer">
      <span>© {new Date().getFullYear()} {STORE_NAME} · Boceto con datos ficticios</span>
      <span>Motor de reservas con <strong>Channelora</strong></span>
    </footer>
  </div>
}
