import * as Dialog from '@radix-ui/react-dialog'
import { CalendarDays, CheckCircle2, Search, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFleetSnapshot } from '@/hooks/useFleetSnapshot'
import type { CustomerProfile } from '@/types'

const PAGE_SIZE = 5

export function KycValidationView() {
  const { data } = useFleetSnapshot()
  const [overrides, setOverrides] = useState<Record<string, CustomerProfile['kycStatus']>>({})
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const customers = useMemo(
    () => (data?.customers ?? []).map((c) => ({ ...c, kycStatus: overrides[c.id] ?? c.kycStatus })),
    [data?.customers, overrides],
  )
  const pending = useMemo(
    () =>
      customers.filter((c) => {
        if (c.kycStatus !== 'pending') return false
        const byQuery =
          query.trim() === '' ||
          `${c.fullName} ${c.email} ${c.phone}`.toLowerCase().includes(query.toLowerCase())
        const time = new Date(c.registeredAt).getTime()
        const byFrom = fromDate ? time >= new Date(`${fromDate}T00:00:00`).getTime() : true
        const byTo = toDate ? time <= new Date(`${toDate}T23:59:59`).getTime() : true
        return byQuery && byFrom && byTo
      }),
    [customers, fromDate, query, toDate],
  )

  const totalPages = Math.max(1, Math.ceil(pending.length / PAGE_SIZE))
  const visiblePage = Math.min(page, totalPages)
  const start = (visiblePage - 1) * PAGE_SIZE
  const rows = pending.slice(start, start + PAGE_SIZE)
  const selected = pending.find((c) => c.id === selectedId) ?? null

  function setDecision(id: string, status: CustomerProfile['kycStatus']) {
    setOverrides((prev) => ({ ...prev, [id]: status }))
    setSelectedId(null)
  }

  return (
    <section className="space-y-4">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-text">Validación KYC</CardTitle>
          <CardDescription className="text-text-muted">
            Revisión documental y decisión de alta: aprobar o rechazar registro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_auto_auto_1fr]">
            <label className="relative sm:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar pendiente por cliente, email o teléfono"
                className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </label>
            <DateInput label="Desde" value={fromDate} onChange={setFromDate} />
            <DateInput label="Hasta" value={toDate} onChange={setToDate} />
            <div className="flex items-center sm:col-span-2 sm:justify-end xl:col-span-1">
              <Badge variant={pending.length ? 'warning' : 'success'}>
                {pending.length} pendientes por validar
              </Badge>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="bg-primary-soft text-left text-primary">
                <tr>
                  <th className="px-3 py-2 font-semibold">Cliente</th>
                  <th className="px-3 py-2 font-semibold">Contacto</th>
                  <th className="px-3 py-2 font-semibold">Fecha registro</th>
                  <th className="px-3 py-2 font-semibold">Acción KYC</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-text">{c.fullName}</td>
                    <td className="px-3 py-2 text-xs text-text-muted">
                      {c.email}
                      <br />
                      {c.phone}
                    </td>
                    <td className="px-3 py-2 text-xs text-text-muted">
                      {new Date(c.registeredAt).toLocaleString('es-CO')}
                    </td>
                    <td className="px-3 py-2">
                      <Button size="sm" onClick={() => setSelectedId(c.id)}>
                        Revisar registro
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {rows.length === 0 ? (
              <div className="border-t border-border px-3 py-4 text-sm text-text-muted">
                No hay registros pendientes con esos filtros.
              </div>
            ) : null}
            <div className="flex flex-col gap-2 border-t border-border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-text-muted">
                Mostrando {rows.length === 0 ? 0 : start + 1}-{start + rows.length} de {pending.length}
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
        </CardContent>
      </Card>

      <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-primary/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(980px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            {!selected ? null : (
              <div className="flex flex-1 flex-col overflow-y-auto p-3 sm:p-4">
                <Dialog.Title className="text-lg font-semibold text-text">
                  Validar identidad de {selected.fullName}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-text-muted">
                  Compara cédula y selfie antes de aprobar el registro.
                </Dialog.Description>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Cédula</p>
                    <img
                      src={selected.cedulaPhotoUrl}
                      alt={`Cédula de ${selected.fullName}`}
                      className="h-56 w-full rounded-md border border-border object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Selfie</p>
                    <img
                      src={selected.selfiePhotoUrl}
                      alt={`Selfie de ${selected.fullName}`}
                      className="h-56 w-full rounded-md border border-border object-cover"
                    />
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-border bg-primary-soft/60 p-3 text-sm text-text">
                  <p><strong>Teléfono:</strong> {selected.phone}</p>
                  <p><strong>Email:</strong> {selected.email}</p>
                </div>
                <div className="mt-4 flex flex-col justify-end gap-2 sm:flex-row">
                  <Dialog.Close asChild>
                    <Button variant="outline" className="w-full sm:w-auto">Cancelar</Button>
                  </Dialog.Close>
                  <Button variant="destructive" className="w-full sm:w-auto" onClick={() => setDecision(selected.id, 'rejected')}>
                    <XCircle className="size-4" aria-hidden />
                    Rechazar
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={() => setDecision(selected.id, 'approved')}>
                    <CheckCircle2 className="size-4" aria-hidden />
                    Aprobar
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="relative block w-full">
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text focus:border-primary focus:outline-none"
      />
    </label>
  )
}
