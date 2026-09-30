import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Search, X, Package, User, Truck, AlertTriangle, ChevronRight } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { orders, customers, drivers, incidents } = useApp();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQ = query.trim().toLowerCase();

  const matchedOrders = cleanQ
    ? orders.filter(
        (o) =>
          o.id.toLowerCase().includes(cleanQ) ||
          o.trackingNumber.toLowerCase().includes(cleanQ) ||
          o.customerName.toLowerCase().includes(cleanQ) ||
          o.customerAddress.street.toLowerCase().includes(cleanQ)
      ).slice(0, 4)
    : [];

  const matchedCustomers = cleanQ
    ? customers.filter(
        (c) =>
          c.fullName.toLowerCase().includes(cleanQ) ||
          c.documentNumber.includes(cleanQ) ||
          c.email.toLowerCase().includes(cleanQ) ||
          c.phone.includes(cleanQ)
      ).slice(0, 4)
    : [];

  const matchedDrivers = cleanQ
    ? drivers.filter(
        (d) =>
          d.name.toLowerCase().includes(cleanQ) ||
          d.vehiclePlate.toLowerCase().includes(cleanQ) ||
          d.phone.includes(cleanQ)
      ).slice(0, 4)
    : [];

  const matchedIncidents = cleanQ
    ? incidents.filter(
        (i) =>
          i.id.toLowerCase().includes(cleanQ) ||
          i.orderId.toLowerCase().includes(cleanQ) ||
          i.customerName.toLowerCase().includes(cleanQ) ||
          i.description.toLowerCase().includes(cleanQ)
      ).slice(0, 4)
    : [];

  const hasResults =
    matchedOrders.length > 0 ||
    matchedCustomers.length > 0 ||
    matchedDrivers.length > 0 ||
    matchedIncidents.length > 0;

  const handleSelect = (url: string) => {
    navigate(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E5EAF0] bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por SOL-4587, cliente María Torres, INC-0187, chofer Carlos..."
            className="w-full text-sm bg-transparent border-none focus:outline-none text-[#102A43] placeholder:text-slate-400 font-sans"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {!query && (
            <div className="py-8 text-center text-xs text-slate-400">
              Escribe el número de solicitud, nombre de cliente, chofer o código de incidencia...
            </div>
          )}

          {query && !hasResults && (
            <div className="py-8 text-center text-xs text-slate-500">
              No se encontraron coincidencias para &quot;<strong>{query}</strong>&quot;
            </div>
          )}

          {/* Orders */}
          {matchedOrders.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#143F73]" /> Solicitudes ({matchedOrders.length})
              </p>
              <div className="space-y-1">
                {matchedOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => handleSelect(`/operations/orders/${o.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#E8EEF5]/40 cursor-pointer transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#143F73] font-mono">{o.id}</span>
                        <span className="text-xs text-[#102A43] font-medium">{o.customerName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {o.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-md">
                        {o.serviceType} · {o.customerAddress.street}, {o.customerAddress.neighborhood}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#143F73] transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {matchedCustomers.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" /> Clientes ({matchedCustomers.length})
              </p>
              <div className="space-y-1">
                {matchedCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(`/customers`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{c.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {c.documentType} {c.documentNumber}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded font-semibold">
                          KYC {c.kycStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {c.email} · {c.phone}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drivers */}
          {matchedDrivers.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-teal-600" /> Choferes ({matchedDrivers.length})
              </p>
              <div className="space-y-1">
                {matchedDrivers.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleSelect(`/logistics/drivers`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{d.name}</span>
                        <span className="text-xs font-mono text-slate-500">[{d.vehiclePlate}]</span>
                        <span className="text-[10px] text-teal-700 font-semibold">{d.status}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {d.vehicleType} · {d.zoneName} · {d.facilityName}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incidents */}
          {matchedIncidents.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Incidencias ({matchedIncidents.length})
              </p>
              <div className="space-y-1">
                {matchedIncidents.map((i) => (
                  <div
                    key={i.id}
                    onClick={() => handleSelect(`/operations/incidents`)}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-rose-50/50 cursor-pointer transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-rose-700 font-mono">{i.id}</span>
                        <span className="text-xs font-medium text-slate-900">
                          Orden {i.orderId} - {i.type}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-bold">
                          {i.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-md">
                        {i.description}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-700 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#E5EAF0] bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Presiona <strong>Enter</strong> para seleccionar</span>
          <span>LaundryWeb Search v1.0</span>
        </div>
      </div>
    </div>
  );
};
