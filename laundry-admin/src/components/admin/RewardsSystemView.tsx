import * as Dialog from '@radix-ui/react-dialog'
import { Gift, Plus, Search, Sparkles, Target } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type TabId = 'rules' | 'campaigns' | 'redemptions'

type RewardRule = {
  id: string
  name: string
  event: string
  pointsPerCop: number
  minOrderCop: number
  active: boolean
}

type RewardCampaign = {
  id: string
  name: string
  description: string
  multiplier: number
  startsAt: string
  endsAt: string
  active: boolean
}

type RewardRedemption = {
  id: string
  customerName: string
  rewardName: string
  pointsUsed: number
  at: string
}

const PAGE_SIZE = 5

const initialRules: RewardRule[] = [
  {
    id: 'rr-1',
    name: 'Compra en app',
    event: 'Orden pagada y completada',
    pointsPerCop: 1,
    minOrderCop: 20000,
    active: true,
  },
  {
    id: 'rr-2',
    name: 'Servicio a domicilio',
    event: 'Orden domicilio entregada',
    pointsPerCop: 2,
    minOrderCop: 15000,
    active: true,
  },
]

const initialCampaigns: RewardCampaign[] = [
  {
    id: 'rc-1',
    name: 'Doble puntos fines de semana',
    description: 'Sábados y domingos multiplicador x2.',
    multiplier: 2,
    startsAt: '2026-05-01',
    endsAt: '2026-08-31',
    active: true,
  },
]

const initialRedemptions: RewardRedemption[] = [
  {
    id: 'rx-1',
    customerName: 'Paola Herrera',
    rewardName: 'Descuento $10.000',
    pointsUsed: 5000,
    at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rx-2',
    customerName: 'Inés Ocampo',
    rewardName: 'Envío gratis próxima orden',
    pointsUsed: 3500,
    at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export function RewardsSystemView() {
  const [tab, setTab] = useState<TabId>('rules')
  const [rules, setRules] = useState<RewardRule[]>(initialRules)
  const [campaigns, setCampaigns] = useState<RewardCampaign[]>(initialCampaigns)
  const [redemptions] = useState<RewardRedemption[]>(initialRedemptions)

  const [openRuleModal, setOpenRuleModal] = useState(false)
  const [ruleName, setRuleName] = useState('')
  const [ruleEvent, setRuleEvent] = useState('')
  const [rulePoints, setRulePoints] = useState('1')
  const [ruleMin, setRuleMin] = useState('0')
  const [ruleError, setRuleError] = useState('')

  const stats = useMemo(() => {
    const activeRules = rules.filter((r) => r.active).length
    const activeCampaigns = campaigns.filter((c) => c.active).length
    const totalRedeemed = redemptions.reduce((sum, r) => sum + r.pointsUsed, 0)
    return { activeRules, activeCampaigns, totalRedeemed, redemptionsCount: redemptions.length }
  }, [campaigns, redemptions, rules])

  function toggleRule(id: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)))
  }

  function toggleCampaign(id: string) {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)))
  }

  function createRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setRuleError('')
    const pts = Number(rulePoints)
    const min = Number(ruleMin)
    if (!ruleName.trim() || !ruleEvent.trim()) {
      setRuleError('Completa nombre y evento.')
      return
    }
    if (Number.isNaN(pts) || pts < 1 || Number.isNaN(min) || min < 0) {
      setRuleError('Puntos y monto mínimo deben ser válidos.')
      return
    }
    setRules((prev) => [
      {
        id: `rr-${Date.now()}`,
        name: ruleName.trim(),
        event: ruleEvent.trim(),
        pointsPerCop: pts,
        minOrderCop: min,
        active: true,
      },
      ...prev,
    ])
    setRuleName('')
    setRuleEvent('')
    setRulePoints('1')
    setRuleMin('0')
    setOpenRuleModal(false)
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
            Configura acumulación de puntos, campañas de fidelización y control de canjes (maquetado mock).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="Reglas activas" value={stats.activeRules} tone="secondary" />
            <Stat label="Campañas activas" value={stats.activeCampaigns} tone="success" />
            <Stat label="Puntos canjeados (mock)" value={stats.totalRedeemed} tone="outline" />
          </div>

          <div
            role="tablist"
            aria-label="Secciones de recompensas"
            className="inline-flex w-full gap-2 rounded-lg bg-[#f4f7fb] p-1"
          >
            <TabButton id="tab-rules" selected={tab === 'rules'} onClick={() => setTab('rules')} controls="panel-rules">
              <Target className="size-4" aria-hidden />
              Reglas
            </TabButton>
            <TabButton id="tab-campaigns" selected={tab === 'campaigns'} onClick={() => setTab('campaigns')} controls="panel-campaigns">
              <Sparkles className="size-4" aria-hidden />
              Campañas
            </TabButton>
            <TabButton
              id="tab-redemptions"
              selected={tab === 'redemptions'}
              onClick={() => setTab('redemptions')}
              controls="panel-redemptions"
            >
              <Gift className="size-4" aria-hidden />
              Canjes
            </TabButton>
          </div>

          {tab === 'rules' ? (
            <div id="panel-rules" role="tabpanel" aria-labelledby="tab-rules" className="rounded-lg border border-border bg-white p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text">Reglas de acumulación</p>
                  <p className="text-xs text-text-muted">Define cuántos puntos se ganan por peso gastado y umbrales mínimos.</p>
                </div>
                <Dialog.Root open={openRuleModal} onOpenChange={setOpenRuleModal}>
                  <Dialog.Trigger asChild>
                    <Button size="sm">
                      <Plus className="size-4" aria-hidden />
                      Nueva regla
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-primary/40" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(560px,95vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
                      <div className="border-b border-border bg-primary-soft/40 px-5 py-4">
                        <Dialog.Title className="text-lg font-semibold text-text">Nueva regla de puntos</Dialog.Title>
                        <Dialog.Description className="mt-1 text-sm text-text-muted">
                          Se aplicará en la app al cumplirse el evento configurado.
                        </Dialog.Description>
                      </div>
                      <form onSubmit={createRule} className="space-y-3 px-5 py-4">
                        <label className="space-y-1.5 text-sm text-text">
                          <span className="font-medium">Nombre</span>
                          <input
                            value={ruleName}
                            onChange={(e) => setRuleName(e.target.value)}
                            required
                            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                          />
                        </label>
                        <label className="space-y-1.5 text-sm text-text">
                          <span className="font-medium">Evento</span>
                          <input
                            value={ruleEvent}
                            onChange={(e) => setRuleEvent(e.target.value)}
                            required
                            placeholder="Ej: Orden completada"
                            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                          />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1.5 text-sm text-text">
                            <span className="font-medium">Puntos por $1 COP</span>
                            <input
                              value={rulePoints}
                              onChange={(e) => setRulePoints(e.target.value)}
                              type="number"
                              min={1}
                              required
                              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                            />
                          </label>
                          <label className="space-y-1.5 text-sm text-text">
                            <span className="font-medium">Monto mínimo orden (COP)</span>
                            <input
                              value={ruleMin}
                              onChange={(e) => setRuleMin(e.target.value)}
                              type="number"
                              min={0}
                              required
                              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                            />
                          </label>
                        </div>
                        {ruleError ? <p className="text-sm font-medium text-destructive">{ruleError}</p> : null}
                        <div className="flex justify-end gap-2 border-t border-border pt-3">
                          <Dialog.Close asChild>
                            <Button type="button" variant="outline" size="sm">
                              Cancelar
                            </Button>
                          </Dialog.Close>
                          <Button type="submit" size="sm">
                            Guardar regla
                          </Button>
                        </div>
                      </form>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>

              <RulesTable rules={rules} onToggle={toggleRule} />
            </div>
          ) : null}

          {tab === 'campaigns' ? (
            <div id="panel-campaigns" role="tabpanel" aria-labelledby="tab-campaigns" className="rounded-lg border border-border bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-text">Campañas de puntos</p>
              <CampaignsTable campaigns={campaigns} onToggle={toggleCampaign} />
            </div>
          ) : null}

          {tab === 'redemptions' ? (
            <div id="panel-redemptions" role="tabpanel" aria-labelledby="tab-redemptions" className="rounded-lg border border-border bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-text">Historial de canjes</p>
              <RedemptionsTable redemptions={redemptions} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  )
}

function TabButton({
  id,
  selected,
  onClick,
  controls,
  children,
}: {
  id: string
  selected: boolean
  onClick: () => void
  controls: string
  children: ReactNode
}) {
  return (
    <button
      id={id}
      role="tab"
      type="button"
      aria-selected={selected}
      aria-controls={controls}
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
        selected ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-text-muted hover:bg-white/80 hover:text-primary'
      }`}
    >
      {children}
    </button>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'secondary' | 'success' | 'outline' }) {
  return (
    <article className="rounded-md border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text">{label}</p>
        <Badge variant={tone}>{value.toLocaleString('es-CO')}</Badge>
      </div>
    </article>
  )
}

function RulesTable({ rules, onToggle }: { rules: RewardRule[]; onToggle: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-primary-soft text-left text-primary">
          <tr>
            <th className="px-3 py-2 font-semibold">Regla</th>
            <th className="px-3 py-2 font-semibold">Evento</th>
            <th className="px-3 py-2 font-semibold">Pts / $1</th>
            <th className="px-3 py-2 font-semibold">Mín. orden</th>
            <th className="px-3 py-2 font-semibold">Estado</th>
            <th className="px-3 py-2 font-semibold">Acción</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-3 py-2 font-semibold text-text">{r.name}</td>
              <td className="px-3 py-2 text-text-muted">{r.event}</td>
              <td className="px-3 py-2 text-text">{r.pointsPerCop}</td>
              <td className="px-3 py-2 text-text">${r.minOrderCop.toLocaleString('es-CO')}</td>
              <td className="px-3 py-2">
                <Badge variant={r.active ? 'success' : 'outline'}>{r.active ? 'Activa' : 'Inactiva'}</Badge>
              </td>
              <td className="px-3 py-2">
                <Button size="sm" variant="outline" onClick={() => onToggle(r.id)}>
                  {r.active ? 'Desactivar' : 'Activar'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CampaignsTable({
  campaigns,
  onToggle,
}: {
  campaigns: RewardCampaign[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-primary-soft text-left text-primary">
          <tr>
            <th className="px-3 py-2 font-semibold">Campaña</th>
            <th className="px-3 py-2 font-semibold">Multiplicador</th>
            <th className="px-3 py-2 font-semibold">Vigencia</th>
            <th className="px-3 py-2 font-semibold">Estado</th>
            <th className="px-3 py-2 font-semibold">Acción</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-t border-border">
              <td className="px-3 py-2">
                <p className="font-semibold text-text">{c.name}</p>
                <p className="text-xs text-text-muted">{c.description}</p>
              </td>
              <td className="px-3 py-2 text-text">x{c.multiplier}</td>
              <td className="px-3 py-2 text-xs text-text-muted">
                {new Date(`${c.startsAt}T00:00:00`).toLocaleDateString('es-CO')} —{' '}
                {new Date(`${c.endsAt}T00:00:00`).toLocaleDateString('es-CO')}
              </td>
              <td className="px-3 py-2">
                <Badge variant={c.active ? 'success' : 'outline'}>{c.active ? 'Activa' : 'Inactiva'}</Badge>
              </td>
              <td className="px-3 py-2">
                <Button size="sm" variant="outline" onClick={() => onToggle(c.id)}>
                  {c.active ? 'Desactivar' : 'Activar'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RedemptionsTable({ redemptions }: { redemptions: RewardRedemption[] }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return redemptions
    return redemptions.filter((r) => `${r.customerName} ${r.rewardName}`.toLowerCase().includes(q))
  }, [query, redemptions])

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
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por cliente o recompensa"
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text focus:border-primary focus:outline-none"
          />
        </label>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-primary-soft text-left text-primary">
          <tr>
            <th className="px-3 py-2 font-semibold">Cliente</th>
            <th className="px-3 py-2 font-semibold">Recompensa</th>
            <th className="px-3 py-2 font-semibold">Puntos</th>
            <th className="px-3 py-2 font-semibold">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-3 py-2 font-semibold text-text">{r.customerName}</td>
              <td className="px-3 py-2 text-text">{r.rewardName}</td>
              <td className="px-3 py-2 text-text">{r.pointsUsed.toLocaleString('es-CO')}</td>
              <td className="px-3 py-2 text-xs text-text-muted">{new Date(r.at).toLocaleString('es-CO')}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
          <Button size="sm" variant="outline" disabled={visiblePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
