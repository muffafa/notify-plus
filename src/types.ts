/**
 * Shared types. The Rule / ChannelConfig / PendingEvent / NotifyEvent shapes are a contract with
 * the native Kotlin layer (android/app/src/main/java/com/notifyplus/notify/*). Keep them in sync.
 */

export type RuleMode = 'keywords' | 'all';

export interface Rule {
  id: string;
  enabled: boolean;
  name: string;
  /** Source app packages. Empty => all Telegram variants (default). */
  sourcePackages: string[];
  /** Notification title (chat/channel name) must contain ANY of these. Empty => any title. */
  sourceTitleContains: string[];
  mode: RuleMode;
  /** mode='keywords' requires at least one to be present in the message. */
  keywords: string[];
  /** If any is present, the message is skipped even if a keyword matched. */
  excludeKeywords: string[];
  /** Notification channel to post matches to (controls sound + vibration). */
  channelId: string;
  /** Cancel the original silent Telegram notification on match. */
  suppressOriginal: boolean;
}

export type Importance = 'min' | 'low' | 'default' | 'high';

export interface ChannelConfig {
  id: string;
  name: string;
  description?: string;
  importance?: Importance;
  /** Raw resource name (no extension) for a custom sound; null/undefined = default; '' = silent. */
  sound?: string | null;
  vibrate?: boolean;
  vibrationPattern?: number[];
  lights?: boolean;
  bypassDnd?: boolean;
}

/** A matched message queued natively, drained into the op-sqlite archive when the app runs. */
export interface PendingEvent {
  id: number;
  ruleId: string;
  ruleName: string;
  sourcePackage: string;
  sourceTitle: string;
  body: string;
  matchedKeyword: string;
  postedAt: number;
  sbnKey: string;
}

/** Live event forwarded from the native listener while the RN runtime is alive. */
export type NotifyEvent =
  | { type: 'service'; connected: boolean }
  | {
      type: 'matched' | 'captured';
      matched: boolean;
      ruleId: string | null;
      ruleName: string | null;
      matchedKeyword: string;
      sourcePackage: string;
      sourceTitle: string;
      body: string;
      /** Looked like a redacted/empty message (e.g. Telegram "You have a new message"). */
      generic: boolean;
      postedAt: number;
    };

/** A row in the searchable Notification Center archive (op-sqlite). */
export interface ArchivedMessage {
  id: number;
  ruleId: string;
  ruleName: string;
  sourcePackage: string;
  sourceTitle: string;
  body: string;
  matchedKeyword: string;
  postedAt: number;
}

export interface TelegramApp {
  package: string;
  label: string;
}

export type ChannelStatus = 'ok' | 'blocked' | 'missing';
