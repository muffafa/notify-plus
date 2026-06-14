import { useEffect, useRef } from 'react';
import { addNotifyListener } from '../native/NotifyModule';
import type { NotifyEvent } from '../types';

/** Subscribe to live native notification events for the lifetime of the component. */
export function useNotifyEvents(handler: (event: NotifyEvent) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => addNotifyListener((event) => ref.current(event)), []);
}
