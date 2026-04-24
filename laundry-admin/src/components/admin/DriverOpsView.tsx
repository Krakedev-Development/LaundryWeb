import * as Dialog from '@radix-ui/react-dialog'
import { Building2, KeyRound, Plus, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFleetSnapshot } from '@/hooks/useFleetSnapshot'

type StaffKind = 'driver'

type Hub = {
  id: string
  name: string
  city: string
  address: string
}

type DriverUser = {
  id: string
  fullName: string
  phone: string
  email: string
  documentId: string
  kind: StaffKind
  hubId: string
  status: 'invited' | 'active'
  mustChangePassword: boolean
  tempPassword?: string
}

const initialHubs: Hub[] = [
  { id: 'hub-1', name: 'Sede Norte', city: 'Medellín', address: 'Calle 82 #52-19' },
  { id: 'hub-2', name: 'Sede Centro', city: 'Medellín', address: 'Carrera 50 #45-33' },
]

function createTempPassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let out = ''
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export function DriverOpsView() {
  const { data } = useFleetSnapshot()
  const [hubs, setHubs] = useState<Hub[]>(initialHubs)
  const [createdCredential, setCreatedCredential] = useState<{ user: string; tempPassword: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'hub' | 'staff'>('staff')
  const [openHubModal, setOpenHubModal] = useState(false)
  const [openStaffModal, setOpenStaffModal] = useState(false)

  const [hubForm, setHubForm] = useState({ name: '', city: '', address: '' })
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    documentId: '',
    kind: 'driver' as StaffKind,
    hubId: initialHubs[0].id,
  })

  const baseDrivers: DriverUser[] = useMemo(
    () =>
      (data?.drivers ?? []).map((d) => ({
        id: d.id,
        fullName: d.displayName,
        phone: d.phone,
        email: `${d.displayName.toLowerCase().replaceAll(' ', '.')}@laundryweb.app`,
        documentId: `CC-${d.id.toUpperCase()}`,
        kind: 'driver',
        hubId: initialHubs[0].id,
        status: d.status === 'offline' ? 'invited' : 'active',
        mustChangePassword: false,
      })),
    [data?.drivers],
  )
  const [newUsers, setNewUsers] = useState<DriverUser[]>([])
  const users = [...baseDrivers, ...newUsers]

  function addHub() {
    if (!hubForm.name || !hubForm.city || !hubForm.address) return
    const next: Hub = {
      id: `hub-${crypto.randomUUID()}`,
      name: hubForm.name.trim(),
      city: hubForm.city.trim(),
      address: hubForm.address.trim(),
    }
    setHubs((prev) => [...prev, next])
    setHubForm({ name: '', city: '', address: '' })
    setStaffForm((prev) => ({ ...prev, hubId: next.id }))
    setOpenHubModal(false)
  }

  function createStaffUser() {
    if (!staffForm.fullName || !staffForm.phone || !staffForm.email || !staffForm.documentId) return
    const tempPassword = createTempPassword(12)
    const newUser: DriverUser = {
      id: `usr-${crypto.randomUUID()}`,
      fullName: staffForm.fullName.trim(),
      phone: staffForm.phone.trim(),
      email: staffForm.email.trim(),
      documentId: staffForm.documentId.trim(),
      kind: staffForm.kind,
      hubId: staffForm.hubId,
      status: 'invited',
      mustChangePassword: true,
      tempPassword,
    }
    setNewUsers((prev) => [newUser, ...prev])
    setCreatedCredential({ user: newUser.email, tempPassword })
    setStaffForm((prev) => ({ ...prev, fullName: '', phone: '', email: '', documentId: '' }))
    setOpenStaffModal(false)
  }

  return (
    <section className="space-y-4">
      <Card className="border-border bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-text">Gestión de sedes y choferes</CardTitle>
          <CardDescription className="text-text-muted">
            Alta de sedes y creación de cuentas operativas con contraseña temporal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            role="tablist"
            aria-label="Formularios de sedes y choferes"
            className="inline-flex w-full gap-2 rounded-lg bg-[#f4f7fb] p-1"
          >
            <button
              id="tab-hub"
              role="tab"
              type="button"
              aria-selected={activeTab === 'hub'}
              aria-controls="panel-hub"
              onClick={() => setActiveTab('hub')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                activeTab === 'hub'
                  ? 'bg-white text-primary shadow-sm'
                  : 'bg-transparent text-text-muted hover:bg-white/80 hover:text-primary'
              }`}
            >
              <Building2 className="size-4 shrink-0" aria-hidden />
              Sedes
            </button>
            <button
              id="tab-staff"
              role="tab"
              type="button"
              aria-selected={activeTab === 'staff'}
              aria-controls="panel-staff"
              onClick={() => setActiveTab('staff')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                activeTab === 'staff'
                  ? 'bg-white text-primary shadow-sm'
                  : 'bg-transparent text-text-muted hover:bg-white/80 hover:text-primary'
              }`}
            >
              <UserPlus className="size-4 shrink-0" aria-hidden />
              Choferes
            </button>
          </div>

          {activeTab === 'hub' ? (
            <div id="panel-hub" role="tabpanel" aria-labelledby="tab-hub" className="rounded-lg border border-border bg-white p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">Sedes creadas</p>
                  <p className="text-xs text-text-muted">Define nuevas sedes para asignación de choferes y cobertura futura.</p>
                </div>
                <Dialog.Root open={openHubModal} onOpenChange={setOpenHubModal}>
                  <Dialog.Trigger asChild>
                    <Button size="sm">
                      <Plus className="size-4" aria-hidden />
                      Crear sede
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-primary/40" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(520px,95vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
                      <div className="border-b border-border bg-primary-soft/40 px-5 py-4">
                        <Dialog.Title className="text-lg font-semibold text-text">Nueva sede</Dialog.Title>
                        <Dialog.Description className="mt-1 text-sm text-text-muted">
                          Registra una sede para operar choferes y solicitudes de recogida.
                        </Dialog.Description>
                      </div>
                      <div className="space-y-3 overflow-y-auto px-5 py-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input value={hubForm.name} onChange={(value) => setHubForm((p) => ({ ...p, name: value }))} placeholder="Nombre sede" />
                          <Input value={hubForm.city} onChange={(value) => setHubForm((p) => ({ ...p, city: value }))} placeholder="Ciudad" />
                        </div>
                        <Input value={hubForm.address} onChange={(value) => setHubForm((p) => ({ ...p, address: value }))} placeholder="Dirección" />
                        <div className="flex justify-end gap-2 border-t border-border pt-3">
                          <Dialog.Close asChild>
                            <Button type="button" variant="outline" size="sm">
                              Cancelar
                            </Button>
                          </Dialog.Close>
                          <Button size="sm" onClick={addHub}>
                            Guardar sede
                          </Button>
                        </div>
                      </div>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead className="bg-primary-soft text-left text-primary">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Sede</th>
                      <th className="px-3 py-2 font-semibold">Ciudad</th>
                      <th className="px-3 py-2 font-semibold">Dirección</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hubs.map((hub) => (
                      <tr key={hub.id} className="border-t border-border">
                        <td className="px-3 py-2 font-semibold text-text">{hub.name}</td>
                        <td className="px-3 py-2 text-text">{hub.city}</td>
                        <td className="px-3 py-2 text-text-muted">{hub.address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'staff' ? (
            <div id="panel-staff" role="tabpanel" aria-labelledby="tab-staff" className="rounded-lg border border-border bg-white p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">Gestión de choferes</p>
                  <p className="text-xs text-text-muted">
                    Crea cuentas de chofer con contraseña temporal y asignación de sede.
                  </p>
                </div>
                <Dialog.Root open={openStaffModal} onOpenChange={setOpenStaffModal}>
                  <Dialog.Trigger asChild>
                    <Button size="sm">
                      <UserPlus className="size-4" aria-hidden />
                      Crear chofer
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-primary/40" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(620px,95vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
                      <div className="border-b border-border bg-primary-soft/40 px-5 py-4">
                        <Dialog.Title className="text-lg font-semibold text-text">Crear chofer</Dialog.Title>
                        <Dialog.Description className="mt-1 text-sm text-text-muted">
                          Se genera contraseña temporal y cambio obligatorio al primer ingreso.
                        </Dialog.Description>
                      </div>
                      <div className="space-y-3 overflow-y-auto px-5 py-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input value={staffForm.fullName} onChange={(value) => setStaffForm((p) => ({ ...p, fullName: value }))} placeholder="Nombre completo" />
                          <Input value={staffForm.phone} onChange={(value) => setStaffForm((p) => ({ ...p, phone: value }))} placeholder="Teléfono" />
                          <Input value={staffForm.email} onChange={(value) => setStaffForm((p) => ({ ...p, email: value }))} placeholder="Email login" />
                          <Input value={staffForm.documentId} onChange={(value) => setStaffForm((p) => ({ ...p, documentId: value }))} placeholder="Documento / cédula" />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="h-10 rounded-md border border-border bg-background px-3 text-sm font-medium text-text inline-flex items-center">
                            Tipo: Chofer
                          </div>
                          <select
                            value={staffForm.hubId}
                            onChange={(e) => setStaffForm((p) => ({ ...p, hubId: e.target.value }))}
                            className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                          >
                            {hubs.map((hub) => (
                              <option key={hub.id} value={hub.id}>
                                {hub.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-border pt-3">
                          <Dialog.Close asChild>
                            <Button type="button" variant="outline" size="sm">
                              Cancelar
                            </Button>
                          </Dialog.Close>
                          <Button size="sm" onClick={createStaffUser}>
                            <KeyRound className="size-4" aria-hidden />
                            Guardar chofer
                          </Button>
                        </div>
                      </div>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
              {createdCredential ? (
                <div className="rounded-md border border-border bg-primary-soft/60 p-3 text-sm text-text">
                  <p>
                    <strong>Usuario:</strong> {createdCredential.user}
                  </p>
                  <p>
                    <strong>Contraseña temporal:</strong> {createdCredential.tempPassword}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Entregar al chofer. En primer login móvil debe cambiarla por privacidad.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {activeTab === 'staff' ? (
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-text">Choferes operativos creados</CardTitle>
            <CardDescription className="text-text-muted">
              Control de choferes y estado de seguridad de acceso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="bg-primary-soft text-left text-primary">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nombre</th>
                    <th className="px-3 py-2 font-semibold">Tipo</th>
                    <th className="px-3 py-2 font-semibold">Sede</th>
                    <th className="px-3 py-2 font-semibold">Usuario</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 font-semibold">Seguridad</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-text">{u.fullName}</p>
                        <p className="text-xs text-text-muted">{u.phone}</p>
                      </td>
                      <td className="px-3 py-2 text-text">Chofer</td>
                      <td className="px-3 py-2 text-text">{hubs.find((h) => h.id === u.hubId)?.name ?? 'N/D'}</td>
                      <td className="px-3 py-2 text-xs text-text-muted">{u.email}</td>
                      <td className="px-3 py-2">
                        <Badge variant={u.status === 'active' ? 'success' : 'warning'}>
                          {u.status === 'active' ? 'Activo' : 'Pendiente primer login'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={u.mustChangePassword ? 'destructive' : 'secondary'}>
                          {u.mustChangePassword ? 'Debe cambiar contraseña' : 'OK'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
    />
  )
}
