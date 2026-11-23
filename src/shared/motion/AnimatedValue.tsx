import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { ease } from './tokens';

/** Keep exact formatted content accessible; animate only subsequent numeric updates. */
export function AnimatedValue({ value }: { value: string | number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const reduced = useReducedMotion();
  useEffect(() => {
    const old = previous.current;
    previous.current = value;
    if (old === value || reduced || !ref.current) return;
    const match = String(value).match(/^(\$?)(\d+(?:\.\d+)?)(%?)$/);
    const oldMatch = String(old).match(/^(\$?)(\d+(?:\.\d+)?)(%?)$/);
    if (
      !match ||
      !oldMatch ||
      match[1] !== oldMatch[1] ||
      match[3] !== oldMatch[3]
    )
      return;
    const digits = match[2].split('.')[1]?.length ?? 0;
    const el = ref.current;
    const controls = animate(Number(oldMatch[2]), Number(match[2]), {
      duration: 0.32,
      ease,
      onUpdate: (n) => {
        el.textContent = `${match[1]}${n.toFixed(digits)}${match[3]}`;
      },
      onComplete: () => {
        el.textContent = String(value);
      },
    });
    return () => {
      controls.stop();
      el.textContent = String(value);
    };
  }, [value, reduced]);
  return (
    <>
      <span className="sr-only">{value}</span>
      <span ref={ref} aria-hidden="true">
        {value}
      </span>
    </>
  );
}
