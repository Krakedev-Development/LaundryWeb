import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { Truck } from 'lucide-react';

export function OrdersListHeader() {
  const navigate = useNavigate();
  return (
    <PageHeader
      title="Solicitudes"
      subtitle="Gestiona el ciclo completo de vida de las solicitudes, desde la recogida hasta la entrega final."
      actions={
        <button
          type="button"
          onClick={() => navigate('/operations/dispatch')}
          className="px-4 py-2.5 text-xs font-semibold text-primary bg-white hover:bg-primary-soft border border-primary/30 rounded-xl transition-colors duration-150 flex items-center gap-2 cursor-pointer"
        >
          <Truck className="w-3.5 h-3.5" aria-hidden />
          <span>Consola de Despacho</span>
        </button>
      }
    />
  );
}
