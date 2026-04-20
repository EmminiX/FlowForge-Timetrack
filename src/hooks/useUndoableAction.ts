import { useRef, useCallback } from 'react';
import { useToastStore } from '../stores/toastStore';

export function useUndoableAction() {
  const addToast = useToastStore((state) => state.addToast);
  const pendingRef = useRef<{ timeoutId: ReturnType<typeof setTimeout>; toastId: string } | null>(null);

  const execute = useCallback(
    (options: {
      message: string;
      action: () => Promise<void>;
      onUndo?: () => void;
      delay?: number;
    }) => {
      const { message, action, onUndo, delay = 10000 } = options;

      const timeoutId = setTimeout(async () => {
        pendingRef.current = null;
        await action();
      }, delay);

      const toastId = addToast({
        message,
        action: onUndo
          ? {
              label: 'Undo',
              onClick: () => {
                if (pendingRef.current) {
                  clearTimeout(pendingRef.current.timeoutId);
                  pendingRef.current = null;
                }
                onUndo();
              },
            }
          : undefined,
        duration: delay,
      });

      pendingRef.current = { timeoutId, toastId };
    },
    [addToast],
  );

  return { execute };
}
