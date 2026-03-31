import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

const variants = {
  info: {
    icon: Info,
    className: 'border-brand-border bg-brand-bg text-brand-text',
  },
  success: {
    icon: CheckCircle2,
    className: 'border-brand-border bg-brand-accent/10 text-brand-text',
  },
  warning: {
    icon: TriangleAlert,
    className: 'border-brand-border bg-ember/10 text-brand-text',
  },
  error: {
    icon: AlertCircle,
    className: 'border-ember/30 bg-ember/10 text-brand-text',
  },
} as const;

export function NoticeBanner({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: keyof typeof variants;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const Icon = variants[variant].icon;
  const liveRole = variant === 'error' || variant === 'warning' ? 'alert' : 'status';
  const liveMode = variant === 'error' || variant === 'warning' ? 'assertive' : 'polite';

  return (
    <div
      role={liveRole}
      aria-live={liveMode}
      className={[
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        variants[variant].className,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <div className="font-semibold text-ink">{title}</div> : null}
        <div className={title ? 'mt-1 text-brand-textMuted' : 'text-brand-textMuted'}>
          {children}
        </div>
      </div>
    </div>
  );
}
