/**
 * JS mirror of the native matcher (TextMatcher.kt). Used ONLY for the in-app live diagnostic /
 * "test this keyword" preview. The authoritative matching at notification time happens natively.
 */
import type { Rule } from '../types';
import { normalize, type NormalizeOptions } from './normalize';

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
  /** The exclude keyword that prevented a match (when !matched due to exclusion). */
  excludedBy?: string;
}

// Punctuation characters that count as word boundaries when punctuationBoundary=true.
const PUNCT_RE = /[.,;:!?()\[\]{}"']/g;

function applyBoundary(text: string, punctBoundary: boolean): string {
  if (!punctBoundary) return text;
  return text.replace(PUNCT_RE, ' ').replace(/\s+/g, ' ').trim();
}

function containsKw(
  haystack: string,
  kw: string,
  exact: boolean,
  punctBoundary: boolean,
): boolean {
  if (!exact) return haystack.includes(kw);
  const h = applyBoundary(haystack, punctBoundary);
  const k = applyBoundary(kw, punctBoundary);
  return (` ${h} `).includes(` ${k} `);
}

/** Normalization options for keyword matching (also used for the channel/title filter). */
function kwOpts(rule: Rule): NormalizeOptions {
  return { caseSensitive: rule.caseSensitive, turkishSensitive: rule.turkishSensitive };
}

/** Normalization options for exclude-keyword matching (independent of keyword settings). */
function exOpts(rule: Rule): NormalizeOptions {
  return { caseSensitive: rule.caseSensitiveExclude, turkishSensitive: rule.turkishSensitiveExclude };
}

function effectivePackages(rule: Rule): string[] {
  return rule.sourcePackages.length ? rule.sourcePackages : DEFAULT_TELEGRAM_PACKAGES;
}

export function sourceMatches(rule: Rule, pkg: string, title: string): boolean {
  if (!effectivePackages(rule).includes(pkg)) return false;
  if (!rule.sourceTitleContains.length) return true;
  const opts = kwOpts(rule);
  const nt = normalize(title, opts);
  return rule.sourceTitleContains.some((s) => {
    const n = normalize(s, opts);
    return !!n && nt.includes(n);
  });
}

export function evaluateRule(rule: Rule, title: string, body: string): MatchOutcome {
  const rawText = (rule.searchTitle ?? true) ? `${title} ${body}` : body;
  const exactKw = rule.exactWordKw ?? false;
  const exactEx = rule.exactWordExclude ?? false;
  const punctKw = rule.punctuationBoundary ?? true;
  const punctEx = rule.punctuationBoundaryExclude ?? true;

  // Exclude keywords use their own normalization + word-boundary settings.
  const eOpts = exOpts(rule);
  const exHaystack = normalize(rawText, eOpts);
  for (const ex of rule.excludeKeywords) {
    const n = normalize(ex, eOpts);
    if (n && containsKw(exHaystack, n, exactEx, punctEx)) return { matched: false, excludedBy: ex };
  }

  // Keywords use their own (independent) normalization + word-boundary settings.
  const kOpts = kwOpts(rule);
  const kwHaystack = normalize(rawText, kOpts);
  if (rule.requireAllKeywords) {
    const allMatch = rule.keywords.every((kw) => {
      const n = normalize(kw, kOpts);
      return !!n && containsKw(kwHaystack, n, exactKw, punctKw);
    });
    if (!allMatch) return { matched: false };
    return { matched: true, ruleId: rule.id, ruleName: rule.name, keyword: rule.keywords.join(', ') };
  }

  for (const kw of rule.keywords) {
    const n = normalize(kw, kOpts);
    if (n && containsKw(kwHaystack, n, exactKw, punctKw)) {
      return { matched: true, ruleId: rule.id, ruleName: rule.name, keyword: kw };
    }
  }
  return { matched: false };
}

/** Evaluate enabled rules in order; first match wins. Also captures first exclude-hit for display. */
export function findMatch(rules: Rule[], pkg: string, title: string, body: string): MatchOutcome {
  let firstExclusion: MatchOutcome | null = null;
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!sourceMatches(rule, pkg, title)) continue;
    const outcome = evaluateRule(rule, title, body);
    if (outcome.matched) return outcome;
    if (outcome.excludedBy !== undefined && !firstExclusion) {
      firstExclusion = { ...outcome, ruleId: rule.id, ruleName: rule.name };
    }
  }
  return firstExclusion ?? { matched: false };
}
