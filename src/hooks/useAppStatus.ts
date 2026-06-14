import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Notify } from '../native/NotifyModule';

export interface AppStatus {
  accessGranted: boolean;
  serviceConnected: boolean;
  notificationsEnabled: boolean;
  batteryIgnored: boolean;
  manufacturer: string;
}

/** Polls native permission/service status, and refreshes whenever the app returns to foreground. */
export function useAppStatus(): { status: AppStatus | null; refresh: () => Promise<void> } {
  const [status, setStatus] = useState<AppStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [accessGranted, serviceConnected, notificationsEnabled, batteryIgnored, manufacturer] =
        await Promise.all([
          Notify.isNotificationAccessGranted(),
          Notify.isServiceConnected(),
          Notify.areNotificationsEnabled(),
          Notify.isIgnoringBatteryOptimizations(),
          Notify.getManufacturer(),
        ]);
      setStatus({
        accessGranted,
        serviceConnected,
        notificationsEnabled,
        batteryIgnored,
        manufacturer,
      });
    } catch {
      // native module unavailable (not rebuilt yet) — leave status null
    }
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { status, refresh };
}
