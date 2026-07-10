import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Shared animation primitives and wrappers to keep motion behavior consistent across the UI.
export const EASE = [0.22, 1, 0.36, 1] as const;
export const TRANSITION = { duration: 0.35, ease: EASE } as const;
export const FAST_TRANSITION = { duration: 0.25, ease: EASE } as const;
export const FORM_TRANSITION = { duration: 0.3, ease: EASE } as const;

export const PAGE_VARIANTS = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
} as const;

export const FADE_UP_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
} as const;

export const SCALE_FADE_VARIANTS = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 },
} as const;

export const buildStaggerContainer = (delay = 0.05, stagger = 0.06) => ({
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: stagger,
      delayChildren: delay,
    },
  },
});

export const buildStaggerItem = (y = 8) => ({
  hidden: { opacity: 0, y },
  show: { opacity: 1, y: 0 },
});

export const listItemTransition = (
  index: number,
  base = 0.02,
  max = 0.2,
  duration = 0.25,
) => ({
  duration,
  ease: EASE,
  delay: Math.min(index * base, max),
});

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  // Respect reduced-motion preference with static fade-only rendering.
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return (
      <motion.div
        className={className}
        initial={false}
        animate={{ opacity: 1 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={PAGE_VARIANTS.initial}
      animate={PAGE_VARIANTS.animate}
      exit={PAGE_VARIANTS.exit}
      transition={TRANSITION}
    >
      {children}
    </motion.div>
  );
}

export function FadeInSection({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  // Lightweight section reveal for cards/sections while honoring reduced-motion users.
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return (
      <motion.div
        className={className}
        initial={false}
        animate={{ opacity: 1 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={FADE_UP_VARIANTS.hidden}
      animate={FADE_UP_VARIANTS.show}
      transition={{ ...TRANSITION, delay }}
    >
      {children}
    </motion.div>
  );
}
