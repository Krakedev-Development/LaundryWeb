import { operationalStage } from '../../services/fulfillment';
import {BusinessReportPanel} from './BusinessReportPanel';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Building2,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { orders, customers, incidents, facilities, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'OPERACION' | 'CLIENTES' | 'SLA' | 'INGRESOS' | 'PLANTA'>('OPERACION');
  const [dateRange, setDateRange] = useState('Ultimos 30 días');
  const [selectedFacility, setSelectedFacility] = useState('ALL');

  // KPIs
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => operationalStage(o) === 'CLOSED' || operationalStage(o) === 'DELIVERED').length;
  const totalRevenue = orders.reduce((acc, o) => acc + o.pricing.total, 0);
  const onTimeOrders = orders.filter((o) => o.slaStatus === 'ON_TIME').length;
  const slaRate = Math.round((onTimeOrders / (totalOrders || 1)) * 100);
  const openIncidents = incidents.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length;
  const pct = (part: number, whole: number) =>
    whole ? Math.round((part / whole) * 100) : 0;
  const successRate = pct(completedOrders, totalOrders);
  const averageTicket = totalOrders ? totalRevenue / totalOrders : 0;
  const incidentRate = pct(incidents.length, totalOrders);
  const slaCount = (risk: string) => orders.filter((o) => o.slaStatus === risk).length;

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
    delivered: orders.filter((o) => dayKey(o.delivery?.completedAt) === d.key).length,
  }));
  const seriesMax = Math.max(1, ...series.flatMap((d) => [d.orders, d.delivered]));
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
    .map((o) => (Date.parse(o.delivery.completedAt!) - Date.parse(o.createdAt)) / 3600000)
    .filter((h) => Number.isFinite(h) && h >= 0);
  const averageHours = durations.length
    ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
    : null;

  // Export handlers
  const handleExportCSV = () => {
    // Generate clean CSV content
    const headers = ['ID Solicitud', 'Cliente', 'Servicio', 'Monto Total', 'Estado', 'SLA', 'Fecha Creación', 'Modalidad', 'Modelo Precio', 'Peso', 'Unidad', 'Pago', 'Pendiente', 'Sede', 'Próxima Acción'];
    const rows = orders.map((o) => [
      o.id,
      `"${o.customerName}"`,
      `"${o.serviceType}"`,
      o.pricing.amountKnown===false?'Pendiente de pesaje':o.pricing.total.toFixed(2),
      operationalStage(o),
      o.slaStatus,
      o.createdAt,
      o.fulfillment?.mode??'HOME_HOME',o.pricing.pricingModel??'FIXED',o.pricing.measuredWeight??'',o.pricing.weightUnit??'',o.pricing.paymentStatus,o.pricing.amountDue??'Pendiente',o.facilityName,o.nextAction??'',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
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
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel (CSV)</span>
            </button>
            <button
              onClick={handlePrintPDF}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        }
      />

      {/* Common Filters Bar per spec #43 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 text-slate-600">
          <Calendar className="w-4 h-4 text-sky-800" />
          <span className="font-medium">Rango temporal:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
          >
            <option value="Hoy">Hoy</option>
            <option value="Esta semana">Esta semana</option>
            <option value="Ultimos 30 días">Últimos 30 días</option>
            <option value="Este trimestre">Este trimestre</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 text-slate-600">
          <Building2 className="w-4 h-4 text-sky-800" />
          <span className="font-medium">Sede:</span>
          <select
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">Todas las sedes operativas</option>
            {facilities.map((fac) => (
              <option key={fac.id} value={fac.id}>{fac.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary KPI Grid per spec #43 */}
      <BusinessReportPanel facilityId={selectedFacility}/>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Solicitudes"
          value={totalOrders}
          subtitle={dateRange}
          icon={<BarChart3 className="w-5 h-5 text-sky-700" />}
        />
        <MetricCard
          title="Completadas"
          value={completedOrders}
          subtitle={`Tasa éxito: ${successRate}%`}
          variant="success"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Cumplimiento SLA"
          value={`${slaRate}%`}
          subtitle="En tiempo prometido"
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Facturación Bruta"
          value={`$${totalRevenue.toFixed(2)}`}
          subtitle={`Ticket prom: ${averageTicket.toFixed(2)}`}
          variant="aqua"
          icon={<DollarSign className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Incidencias"
          value={openIncidents}
          subtitle={`Tasa de incidencias: ${incidentRate}%`}
          variant={openIncidents > 0 ? 'urgent' : 'default'}
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        />
      </div>

      {/* Tabs per spec #43 */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: 'OPERACION', label: 'Operación & Rutas' },
          { id: 'CLIENTES', label: 'Clientes & Billetera' },
          { id: 'SLA', label: 'Tiempos de SLA' },
          { id: 'INGRESOS', label: 'Ingresos Comerciales' },
          { id: 'PLANTA', label: 'Rendimiento en Planta' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#0F4C81] text-[#0F4C81]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Clean Visual Charts (SVG charts without clunky external deps) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Orders Volume Trend */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Evolución Diaria de Solicitudes y Entregas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Volumen procesado en los últimos 7 días</p>
            </div>
            <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-md font-bold">
              {weekDelta}
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-48 pt-6 flex items-end justify-between gap-3 px-2">
            {series.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1.5 h-36">
                  {/* Orders bar */}
                  <div
                    className="w-4 bg-[#0F4C81] rounded-t-sm transition-all"
                    style={{ height: `${(d.orders / seriesMax) * 100}%` }}
                    title={`Solicitudes: ${d.orders}`}
                  />
                  {/* Delivered bar */}
                  <div
                    className="w-4 bg-sky-400 rounded-t-sm transition-all"
                    style={{ height: `${(d.delivered / seriesMax) * 100}%` }}
                    title={`Entregadas: ${d.delivered}`}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{d.day}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100 text-xs">
            <span className="flex items-center gap-2 text-slate-700 font-medium">
              <span className="w-3 h-3 rounded-xs bg-[#0F4C81]" /> Solicitudes recibidas
            </span>
            <span className="flex items-center gap-2 text-slate-700 font-medium">
              <span className="w-3 h-3 rounded-xs bg-sky-400" /> Entregas completadas
            </span>
          </div>
        </div>

        {/* Chart 2: SLA & Quality Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Distribución de Riesgo Operativo (SLA)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Métricas de puntualidad en recogida y entrega</p>
            </div>
            <span className="text-xs font-mono font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
              {slaRate}% a tiempo
            </span>
          </div>

          <div className="space-y-3.5 pt-3">
            {[
              { label: 'A tiempo (Dentro de ventana óptima)', count: onTimeOrders, pct: slaRate, color: 'bg-emerald-500' },
              { label: 'Atención requerida', count: slaCount('ATTENTION'), pct: pct(slaCount('ATTENTION'), totalOrders), color: 'bg-amber-400' },
              { label: 'En riesgo inminente', count: slaCount('AT_RISK'), pct: pct(slaCount('AT_RISK'), totalOrders), color: 'bg-orange-500' },
              { label: 'Vencida / Fuera de ventana', count: slaCount('OVERDUE'), pct: pct(slaCount('OVERDUE'), totalOrders), color: 'bg-rose-500' },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">{row.label}</span>
                  <span className="font-mono text-slate-500 tabular-nums">
                    <strong>{row.count}</strong> ({row.pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${row.color}`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 pt-3 border-t border-slate-100">
            {averageHours
              ? <>El tiempo promedio entre la solicitud del cliente y la entrega final conforme es de <strong>{averageHours} horas</strong>.</>
              : 'Aún no hay entregas completadas para calcular el tiempo promedio.'}
          </p>
        </div>
      </div>
    </div>
  );
};
