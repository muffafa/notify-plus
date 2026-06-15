/**
 * Case- and diacritic-insensitive normalization, Turkish-aware. MUST mirror the native
 * TextNormalizer.kt so the live diagnostic preview and the FTS5 index/query behave like the real
 * (native) matcher. Original text is always preserved for display; only matching/indexing uses this.
 *
 * Call with no opts (or both false) to get the current default full-fold behaviour.
 */

export interface NormalizeOptions {
  caseSensitive?: boolean;
  turkishSensitive?: boolean;
}

// Full fold: Turkish + accented → ASCII lowercase (default, current behaviour).
const FOLD_FULL: Record<string, string> = {
  I: 'i', İ: 'i', ı: 'i', i: 'i', Î: 'i', î: 'i',
  Ş: 's', ş: 's',
  Ç: 'c', ç: 'c',
  Ğ: 'g', ğ: 'g',
  Ö: 'o', ö: 'o', Ô: 'o', ô: 'o',
  Ü: 'u', ü: 'u', Û: 'u', û: 'u',
  Â: 'a', â: 'a',
};

// Turkish-aware lowercase only: İ→i, I→ı (Turkish rule); everything else: ch.toLowerCase().
// Diacritics (ş, ğ, etc.) stay as their lowercase Turkish form.
const FOLD_TR_LOWER: Record<string, string> = {
  İ: 'i',
  I: 'ı',
};

// Case-preserving ASCII fold: Turkish diacritics → ASCII equivalent, case kept.
const FOLD_ASCII_CS: Record<string, string> = {
  I: 'I', İ: 'I', ı: 'i', Î: 'I', î: 'i',
  Ş: 'S', ş: 's',
  Ç: 'C', ç: 'c',
  Ğ: 'G', ğ: 'g',
  Ö: 'O', ö: 'o', Ô: 'O', ô: 'o',
  Ü: 'U', ü: 'u', Û: 'U', û: 'u',
  Â: 'A', â: 'a',
};

// Unicode combining diacritical marks (U+0300–U+036F).
const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalize(input: string | null | undefined, opts?: NormalizeOptions): string {
  if (!input) return '';
  const cs = opts?.caseSensitive ?? false;
  const ts = opts?.turkishSensitive ?? false;

  let result = '';
  for (const ch of input) {
    if (!cs && !ts) {
      result += FOLD_FULL[ch] ?? ch.toLowerCase();
    } else if (!cs && ts) {
      // Lowercase with Turkish-aware I/İ, keep diacritics as-is
      result += FOLD_TR_LOWER[ch] ?? ch.toLowerCase();
    } else if (cs && !ts) {
      // Fold Turkish/accented chars to ASCII, preserve case
      result += FOLD_ASCII_CS[ch] ?? ch;
    } else {
      // cs && ts: no folding at all
      result += ch;
    }
  }

  const stripped = result.normalize('NFD').replace(COMBINING_MARKS, '');
  return stripped.replace(/\s+/g, ' ').trim();
}
