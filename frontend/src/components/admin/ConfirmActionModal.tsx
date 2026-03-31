import type { ReactNode } from 'react';
import { ResponsiveActions } from '../layout/ResponsiveActions';
import { Button, type ButtonProps } from '../ui/Button';
import { Modal } from '../ui/Modal';

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmVariant?: ButtonProps['variant'];
  confirmDisabled?: boolean;
  cancelLabel?: string;
};

export function ConfirmActionModal({
  open,
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel,
  confirmVariant = 'danger',
  confirmDisabled,
  cancelLabel = 'Cancelar',
}: ConfirmActionModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="grid gap-4">
        <div className="text-sm text-brand-text">{description}</div>
        <ResponsiveActions>
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </ResponsiveActions>
      </div>
    </Modal>
  );
}
