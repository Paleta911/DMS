import type { HTMLMotionProps } from "framer-motion";
import { motion, useReducedMotion } from "framer-motion";

// Reusable motion-enabled button with semantic variants and reduced-motion support.
const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40 disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-brand-primary text-white hover:bg-brand-primary2",
  secondary: "border border-brand-border text-brand-primary hover:bg-brand-bg",
  outline: "border border-brand-border text-brand-primary hover:bg-brand-bg",
  ghost: "text-brand-primary hover:bg-brand-bg",
  danger: "bg-ember text-white hover:bg-ember/90",
};

export type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: keyof typeof variants;
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const reduceMotion = useReducedMotion();
  // Disable hover/tap scale animation when motion should be reduced.
  const allowMotion = !reduceMotion && !props.disabled;

  return (
    <motion.button
      className={[base, variants[variant], className].filter(Boolean).join(" ")}
      whileHover={allowMotion ? { scale: 1.08 } : undefined}
      whileTap={allowMotion ? { scale: 0.98 } : undefined}
      {...props}
    />
  );
}
