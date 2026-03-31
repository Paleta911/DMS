import { useNavigate } from 'react-router-dom';
import { ResponsiveActions } from '../layout/ResponsiveActions';
import { Button, type ButtonProps } from '../ui/Button';

type AdminActionItem = {
  key: string;
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: ButtonProps['variant'];
  disabled?: boolean;
};

type AdminActionListProps = {
  actions: AdminActionItem[];
  align?: 'start' | 'center' | 'end';
};

const alignClassName: Record<NonNullable<AdminActionListProps['align']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
};

export function AdminActionList({
  actions,
  align = 'start',
}: AdminActionListProps) {
  const navigate = useNavigate();

  return (
    <div className={alignClassName[align]}>
      <ResponsiveActions>
        {actions.map((action) => {
          return (
            <Button
              key={action.key}
              variant={action.variant ?? 'outline'}
              className="w-full sm:w-auto"
              onClick={() => {
                if (action.href) {
                  navigate(action.href);
                  return;
                }
                action.onClick?.();
              }}
              disabled={action.disabled}
            >
              {action.label}
            </Button>
          );
        })}
      </ResponsiveActions>
    </div>
  );
}
