import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ServiceType = 'garment' | 'wash_type' | 'optional'

type ServiceItem = {
  id: string
  type: ServiceType
  name: string
  description: string
  basePrice: number
  estimatedDays?: number
  minDays?: number
  maxDays?: number
  active: boolean
}

const initialItems: ServiceItem[] = [
  { id: 'sv-1', type: 'garment', name: 'Camisa', description: 'Prenda formal estándar.', basePrice: 6000, active: true },
  { id: 'sv-2', type: 'garment', name: 'Pantalón', description: 'Pantalón casual o vestir.', basePrice: 7000, active: true },
  { id: 'sv-3', type: 'wash_type', name: 'Alfombra', description: 'Servicio especializado para limpieza de alfombras.', basePrice: 32000, estimatedDays: 10, minDays: 7, maxDays: 12, active: true },
  { id: 'sv-4', type: 'wash_type', name: 'Blanqueo', description: 'Proceso químico controlado para blanqueo.', basePrice: 18000, estimatedDays: 15, minDays: 10, maxDays: 18, active: true },
  { id: 'sv-5', type: 'wash_type', name: 'Costura', description: 'Ajustes y reparación básica de prendas.', basePrice: 15000, estimatedDays: 4, minDays: 2, maxDays: 7, active: true },
  { id: 'sv-6', type: 'wash_type', name: 'Desmanche', description: 'Tratamiento para manchas complejas.', basePrice: 19000, estimatedDays: 15, minDays: 10, maxDays: 18, active: true },
  { id: 'sv-7', type: 'wash_type', name: 'Edredones', description: 'Limpieza especializada de edredones.', basePrice: 28000, estimatedDays: 2, minDays: 1, maxDays: 4, active: true },
  { id: 'sv-8', type: 'wash_type', name: 'L/P', description: 'Lavado y planchado estándar.', basePrice: 12000, estimatedDays: 1, minDays: 1, maxDays: 2, active: true },
  { id: 'sv-9', type: 'wash_type', name: 'L/S', description: 'Lavado al seco para prendas delicadas.', basePrice: 14000, estimatedDays: 1, minDays: 1, maxDays: 2, active: true },
  { id: 'sv-10', type: 'wash_type', name: 'Reproceso', description: 'Corrección y segundo tratamiento de servicio.', basePrice: 9000, estimatedDays: 1, minDays: 1, maxDays: 3, active: true },
  { id: 'sv-11', type: 'wash_type', name: 'Solo Plancha', description: 'Servicio exclusivo de planchado.', basePrice: 7000, estimatedDays: 1, minDays: 1, maxDays: 2, active: true },
  { id: 'sv-12', type: 'wash_type', name: 'Tinturado', description: 'Proceso de tinturado y recuperación de color.', basePrice: 24000, estimatedDays: 5, minDays: 3, maxDays: 8, active: true },
  { id: 'sv-13', type: 'wash_type', name: 'Zapatos', description: 'Lavado y tratamiento de calzado.', basePrice: 22000, estimatedDays: 5, minDays: 3, maxDays: 8, active: true },
  { id: 'sv-14', type: 'optional', name: 'Doblado especial', description: 'Empaque y doblado premium.', basePrice: 3000, active: true },
  { id: 'sv-15', type: 'optional', name: 'Perfumado', description: 'Aroma adicional en entrega.', basePrice: 2000, active: true },
]

const typeLabel: Record<ServiceType, string> = {
  garment: 'Tipo de prenda',
  wash_type: 'Servicio (tipo de lavado)',
  optional: 'Servicio opcional',
}

const singularByType: Record<ServiceType, string> = {
  garment: 'prenda',
  wash_type: 'tipo de lavado',
  optional: 'servicio adicional',
}

const PAGE_SIZE = 5

export function ServicesCatalogView() {
  const [items, setItems] = useState<ServiceItem[]>(initialItems)
  const [openModal, setOpenModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeMenu, setActiveMenu] = useState<ServiceType>('garment')
  const [type, setType] = useState<ServiceType>('garment')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('0')
  const [estimatedDays, setEstimatedDays] = useState('1')
  const [minDays, setMinDays] = useState('1')
  const [maxDays, setMaxDays] = useState('3')
  const [formError, setFormError] = useState('')

  const grouped = useMemo(
    () => ({
      garment: items.filter((i) => i.type === 'garment'),
      wash_type: items.filter((i) => i.type === 'wash_type'),
      optional: items.filter((i) => i.type === 'optional'),
    }),
    [items],
  )

  function toggleActive(id: string) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, active: !item.active } : item)))
  }

  function openCreateModal() {
    setEditingId(null)
    setType(activeMenu)
    setName('')
    setDescription('')
    setBasePrice('0')
    setEstimatedDays('1')
    setMinDays('1')
    setMaxDays('3')
    setFormError('')
    setOpenModal(true)
  }

  function openEditModal(item: ServiceItem) {
    setEditingId(item.id)
    setType(item.type)
    setName(item.name)
    setDescription(item.description)
    setBasePrice(String(item.basePrice))
    setEstimatedDays(String(item.estimatedDays ?? 1))
    setMinDays(String(item.minDays ?? 1))
    setMaxDays(String(item.maxDays ?? 3))
    setFormError('')
    setOpenModal(true)
  }

  function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    const parsedPrice = Number(basePrice)
    if (!name.trim() || !description.trim()) {
      setFormError('Completa nombre y descripción.')
      return
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('El precio base debe ser un número válido mayor o igual a 0.')
      return
    }

    const nextItem: ServiceItem = {
      id: editingId ?? `sv-${Date.now()}`,
      type,
      name: name.trim(),
      description: description.trim(),
      basePrice: parsedPrice,
      active: true,
    }

    if (type === 'wash_type') {
      const parsedEstimatedDays = Number(estimatedDays)
      const parsedMinDays = Number(minDays)
      const parsedMaxDays = Number(maxDays)
      if (
        Number.isNaN(parsedEstimatedDays) ||
        Number.isNaN(parsedMinDays) ||
        Number.isNaN(parsedMaxDays) ||
        parsedEstimatedDays < 1 ||
        parsedMinDays < 1 ||
        parsedMaxDays < 1
      ) {
        setFormError('Los días deben ser números válidos y mayores a 0.')
        return
      }
      if (parsedMinDays > parsedMaxDays) {
        setFormError('Los días mínimos no pueden ser mayores que los máximos.')
        return
      }
      if (parsedEstimatedDays < parsedMinDays || parsedEstimatedDays > parsedMaxDays) {
        setFormError('Los días requeridos deben estar entre mínimo y máximo.')
        return
      }
      nextItem.estimatedDays = parsedEstimatedDays
      nextItem.minDays = parsedMinDays
      nextItem.maxDays = parsedMaxDays
    }

    if (editingId) {
      setItems((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...nextItem, active: item.active } : item)),
      )
    } else {
      setItems((prev) => [{ ...nextItem, active: true }, ...prev])
    }

    setEditingId(null)
    setOpenModal(false)
  }

  return (
    <section className="space-y-4">
      <Card className="border-border bg-surface">
        <Dialog.Root open={openModal} onOpenChange={setOpenModal}>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-text">Catálogo de servicios</CardTitle>
                <CardDescription className="text-text-muted">
                  Gestiona tipos de prendas, tipos de lavado y servicios opcionales visibles en la app.
                </CardDescription>
              </div>
              <Dialog.Trigger asChild>
                <Button className="shrink-0" onClick={openCreateModal}>
                  <Plus className="size-4" aria-hidden />
                  Nuevo {singularByType[activeMenu]}
                </Button>
              </Dialog.Trigger>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">

          <div
            role="tablist"
            aria-label="Categorías de catálogo"
            className="inline-flex w-full gap-2 rounded-lg bg-[#f4f7fb] p-1"
          >
            <button
              id="tab-garment"
              role="tab"
              type="button"
              aria-selected={activeMenu === 'garment'}
              aria-controls="panel-garment"
              onClick={() => setActiveMenu('garment')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                activeMenu === 'garment'
                  ? 'bg-white text-primary shadow-sm'
                  : 'bg-transparent text-text-muted hover:bg-white/80 hover:text-primary'
              }`}
            >
              Prendas
            </button>
            <button
              id="tab-wash"
              role="tab"
              type="button"
              aria-selected={activeMenu === 'wash_type'}
              aria-controls="panel-wash"
              onClick={() => setActiveMenu('wash_type')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                activeMenu === 'wash_type'
                  ? 'bg-white text-primary shadow-sm'
                  : 'bg-transparent text-text-muted hover:bg-white/80 hover:text-primary'
              }`}
            >
              Tipos de lavado
            </button>
            <button
              id="tab-optional"
              role="tab"
              type="button"
              aria-selected={activeMenu === 'optional'}
              aria-controls="panel-optional"
              onClick={() => setActiveMenu('optional')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                activeMenu === 'optional'
                  ? 'bg-white text-primary shadow-sm'
                  : 'bg-transparent text-text-muted hover:bg-white/80 hover:text-primary'
              }`}
            >
              Servicios adicionales
            </button>
          </div>

          {activeMenu === 'garment' ? (
            <div id="panel-garment" role="tabpanel" aria-labelledby="tab-garment" className="rounded-lg border border-border bg-white p-3">
              <CatalogTable items={grouped.garment} onToggle={toggleActive} onEdit={openEditModal} />
            </div>
          ) : null}
          {activeMenu === 'wash_type' ? (
            <div id="panel-wash" role="tabpanel" aria-labelledby="tab-wash" className="rounded-lg border border-border bg-white p-3">
              <CatalogTable items={grouped.wash_type} onToggle={toggleActive} onEdit={openEditModal} showTiming />
            </div>
          ) : null}
          {activeMenu === 'optional' ? (
            <div id="panel-optional" role="tabpanel" aria-labelledby="tab-optional" className="rounded-lg border border-border bg-white p-3">
              <CatalogTable items={grouped.optional} onToggle={toggleActive} onEdit={openEditModal} />
            </div>
          ) : null}
          </CardContent>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-primary/40" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(780px,95vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
              <div className="flex items-start justify-between border-b border-border bg-primary-soft/40 px-5 py-4">
                <div className="pr-3">
                  <Dialog.Title className="text-lg font-semibold text-text">
                    {editingId ? 'Editar' : 'Crear'} {singularByType[type]}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-text-muted">
                    {editingId
                      ? `Actualiza la configuración del ${singularByType[type]} seleccionado.`
                      : `Registra un nuevo ${singularByType[type]} para la app móvil.`}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button size="sm" variant="outline">Cerrar</Button>
                </Dialog.Close>
              </div>

              <form onSubmit={saveItem} className="space-y-4 px-5 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 text-sm text-text">
                    <span className="font-medium">Tipo</span>
                    <select
                      value={type}
                      onChange={(event) => setType(event.target.value as ServiceType)}
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                    >
                      <option value="garment">Tipo de prenda</option>
                      <option value="wash_type">Tipo de lavado</option>
                      <option value="optional">Servicio opcional</option>
                    </select>
                  </label>
                  <label className="space-y-1.5 text-sm text-text">
                    <span className="font-medium">Nombre</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      placeholder="Ej: Perfumado premium"
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                    />
                  </label>
                </div>
                <label className="space-y-1.5 text-sm text-text">
                  <span className="font-medium">Descripción</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    required
                    rows={3}
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <label className="space-y-1.5 text-sm text-text">
                    <span className="font-medium">Precio base</span>
                    <input
                      value={basePrice}
                      onChange={(event) => setBasePrice(event.target.value)}
                      type="number"
                      min={0}
                      required
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                    />
                  </label>
                  <div className="flex items-end">
                    <div className="h-10 rounded-md border border-border bg-background px-3 text-sm font-medium text-text inline-flex items-center">
                      Moneda: COP
                    </div>
                  </div>
                </div>
                {type === 'wash_type' ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-1.5 text-sm text-text">
                      <span className="font-medium">Días requeridos</span>
                      <input
                        value={estimatedDays}
                        onChange={(event) => setEstimatedDays(event.target.value)}
                        type="number"
                        min={1}
                        required
                        className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm text-text">
                      <span className="font-medium">Días mínimos permitidos</span>
                      <input
                        value={minDays}
                        onChange={(event) => setMinDays(event.target.value)}
                        type="number"
                        min={1}
                        required
                        className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm text-text">
                      <span className="font-medium">Días máximos permitidos</span>
                      <input
                        value={maxDays}
                        onChange={(event) => setMaxDays(event.target.value)}
                        type="number"
                        min={1}
                        required
                        className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                      />
                    </label>
                  </div>
                ) : null}
                {formError ? <p className="text-sm font-medium text-destructive">{formError}</p> : null}
                <div className="flex justify-end border-t border-border pt-3">
                  <Button type="submit">
                    <Plus className="size-4" aria-hidden />
                    {editingId ? 'Guardar cambios' : 'Crear'}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </Card>
    </section>
  )
}

function CatalogTable({
  items,
  onToggle,
  onEdit,
  showTiming = false,
}: {
  items: ServiceItem[]
  onToggle: (id: string) => void
  onEdit: (item: ServiceItem) => void
  showTiming?: boolean
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return items
    return items.filter((item) =>
      `${item.name} ${item.description} ${typeLabel[item.type]}`.toLowerCase().includes(normalized),
    )
  }, [items, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visiblePage = Math.min(page, totalPages)
  const start = (visiblePage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-background px-3 py-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nombre, descripción o tipo"
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text focus:border-primary focus:outline-none"
          />
        </label>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-background text-left text-text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Nombre</th>
            <th className="px-3 py-2 font-medium">Tipo</th>
            <th className="px-3 py-2 font-medium">Precio base</th>
            {showTiming ? <th className="px-3 py-2 font-medium">Días req.</th> : null}
            {showTiming ? <th className="px-3 py-2 font-medium">Días mín.</th> : null}
            {showTiming ? <th className="px-3 py-2 font-medium">Días máx.</th> : null}
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium">Acción</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="px-3 py-2">
                <p className="font-semibold text-text">{item.name}</p>
                <p className="text-xs text-text-muted">{item.description}</p>
              </td>
              <td className="px-3 py-2 text-text">{typeLabel[item.type]}</td>
              <td className="px-3 py-2 text-text">${item.basePrice.toLocaleString('es-CO')}</td>
              {showTiming ? <td className="px-3 py-2 text-text">{item.estimatedDays ?? '-'}</td> : null}
              {showTiming ? <td className="px-3 py-2 text-text">{item.minDays ?? '-'}</td> : null}
              {showTiming ? <td className="px-3 py-2 text-text">{item.maxDays ?? '-'}</td> : null}
              <td className="px-3 py-2">
                <Badge variant={item.active ? 'success' : 'outline'}>{item.active ? 'Activo' : 'Inactivo'}</Badge>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                    Editar
                  </Button>
                  <Button size="sm" variant={item.active ? 'outline' : 'secondary'} onClick={() => onToggle(item.id)}>
                    {item.active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <div className="border-t border-border px-3 py-3 text-sm text-text-muted">No hay elementos en este grupo.</div>
      ) : null}
      <div className="flex items-center justify-between border-t border-border bg-background px-3 py-2">
        <p className="text-xs text-text-muted">
          Mostrando {rows.length === 0 ? 0 : start + 1}-{start + rows.length} de {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={visiblePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Anterior
          </Button>
          <span className="text-xs text-text-muted">
            {visiblePage}/{totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={visiblePage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
