import type { Rule } from '../types';
import { Notify } from '../native/NotifyModule';

export function newRuleId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyRule(): Rule {
  return {
    id: newRuleId(),
    enabled: true,
    name: 'New rule',
    sourcePackages: [],
    sourceTitleContains: [],
    keywords: [],
    excludeKeywords: [],
    channelId: 'deals_high',
    // Hide the original (silent) Telegram notification by default so the user only sees our
    // filtered loud alert. Telegram uses one notification per chat, so this clears that chat's
    // native notification on a match.
    suppressOriginal: true,
    searchTitle: true,
    exactWordKw: false,
    exactWordExclude: false,
    punctuationBoundary: true,
    caseSensitive: false,
    turkishSensitive: false,
    punctuationBoundaryExclude: true,
    caseSensitiveExclude: false,
    turkishSensitiveExclude: false,
    requireAllKeywords: false,
  };
}

/** A sensible starter rule so the app does something useful immediately after onboarding. */
export function starterRule(): Rule {
  return {
    ...emptyRule(),
    name: 'Hot deals',
    keywords: ['fiyat hatası', 'indirim', 'ücretsiz', 'kupon'],
    channelId: 'deals_high',
  };
}

export const loadRules = (): Promise<Rule[]> => Notify.getRules();
export const saveRules = (rules: Rule[]): Promise<boolean> => Notify.setRules(rules);
