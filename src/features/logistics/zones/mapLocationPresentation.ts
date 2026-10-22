import {
  Building2,
  Truck,
  Package,
  ArrowUpRight,
  CircleAlert,
} from 'lucide-react';

export const locationKinds = {
  facility: { label: 'Sede', icon: Building2 },
  driver: { label: 'Chofer', icon: Truck },
  pickup: { label: 'Recogida', icon: Package },
  delivery: { label: 'Entrega', icon: ArrowUpRight },
  incident: { label: 'Incidencia', icon: CircleAlert },
};
