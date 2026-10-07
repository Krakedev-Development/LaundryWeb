import { operationalStage } from '../../services/fulfillment';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { Customer } from '../../types';
import {
  Users,
  Award,
  Wallet,
  Coins,
  Search,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Clock,
  AlertTriangle,
  X,
  Plus,
  ArrowUpRight,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { customers, orders, pointsLedger, adjustCustomerPoints, currentUser } = useApp();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState('ALL');

  // Customer 360 Drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'PROFILE' | 'ORDERS' | 'POINTS' | 'MEMBERSHIP'>('PROFILE');

  // Points adjustment state (Ledger rule #39)
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false);
  const [pointsDelta, setPointsDelta] = useState(100);
  const [pointsReason, setPointsReason] = useState('Bonificación por fidelidad o cortesía comercial');

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // KPIs
  const totalCustomers = customers.length;
  const premiumMembers = customers.filter((c) => c.membership !== 'ESTANDAR').length;
  const totalWalletBalance = customers.reduce((acc, c) => acc + c.walletBalance, 0);
  const totalPoints = customers.reduce((acc, c) => acc + c.points, 0);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (membershipFilter !== 'ALL' && c.membership !== membershipFilter) return false;
      if (kycFilter !== 'ALL' && c.kycStatus !== kycFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.documentNumber.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [customers, membershipFilter, kycFilter, searchQuery]);

  // Customer orders
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter((o) => o.customerId === selectedCustomer.id);
  }, [orders, selectedCustomer]);

  // Customer ledger entries
  const customerLedger = useMemo(() => {
    if (!selectedCustomer) return [];
    return pointsLedger.filter((l) => l.customerId === selectedCustomer.id);
  }, [pointsLedger, selectedCustomer]);

  const handleAdjustPointsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !pointsReason.trim()) return;
    adjustCustomerPoints(selectedCustomer.id, pointsDelta, pointsReason);
    setIsAdjustingPoints(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Directorio de Clientes"
        subtitle="Gestión de relaciones con clientes, cuentas corporativas, billetera y fidelización."
        actions={
          currentUser.role === 'ADMIN' ? (
            <button
              onClick={() => navigate('/customers/kyc')}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Validaciones KYC Pendientes</span>
            </button>
          ) : undefined
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Clientes Totales"
          value={totalCustomers}
          subtitle="Registrados en plataforma"
          icon={<Users className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Suscripción Activa"
          value={premiumMembers}
          subtitle="Planes Premium & Eco Wash"
          variant="aqua"
          icon={<Award className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Saldo en Billeteras"
          value={`$${totalWalletBalance.toFixed(2)}`}
          subtitle="Fondos prepagados"
          variant="success"
          icon={<Wallet className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Puntos Acumulados"
          value={totalPoints.toLocaleString()}
          subtitle="En programa de lealtad"
          icon={<Coins className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Filter Bar & Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, documento, correo o teléfono..."
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-3 text-xs w-full sm:w-auto">
            <select
              value={membershipFilter}
              onChange={(e) => setMembershipFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Todas las Membresías</option>
              <option value="ESTANDAR">Estándar</option>
              <option value="PREMIUM_FRESH">Premium Fresh</option>
              <option value="ECO_WASH">Eco Wash Club</option>
              <option value="CORPORATIVO">Corporativo</option>
            </select>

            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">Todos los Estados KYC</option>
              <option value="APPROVED">KYC Aprobado</option>
              <option value="PENDING">KYC Pendiente</option>
              <option value="REJECTED">KYC Rechazado</option>
            </select>
          </div>
        </div>

        {/* Customers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Documento</th>
                <th className="py-3.5 px-4">Contacto</th>
                <th className="py-3.5 px-4">Zona / Dirección</th>
                <th className="py-3.5 px-4">Membresía</th>
                <th className="py-3.5 px-4">KYC</th>
                <th className="py-3.5 px-4 text-right">Billetera / Puntos</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((cust) => (
                <tr
                  key={cust.id}
                  onClick={() => setSelectedCustomerId(cust.id)}
                  className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-slate-900 block">{cust.fullName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{cust.id}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {cust.documentType} {cust.documentNumber}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="text-slate-800 font-medium">{cust.phone}</div>
                    <div className="text-[11px] text-slate-400">{cust.email}</div>
                  </td>
                  <td className="py-3.5 px-4 truncate max-w-[170px] text-slate-700">
                    {cust.addresses[0]?.neighborhood || 'Sin dirección'}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-semibold text-[11px] text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200/80">
                      {cust.membership.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                        cust.kycStatus === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : cust.kycStatus === 'PENDING'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {cust.kycStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                    <span className="font-bold text-slate-900">${cust.walletBalance.toFixed(2)}</span>
                    <span className="block text-[11px] text-amber-600">{cust.points} pts</span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerId(cust.id);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Ver 360°
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Drawer per spec #34 */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-sky-700 text-white font-bold flex items-center justify-center text-base shadow-xs">
                  {selectedCustomer.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedCustomer.fullName}
                    </h2>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        selectedCustomer.kycStatus === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                          : selectedCustomer.kycStatus === 'PENDING'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200/70'
                          : 'bg-rose-50 text-rose-800 border border-rose-200/70'
                      }`}
                    >
                      KYC {selectedCustomer.kycStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedCustomer.id} · {selectedCustomer.documentType} {selectedCustomer.documentNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Balances Grid */}
            <div className="p-4 grid grid-cols-3 gap-3 border-b border-slate-100 bg-white text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Membresía</span>
                <span className="font-bold text-[#0F4C81]">
                  {selectedCustomer.membership.replace('_', ' ')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Billetera</span>
                <span className="font-bold text-emerald-800 font-mono tabular-nums">
                  ${selectedCustomer.walletBalance.toFixed(2)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Puntos Lealtad</span>
                <span className="font-bold text-amber-700 font-mono tabular-nums">
                  {selectedCustomer.points} pts
                </span>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="px-5 border-b border-slate-200 flex items-center gap-4 text-xs font-semibold">
              <button
                onClick={() => setDrawerTab('PROFILE')}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'PROFILE'
                    ? 'border-[#0F4C81] text-[#0F4C81]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Perfil & Direcciones
              </button>
              <button
                onClick={() => setDrawerTab('ORDERS')}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'ORDERS'
                    ? 'border-[#0F4C81] text-[#0F4C81]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Solicitudes ({customerOrders.length})
              </button>
              <button
                onClick={() => setDrawerTab('POINTS')}
                className={`py-3 border-b-2 transition-colors cursor-pointer ${
                  drawerTab === 'POINTS'
                    ? 'border-[#0F4C81] text-[#0F4C81]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Ledger de Puntos
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {drawerTab === 'PROFILE' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="font-bold text-slate-900 block">Datos de Contacto</span>
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <p className="flex items-center gap-2 text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedCustomer.phone}
                      </p>
                      <p className="flex items-center gap-2 text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedCustomer.email}
                      </p>
                      <p className="text-[11px] text-slate-500">Cliente desde: {selectedCustomer.createdAt}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-bold text-slate-900 block">Dirección Principal Registrada</span>
                    {selectedCustomer.addresses.map((addr, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                        <p className="font-bold text-slate-800">
                          {addr.street} #{addr.number} {addr.complement && `(${addr.complement})`}
                        </p>
                        <p className="text-slate-600 text-[11px]">
                          {addr.neighborhood}, {addr.city}
                        </p>
                        {addr.reference && (
                          <p className="text-slate-400 text-[11px] italic mt-0.5">Ref: {addr.reference}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedCustomer.notes && (
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">Notas del Operador</span>
                      <p className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-slate-700">
                        {selectedCustomer.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'ORDERS' && (
                <div className="space-y-2">
                  {customerOrders.length === 0 ? (
                    <p className="text-slate-400 italic py-6 text-center">Sin órdenes registradas para este cliente.</p>
                  ) : (
                    customerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => navigate(`/operations/orders/${ord.id}`)}
                        className="p-3 rounded-xl border border-slate-200 hover:border-[#143F73] transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#143F73] font-mono">{ord.id}</span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                              {operationalStage(ord)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {ord.serviceType} · {ord.pricing.amountKnown===false?'Pendiente de pesaje':`${ord.pricing.total.toFixed(2)}`}
                          </p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))
                  )}
                </div>
              )}

              {drawerTab === 'POINTS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Historial Inmutable de Puntos (Ledger)</span>
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => setIsAdjustingPoints(true)}
                        className="text-[11px] font-bold text-[#143F73] bg-[#E8EEF5] hover:bg-[#d8e3ef] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Ajuste Manual
                      </button>
                    )}
                  </div>

                  {isAdjustingPoints && (
                    <form onSubmit={handleAdjustPointsSubmit} className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2">
                      <span className="font-bold text-[#143F73] block">Ajuste Administrativo de Puntos (Regla #39)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-600 block mb-0.5">Puntos (+ / -)</label>
                          <input
                            type="number"
                            value={pointsDelta}
                            onChange={(e) => setPointsDelta(parseInt(e.target.value) || 0)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600 block mb-0.5">Motivo obligatorio *</label>
                          <input
                            type="text"
                            required
                            value={pointsReason}
                            onChange={(e) => setPointsReason(e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAdjustingPoints(false)}
                          className="px-2 py-1 text-slate-600 text-[11px]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-[#0F4C81] hover:bg-[#0A3660] text-white font-bold rounded-lg text-xs cursor-pointer"
                        >
                          Guardar Ajuste
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {customerLedger.length === 0 ? (
                      <p className="text-slate-400 italic p-4 text-center">Sin movimientos de puntos registrados.</p>
                    ) : (
                      customerLedger.map((led) => (
                        <div key={led.id} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-800">{led.reason}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {led.date} {led.adminUser && `· Por: ${led.adminUser}`}
                            </p>
                          </div>
                          <span
                            className={`font-mono font-bold text-sm tabular-nums ${
                              led.points > 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {led.points > 0 ? `+${led.points}` : led.points}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
