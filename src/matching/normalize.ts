/**
 * Case- and diacritic-insensitive normalization, Turkish-aware. MUST mirror the native
 * TextNormalizer.kt so the live diagnostic preview and the FTS5 index/query behave like the real
 * (native) matcher. Original text is always preserved for display; only matching/indexing uses this.
 */

const FOLD: Record<string, string> = {
  I: 'i',
  İ: 'i',
  ı: 'i',
  i: 'i',
  Î: 'i',
  î: 'i',
  Ş: 's',
  ş: 's',
  Ç: 'c',
  ç: 'c',
  Ğ: 'g',
  ğ: 'g',
  Ö: 'o',
  ö: 'o',
  Ô: 'o',
  ô: 'o',
  Ü: 'u',
  ü: 'u',
  Û: 'u',
  û: 'u',
  Â: 'a',
  â: 'a',
};

// Unicode combining diacritical marks (U+0300–U+036F).
const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalize(input: string | null | undefined): string {
  if (!input) return '';
  let folded = '';
  for (const ch of input) {
    folded += FOLD[ch] ?? ch.toLowerCase();
  }
  // Strip remaining combining diacritical marks (non-Turkish accents).
  const stripped = folded.normalize('NFD').replace(COMBINING_MARKS, '');
  return stripped.replace(/\s+/g, ' ').trim();
}
