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
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              variant === 'danger'
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-orange-100 dark:bg-orange-900/30'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${
                variant === 'danger'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-orange-600 dark:text-orange-400'
              }`}
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
