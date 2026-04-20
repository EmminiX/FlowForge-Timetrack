import { useEffect, useRef, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const modalTitleId = useId();
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Save previously focused element and restore on close
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
      previouslyFocusedRef.current = null;
    }
  }, [isOpen]);

  // Focus trap: Tab cycles within modal
  useEffect(() => {
    if (!isOpen || !contentRef.current) return;

    // Initial focus
    contentRef.current.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !contentRef.current) return;

      const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) return;

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200'
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        role='dialog'
        aria-modal='true'
        aria-labelledby={title ? modalTitleId : undefined}
        className={clsx(
          'w-full mx-4 bg-background rounded-xl shadow-xl border border-border',
          'animate-in fade-in zoom-in-95 duration-200',
          'max-h-[90vh] flex flex-col',
          sizes[size],
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className='flex items-center justify-between px-6 py-4 border-b border-border shrink-0'>
            {title && <h2 id={modalTitleId} className='text-lg font-semibold text-foreground'>{title}</h2>}
            {showCloseButton && (
              <Button
                variant='ghost'
                size='sm'
                onClick={onClose}
                className='ml-auto -mr-2'
                aria-label='Close'
              >
                <X className='w-5 h-5' />
              </Button>
            )}
          </div>
        )}

        {/* Content — scrollable */}
        <div className='px-6 py-4 overflow-y-auto flex-1 min-h-0'>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// Convenience components for modal structure
export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className='flex items-center justify-end gap-3 pt-4 mt-4 border-t border-border'>
      {children}
    </div>
  );
}
