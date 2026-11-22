import {
  Building2,
  Check,
  Clock,
  MapPin,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import type { Driver } from '../../types';
import type { DriverCandidate } from '../../services/geo/DispatchService';

export function DriverCandidateCard({
  driver,
  candidate,
  recommended,
  selected,
  onSelect,
}: {
  driver: Driver;
  candidate: DriverCandidate;
  recommended: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`group block cursor-pointer rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${selected ? 'border-primary bg-primary-soft ring-1 ring-primary/20 shadow-sm' : 'border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50/70'}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-primary text-white' : 'bg-slate-100 text-primary'}`}
        >
          <UserRound className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-ink">
            {driver.name}
          </span>
          {recommended && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Recomendado
            </span>
          )}
        </div>
        <input
          type="radio"
          name="driver"
          aria-label={driver.name}
          checked={selected}
          onChange={onSelect}
          className="mt-1 size-4 shrink-0 cursor-pointer accent-primary"
        />
      </div>
      <div className="my-3 grid grid-cols-2 gap-2">
        <span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Clock className="size-4 text-primary" aria-hidden="true" />
          <span>
            <strong className="font-bold text-ink">
              {candidate.etaSeconds !== null
                ? `${Math.ceil(candidate.etaSeconds / 60)} min`
                : 'GPS pendiente'}
            </strong>
            <span className="block text-[10px] text-slate-500">
              {candidate.etaSeconds !== null
                ? 'Tiempo de llegada'
                : 'En sede operativa'}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <MapPin className="size-4 text-primary" aria-hidden="true" />
          <span>
            <strong className="font-bold text-ink">
              {candidate.distanceMeters !== null
                ? `${(candidate.distanceMeters / 1000).toFixed(1)} km`
                : 'En sede'}
            </strong>
            <span className="block text-[10px] text-slate-500">
              {candidate.distanceMeters !== null
                ? 'Distancia estimada'
                : 'En sede · GPS pendiente'}
            </span>
          </span>
        </span>
      </div>
      <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
        <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
        {driver.facilityName}
      </span>
      <span className="mt-2 flex items-start gap-1.5 border-t border-slate-200/70 pt-2 text-[11px] leading-relaxed text-slate-500">
        <Check
          className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
          aria-hidden="true"
        />
        {candidate.reasons.join(' · ')}
      </span>
    </label>
  );
}
