import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Truck } from 'lucide-react';
export function OrdersListHeader() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        title="Solicitudes"
        subtitle="Gestiona el ciclo completo de vida de las solicitudes, desde la recogida hasta la entrega final."
        actions={
          <button
            onClick={() => navigate('/operations/dispatch')}
            className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Consola de Despacho</span>
          </button>
        }
      />
    </>
  );
}
