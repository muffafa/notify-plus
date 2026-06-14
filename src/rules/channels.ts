import type { ChannelConfig } from '../types';
import { Notify } from '../native/NotifyModule';

/**
 * Preset notification channels. Each rule posts to one of these (the channel controls sound +
 * vibration on Android 8+). To add a CUSTOM sound: drop an mp3/ogg in
 * android/app/src/main/res/raw/<name> and reference it as `sound: '<name>'` (no extension), then
 * bump the channel id (channels are immutable after creation — see README).
 */
export const PRESET_CHANNELS: ChannelConfig[] = [
  {
    id: 'deals_high',
    name: 'High-value deals',
    description: 'Loud alert with strong vibration — mirrors to your watch',
    importance: 'high',
    sound: null, // default notification sound
    vibrate: true,
    vibrationPattern: [0, 400, 150, 400],
  },
  {
    id: 'deals_default',
    name: 'Normal deals',
    description: 'Standard alert',
    importance: 'default',
    sound: null,
    vibrate: true,
    vibrationPattern: [0, 250],
  },
  {
    id: 'deals_silent',
    name: 'Silent (log only)',
    description: 'No sound or vibration; still archived and visible',
    importance: 'low',
    sound: '',
    vibrate: false,
  },
];

export const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  PRESET_CHANNELS.map((c) => [c.id, c.name]),
);

export async function ensurePresetChannels(): Promise<void> {
  await Notify.ensureDefaultChannel();
  for (const c of PRESET_CHANNELS) {
    await Notify.createChannel(c);
  }
}
