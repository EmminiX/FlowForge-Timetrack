import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div className='fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm'>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: { id: string; message: string; action?: { label: string; onClick: () => void }; duration?: number };
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration || 10000);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <div className='bg-foreground text-background px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom duration-200'>
      <span className='text-sm flex-1'>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            onDismiss();
          }}
          className='text-sm font-medium text-primary-foreground bg-primary px-3 py-1 rounded-md hover:opacity-90 transition-opacity shrink-0'
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={onDismiss} className='opacity-60 hover:opacity-100 shrink-0' aria-label='Dismiss'>
        <X className='w-4 h-4' />
      </button>
    </div>
  );
}
