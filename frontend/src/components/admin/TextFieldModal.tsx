import { ResponsiveActions } from '../layout/ResponsiveActions';
import { Button, type ButtonProps } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

type TextFieldModalProps = {
  open: boolean;
  title: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmVariant?: ButtonProps['variant'];
  confirmDisabled?: boolean;
};

export function TextFieldModal({
  open,
  title,
  label,
  value,
  onChange,
  onClose,
  onConfirm,
  confirmLabel = 'Guardar',
  confirmVariant = 'primary',
  confirmDisabled,
}: TextFieldModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="grid gap-4">
        <Input label={label} value={value} onChange={(event) => onChange(event.target.value)} />
        <ResponsiveActions>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </ResponsiveActions>
      </div>
    </Modal>
  );
}
