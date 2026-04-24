/* eslint-disable react-refresh/only-export-components -- exporta constantes de navegación compartidas */
import {
  BadgeCheck,
  BadgePercent,
  ClipboardList,
  Gift,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Shirt,
  Users,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import logoLaundry from '@/assets/logo-laundry.png'
import type { SessionRole } from '@/components/auth/LoginView'

export const ADMIN_SECTIONS = [
  { id: 'dashboard', label: 'Control de mando', icon: LayoutDashboard, allowedRoles: ['Administrador', 'Supervisor'] },
  { id: 'map', label: 'Asignación de recogida', icon: MapPin, allowedRoles: ['Administrador', 'Supervisor'] },
  { id: 'requests', label: 'Seguimiento de entrega', icon: ClipboardList, allowedRoles: ['Administrador', 'Supervisor'] },
  { id: 'orders', label: 'Historial solicitudes', icon: Package, allowedRoles: ['Administrador', 'Supervisor'] },
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
  sessionLabel,
  sessionRole,
  onLogout,
  activeSection,
  onSectionChange,
  children,
}: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sections = ADMIN_SECTIONS.filter((section) => section.allowedRoles.includes(sessionRole))

  useEffect(() => {
    if (!mobileOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [mobileOpen])

  function handleSectionChange(next: AdminSectionId) {
    onSectionChange(next)
    setMobileOpen(false)
  }

  const sidebarInner = (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <img src={logoLaundry} alt="Laundry icon" className="h-full w-full object-contain p-1" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-text">LaundryWeb</p>
            <p className="truncate text-[11px] text-text-muted">Panel administrativo</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="ml-auto inline-flex size-8 items-center justify-center rounded-md border border-border bg-surface text-text-muted hover:text-text lg:hidden"
          aria-label="Cerrar navegación"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {!collapsed ? (
        <div className="px-3 pt-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">Navegación</p>
        </div>
      ) : null}

      <nav className="flex flex-1 flex-col gap-0.5 overflow-hidden p-2">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSectionChange(item.id)}
            className={cn(
              'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] leading-tight transition-all',
              activeSection === item.id
                ? 'bg-primary-soft font-semibold text-primary shadow-[inset_0_0_0_1px_var(--color-border)]'
                : 'text-text-muted hover:bg-primary-soft/70 hover:text-primary',
              collapsed && 'justify-center',
            )}
            title={collapsed ? item.label : undefined}
          >
            {activeSection === item.id ? (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
            ) : null}
            <item.icon className="size-4 shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        {!collapsed ? (
          <div className="mb-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Sesión</p>
            <p className="mt-0.5 text-sm font-semibold leading-tight text-text">{sessionLabel}</p>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size={collapsed ? 'icon' : 'sm'}
          className={cn('mb-1.5 w-full justify-start rounded-lg', collapsed && 'justify-center')}
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
          className={cn('hidden h-9 w-full justify-start rounded-lg text-sm lg:inline-flex', collapsed && 'justify-center')}
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
    </>
  )

  return (
    <div className="flex min-h-screen w-full bg-background text-text">
      <aside
        className={cn(
          'sticky top-0 hidden h-screen flex-col overflow-hidden border-r border-border bg-card/95 shadow-sm backdrop-blur transition-[width] duration-200 lg:flex',
          collapsed ? 'w-[72px]' : 'w-60',
        )}
      >
        {sidebarInner}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="relative z-10 flex h-full w-[82%] max-w-[300px] flex-col border-r border-border bg-card shadow-xl">
            {sidebarInner}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-surface text-text hover:text-primary"
            aria-label="Abrir navegación"
          >
            <Menu className="size-4" aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
              <img src={logoLaundry} alt="" aria-hidden className="h-full w-full object-contain p-0.5" />
            </div>
            <p className="truncate text-sm font-semibold text-text">{title}</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onLogout} className="shrink-0">
            <LogOut className="size-4" aria-hidden />
            <span className="sr-only">Cerrar sesión</span>
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
