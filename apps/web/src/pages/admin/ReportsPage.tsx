import { useState } from 'react'
import { useAppData, usePropertyName } from '../../context/AppData'
import { ReportsView } from '../../components/ReportsView'
import { ReservationDetail } from '../../components/ReservationDetail'
import { PageHeader } from './AdminLayout'

export function ReportsPage() {
  const { data, propertyFilter, setPropertyFilter } = useAppData()
  const propertyName = usePropertyName()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return <>
    <PageHeader eyebrow="FACTURACIÓN" title="Ingresos por alojamiento y plataforma." subtitle="Valores brutos, comisiones y netos para liquidar y facturar cada alojamiento."/>
    <div className="reports-layout">
      <ReportsView reservations={data.reservations} properties={data.properties} selectedProperty={propertyFilter} onSelectProperty={setPropertyFilter}
        propertyName={propertyName} selectedId={selectedId ?? undefined} onOpenReservation={setSelectedId}/>
      {selectedId && <aside className="detail-drawer"><ReservationDetail key={selectedId} selection={{ kind: 'reservation', id: selectedId }} onClose={() => setSelectedId(null)}/></aside>}
    </div>
  </>
}
