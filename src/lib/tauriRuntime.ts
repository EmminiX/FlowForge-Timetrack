import { isTauriRuntime } from './platform';

type UnlistenFn = () => void;
type TauriEvent<T> = { payload: T };

export async function safeEmit<TPayload>(event: string, payload?: TPayload): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false;
  }

  const { emit } = await import('@tauri-apps/api/event');
  await emit(event, payload);
  return true;
}

export async function safeListen<TPayload>(
  event: string,
  handler: (event: TauriEvent<TPayload>) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  const { listen } = await import('@tauri-apps/api/event');
  return listen<TPayload>(event, handler);
}

export async function safeInvoke<TResult>(
  command: string,
  args?: Record<string, unknown>,
): Promise<TResult | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<TResult>(command, args);
}
