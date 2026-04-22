import { AssignmentMap } from '@/components/admin/AssignmentMap'
import { AdminLayout } from '@/components/admin/AdminLayout'

function App() {
  return (
    <AdminLayout
      title="Control de mando"
      subtitle="Mapa operativo, KPIs rápidos y preparación para asignación de órdenes."
    >
      <AssignmentMap />
    </AdminLayout>
  )
}

export default App
