import * as Dialog from '@radix-ui/react-dialog'
import { CalendarDays, CircleDollarSign, Plus, Tag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'

type Promotion = {
  id: string
  name: string
  description: string
  code: string
  discountType: 'percent' | 'fixed'
  discountPercent: number
  minOrderAmount: number
  usageLimit: number
  appliesToServiceIds: string[]
  startsAt: string
  validUntil: string
  active: boolean
}

const SERVICE_OPTIONS = [
  { value: 'dry_clean', label: 'Lavado al seco', description: 'Prendas delicadas y especiales.' },
  { value: 'iron', label: 'Planchado', description: 'Solo servicio de planchado.' },
  { value: 'wash_fold', label: 'Lavado + doblado', description: 'Lavado estándar con doblado.' },
  { value: 'home_service', label: 'Domicilio', description: 'Recogida/entrega a domicilio.' },
  { value: 'shoes', label: 'Zapatos', description: 'Limpieza y tratamiento de calzado.' },
  { value: 'blankets', label: 'Edredones', description: 'Limpieza especializada de edredones.' },
]

const initialPromotions: Promotion[] = [
  {
    id: 'promo-1',
    name: 'Mes de Camisas',
    description: '15% en planchado de camisas durante el mes.',
    code: 'CAMISAS15',
    discountType: 'percent',
    discountPercent: 15,
    minOrderAmount: 20000,
    usageLimit: 500,
    appliesToServiceIds: ['iron'],
    startsAt: '2026-05-01',
    validUntil: '2026-05-31',
    active: true,
  },
  {
    id: 'promo-2',
    name: 'Primera orden app',
    description: '10% de descuento + bolso promocional.',
    code: 'APP10',
    discountType: 'percent',
    discountPercent: 10,
    minOrderAmount: 15000,
    usageLimit: 1000,
    appliesToServiceIds: ['dry_clean', 'iron', 'wash_fold', 'home_service', 'shoes', 'blankets'],
    startsAt: '2026-05-01',
    validUntil: '2026-06-15',
    active: true,
  },
  {
    id: 'promo-3',
    name: 'Lavado por volumen',
    description: '20% a partir de 15 libras.',
    code: 'VOLUMEN20',
    discountType: 'percent',
    discountPercent: 20,
    minOrderAmount: 30000,
    usageLimit: 300,
    appliesToServiceIds: ['wash_fold'],
    startsAt: '2026-04-01',
    validUntil: '2026-04-30',
    active: false,
  },
]

export function PromotionsView() {
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions)
  const [openCreateModal, setOpenCreateModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountPercent, setDiscountPercent] = useState('10')
  const [minOrderAmount, setMinOrderAmount] = useState('0')
  const [usageLimit, setUsageLimit] = useState('100')
  const [appliesToServiceIds, setAppliesToServiceIds] = useState<string[]>([])
  const [startsAt, setStartsAt] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [active, setActive] = useState(true)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const stats = useMemo(() => {
    const total = promotions.length
    const active = promotions.filter((promotion) => promotion.active).length
    const inactive = total - active
    return { total, active, inactive }
  }, [promotions])

  function resetForm() {
    setName('')
    setDescription('')
    setCode('')
    setDiscountType('percent')
    setDiscountPercent('10')
    setMinOrderAmount('0')
    setUsageLimit('100')
    setAppliesToServiceIds([])
    setStartsAt('')
    setValidUntil('')
    setActive(true)
  }

  function togglePromotion(id: string) {
    setPromotions((prev) =>
      prev.map((promotion) =>
        promotion.id === id ? { ...promotion, active: !promotion.active } : promotion,
      ),
    )
  }

  function createPromotion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setFormSuccess('')

    const parsedDiscount = Number(discountPercent)
    const parsedMinOrderAmount = Number(minOrderAmount)
    const parsedUsageLimit = Number(usageLimit)
    if (!name.trim() || !description.trim() || !code.trim()) {
      setFormError('Completa nombre, descripción y código de la promoción.')
      return
    }
    if (Number.isNaN(parsedDiscount) || parsedDiscount <= 0) {
      setFormError('El valor del descuento debe ser mayor a 0.')
      return
    }
    if (discountType === 'percent' && parsedDiscount > 100) {
      setFormError('Si el tipo es porcentaje, el descuento no puede superar 100%.')
      return
    }
    if (Number.isNaN(parsedMinOrderAmount) || parsedMinOrderAmount < 0) {
      setFormError('El monto mínimo debe ser 0 o mayor.')
      return
    }
    if (Number.isNaN(parsedUsageLimit) || parsedUsageLimit < 1) {
      setFormError('El límite de uso debe ser mínimo 1.')
      return
    }
    if (appliesToServiceIds.length === 0) {
      setFormError('Selecciona al menos un servicio al que aplica la promoción.')
      return
    }
    if (!startsAt || !validUntil) {
      setFormError('Debes seleccionar fecha de inicio y fecha de fin.')
      return
    }
    if (new Date(`${startsAt}T00:00:00`).getTime() > new Date(`${validUntil}T23:59:59`).getTime()) {
      setFormError('La fecha fin debe ser mayor o igual a la fecha de inicio.')
      return
    }

    const next: Promotion = {
      id: `promo-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      code: code.trim().toUpperCase(),
      discountType,
      discountPercent: parsedDiscount,
      minOrderAmount: parsedMinOrderAmount,
      usageLimit: parsedUsageLimit,
      appliesToServiceIds,
      startsAt,
      validUntil,
      active,
    }
    setPromotions((prev) => [next, ...prev])
    resetForm()
    setOpenCreateModal(false)
    setFormSuccess('Promoción creada correctamente.')
  }

  return (
    <section className="space-y-4">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-text">Módulo de promociones</CardTitle>
          <CardDescription className="text-text-muted">
            Crea campañas mensuales y controla cuáles se muestran en la app móvil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Dialog.Root open={openCreateModal} onOpenChange={setOpenCreateModal}>
              <Dialog.Trigger asChild>
                <Button>
                  <Plus className="size-4" aria-hidden />
                  Nueva promoción
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-primary/40" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(900px,95vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                  <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                      <Dialog.Title className="text-base font-semibold text-text">Crear promoción</Dialog.Title>
                      <Dialog.Description className="text-sm text-text-muted">
                        Completa todos los campos requeridos para publicar una campaña.
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <Button size="sm" variant="outline" className="shrink-0">Cerrar</Button>
                    </Dialog.Close>
                  </div>

                  <form onSubmit={createPromotion} className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1.5 text-sm text-text">
                        <span className="font-medium">Nombre de promoción</span>
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Ej: Promo Camisas Mayo"
                          required
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </label>
                      <label className="space-y-1.5 text-sm text-text">
                        <span className="font-medium">Código promocional</span>
                        <input
                          value={code}
                          onChange={(event) => setCode(event.target.value)}
                          placeholder="Ej: APP10"
                          required
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </label>
                    </div>
                    <label className="space-y-1.5 text-sm text-text">
                      <span className="font-medium">Descripción comercial</span>
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Explica qué beneficio recibe el cliente"
                        required
                        rows={3}
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="space-y-1.5 text-sm text-text">
                        <span className="font-medium">Tipo de descuento</span>
                        <select
                          value={discountType}
                          onChange={(event) => setDiscountType(event.target.value as 'percent' | 'fixed')}
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                        >
                          <option value="percent">Porcentaje</option>
                          <option value="fixed">Valor fijo</option>
                        </select>
                      </label>
                      <label className="space-y-1.5 text-sm text-text">
                        <span className="font-medium">Valor de descuento</span>
                        <input
                          value={discountPercent}
                          onChange={(event) => setDiscountPercent(event.target.value)}
                          type="number"
                          min={1}
                          required
                          placeholder={discountType === 'percent' ? 'Ej: 15 (%)' : 'Ej: 5000 ($)'}
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </label>
                      <label className="space-y-1.5 text-sm text-text">
                        <span className="font-medium">Monto mínimo de compra</span>
                        <input
                          value={minOrderAmount}
                          onChange={(event) => setMinOrderAmount(event.target.value)}
                          type="number"
                          min={0}
                          required
                          placeholder="Ej: 20000"
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </label>
                      <label className="space-y-1.5 text-sm text-text">
                        <span className="font-medium">Límite de usos</span>
                        <input
                          value={usageLimit}
                          onChange={(event) => setUsageLimit(event.target.value)}
                          type="number"
                          min={1}
                          required
                          placeholder="Ej: 100"
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <label className="space-y-1.5 text-sm text-text sm:col-span-2 md:col-span-3">
                        <span className="font-medium">Servicios a los que aplica la promoción</span>
                        <SearchableMultiSelect
                          options={SERVICE_OPTIONS}
                          selectedValues={appliesToServiceIds}
                          onChange={setAppliesToServiceIds}
                          placeholder="Buscar servicios..."
                          emptyMessage="No hay servicios para seleccionar."
                        />
                      </label>
                      <label className="space-y-1.5 text-sm text-text">
                        <span className="font-medium">Fecha de inicio</span>
                        <input
                          type="date"
                          value={startsAt}
                          onChange={(event) => setStartsAt(event.target.value)}
                          required
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </label>
                      <label className="space-y-1.5 text-sm text-text">
                        <span className="font-medium">Fecha de fin</span>
                        <input
                          type="date"
                          value={validUntil}
                          onChange={(event) => setValidUntil(event.target.value)}
                          required
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </label>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-text">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(event) => setActive(event.target.checked)}
                        className="size-4 rounded border border-border"
                      />
                      Publicar activa al crear
                    </label>

                    {formError ? <p className="text-sm font-medium text-destructive">{formError}</p> : null}
                    </div>

                    <div className="flex justify-end border-t border-border px-4 py-3">
                      <Button type="submit">
                        <Plus className="size-4" aria-hidden />
                        Crear promoción
                      </Button>
                    </div>
                  </form>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryItem label="Total promociones" value={stats.total} tone="secondary" />
            <SummaryItem label="Activas" value={stats.active} tone="success" />
            <SummaryItem label="Inactivas" value={stats.inactive} tone="outline" />
          </div>
          {formSuccess ? <p className="text-sm font-medium text-primary">{formSuccess}</p> : null}

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead className="bg-primary-soft text-left text-primary">
                <tr>
                  <th className="px-3 py-2 font-semibold">Promoción</th>
                  <th className="px-3 py-2 font-semibold">Descuento</th>
                  <th className="px-3 py-2 font-semibold">Vigencia</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promotion) => (
                  <tr key={promotion.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <p className="inline-flex items-center gap-1 font-semibold text-text">
                        <Tag className="size-4 text-primary" aria-hidden />
                        {promotion.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        Código: {promotion.code} · {formatServices(promotion.appliesToServiceIds)}
                      </p>
                      <p className="text-xs text-text-muted">{promotion.description}</p>
                    </td>
                    <td className="px-3 py-2 text-text">
                      <p className="inline-flex items-center gap-1">
                        <CircleDollarSign className="size-4 text-aqua" aria-hidden />
                        {promotion.discountType === 'percent'
                          ? `${promotion.discountPercent}%`
                          : `$${promotion.discountPercent.toLocaleString('es-CO')}`}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-text">
                      <p className="inline-flex items-center gap-1 text-xs">
                        <CalendarDays className="size-4 text-primary" aria-hidden />
                        {new Date(`${promotion.startsAt}T00:00:00`).toLocaleDateString('es-CO')} -{' '}
                        {new Date(`${promotion.validUntil}T00:00:00`).toLocaleDateString('es-CO')}
                      </p>
                      <p className="text-xs text-text-muted">
                        Mínimo: ${promotion.minOrderAmount.toLocaleString('es-CO')} · Límite: {promotion.usageLimit}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={promotion.active ? 'success' : 'outline'}>
                        {promotion.active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant={promotion.active ? 'outline' : 'secondary'} onClick={() => togglePromotion(promotion.id)}>
                        {promotion.active ? 'Desactivar' : 'Activar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'secondary' | 'success' | 'outline'
}) {
  return (
    <article className="rounded-md border border-border bg-background px-3 py-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-text">{label}</p>
        <Badge variant={tone}>{value}</Badge>
      </div>
    </article>
  )
}

function formatServices(serviceIds: string[]) {
  if (serviceIds.length === 0) return 'Sin servicios'
  const labelMap = Object.fromEntries(SERVICE_OPTIONS.map((option) => [option.value, option.label]))
  return serviceIds.map((id) => labelMap[id] ?? id).join(', ')
}
