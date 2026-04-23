/* eslint-disable react-refresh/only-export-components -- exporta constantes de navegación compartidas */
import {
  BadgeCheck,
  BadgePercent,
  Gift,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Shirt,
  Users,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import logoLaundry from '@/assets/logo-laundry.png'
import type { SessionRole } from '@/components/auth/LoginView'

export const ADMIN_SECTIONS = [
  { id: 'dashboard', label: 'Control de mando', icon: LayoutDashboard, allowedRoles: ['Administrador', 'Supervisor'] },
  { id: 'map', label: 'Asignar choferes', icon: MapPin, allowedRoles: ['Administrador', 'Supervisor'] },
  { id: 'orders', label: 'Órdenes', icon: Package, allowedRoles: ['Administrador', 'Supervisor'] },
  { id: 'clients', label: 'Gestión de clientes', icon: BadgeCheck, allowedRoles: ['Administrador'] },
  { id: 'kyc', label: 'Validación KYC', icon: ShieldCheck, allowedRoles: ['Administrador'] },
  { id: 'team', label: 'Choferes y sedes', icon: Users, allowedRoles: ['Administrador'] },
  { id: 'services', label: 'Catálogo servicios', icon: Shirt, allowedRoles: ['Administrador'] },
  { id: 'rewards', label: 'Recompensas', icon: Gift, allowedRoles: ['Administrador'] },
  { id: 'promotions', label: 'Promociones', icon: BadgePercent, allowedRoles: ['Administrador'] },
] as const

export type AdminSectionId = (typeof ADMIN_SECTIONS)[number]['id']

type AdminLayoutProps = {
  title: string
  subtitle?: string
  sessionLabel: string
  sessionRole: SessionRole
  onLogout: () => void
  activeSection: AdminSectionId
  onSectionChange: (section: AdminSectionId) => void
  children: ReactNode
}

export function AdminLayout({
  title,
  subtitle,
  sessionLabel,
  sessionRole,
  onLogout,
  activeSection,
  onSectionChange,
  children,
}: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const sections = ADMIN_SECTIONS.filter((section) => section.allowedRoles.includes(sessionRole))

  return (
    <div className="flex min-h-screen w-full bg-background text-text">
      <aside
        className={cn(
          'sticky top-0 flex h-screen flex-col border-r border-border bg-card/95 backdrop-blur transition-[width] duration-200',
          collapsed ? 'w-[72px]' : 'w-60',
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-3">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <img
              src={logoLaundry}
              alt="Laundry icon"
              className="h-full w-full object-contain p-1"
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-text">LaundryWeb</p>
              <p className="truncate text-xs text-text-muted">Panel administrativo</p>
            </div>
          )}
        </div>

        {!collapsed ? (
          <div className="px-3 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
              Navegación
            </p>
          </div>
        ) : null}

        <nav className="flex flex-1 flex-col gap-1.5 p-2">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all',
                activeSection === item.id
                  ? 'bg-primary-soft font-medium text-primary shadow-[inset_0_0_0_1px_var(--color-border)]'
                  : 'text-text-muted hover:bg-primary-soft/70 hover:text-primary',
                collapsed && 'justify-center',
              )}
              title={collapsed ? item.label : undefined}
            >
              {activeSection === item.id ? (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
              ) : null}
              <item.icon className="size-4 shrink-0" aria-hidden />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          {!collapsed ? (
            <div className="mb-2 rounded-lg border border-border bg-background px-2.5 py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">Sesión</p>
              <p className="mt-1 text-sm font-medium text-text">{sessionLabel}</p>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size={collapsed ? 'icon' : 'sm'}
            className={cn('mb-2 w-full justify-start rounded-lg', collapsed && 'justify-center')}
            onClick={onLogout}
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <LogOut className="size-4" aria-hidden />
            {!collapsed ? <span className="ml-1">Cerrar sesión</span> : null}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            className={cn('w-full justify-start rounded-lg', collapsed && 'justify-center')}
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
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/95">
          <div>
            <h1 className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-text">
              <span className="inline-flex size-5 overflow-hidden rounded border border-border bg-surface">
                <img
                  src={logoLaundry}
                  alt=""
                  aria-hidden
                  className="h-full w-full object-contain p-0.5"
                />
              </span>
              {title}
            </h1>
            {subtitle ? <p className="text-sm text-text-muted">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="rounded-md border border-border bg-surface px-2 py-1 font-medium text-text">
              {sessionLabel}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={onLogout}>
              <LogOut className="size-4" aria-hidden />
              Cerrar sesión
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
