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
      className={`group block cursor-pointer rounded-2xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-[#0F4C81]/30 ${selected ? 'border-[#0F4C81] bg-[#F0F6FC] ring-1 ring-[#0F4C81]/20' : 'border-slate-200 bg-white hover:border-[#0F4C81]/40 hover:bg-slate-50'}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-[#0F4C81] text-white' : 'bg-slate-100 text-[#0F4C81]'}`}
        >
          <UserRound className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#102A43]">
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
          className="mt-1 size-4 shrink-0 cursor-pointer accent-[#0F4C81]"
        />
      </div>
      <div className="my-3 grid grid-cols-2 gap-2">
        <span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Clock className="size-4 text-[#0F4C81]" aria-hidden="true" />
          <span>
            <strong className="font-bold text-[#102A43]">
              {Math.ceil(candidate.etaSeconds! / 60)} min
            </strong>
            <span className="block text-[10px] text-slate-500">
              Tiempo de llegada
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <MapPin className="size-4 text-[#0F4C81]" aria-hidden="true" />
          <span>
            <strong className="font-bold text-[#102A43]">
              {(candidate.distanceMeters! / 1000).toFixed(1)} km
            </strong>
            <span className="block text-[10px] text-slate-500">
              Distancia estimada
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
