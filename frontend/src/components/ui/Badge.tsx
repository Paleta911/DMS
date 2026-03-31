import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FAST_TRANSITION, SCALE_FADE_VARIANTS } from './Motion';
import { translateStatus } from '../../utils/labels';

const variants: Record<string, string> = {
  DRAFT: 'bg-brand-muted/30 text-brand-text',
  IN_REVIEW: 'bg-bsm-stTropaz/15 text-brand-text',
  APPROVED: 'bg-bsm-hippieGreen/20 text-brand-text',
  OBSOLETE: 'bg-bsm-ming/20 text-brand-text',
  DB_UP: 'bg-bsm-hippieGreen/20 text-brand-text',
  DB_DOWN: 'bg-brand-muted/35 text-brand-text',
  ES_UP: 'bg-bsm-citron/25 text-brand-text',
  ES_DOWN: 'bg-brand-muted/35 text-brand-text',
  WARN: 'bg-bsm-sanMarino/15 text-brand-text',
  default: 'bg-brand-muted/30 text-brand-text',
};

export function StatusBadge({ status }: { status: string }) {
  const style = variants[status] ?? variants.default;
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      className={`tag ${style}`}
      initial={reduceMotion ? false : SCALE_FADE_VARIANTS.hidden}
      animate={SCALE_FADE_VARIANTS.show}
      transition={FAST_TRANSITION}
    >
      {translateStatus(status)}
    </motion.span>
  );
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: string }) {
  const style = variants[tone] ?? variants.default;
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      className={`tag ${style}`}
      initial={reduceMotion ? false : SCALE_FADE_VARIANTS.hidden}
      animate={SCALE_FADE_VARIANTS.show}
      transition={FAST_TRANSITION}
    >
      {children}
    </motion.span>
  );
}
