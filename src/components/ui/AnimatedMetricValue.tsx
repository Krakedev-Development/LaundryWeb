import NumberFlow from '@number-flow/react';

interface AnimatedMetricValueProps {
  value: string | number;
  className?: string;
}

const NUMERIC_STRING_RE = /^([^\d-]*)(-?\d+(?:\.\d+)?)(.*)$/;

/** Renders numeric metrics with vertical rolling NumberFlow transitions while keeping formatted strings intact. */
export function AnimatedMetricValue({
  value,
  className = '',
}: AnimatedMetricValueProps) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const decimals = Number.isInteger(value)
      ? 0
      : (String(value).split('.')[1]?.length ?? 0);
    return (
      <NumberFlow
        value={value}
        format={
          decimals > 0
            ? {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              }
            : undefined
        }
        className={`tabular-nums ${className}`}
      />
    );
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = NUMERIC_STRING_RE.exec(trimmed);
    if (match) {
      const [, prefix, rawNum, suffix] = match;
      const num = Number(rawNum);
      // Avoid mis-formatting compound expressions like ratios or clocks (e.g. "12/20", "14:00").
      const hasMoreNumbers = /\d/.test(suffix);
      if (Number.isFinite(num) && !hasMoreNumbers) {
        const decimals = rawNum.includes('.')
          ? (rawNum.split('.')[1]?.length ?? 0)
          : 0;
        return (
          <NumberFlow
            value={num}
            prefix={prefix || undefined}
            suffix={suffix || undefined}
            format={
              decimals > 0
                ? {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                  }
                : undefined
            }
            className={`tabular-nums ${className}`}
          />
        );
      }
    }
  }

  return <span className={`tabular-nums ${className}`}>{value}</span>;
}
