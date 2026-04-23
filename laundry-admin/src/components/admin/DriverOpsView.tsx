import { Building2, KeyRound, Plus, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFleetSnapshot } from '@/hooks/useFleetSnapshot'

type StaffKind = 'driver' | 'assistant'

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
  const [activeTab, setActiveTab] = useState<'hub' | 'staff'>('hub')

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
  }

  return (
    <section className="space-y-4">
      <Card className="border-border bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-text">Gestión de sedes y usuarios</CardTitle>
          <CardDescription className="text-text-muted">
            Alta de sedes y creación de cuentas operativas con contraseña temporal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            role="tablist"
            aria-label="Formularios de sedes y usuarios"
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
              Usuarios
            </button>
          </div>

          {activeTab === 'hub' ? (
            <div id="panel-hub" role="tabpanel" aria-labelledby="tab-hub" className="rounded-lg border border-border bg-white p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-text">Agregar sede</p>
                <p className="text-xs text-text-muted">Define nuevas sedes para asignación de choferes y rutas futuras.</p>
              </div>
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={hubForm.name} onChange={(value) => setHubForm((p) => ({ ...p, name: value }))} placeholder="Nombre sede" />
                  <Input value={hubForm.city} onChange={(value) => setHubForm((p) => ({ ...p, city: value }))} placeholder="Ciudad" />
                </div>
                <Input value={hubForm.address} onChange={(value) => setHubForm((p) => ({ ...p, address: value }))} placeholder="Dirección" />
                <Button onClick={addHub}>
                  <Plus className="size-4" aria-hidden />
                  Crear sede
                </Button>
              </div>
            </div>
          ) : null}

          {activeTab === 'staff' ? (
            <div id="panel-staff" role="tabpanel" aria-labelledby="tab-staff" className="rounded-lg border border-border bg-white p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-text">Crear usuario chofer/ayudante</p>
                <p className="text-xs text-text-muted">
                  Al crear el usuario se genera una contraseña temporal y cambio obligatorio al primer ingreso móvil.
                </p>
              </div>
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={staffForm.fullName} onChange={(value) => setStaffForm((p) => ({ ...p, fullName: value }))} placeholder="Nombre completo" />
                  <Input value={staffForm.phone} onChange={(value) => setStaffForm((p) => ({ ...p, phone: value }))} placeholder="Teléfono" />
                  <Input value={staffForm.email} onChange={(value) => setStaffForm((p) => ({ ...p, email: value }))} placeholder="Email login" />
                  <Input value={staffForm.documentId} onChange={(value) => setStaffForm((p) => ({ ...p, documentId: value }))} placeholder="Documento / cédula" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={staffForm.kind}
                    onChange={(e) => setStaffForm((p) => ({ ...p, kind: e.target.value as StaffKind }))}
                    className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                  >
                    <option value="driver">Chofer</option>
                    <option value="assistant">Ayudante</option>
                  </select>
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
                <Button onClick={createStaffUser}>
                  <KeyRound className="size-4" aria-hidden />
                  Crear usuario y contraseña temporal
                </Button>
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
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-text">Usuarios operativos creados</CardTitle>
          <CardDescription className="text-text-muted">
            Control de choferes/ayudantes y estado de seguridad de acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
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
                    <td className="px-3 py-2 text-text">{u.kind === 'driver' ? 'Chofer' : 'Ayudante'}</td>
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
        </CardContent>
      </Card>
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
