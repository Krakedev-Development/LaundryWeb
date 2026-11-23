import { forwardRef, type ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';
import { transition, exitTransition } from './tokens';

const Page = forwardRef<HTMLDivElement, { children: ReactNode }>(function Page(
  { children },
  ref,
) {
  const present = useIsPresent();
  const reduced = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className="lw-page"
      inert={!present}
      aria-hidden={!present || undefined}
      initial={{ opacity: 0, y: reduced ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : -4, transition: exitTransition }}
      transition={reduced ? { duration: 0 } : transition}
    >
      {children}
    </motion.div>
  );
});

/** Retain the outgoing outlet, never key search parameters or background data updates. */
export function PageTransition() {
  const outlet = useOutlet();
  const { pathname } = useLocation();
  return (
    <div className="relative min-w-0">
      <AnimatePresence initial={false} mode="popLayout">
        <Page key={pathname}>{outlet}</Page>
      </AnimatePresence>
    </div>
  );
}
