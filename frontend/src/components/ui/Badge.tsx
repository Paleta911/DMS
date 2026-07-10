import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FAST_TRANSITION, SCALE_FADE_VARIANTS } from "./Motion";
import { translateStatus } from "../../utils/labels";

// Status/pill badge primitives shared across lists, cards, and admin dashboards.
const variants: Record<string, string> = {
  DRAFT: "border border-slate-600 bg-slate-700 text-white shadow-sm",
  IN_REVIEW: "border border-amber-700 bg-amber-600 text-white shadow-sm",
  APPROVED: "border border-emerald-700 bg-emerald-600 text-white shadow-sm",
  OBSOLETE: "border border-rose-700 bg-rose-600 text-white shadow-sm",
  DB_UP: "border border-emerald-700 bg-emerald-600 text-white shadow-sm",
  DB_DOWN: "border border-rose-700 bg-rose-600 text-white shadow-sm",
  ES_UP: "border border-lime-700 bg-lime-600 text-white shadow-sm",
  ES_DOWN: "border border-rose-700 bg-rose-600 text-white shadow-sm",
  WARN: "border border-amber-700 bg-amber-600 text-white shadow-sm",
  default: "border border-slate-600 bg-slate-700 text-white shadow-sm",
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

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: string;
}) {
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
