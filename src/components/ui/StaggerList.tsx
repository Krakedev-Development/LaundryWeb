import type { ReactNode } from 'react';
import { motion } from 'motion/react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

interface StaggerProps {
  children: ReactNode;
  className?: string;
}

/** Staggered grid/list container that animates children progressively. */
export function StaggerContainer({ children, className = '' }: StaggerProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Individual child inside a StaggerContainer. */
export function StaggerItem({ children, className = '' }: StaggerProps) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/** Valid HTML tbody stagger container for tables. */
export function StaggerTableBody({ children, className = '' }: StaggerProps) {
  return (
    <motion.tbody
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.tbody>
  );
}

/** Valid HTML tr stagger item for tables. */
export function StaggerTableRow({
  children,
  className = '',
  onClick,
}: StaggerProps & { onClick?: () => void }) {
  return (
    <motion.tr variants={itemVariants} className={className} onClick={onClick}>
      {children}
    </motion.tr>
  );
}
