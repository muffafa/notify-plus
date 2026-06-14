import { normalize } from '../src/matching/normalize';
import { evaluateRule, findMatch, sourceMatches } from '../src/matching/match';
import { toFtsQuery } from '../src/db/fts';
import { emptyRule } from '../src/rules/rules';
import type { Rule } from '../src/types';

describe('normalize (Turkish-aware)', () => {
  it('folds the dotted/dotless I in both directions', () => {
    expect(normalize('AKILLI')).toBe('akilli');
    expect(normalize('akıllı')).toBe('akilli');
    expect(normalize('İndirim')).toBe('indirim');
    expect(normalize('INDIRIM')).toBe('indirim');
  });

  it('folds other Turkish letters and strips diacritics', () => {
    expect(normalize('Şahane Çorba Güzel')).toBe('sahane corba guzel');
    expect(normalize('café')).toBe('cafe');
  });

  it('collapses whitespace', () => {
    expect(normalize('  fiyat   hatası \n var ')).toBe('fiyat hatasi var');
  });

  it('handles empty/nullish', () => {
    expect(normalize('')).toBe('');
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
  });
});

describe('keyword matching', () => {
  const base = (over: Partial<Rule>): Rule => ({ ...emptyRule(), ...over });

  it('matches case- and Turkish-insensitively', () => {
    const rule = base({ keywords: ['akıllı saat'] });
    expect(evaluateRule(rule, 'Kanal', 'Yeni AKILLI SAAT indirimi!').matched).toBe(true);
    expect(evaluateRule(rule, 'Kanal', 'akilli saat kampanya').matched).toBe(true);
  });

  it('matches substrings (prefix-like)', () => {
    const rule = base({ keywords: ['akıl'] });
    expect(evaluateRule(rule, '', 'akıllı bileklik').matched).toBe(true);
  });

  it('respects exclude keywords', () => {
    const rule = base({ keywords: ['iphone'], excludeKeywords: ['kılıf'] });
    expect(evaluateRule(rule, '', 'iPhone 15 indirim').matched).toBe(true);
    expect(evaluateRule(rule, '', 'iPhone kılıfı indirim').matched).toBe(false);
  });

  it('all-mode matches anything but still honors excludes', () => {
    const rule = base({ mode: 'all', excludeKeywords: ['reklam'] });
    expect(evaluateRule(rule, '', 'herhangi bir mesaj').matched).toBe(true);
    expect(evaluateRule(rule, '', 'bu bir reklam').matched).toBe(false);
  });

  it('reports the matched keyword', () => {
    const rule = base({ keywords: ['kupon', 'indirim'] });
    expect(evaluateRule(rule, '', 'büyük indirim').keyword).toBe('indirim');
  });
});

describe('source matching', () => {
  it('defaults to Telegram packages when none specified', () => {
    const rule = emptyRule();
    expect(sourceMatches(rule, 'org.telegram.messenger', 'any')).toBe(true);
    expect(sourceMatches(rule, 'com.whatsapp', 'any')).toBe(false);
  });

  it('filters by channel title when provided', () => {
    const rule: Rule = { ...emptyRule(), sourceTitleContains: ['indirim kanalı'] };
    expect(sourceMatches(rule, 'org.telegram.messenger', 'İndirim Kanalı')).toBe(true);
    expect(sourceMatches(rule, 'org.telegram.messenger', 'Sohbet')).toBe(false);
  });
});

describe('findMatch (first enabled match wins)', () => {
  it('skips disabled rules and returns the first match', () => {
    const rules: Rule[] = [
      { ...emptyRule(), enabled: false, keywords: ['indirim'] },
      { ...emptyRule(), name: 'second', keywords: ['indirim'] },
    ];
    const out = findMatch(rules, 'org.telegram.messenger', 'Kanal', 'büyük indirim');
    expect(out.matched).toBe(true);
    expect(out.ruleName).toBe('second');
  });
});

describe('toFtsQuery (FTS5 injection-safe)', () => {
  it('produces prefix tokens joined by space', () => {
    expect(toFtsQuery('akıllı saat')).toBe('akilli* saat*');
  });

  it('strips special characters that would break FTS5 syntax', () => {
    expect(toFtsQuery('t-bar (50%)')).toBe('tbar* 50*');
    expect(toFtsQuery('"indirim"')).toBe('indirim*');
    expect(toFtsQuery('-NOT a*b')).toBe('not* ab*');
  });

  it('returns empty string when nothing usable remains', () => {
    expect(toFtsQuery('   ---  ')).toBe('');
    expect(toFtsQuery('')).toBe('');
  });
});
