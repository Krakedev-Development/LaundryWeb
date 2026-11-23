import { motion } from 'motion/react';

interface AnimatedCheckmarkProps {
  size?: number;
  className?: string;
}

/** Animated SVG checkmark with pathLength drawing transition. */
export function AnimatedCheckmark({
  size = 18,
  className = 'text-emerald-600',
}: AnimatedCheckmarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      />
      <motion.path
        d="M8 12.5l2.8 2.8 5.4-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.12, ease: 'easeOut' }}
      />
    </svg>
  );
}
