import { useAppData } from '../context/AppData'

export function Toast() {
  const { message, clearMessage } = useAppData()
  if (!message) return null
  return <div className="message toast" role="status">{message}<button onClick={clearMessage} aria-label="Cerrar">×</button></div>
}
