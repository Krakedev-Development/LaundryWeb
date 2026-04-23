import {
  ArrowUpRight,
  BellRing,
  Clock3,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const quickStats = [
  { label: 'Nuevas órdenes', value: '126', note: '+8% vs ayer', icon: PackageCheck },
  { label: 'Choferes activos', value: '42', note: '5 en ruta crítica', icon: Truck },
  { label: 'KYC pendientes', value: '14', note: '3 de alta prioridad', icon: ShieldCheck },
  { label: 'SLA global', value: '94.2%', note: 'Objetivo: 95%', icon: Clock3 },
] as const

const alerts = [
  '2 incidencias abiertas en Zona Centro.',
  'Promoción “Lava+Seca” activa hasta 20:00.',
  '4 solicitudes de soporte esperando supervisor.',
] as const

export function HomeOverview() {
  return (
    <section className="space-y-4">
      <Card className="border-border bg-surface">
        <CardHeader className="space-y-2">
          <Badge variant="secondary" className="w-fit">
            Inicio operativo
          </Badge>
          <CardTitle className="text-2xl text-text">
            Dashboard Administrativo LaundryWeb
          </CardTitle>
          <CardDescription className="max-w-3xl text-sm text-text-muted">
            Vista inicial maquetada con mocks para Admin y Supervisor. Desde aquí puedes
            monitorear estado general, saltar a asignación y revisar alertas operativas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button className="gap-2">
            Ir a control de mando
            <ArrowUpRight className="size-4" aria-hidden />
          </Button>
          <Button variant="outline">Ver cola de KYC</Button>
          <Button variant="secondary">Abrir centro de mensajes</Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickStats.map((stat) => (
          <Card key={stat.label} className="border-border bg-surface">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-text-muted">
                <span className="rounded-md bg-primary-soft p-1 text-primary">
                  <stat.icon className="size-4" aria-hidden />
                </span>
                {stat.label}
              </CardDescription>
              <CardTitle className="text-2xl text-text">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Badge variant="success">{stat.note}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-text">
            <BellRing className="size-4 text-aqua" aria-hidden />
            Alertas rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          {alerts.map((alert) => (
            <article
              key={alert}
              className="rounded-md border border-border bg-aqua-soft px-3 py-2 text-sm text-text"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-aqua" aria-hidden />
                <p>{alert}</p>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
