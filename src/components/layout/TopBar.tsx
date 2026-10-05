import { operationalStage } from '../../services/fulfillment';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  UserCheck,
  RefreshCw,
  LogOut,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface TopBarProps {
  onOpenMobileSidebar: () => void;
  onOpenSearch: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileSidebar, onOpenSearch }) => {
  const { currentUser, switchRole, resetAll, orders, incidents, customers } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  // Current formatted date in Spanish
  const todayFormatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  // Notification items
  const urgentOrders = orders.filter((o) => o.priority === 'URGENT' && operationalStage(o) !== 'CLOSED');
  const openIncidents = incidents.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
  const pendingKyc = customers.filter((c) => c.kycStatus === 'PENDING');

  const totalNotifications = urgentOrders.length + openIncidents.length + (currentUser.role === 'ADMIN' ? pendingKyc.length : 0);

  return (
    <header className="h-16 bg-white border-b border-[#E5EAF0] sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile hamburger & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Button / Input trigger */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full max-w-md flex items-center justify-between px-3.5 py-2 text-xs text-slate-400 bg-[#F7F9FC] border border-[#E5EAF0] hover:border-slate-300 rounded-xl transition-all shadow-2xs group text-left"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-[#143F73] transition-colors" />
            <span className="truncate">Buscar solicitudes, clientes, choferes o direcciones...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-2xs shrink-0">
            ⌘ K
          </kbd>
        </button>
      </div>

      {/* Right: Date, Notifications, Quick Role Toggle, User Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Date Display */}
        <div className="hidden xl:flex flex-col text-right">
          <span className="text-xs font-semibold text-[#102A43]">{capitalizedDate}</span>
          <span className="text-[10px] text-[#6B7280]">Centro Operativo Principal</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                {totalNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-[#102A43] uppercase tracking-wider">
                  Notificaciones Operativas
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {totalNotifications} alertas activas
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {urgentOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      navigate(`/operations/orders/${o.id}`);
                      setShowNotifications(false);
                    }}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-2.5"
                  >
                    <Clock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-red-900">
                        Solicitud Urgente: {o.id}
                      </p>
                      <p className="text-[11px] text-slate-600 truncate">
                        {o.customerName} · SLA: {o.slaDeadline}
                      </p>
                    </div>
                  </div>
                ))}

                {openIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => {
                      navigate(`/operations/incidents`);
                      setShowNotifications(false);
                    }}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-amber-900">
                        Incidencia {inc.id}: {inc.type}
                      </p>
                      <p className="text-[11px] text-slate-600 truncate">
                        {inc.customerName} · Severidad {inc.severity}
                      </p>
                    </div>
                  </div>
                ))}

                {currentUser.role === 'ADMIN' &&
                  pendingKyc.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        navigate(`/customers/kyc`);
                        setShowNotifications(false);
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-2.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-blue-900">
                          KYC Pendiente de Aprobación
                        </p>
                        <p className="text-[11px] text-slate-600 truncate">
                          {c.fullName} ({c.documentType} {c.documentNumber})
                        </p>
                      </div>
                    </div>
                  ))}

                {totalNotifications === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No tienes alertas operativas pendientes en este momento.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full object-cover border border-[#E5EAF0]"
            />
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-[#102A43] leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-semibold text-[#143F73]">
                {currentUser.role === 'ADMIN' ? 'Administrador' : 'Supervisor'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-[#102A43]">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8EEF5] text-[#143F73]">
                  <UserCheck className="w-3 h-3 text-[#143F73]" />
                  Rol: {currentUser.role === 'ADMIN' ? 'Administrador' : 'Supervisor'}
                </div>
              </div>

              {/* Role Switcher for verification of permissions matrix #4 & #5 */}
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                  Cambiar Rol Operativo
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => {
                      switchRole('ADMIN');
                      setShowUserMenu(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      currentUser.role === 'ADMIN'
                        ? 'bg-[#143F73] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>Admin</span>
                    {currentUser.role === 'ADMIN' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      switchRole('SUPERVISOR');
                      setShowUserMenu(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      currentUser.role === 'SUPERVISOR'
                        ? 'bg-[#143F73] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>Supervisor</span>
                    {currentUser.role === 'SUPERVISOR' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Reset Demo Data Action */}
              <button
                onClick={() => {
                  resetAll();
                  setShowUserMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Restablecer datos demo</span>
              </button>

              {/* Logout */}
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/login');
                }}
                className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
