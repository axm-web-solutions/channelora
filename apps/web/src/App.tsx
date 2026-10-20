import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppDataProvider, useAppData } from './context/AppData'
import { StoreLayout } from './pages/store/StoreLayout'
import { StoreHome } from './pages/store/StoreHome'
import { PropertyPage } from './pages/store/PropertyPage'
import { BookingConfirmation } from './pages/store/BookingConfirmation'
import { LoginPage } from './pages/admin/LoginPage'
import { AdminLayout } from './pages/admin/AdminLayout'
import { CalendarPage } from './pages/admin/CalendarPage'
import { ReservationsPage } from './pages/admin/ReservationsPage'
import { PropertiesPage } from './pages/admin/PropertiesPage'
import { ConnectionsPage } from './pages/admin/ConnectionsPage'
import { ReportsPage } from './pages/admin/ReportsPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAppData()
  const location = useLocation()
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }}/>
  return children
}

export default function App() {
  return <BrowserRouter>
    <AppDataProvider>
      <Routes>
        <Route element={<StoreLayout/>}>
          <Route index element={<StoreHome/>}/>
          <Route path="alojamientos/:id" element={<PropertyPage/>}/>
          <Route path="reserva/:id" element={<BookingConfirmation/>}/>
        </Route>
        <Route path="admin/login" element={<LoginPage/>}/>
        <Route path="admin" element={<RequireAuth><AdminLayout/></RequireAuth>}>
          <Route index element={<Navigate to="calendario" replace/>}/>
          <Route path="calendario" element={<CalendarPage/>}/>
          <Route path="reservas" element={<ReservationsPage/>}/>
          <Route path="alojamientos" element={<PropertiesPage/>}/>
          <Route path="conexiones" element={<ConnectionsPage/>}/>
          <Route path="reportes" element={<ReportsPage/>}/>
        </Route>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </AppDataProvider>
  </BrowserRouter>
}
