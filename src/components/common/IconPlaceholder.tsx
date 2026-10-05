import { Camera, FileText, ScanFace, UserRound } from 'lucide-react';

const icons = {
  user: UserRound,
  document: FileText,
  selfie: ScanFace,
  evidence: Camera,
};

export function IconPlaceholder({
  kind,
  label,
  className = '',
  caption,
}: {
  kind: keyof typeof icons;
  label: string;
  className?: string;
  caption?: string;
}) {
  const Icon = icons[kind];
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={`flex shrink-0 flex-col items-center justify-center gap-3 border border-slate-200 bg-slate-100 text-[#0F4C81] ${className}`}
    >
      <Icon
        aria-hidden="true"
        className={caption ? 'size-10' : 'h-1/2 w-1/2'}
      />
      {caption && (
        <span className="text-center text-xs text-slate-600">{caption}</span>
      )}
    </div>
  );
}
