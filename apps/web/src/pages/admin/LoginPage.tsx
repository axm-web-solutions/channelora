import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, LogIn } from 'lucide-react'
import { DEMO_CREDENTIALS, useAppData } from '../../context/AppData'
import { STORE_NAME } from '../store/StoreLayout'

export function LoginPage() {
  const { user, login } = useAppData()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin/calendario'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to={from} replace/>

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (login(email, password)) navigate(from, { replace: true })
    else setError('Correo o contraseña incorrectos.')
  }

  return <div className="login-page">
    <div className="login-card panel">
      <Link to="/" className="back-link"><ArrowLeft size={15}/> Volver a la tienda</Link>
      <div className="brand login-brand"><img className="brand-logo" src="/brand/channelora-mark.svg" alt=""/><div><strong>Channelora</strong><span>PANEL DE {STORE_NAME.toUpperCase()}</span></div></div>
      <h1>Acceso de administración</h1>
      <p className="muted-copy">Gestiona calendario, reservas, alojamientos, conexiones y reportes.</p>
      <form className="stack-form" onSubmit={submit}>
        <label>Correo electrónico<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username"/></label>
        <label>Contraseña<input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/></label>
        {error && <p className="form-error">{error}</p>}
        <button className="button primary" type="submit"><LogIn size={16}/> Iniciar sesión</button>
      </form>
      <div className="demo-credentials">
        <KeyRound size={16}/>
        <div><strong>Usuario de demostración</strong><span>{DEMO_CREDENTIALS.email} · {DEMO_CREDENTIALS.password}</span></div>
        <button type="button" className="button secondary small" onClick={() => { setEmail(DEMO_CREDENTIALS.email); setPassword(DEMO_CREDENTIALS.password); setError('') }}>Usar</button>
      </div>
      <small className="hint">Acceso simulado en el navegador, solo para el boceto. En producción se usará Supabase Auth.</small>
    </div>
  </div>
}
