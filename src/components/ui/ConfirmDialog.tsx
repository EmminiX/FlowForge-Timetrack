import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal, ModalFooter } from './Modal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size='sm'>
      <div className='flex gap-4'>
        {variant !== 'default' && (
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border ${
              variant === 'danger'
                ? 'border-destructive/35 bg-destructive/10'
                : 'border-accent/40 bg-accent/15'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${variant === 'danger' ? 'text-destructive' : 'text-accent'}`}
            />
          </div>
        )}
        <p className='text-muted-foreground'>{message}</p>
      </div>

      <ModalFooter>
        <Button variant='outline' onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'destructive' : 'primary'}
          onClick={() => onConfirm()}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
