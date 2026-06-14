package com.notifyplus.notify

import java.text.Normalizer

/**
 * Case- and diacritic-insensitive normalization, Turkish-aware.
 *
 * unicode61 (the SQLite FTS5 tokenizer used on the JS side) mishandles the Turkish dotted/dotless
 * I pair, so we fold text the SAME way on both the native matching path and the JS search/index
 * path. The original text is always kept for display; only matching/indexing uses normalized text.
 *
 * Folding rules:
 *  - I, İ, ı, i  -> i   (collapses the Turkish I problem entirely)
 *  - ş -> s, ç -> c, ğ -> g, ö -> o, ü -> u, plus common circumflex vowels
 *  - everything else: lower-cased, then remaining Unicode combining marks stripped (é -> e, etc.)
 *  - whitespace collapsed to single spaces
 *
 * NOTE: keep this in sync with src/matching/normalize.ts (the JS mirror used for the live
 * diagnostic preview and for FTS5 indexing/search).
 */
object TextNormalizer {

  fun normalize(input: String?): String {
    if (input.isNullOrEmpty()) return ""

    val folded = StringBuilder(input.length)
    for (ch in input) {
      val mapped = when (ch) {
        'I', 'İ', 'ı', 'i', 'Î', 'î' -> 'i'
        'Ş', 'ş' -> 's'
        'Ç', 'ç' -> 'c'
        'Ğ', 'ğ' -> 'g'
        'Ö', 'ö', 'Ô', 'ô' -> 'o'
        'Ü', 'ü', 'Û', 'û' -> 'u'
        'Â', 'â' -> 'a'
        else -> Character.toLowerCase(ch)
      }
      folded.append(mapped)
    }

    // Strip any remaining non-spacing combining marks (handles non-Turkish accents).
    val decomposed = Normalizer.normalize(folded, Normalizer.Form.NFD)
    val stripped = StringBuilder(decomposed.length)
    for (ch in decomposed) {
      if (Character.getType(ch) != Character.NON_SPACING_MARK.toInt()) {
        stripped.append(ch)
      }
    }

    return WHITESPACE.replace(stripped, " ").trim()
  }

  private val WHITESPACE = Regex("\\s+")
}
