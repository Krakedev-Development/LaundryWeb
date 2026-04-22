import {
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const nav = [
  { label: 'Control de mando', icon: LayoutDashboard, href: '#', active: true },
  { label: 'Mapa de asignación', icon: MapPin, href: '#', active: false },
  { label: 'Órdenes', icon: Package, href: '#', active: false },
  { label: 'Validación KYC', icon: ShieldCheck, href: '#', active: false },
  { label: 'Mensajería', icon: MessageSquare, href: '#', active: false },
  { label: 'Equipo', icon: Users, href: '#', active: false },
] as const

type AdminLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export function AdminLayout({ title, subtitle, children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen w-full bg-muted/40 text-foreground">
      <aside
        className={cn(
          'sticky top-0 flex h-screen flex-col border-r border-border bg-card transition-[width] duration-200',
          collapsed ? 'w-[72px]' : 'w-60',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            LW
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">LaundryWeb</p>
              <p className="truncate text-xs text-muted-foreground">Panel operativo</p>
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                item.active
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                collapsed && 'justify-center',
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="size-4 shrink-0" aria-hidden />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </a>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <Button
            type="button"
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            className={cn('w-full justify-start', collapsed && 'justify-center')}
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="size-4" aria-hidden />
                <span className="ml-1">Contraer barra</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div>
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md border border-border bg-card px-2 py-1 font-medium text-foreground">
              Supervisor
            </span>
            <span className="hidden sm:inline">Escritorio optimizado</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
