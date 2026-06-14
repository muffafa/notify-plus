import { normalize } from '../matching/normalize';

/**
 * Turn raw user input into a safe FTS5 MATCH expression.
 *
 * Folds Turkish/diacritics, drops anything that isn't a normalized word character (so '-', '(',
 * '%', '"' etc. cannot cause `fts5: syntax error`), and appends '*' for prefix matching
 * ("akil" finds "akilli"). Tokens are space-joined => implicit AND in FTS5.
 * Returns '' if nothing usable remains (caller should fall back to a recent-messages query).
 */
export function toFtsQuery(raw: string): string {
  return normalize(raw)
    .split(' ')
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 0)
    .map((t) => `${t}*`)
    .join(' ');
}
