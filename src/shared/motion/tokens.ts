import type { Transition } from 'framer-motion';

/** Shared timing: navigation, selections and overlays speak the same language. */
export const ease = [0.22, 1, 0.36, 1] as const;
export const transition: Transition = { duration: 0.24, ease };
export const exitTransition: Transition = { duration: 0.14, ease };
export const selectionTransition: Transition = {
  type: 'spring',
  stiffness: 440,
  damping: 36,
};
export const overlayVariants = {
  hidden: { opacity: 0, scale: 0.98, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.985, y: 4, transition: exitTransition },
};
