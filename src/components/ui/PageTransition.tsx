import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

interface PageTransitionProps {
  children: ReactNode;
  routeKey?: string;
  className?: string;
}

/** Smooth route transition wrapper using AnimatePresence mode="wait". */
export function PageTransition({
  children,
  routeKey,
  className = '',
}: PageTransitionProps) {
  const { pathname } = useLocation();
  const key = routeKey ?? pathname;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
