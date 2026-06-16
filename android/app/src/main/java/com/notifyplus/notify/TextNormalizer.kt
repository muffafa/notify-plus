package com.notifyplus.notify

import java.text.Normalizer

/**
 * Case- and diacritic-insensitive normalization, Turkish-aware. MUST mirror normalize.ts.
 *
 * caseSensitive=false, turkishSensitive=false (default): full fold — Turkish + accented → ASCII
 * lowercase. caseSensitive=false, turkishSensitive=true: Turkish-aware lowercase only (İ→i, I→ı);
 * diacritics stay as Turkish lowercase. caseSensitive=true, turkishSensitive=false: fold Turkish
 * diacritics to ASCII, preserve case. caseSensitive=true, turkishSensitive=true: no folding.
 */
object TextNormalizer {

  fun normalize(
    input: String?,
    caseSensitive: Boolean = false,
    turkishSensitive: Boolean = false,
  ): String {
    if (input.isNullOrEmpty()) return ""

    val folded = StringBuilder(input.length)
    for (ch in input) {
      folded.append(mapChar(ch, caseSensitive, turkishSensitive))
    }

    val decomposed = Normalizer.normalize(folded, Normalizer.Form.NFD)
    val stripped = StringBuilder(decomposed.length)
    for (ch in decomposed) {
      if (Character.getType(ch) != Character.NON_SPACING_MARK.toInt()) stripped.append(ch)
    }

    return WHITESPACE.replace(stripped, " ").trim()
  }

  private fun mapChar(ch: Char, caseSensitive: Boolean, turkishSensitive: Boolean): Char {
    if (caseSensitive && turkishSensitive) return ch

    if (!caseSensitive && !turkishSensitive) {
      return when (ch) {
        'I', 'İ', 'ı', 'i', 'Î', 'î' -> 'i'
        'Ş', 'ş' -> 's'
        'Ç', 'ç' -> 'c'
        'Ğ', 'ğ' -> 'g'
        'Ö', 'ö', 'Ô', 'ô' -> 'o'
        'Ü', 'ü', 'Û', 'û' -> 'u'
        'Â', 'â' -> 'a'
        else -> Character.toLowerCase(ch)
      }
    }

    if (!caseSensitive && turkishSensitive) {
      // Turkish-aware lowercase; diacritics stay as-is (just lowercased by Character.toLowerCase)
      return when (ch) {
        'İ' -> 'i'
        'I' -> 'ı'
        else -> Character.toLowerCase(ch)
      }
    }

    // caseSensitive && !turkishSensitive: fold Turkish diacritics to ASCII, preserve case
    return when (ch) {
      'I' -> 'I'; 'İ' -> 'I'; 'ı' -> 'i'; 'Î' -> 'I'; 'î' -> 'i'
      'Ş' -> 'S'; 'ş' -> 's'
      'Ç' -> 'C'; 'ç' -> 'c'
      'Ğ' -> 'G'; 'ğ' -> 'g'
      'Ö' -> 'O'; 'ö' -> 'o'; 'Ô' -> 'O'; 'ô' -> 'o'
      'Ü' -> 'U'; 'ü' -> 'u'; 'Û' -> 'U'; 'û' -> 'u'
      'Â' -> 'A'; 'â' -> 'a'
      else -> ch
    }
  }

  private val WHITESPACE = Regex("\\s+")
}
