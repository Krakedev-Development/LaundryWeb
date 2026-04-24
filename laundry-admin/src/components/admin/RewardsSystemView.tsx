import * as Dialog from '@radix-ui/react-dialog'
import { Gift, Plus, Search, Target, TicketPercent, Trash2 } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { useRewardsStore } from '@/stores/useRewardsStore'
import type { PointsRule, RewardCatalogItem, RewardRedemption, RewardRedemptionStatus } from '@/types'

type TabId = 'rewards' | 'rules' | 'redemptions'

const PAGE_SIZE = 5

type RuleFormState = {
  id: string | null
  name: string
  description: string
  minPurchases: string
  minSpendUsd: string
  requiredPoints: string
  validFrom: string
  validTo: string
}

type RewardFormState = {
  id: string | null
  name: string
  description: string
  requiredRuleIds: string[]
  validFrom: string
  validTo: string
  publish: boolean
}

function emptyRuleForm(): RuleFormState {
  return {
    id: null,
    name: '',
    description: '',
    minPurchases: '1',
    minSpendUsd: '0',
    requiredPoints: '100',
    validFrom: '',
    validTo: '',
  }
}

function emptyRewardForm(): RewardFormState {
  return {
    id: null,
    name: '',
    description: '',
    requiredRuleIds: [],
    validFrom: '',
    validTo: '',
    publish: true,
  }
}

export function RewardsSystemView() {
  const { loading, catalog, rules, redemptions, pendingRedemptions, pointsRedeemed, createReward, updateReward, deleteReward, toggleReward, addRule, updateRule, deleteRule, toggleRule, setRedemptionStatus } =
    useRewardsStore()
  const [tab, setTab] = useState<TabId>('rewards')
  const [openRewardModal, setOpenRewardModal] = useState(false)
  const [openRuleModal, setOpenRuleModal] = useState(false)
  const [rewardForm, setRewardForm] = useState<RewardFormState>(emptyRewardForm())
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm())
  const [rewardError, setRewardError] = useState('')
  const [ruleError, setRuleError] = useState('')

  const ruleOptions = useMemo(
    () =>
      rules
        .filter((item) => item.active)
        .map((item) => ({
          value: item.id,
          label: item.name,
          description: buildRuleSummary(item),
        })),
    [rules],
  )

  async function submitRule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRuleError('')
    const minPurchases = Number(ruleForm.minPurchases)
    const minSpendUsd = Number(ruleForm.minSpendUsd)
    const requiredPoints = Number(ruleForm.requiredPoints)
    if (!ruleForm.name.trim() || !ruleForm.description.trim()) {
      setRuleError('Nombre y descripción son obligatorios.')
      return
    }
    if (Number.isNaN(minPurchases) || minPurchases < 0 || Number.isNaN(minSpendUsd) || minSpendUsd < 0 || Number.isNaN(requiredPoints) || requiredPoints < 0) {
      setRuleError('Los valores numéricos deben ser válidos.')
      return
    }
    if (!ruleForm.validFrom || !ruleForm.validTo) {
      setRuleError('La vigencia de la regla es obligatoria.')
      return
    }
    const payload = {
      name: ruleForm.name.trim(),
      description: ruleForm.description.trim(),
      minPurchases,
      minSpendUsd,
      requiredPoints,
      validFrom: ruleForm.validFrom,
      validTo: ruleForm.validTo,
      active: true,
    }
    if (ruleForm.id) {
      await updateRule(ruleForm.id, payload)
    } else {
      await addRule(payload)
    }
    setRuleForm(emptyRuleForm())
    setOpenRuleModal(false)
  }

  async function submitReward(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRewardError('')
    if (!rewardForm.name.trim() || !rewardForm.description.trim()) {
      setRewardError('Nombre y descripción son obligatorios.')
      return
    }
    if (rewardForm.requiredRuleIds.length === 0) {
      setRewardError('Debes seleccionar al menos una regla.')
      return
    }
    if (!rewardForm.validFrom || !rewardForm.validTo) {
      setRewardError('La vigencia de la recompensa es obligatoria.')
      return
    }
    const payload = {
      name: rewardForm.name.trim(),
      description: rewardForm.description.trim(),
      pointsCost: calculatePointsCostFromRules(rewardForm.requiredRuleIds, rules),
      requiredRuleIds: rewardForm.requiredRuleIds,
      status: rewardForm.publish ? 'active' : 'inactive' as const,
      stock: null,
      validFrom: rewardForm.validFrom,
      validTo: rewardForm.validTo,
      icon: 'Gift',
    }
    if (rewardForm.id) {
      await updateReward(rewardForm.id, payload)
    } else {
      await createReward(payload)
    }
    setRewardForm(emptyRewardForm())
    setOpenRewardModal(false)
  }

  function editRule(rule: PointsRule) {
    setRuleForm({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      minPurchases: String(rule.minPurchases),
      minSpendUsd: String(rule.minSpendUsd),
      requiredPoints: String(rule.requiredPoints),
      validFrom: rule.validFrom ?? '',
      validTo: rule.validTo ?? '',
    })
    setOpenRuleModal(true)
  }

  function editReward(reward: RewardCatalogItem) {
    setRewardForm({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      requiredRuleIds: reward.requiredRuleIds,
      validFrom: reward.validFrom ?? '',
      validTo: reward.validTo ?? '',
      publish: reward.status === 'active',
    })
    setOpenRewardModal(true)
  }

  return (
    <section className="space-y-4">
      <Card className="border-border bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="inline-flex items-center gap-2 text-text">
            <Gift className="size-5 text-primary" aria-hidden />
            Sistema de recompensas
          </CardTitle>
          <CardDescription className="text-text-muted">
            CRUD completo de reglas y recompensas con validaciones por compras, gasto, puntos y vigencia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p className="text-sm text-text-muted">Cargando datos...</p> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Recompensas activas" value={catalog.filter((i) => i.status === 'active').length} tone="secondary" />
            <Stat label="Canjes pendientes" value={pendingRedemptions} tone="warning" />
            <Stat label="Puntos canjeados" value={pointsRedeemed} tone="outline" />
          </div>

          <div role="tablist" className="inline-flex w-full gap-2 rounded-lg bg-[#f4f7fb] p-1">
            <TabButton id="tab-rewards" selected={tab === 'rewards'} onClick={() => setTab('rewards')} controls="panel-rewards">
              <TicketPercent className="size-4" aria-hidden />
              Recompensas
            </TabButton>
            <TabButton id="tab-rules" selected={tab === 'rules'} onClick={() => setTab('rules')} controls="panel-rules">
              <Target className="size-4" aria-hidden />
              Reglas
            </TabButton>
            <TabButton id="tab-redemptions" selected={tab === 'redemptions'} onClick={() => setTab('redemptions')} controls="panel-redemptions">
              <Gift className="size-4" aria-hidden />
              Canjes
            </TabButton>
          </div>

          {tab === 'rewards' ? (
            <div id="panel-rewards" className="rounded-lg border border-border bg-white p-3 sm:p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-text">Gestión de recompensas</p>
                <Button size="sm" onClick={() => { setRewardForm(emptyRewardForm()); setOpenRewardModal(true) }}>
                  <Plus className="size-4" aria-hidden />
                  Nueva recompensa
                </Button>
              </div>
              <RewardsTable items={catalog} rules={rules} onEdit={editReward} onDelete={(id) => void deleteReward(id)} onToggle={(id) => void toggleReward(id)} />
            </div>
          ) : null}

          {tab === 'rules' ? (
            <div id="panel-rules" className="rounded-lg border border-border bg-white p-3 sm:p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-text">Reglas para habilitar canje</p>
                <Button size="sm" onClick={() => { setRuleForm(emptyRuleForm()); setOpenRuleModal(true) }}>
                  <Plus className="size-4" aria-hidden />
                  Nueva regla
                </Button>
              </div>
              <RulesTable rules={rules} onEdit={editRule} onDelete={(id) => void deleteRule(id)} onToggle={(id) => void toggleRule(id)} />
            </div>
          ) : null}

          {tab === 'redemptions' ? <RedemptionsTable redemptions={redemptions} onStatusChange={setRedemptionStatus} /> : null}
        </CardContent>
      </Card>

      <Dialog.Root open={openRuleModal} onOpenChange={setOpenRuleModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-primary/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(720px,95vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
            <div className="border-b border-border bg-primary-soft/40 px-5 py-4">
              <Dialog.Title className="text-lg font-semibold text-text">{ruleForm.id ? 'Editar regla' : 'Nueva regla'}</Dialog.Title>
            </div>
            <form onSubmit={submitRule} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <label className="space-y-1.5 text-sm text-text">
                <span className="font-medium">Nombre</span>
                <input value={ruleForm.name} onChange={(e) => setRuleForm((p) => ({ ...p, name: e.target.value }))} className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none" />
              </label>
              <label className="space-y-1.5 text-sm text-text">
                <span className="font-medium">Descripción (visible para cliente)</span>
                <textarea value={ruleForm.description} onChange={(e) => setRuleForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none" />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberInput label="Compras mínimas" value={ruleForm.minPurchases} onChange={(v) => setRuleForm((p) => ({ ...p, minPurchases: v }))} />
                <NumberInput label="Gasto mínimo (USD)" value={ruleForm.minSpendUsd} onChange={(v) => setRuleForm((p) => ({ ...p, minSpendUsd: v }))} />
                <NumberInput label="Puntaje requerido para reclamar" value={ruleForm.requiredPoints} onChange={(v) => setRuleForm((p) => ({ ...p, requiredPoints: v }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DateInput label="Fecha inicio" value={ruleForm.validFrom} onChange={(v) => setRuleForm((p) => ({ ...p, validFrom: v }))} />
                <DateInput label="Fecha fin" value={ruleForm.validTo} onChange={(v) => setRuleForm((p) => ({ ...p, validTo: v }))} />
              </div>
              {ruleError ? <p className="text-sm font-medium text-destructive">{ruleError}</p> : null}
              <ModalActions />
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={openRewardModal} onOpenChange={setOpenRewardModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-primary/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(760px,95vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
            <div className="border-b border-border bg-primary-soft/40 px-5 py-4">
              <Dialog.Title className="text-lg font-semibold text-text">{rewardForm.id ? 'Editar recompensa' : 'Nueva recompensa'}</Dialog.Title>
            </div>
            <form onSubmit={submitReward} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <label className="space-y-1.5 text-sm text-text">
                <span className="font-medium">Nombre</span>
                <input value={rewardForm.name} onChange={(e) => setRewardForm((p) => ({ ...p, name: e.target.value }))} className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none" />
              </label>
              <label className="space-y-1.5 text-sm text-text">
                <span className="font-medium">Descripción visible al cliente</span>
                <textarea value={rewardForm.description} onChange={(e) => setRewardForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm text-text">
                  <span className="font-medium">Reglas que debe cumplir para reclamar</span>
                  <SearchableMultiSelect options={ruleOptions} selectedValues={rewardForm.requiredRuleIds} onChange={(values) => setRewardForm((p) => ({ ...p, requiredRuleIds: values }))} placeholder="Buscar reglas..." emptyMessage="No hay reglas activas." />
                </label>
              <article className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text">
                <p className="font-medium">Costo en puntos (automático)</p>
                <p className="mt-1 text-xs text-text-muted">
                  Se calcula con base en las reglas seleccionadas.
                </p>
                <p className="mt-1 text-base font-semibold text-primary">
                  {calculatePointsCostFromRules(rewardForm.requiredRuleIds, rules).toLocaleString('es-CO')} pts
                </p>
              </article>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DateInput label="Fecha inicio" value={rewardForm.validFrom} onChange={(v) => setRewardForm((p) => ({ ...p, validFrom: v }))} />
                <DateInput label="Fecha fin" value={rewardForm.validTo} onChange={(v) => setRewardForm((p) => ({ ...p, validTo: v }))} />
              </div>
              <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-text">
                <input type="checkbox" checked={rewardForm.publish} onChange={(e) => setRewardForm((p) => ({ ...p, publish: e.target.checked }))} />
                Publicar recompensa al guardar
              </label>
              {rewardError ? <p className="text-sm font-medium text-destructive">{rewardError}</p> : null}
              <ModalActions />
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

function TabButton({ id, selected, onClick, controls, children }: { id: string; selected: boolean; onClick: () => void; controls: string; children: ReactNode }) {
  return (
    <button id={id} role="tab" type="button" aria-selected={selected} aria-controls={controls} onClick={onClick} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${selected ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-text-muted hover:bg-white/80 hover:text-primary'}`}>
      {children}
    </button>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'secondary' | 'warning' | 'outline' }) {
  return (
    <article className="rounded-md border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text">{label}</p>
        <Badge variant={tone}>{value.toLocaleString('es-CO')}</Badge>
      </div>
    </article>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1.5 text-sm text-text">
      <span className="font-medium">{label}</span>
      <input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none" />
    </label>
  )
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1.5 text-sm text-text">
      <span className="font-medium">{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none" />
    </label>
  )
}

function ModalActions() {
  return (
    <div className="flex justify-end gap-2 border-t border-border pt-3">
      <Dialog.Close asChild>
        <Button type="button" variant="outline" size="sm">
          Cancelar
        </Button>
      </Dialog.Close>
      <Button type="submit" size="sm">
        Guardar
      </Button>
    </div>
  )
}

function RewardsTable({
  items,
  rules,
  onEdit,
  onDelete,
  onToggle,
}: {
  items: RewardCatalogItem[]
  rules: PointsRule[]
  onEdit: (item: RewardCatalogItem) => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
}) {
  const ruleMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const rule of rules) map[rule.id] = rule.name
    return map
  }, [rules])
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] table-fixed border-collapse text-sm">
        <thead className="bg-primary-soft text-left text-primary">
          <tr>
            <th className="w-[22%] px-3 py-2 font-semibold">Recompensa</th>
            <th className="w-[28%] px-3 py-2 font-semibold">Requisitos cliente</th>
            <th className="w-[10%] px-3 py-2 font-semibold">Costo</th>
            <th className="w-[18%] px-3 py-2 font-semibold">Vigencia</th>
            <th className="w-[10%] px-3 py-2 font-semibold">Estado</th>
            <th className="w-[12%] px-3 py-2 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="px-3 py-2">
                <p className="font-semibold text-text">{item.name}</p>
                <p className="text-xs text-text-muted break-words">{item.description}</p>
              </td>
              <td className="px-3 py-2 text-xs text-text-muted break-words">{item.requiredRuleIds.map((id) => ruleMap[id] ?? id).join(', ')}</td>
              <td className="px-3 py-2 text-text">{item.pointsCost.toLocaleString('es-CO')}</td>
              <td className="px-3 py-2 text-xs text-text-muted">{formatDateRange(item.validFrom, item.validTo)}</td>
              <td className="px-3 py-2">
                <Badge variant={item.status === 'active' ? 'success' : 'outline'}>{item.status === 'active' ? 'Activa' : 'Inactiva'}</Badge>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onEdit(item)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onToggle(item.id)}>
                    {item.status === 'active' ? 'Ocultar' : 'Publicar'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onDelete(item.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function RulesTable({ rules, onEdit, onDelete, onToggle }: { rules: PointsRule[]; onEdit: (item: PointsRule) => void; onDelete: (id: string) => void; onToggle: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] table-fixed border-collapse text-sm">
        <thead className="bg-primary-soft text-left text-primary">
          <tr>
            <th className="w-[22%] px-3 py-2 font-semibold">Regla</th>
            <th className="w-[30%] px-3 py-2 font-semibold">Requisitos</th>
            <th className="w-[10%] px-3 py-2 font-semibold">Puntaje requerido</th>
            <th className="w-[16%] px-3 py-2 font-semibold">Vigencia</th>
            <th className="w-[10%] px-3 py-2 font-semibold">Estado</th>
            <th className="w-[12%] px-3 py-2 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id} className="border-t border-border">
              <td className="px-3 py-2">
                <p className="font-semibold text-text">{rule.name}</p>
                <p className="text-xs text-text-muted break-words">{rule.description}</p>
              </td>
              <td className="px-3 py-2 text-xs text-text-muted break-words">{buildRuleSummary(rule)}</td>
              <td className="px-3 py-2 text-text">{rule.requiredPoints.toLocaleString('es-CO')}</td>
              <td className="px-3 py-2 text-xs text-text-muted">{formatDateRange(rule.validFrom, rule.validTo)}</td>
              <td className="px-3 py-2">
                <Badge variant={rule.active ? 'success' : 'outline'}>{rule.active ? 'Activa' : 'Inactiva'}</Badge>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onEdit(rule)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onToggle(rule.id)}>
                    {rule.active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => onDelete(rule.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function RedemptionsTable({ redemptions, onStatusChange }: { redemptions: RewardRedemption[]; onStatusChange: (id: string, status: RewardRedemptionStatus) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return redemptions
    return redemptions.filter((r) => `${r.customerName} ${r.rewardName} ${r.status}`.toLowerCase().includes(q))
  }, [query, redemptions])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visiblePage = Math.min(page, totalPages)
  const start = (visiblePage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)
  const pendingRows = rows.filter((row) => row.status === 'pending')

  async function approveAllVisible() {
    await Promise.all(pendingRows.map((row) => onStatusChange(row.id, 'approved')))
  }

  async function rejectAllVisible() {
    await Promise.all(pendingRows.map((row) => onStatusChange(row.id, 'cancelled')))
  }

  return (
    <div id="panel-redemptions" className="rounded-lg border border-border bg-white p-3 sm:p-4">
      <div className="mb-3 space-y-2 border-b border-border pb-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder="Buscar canjes" className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text focus:border-primary focus:outline-none" />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 px-2 text-xs" disabled={pendingRows.length === 0} onClick={() => void approveAllVisible()}>
            Aprobar todos
          </Button>
          <Button size="sm" variant="outline" className="h-8 px-2 text-xs" disabled={pendingRows.length === 0} onClick={() => void rejectAllVisible()}>
            Rechazar todos
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
        <thead className="bg-primary-soft text-left text-primary">
          <tr>
            <th className="w-[22%] px-3 py-2 font-semibold">Cliente</th>
            <th className="w-[28%] px-3 py-2 font-semibold">Recompensa</th>
            <th className="w-[12%] px-3 py-2 text-right font-semibold">Puntos</th>
            <th className="w-[14%] px-3 py-2 font-semibold">Estado</th>
            <th className="w-[24%] px-3 py-2 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-3 py-2 font-medium text-text">{r.customerName}</td>
              <td className="px-3 py-2 text-text">{r.rewardName}</td>
              <td className="px-3 py-2 text-right text-text">{r.pointsSpent.toLocaleString('es-CO')}</td>
              <td className="px-3 py-2"><Badge variant={statusBadge(r.status)}>{statusLabel(r.status)}</Badge></td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" disabled={r.status !== 'pending'} onClick={() => void onStatusChange(r.id, 'approved')}>Aprobar</Button>
                  <Button size="sm" variant="outline" className="h-8 px-2 text-xs" disabled={r.status !== 'pending'} onClick={() => void onStatusChange(r.id, 'cancelled')}>Rechazar</Button>
                </div>
              </td>
            </tr>
          )) : (
            <tr className="border-t border-border">
              <td colSpan={5} className="px-3 py-6 text-center text-sm text-text-muted">No hay canjes para el filtro actual.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Mostrando {rows.length === 0 ? 0 : start + 1}-{start + rows.length} de {filtered.length}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={visiblePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={visiblePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
        </div>
      </div>
    </div>
  )
}

function statusLabel(status: RewardRedemptionStatus) {
  const labels: Record<RewardRedemptionStatus, string> = { pending: 'Pendiente', approved: 'Aprobado', delivered: 'Entregado', cancelled: 'Rechazado' }
  return labels[status]
}

function statusBadge(status: RewardRedemptionStatus): 'warning' | 'success' | 'secondary' | 'outline' {
  if (status === 'pending') return 'warning'
  if (status === 'approved') return 'secondary'
  if (status === 'delivered') return 'success'
  return 'outline'
}

function formatDateRange(from: string | null, to: string | null) {
  if (!from || !to) return 'Sin vigencia'
  return `${new Date(`${from}T00:00:00`).toLocaleDateString('es-CO')} — ${new Date(`${to}T00:00:00`).toLocaleDateString('es-CO')}`
}

function buildRuleSummary(rule: PointsRule) {
  return `${rule.minPurchases} compras, USD ${rule.minSpendUsd.toLocaleString('en-US')}, ${rule.requiredPoints} puntos requeridos`
}

function calculatePointsCostFromRules(ruleIds: string[], rules: PointsRule[]) {
  const selected = rules.filter((rule) => ruleIds.includes(rule.id))
  if (selected.length === 0) return 0
  return Math.max(...selected.map((rule) => rule.requiredPoints))
}
