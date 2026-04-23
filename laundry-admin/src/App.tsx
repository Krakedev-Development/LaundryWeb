import { useEffect, useMemo, useState } from 'react'
import { AdminLayout, type AdminSectionId } from '@/components/admin/AdminLayout'
import { ClientManagementView } from '@/components/admin/ClientManagementView'
import { DashboardView } from '@/components/admin/DashboardView'
import { DriverAssignmentView } from '@/components/admin/DriverAssignmentView'
import { DriverOpsView } from '@/components/admin/DriverOpsView'
import { KycValidationView } from '@/components/admin/KycValidationView'
import { PromotionsView } from '@/components/admin/PromotionsView'
import { RewardsSystemView } from '@/components/admin/RewardsSystemView'
import { RouteHistoryView } from '@/components/admin/RouteHistoryView'
import { ServicesCatalogView } from '@/components/admin/ServicesCatalogView'
import logoLaundry from '@/assets/logo-laundry.png'
import { LoginView, type SessionRole } from '@/components/auth/LoginView'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const sectionMeta: Record<AdminSectionId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Control de mando',
    subtitle: 'Gráficas operativas y servicios domiciliarios sin asignación en prioridad alta.',
  },
  map: {
    title: 'Asignar choferes',
    subtitle: 'Clientes esperando chofer, rutas por sede y asignación directa.',
  },
  orders: {
    title: 'Historial de rutas',
    subtitle: 'Rutas operativas con filtros por estado, zona y fecha.',
  },
  clients: {
    title: 'Gestión de clientes',
    subtitle: 'Suscripciones, billetera, promociones y administración comercial.',
  },
  kyc: {
    title: 'Validación KYC',
    subtitle: 'Control documental de identidad para nuevos registros.',
  },
  team: {
    title: 'Choferes y sedes',
    subtitle: 'Creación de usuarios operativos con contraseña temporal y gestión de sedes.',
  },
  services: {
    title: 'Catálogo de servicios',
    subtitle: 'Gestiona tipos de prendas, tipos de lavado y extras opcionales de la app.',
  },
  rewards: {
    title: 'Sistema de recompensas',
    subtitle: 'Puntos, campañas de fidelización y canjes visibles para clientes en la app.',
  },
  promotions: {
    title: 'Promociones',
    subtitle: 'Administración de campañas, vigencia y visibilidad comercial en la app móvil.',
  },
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionRole, setSessionRole] = useState<SessionRole>('Supervisor')
  const [section, setSection] = useState<AdminSectionId>('dashboard')
  const allowedSections = useMemo(
    () =>
      sessionRole === 'Administrador'
        ? (['dashboard', 'map', 'orders', 'clients', 'kyc', 'team', 'services', 'rewards', 'promotions'] as const)
        : (['dashboard', 'map', 'orders'] as const),
    [sessionRole],
  )
  const currentSection = allowedSections.includes(section) ? section : allowedSections[0]
  const current = sectionMeta[currentSection]
  const content = useMemo(() => {
    if (currentSection === 'dashboard') return <DashboardView />
    if (currentSection === 'map') return <DriverAssignmentView />
    if (currentSection === 'orders') return <RouteHistoryView canEditOrder={sessionRole === 'Administrador'} />
    if (currentSection === 'clients') return <ClientManagementView />
    if (currentSection === 'kyc') return <KycValidationView />
    if (currentSection === 'team') return <DriverOpsView />
    if (currentSection === 'services') return <ServicesCatalogView />
    if (currentSection === 'rewards') return <RewardsSystemView />
    if (currentSection === 'promotions') return <PromotionsView />
    return <ComingSoon section={currentSection} />
  }, [currentSection, sessionRole])

  useEffect(() => {
    const faviconEl = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
    if (faviconEl) {
      faviconEl.href = logoLaundry
      faviconEl.type = 'image/png'
    }
  }, [])

  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={(role) => {
          setSessionRole(role)
          setIsAuthenticated(true)
        }}
      />
    )
  }

  return (
    <AdminLayout
      title={current.title}
      subtitle={current.subtitle}
      sessionLabel={sessionRole}
      sessionRole={sessionRole}
      onLogout={() => setIsAuthenticated(false)}
      activeSection={currentSection}
      onSectionChange={setSection}
    >
      {content}
    </AdminLayout>
  )
}

export default App

function ComingSoon({ section }: { section: AdminSectionId }) {
  return (
    <Card className="border-border bg-surface">
      <CardHeader>
        <Badge variant="secondary" className="w-fit">
          Próximo módulo
        </Badge>
        <CardTitle className="text-text">Sección en construcción: {section}</CardTitle>
        <CardDescription className="text-text-muted">
          La navegación ya está activa; este módulo se puede desarrollar en el siguiente paso.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-text-muted">
        Estructura base lista para agregar tablas, filtros, timeline y acciones operativas.
      </CardContent>
    </Card>
  )
}
