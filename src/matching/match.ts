/**
 * JS mirror of the native matcher (TextMatcher.kt). Used ONLY for the in-app live diagnostic /
 * "test this keyword" preview. The authoritative matching at notification time happens natively.
 */
import type { Rule } from '../types';
import { normalize } from './normalize';

export const DEFAULT_TELEGRAM_PACKAGES = [
  'org.telegram.messenger',
  'org.telegram.messenger.web',
  'org.telegram.messenger.beta',
  'org.telegram.plus',
  'org.thunderdog.challegram',
];

export interface MatchOutcome {
  matched: boolean;
  ruleId?: string;
  ruleName?: string;
  keyword?: string;
}

function effectivePackages(rule: Rule): string[] {
  return rule.sourcePackages.length ? rule.sourcePackages : DEFAULT_TELEGRAM_PACKAGES;
}

export function sourceMatches(rule: Rule, pkg: string, title: string): boolean {
  if (!effectivePackages(rule).includes(pkg)) return false;
  if (!rule.sourceTitleContains.length) return true;
  const nt = normalize(title);
  return rule.sourceTitleContains.some((s) => {
    const n = normalize(s);
    return !!n && nt.includes(n);
  });
}

export function evaluateRule(rule: Rule, title: string, body: string): MatchOutcome {
  const haystack = normalize(`${title} ${body}`);

  for (const ex of rule.excludeKeywords) {
    const n = normalize(ex);
    if (n && haystack.includes(n)) return { matched: false };
  }

  if (rule.mode === 'all') {
    return { matched: true, ruleId: rule.id, ruleName: rule.name, keyword: '' };
  }

  for (const kw of rule.keywords) {
    const n = normalize(kw);
    if (n && haystack.includes(n)) {
      return { matched: true, ruleId: rule.id, ruleName: rule.name, keyword: kw };
    }
  }
  return { matched: false };
}

/** Evaluate enabled rules in order; first match wins. */
export function findMatch(rules: Rule[], pkg: string, title: string, body: string): MatchOutcome {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!sourceMatches(rule, pkg, title)) continue;
    const outcome = evaluateRule(rule, title, body);
    if (outcome.matched) return outcome;
  }
  return { matched: false };
}
