import { operationalStage } from '../../services/fulfillment';
import { BusinessReportPanel } from './BusinessReportPanel';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { AnimatedPillTabs } from '../../components/ui/AnimatedPillTabs';
import { StaggerContainer, StaggerItem } from '../../components/ui/StaggerList';
import { btnPrimary, btnSecondary } from '../../shared/ui/controls';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Building2,
} from 'lucide-react';

type ReportTab = 'OPERACION' | 'CLIENTES' | 'SLA' | 'INGRESOS' | 'PLANTA';

interface ChartTooltipPayloadItem {
  name?: string;
  value?: number;
  dataKey?: string;
}

function MinimalReportTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-md">
      <p className="mb-1.5 font-bold tracking-tight text-ink capitalize">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div
            key={entry.dataKey ?? entry.name}
            className="flex items-center justify-between gap-4 tabular-nums"
          >
            <span className="flex items-center gap-1.5 text-slate-600">
              <span
                className={`size-2 rounded-full ${
                  entry.dataKey === 'orders' ? 'bg-primary' : 'bg-sky-500'
                }`}
              />
              {entry.name}
            </span>
            <strong className="font-bold text-ink">{entry.value ?? 0}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export const ReportsPage: React.FC = () => {
  const { orders, incidents, facilities, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<ReportTab>('OPERACION');
  const [dateRange, setDateRange] = useState('Ultimos 30 días');
  const [selectedFacility, setSelectedFacility] = useState('ALL');

  // KPIs
  const totalOrders = orders.length;
  const completedOrders = orders.filter(
    (o) =>
      operationalStage(o) === 'CLOSED' ||
      operationalStage(o) === 'DELIVERED',
  ).length;
  const totalRevenue = orders.reduce((acc, o) => acc + o.pricing.total, 0);
  const onTimeOrders = orders.filter((o) => o.slaStatus === 'ON_TIME').length;
  const slaRate = Math.round((onTimeOrders / (totalOrders || 1)) * 100);
  const openIncidents = incidents.filter(
    (i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS',
  ).length;
  const pct = (part: number, whole: number) =>
    whole ? Math.round((part / whole) * 100) : 0;
  const successRate = pct(completedOrders, totalOrders);
  const averageTicket = totalOrders ? totalRevenue / totalOrders : 0;
  const incidentRate = pct(incidents.length, totalOrders);
  const slaCount = (risk: string) =>
    orders.filter((o) => o.slaStatus === risk).length;

  // Serie de los últimos 7 días: solicitudes creadas y entregas completadas por día.
  const dayKey = (iso?: string) => (iso ? iso.slice(0, 10) : '');
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86400000);
    return {
      key: date.toISOString().slice(0, 10),
      day: date.toLocaleDateString('es', { weekday: 'short', day: 'numeric' }),
    };
  });
  const series = days.map((d) => ({
    day: d.day,
    orders: orders.filter((o) => dayKey(o.createdAt) === d.key).length,
    delivered: orders.filter((o) => dayKey(o.delivery?.completedAt) === d.key)
      .length,
  }));
  const createdIn = (from: number, to: number) =>
    orders.filter((o) => {
      const t = Date.parse(o.createdAt);
      return t >= Date.now() - from * 86400000 && t < Date.now() - to * 86400000;
    }).length;
  const lastWeek = createdIn(7, 0);
  const previousWeek = createdIn(14, 7);
  const weekDelta = previousWeek
    ? `${lastWeek >= previousWeek ? '+' : ''}${Math.round(((lastWeek - previousWeek) / previousWeek) * 100)}% vs sem anterior`
    : 'Sin semana anterior para comparar';
  const durations = orders
    .filter((o) => o.delivery?.completedAt)
    .map(
      (o) =>
        (Date.parse(o.delivery.completedAt!) - Date.parse(o.createdAt)) /
        3600000,
    )
    .filter((h) => Number.isFinite(h) && h >= 0);
  const averageHours = durations.length
    ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
    : null;

  // Export handlers
  const handleExportCSV = () => {
    const headers = [
      'ID Solicitud',
      'Cliente',
      'Servicio',
      'Monto Total',
      'Estado',
      'SLA',
      'Fecha Creación',
      'Modalidad',
      'Modelo Precio',
      'Peso',
      'Unidad',
      'Pago',
      'Pendiente',
      'Sede',
      'Próxima Acción',
    ];
    const rows = orders.map((o) => [
      o.id,
      `"${o.customerName}"`,
      `"${o.serviceType}"`,
      o.pricing.amountKnown === false
        ? 'Pendiente de pesaje'
        : o.pricing.total.toFixed(2),
      operationalStage(o),
      o.slaStatus,
      o.createdAt,
      o.fulfillment?.mode ?? 'HOME_HOME',
      o.pricing.pricingModel ?? 'FIXED',
      o.pricing.measuredWeight ?? '',
      o.pricing.weightUnit ?? '',
      o.pricing.paymentStatus,
      o.pricing.amountDue ?? 'Pendiente',
      o.facilityName,
      o.nextAction ?? '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LaundryWeb_Reporte_${activeTab}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'Reporte Excel / CSV exportado',
      message: 'Se descargó el archivo con las solicitudes operacionales.',
    });
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reportería y Métricas de Rendimiento"
        subtitle="Analítica operacional, cumplimiento de tiempos de servicio, ingresos y auditoría de volumen."
        actions={
          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleExportCSV}
              className={btnSecondary}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel (CSV)</span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handlePrintPDF}
              className={btnPrimary}
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </motion.button>
          </div>
        }
      />

      {/* Common Filters Bar */}
      <div className="fintech-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 text-slate-600">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="font-semibold">Rango temporal:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3.5 py-2 bg-slate-50/80 border border-slate-200/90 rounded-xl font-semibold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          >
            <option value="Hoy">Hoy</option>
            <option value="Esta semana">Esta semana</option>
            <option value="Ultimos 30 días">Últimos 30 días</option>
            <option value="Este trimestre">Este trimestre</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 text-slate-600">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="font-semibold">Sede:</span>
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="px-3.5 py-2 bg-slate-50/80 border border-slate-200/90 rounded-xl font-semibold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          >
            <option value="ALL">Todas las sedes operativas</option>
            {facilities.map((fac) => (
              <option key={fac.id} value={fac.id}>
                {fac.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <BusinessReportPanel facilityId={selectedFacility} />
      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StaggerItem>
          <MetricCard
            title="Total Solicitudes"
            value={totalOrders}
            subtitle={dateRange}
            icon={<BarChart3 className="w-5 h-5 text-sky-700" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Completadas"
            value={completedOrders}
            subtitle={`Tasa éxito: ${successRate}%`}
            variant="success"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Cumplimiento SLA"
            value={`${slaRate}%`}
            subtitle="En tiempo prometido"
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Facturación Bruta"
            value={`$${totalRevenue.toFixed(2)}`}
            subtitle={`Ticket prom: ${averageTicket.toFixed(2)}`}
            variant="aqua"
            icon={<DollarSign className="w-5 h-5 text-sky-600" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Incidencias"
            value={openIncidents}
            subtitle={`Tasa de incidencias: ${incidentRate}%`}
            variant={openIncidents > 0 ? 'urgent' : 'default'}
            icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Tabs */}
      <div className="overflow-x-auto pb-1">
        <AnimatedPillTabs<ReportTab>
          layoutId="reports-active-tab"
          ariaLabel="Categorías de reportes"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { id: 'OPERACION', label: 'Operación & Rutas' },
            { id: 'CLIENTES', label: 'Clientes & Billetera' },
            { id: 'SLA', label: 'Tiempos de SLA' },
            { id: 'INGRESOS', label: 'Ingresos Comerciales' },
            { id: 'PLANTA', label: 'Rendimiento en Planta' },
          ]}
        />
      </div>

      {/* Fintech Recharts Visualization & SLA Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Orders Volume Trend (Recharts with 45deg diagonal pattern) */}
        <div className="fintech-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-ink">
                Evolución Diaria de Solicitudes y Entregas
              </h3>
              <p className="text-xs text-subtle mt-0.5">
                Volumen procesado en los últimos 7 días
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full font-bold tabular-nums">
              {weekDelta}
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                barGap={6}
              >
                <defs>
                  <pattern
                    id="deliveredDiagonalHatch"
                    patternUnits="userSpaceOnUse"
                    width="6"
                    height="6"
                    patternTransform="rotate(45)"
                  >
                    <rect width="6" height="6" fill="#E0F2FE" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="6"
                      stroke="#0284C7"
                      strokeWidth="2.4"
                      strokeOpacity="0.65"
                    />
                  </pattern>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="#E2E8F0"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <Tooltip
                  content={<MinimalReportTooltip />}
                  cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }}
                />
                <Bar
                  dataKey="orders"
                  name="Solicitudes recibidas"
                  fill="#0F4C81"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={22}
                />
                <Bar
                  dataKey="delivered"
                  name="Entregas completadas"
                  fill="url(#deliveredDiagonalHatch)"
                  stroke="#0284C7"
                  strokeWidth={1}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 text-xs">
            <span className="flex items-center gap-2 text-slate-700 font-medium">
              <span className="w-3 h-3 rounded-xs bg-primary" /> Solicitudes recibidas
            </span>
            <span className="flex items-center gap-2 text-slate-700 font-medium">
              <span
                className="w-3 h-3 rounded-xs border border-sky-600"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, #E0F2FE, #E0F2FE 2px, rgba(2, 132, 199, 0.55) 2px, rgba(2, 132, 199, 0.55) 4px)',
                }}
              />{' '}
              Entregas completadas
            </span>
          </div>
        </div>

        {/* Chart 2: SLA & Quality Distribution */}
        <div className="fintech-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold tracking-tight text-ink">
                Distribución de Riesgo Operativo (SLA)
              </h3>
              <p className="text-xs text-subtle mt-0.5">
                Métricas de puntualidad en recogida y entrega
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-primary bg-primary-soft px-3 py-1 rounded-full border border-primary/15 tabular-nums">
              {slaRate}% a tiempo
            </span>
          </div>

          <div className="space-y-4 pt-3">
            {[
              {
                label: 'A tiempo (Dentro de ventana óptima)',
                count: onTimeOrders,
                pct: slaRate,
                color: 'bg-emerald-500',
              },
              {
                label: 'Atención requerida',
                count: slaCount('ATTENTION'),
                pct: pct(slaCount('ATTENTION'), totalOrders),
                color: 'bg-amber-400',
              },
              {
                label: 'En riesgo inminente',
                count: slaCount('AT_RISK'),
                pct: pct(slaCount('AT_RISK'), totalOrders),
                color: 'bg-orange-500',
              },
              {
                label: 'Vencida / Fuera de ventana',
                count: slaCount('OVERDUE'),
                pct: pct(slaCount('OVERDUE'), totalOrders),
                color: 'bg-rose-500',
              },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">
                    {row.label}
                  </span>
                  <span className="font-mono text-slate-500 tabular-nums">
                    <strong className="text-ink">{row.count}</strong> ({row.pct}
                    %)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${row.pct}%` }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className={`h-full rounded-full ${row.color}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-subtle pt-3 border-t border-slate-100">
            {averageHours ? (
              <>
                El tiempo promedio entre la solicitud del cliente y la entrega
                final conforme es de <strong>{averageHours} horas</strong>.
              </>
            ) : (
              'Aún no hay entregas completadas para calcular el tiempo promedio.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
