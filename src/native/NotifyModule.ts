import { NativeEventEmitter, NativeModules } from 'react-native';
import type {
  ChannelConfig,
  ChannelStatus,
  NotifyEvent,
  PendingEvent,
  Rule,
  TelegramApp,
} from '../types';

/** Raw native interface (legacy bridge module). Collections come back as JSON strings. */
interface NativeNotify {
  // Notification access
  isNotificationAccessGranted(): Promise<boolean>;
  openNotificationAccessSettings(): Promise<boolean>;
  isServiceConnected(): Promise<boolean>;
  // Post-notifications / channel status
  areNotificationsEnabled(): Promise<boolean>;
  openAppNotificationSettings(): Promise<boolean>;
  openChannelSettings(channelId: string): Promise<boolean>;
  // Battery optimization
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  openBatteryOptimizationSettings(): Promise<boolean>;
  openAppDetailsSettings(): Promise<boolean>;
  getManufacturer(): Promise<string>;
  // Telegram detection
  getInstalledTelegramPackages(): Promise<string>;
  // Rules / prefs
  setRules(json: string): Promise<boolean>;
  getRules(): Promise<string>;
  setDiagnosticMode(on: boolean): Promise<boolean>;
  isDiagnosticMode(): Promise<boolean>;
  getPref(key: string): Promise<string | null>;
  setPref(key: string, value: string | null): Promise<boolean>;
  // Channels
  ensureDefaultChannel(): Promise<boolean>;
  createChannel(configJson: string): Promise<boolean>;
  deleteChannel(id: string): Promise<boolean>;
  getChannelStatus(id: string): Promise<ChannelStatus>;
  // Pending events
  drainPendingEvents(): Promise<string>;
  pendingCount(): Promise<number>;
  // NativeEventEmitter bookkeeping
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

const Native = NativeModules.NotifyModule as NativeNotify | undefined;

function require_(): NativeNotify {
  if (!Native) {
    throw new Error(
      'NotifyModule native module is not available. Rebuild the Android app (npm run android) ' +
        'after adding the native code; it is Android-only.',
    );
  }
  return Native;
}

export const isNotifyAvailable = (): boolean => !!Native;

const EVENT_NAME = 'NotifyEvent';
// NativeEventEmitter requires a module that implements addListener/removeListeners (we do).
const emitter = Native ? new NativeEventEmitter(NativeModules.NotifyModule) : undefined;

/** Subscribe to live notification events. Returns an unsubscribe function. */
export function addNotifyListener(cb: (event: NotifyEvent) => void): () => void {
  if (!emitter) return () => {};
  const sub = emitter.addListener(EVENT_NAME, (json: string) => {
    try {
      cb(JSON.parse(json) as NotifyEvent);
    } catch {
      // ignore malformed payloads
    }
  });
  return () => sub.remove();
}

/** Typed, ergonomic wrapper over the native module. */
export const Notify = {
  // ---- Notification access ----
  isNotificationAccessGranted: () => require_().isNotificationAccessGranted(),
  openNotificationAccessSettings: () => require_().openNotificationAccessSettings(),
  isServiceConnected: () => require_().isServiceConnected(),

  // ---- Post-notifications / channel status ----
  areNotificationsEnabled: () => require_().areNotificationsEnabled(),
  openAppNotificationSettings: () => require_().openAppNotificationSettings(),
  openChannelSettings: (channelId: string) => require_().openChannelSettings(channelId),

  // ---- Battery optimization ----
  isIgnoringBatteryOptimizations: () => require_().isIgnoringBatteryOptimizations(),
  openBatteryOptimizationSettings: () => require_().openBatteryOptimizationSettings(),
  openAppDetailsSettings: () => require_().openAppDetailsSettings(),
  getManufacturer: () => require_().getManufacturer(),

  // ---- Telegram detection ----
  async getInstalledTelegramPackages(): Promise<TelegramApp[]> {
    const json = await require_().getInstalledTelegramPackages();
    return safeParse<TelegramApp[]>(json, []);
  },

  // ---- Rules / prefs ----
  setRules: (rules: Rule[]) => require_().setRules(JSON.stringify(rules)),
  async getRules(): Promise<Rule[]> {
    const json = await require_().getRules();
    return safeParse<Rule[]>(json, []);
  },
  setDiagnosticMode: (on: boolean) => require_().setDiagnosticMode(on),
  isDiagnosticMode: () => require_().isDiagnosticMode(),
  getPref: (key: string) => require_().getPref(key),
  setPref: (key: string, value: string | null) => require_().setPref(key, value),

  // ---- Channels ----
  ensureDefaultChannel: () => require_().ensureDefaultChannel(),
  createChannel: (config: ChannelConfig) => require_().createChannel(JSON.stringify(config)),
  deleteChannel: (id: string) => require_().deleteChannel(id),
  getChannelStatus: (id: string) => require_().getChannelStatus(id),

  // ---- Pending events ----
  async drainPendingEvents(): Promise<PendingEvent[]> {
    const json = await require_().drainPendingEvents();
    return safeParse<PendingEvent[]>(json, []);
  },
  pendingCount: () => require_().pendingCount(),
};

function safeParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
