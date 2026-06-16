package com.notifyplus.notify

/** Result of evaluating a single rule against one notification. */
sealed class EvalResult {
  /** The rule matched — keyword is the matched keyword, or "" for ALL-mode rules. */
  data class Match(val rule: Rule, val keyword: String) : EvalResult()
  /** An exclude keyword was found in the text — byKeyword is the exclude keyword that fired. */
  data class Excluded(val rule: Rule, val byKeyword: String) : EvalResult()
  /** Neither a match nor an exclusion — no keyword criteria were satisfied. */
  object NoMatch : EvalResult()
}

object TextMatcher {

  // Punctuation characters treated as word boundaries when punctuationBoundary=true.
  private val PUNCT_RE = Regex("[.,;:!?()\\[\\]{}'\"]+")

  private fun applyBoundary(text: String, punctBoundary: Boolean): String {
    if (!punctBoundary) return text
    return PUNCT_RE.replace(text, " ").replace(Regex("\\s+"), " ").trim()
  }

  private fun containsKw(haystack: String, kw: String, exactWord: Boolean, punctBoundary: Boolean): Boolean {
    if (!exactWord) return haystack.contains(kw)
    val h = applyBoundary(haystack, punctBoundary)
    val k = applyBoundary(kw, punctBoundary)
    return " $h ".contains(" $k ")
  }

  /**
   * Does [rule] apply to a notification from [sourcePackage] with this [rawTitle]?
   */
  fun sourceMatches(rule: Rule, sourcePackage: String, rawTitle: String): Boolean {
    if (sourcePackage !in rule.effectivePackages()) return false
    if (rule.sourceTitleContains.isEmpty()) return true
    val normTitle = normKw(rule, rawTitle)
    return rule.sourceTitleContains.any { needle ->
      val n = normKw(rule, needle)
      n.isNotEmpty() && normTitle.contains(n)
    }
  }

  /**
   * Evaluate keyword/exclude logic against raw title and body.
   * Returns [EvalResult.Match], [EvalResult.Excluded], or [EvalResult.NoMatch].
   */
  fun evaluate(rule: Rule, rawTitle: String, rawBody: String): EvalResult {
    val searchText = if (rule.searchTitle) "$rawTitle $rawBody" else rawBody

    // Exclude keywords use their own normalization + word-boundary settings.
    val exHaystack = normExclude(rule, searchText)
    for (ex in rule.excludeKeywords) {
      val n = normExclude(rule, ex)
      if (n.isNotEmpty() && containsKw(exHaystack, n, rule.exactWordExclude, rule.punctuationBoundaryExclude)) {
        return EvalResult.Excluded(rule, ex)
      }
    }

    // Keywords use their own (independent) normalization + word-boundary settings.
    val kwHaystack = normKw(rule, searchText)
    if (rule.requireAllKeywords) {
      val allMatch = rule.keywords.all { kw ->
        val n = normKw(rule, kw)
        n.isNotEmpty() && containsKw(kwHaystack, n, rule.exactWordKw, rule.punctuationBoundary)
      }
      if (!allMatch) return EvalResult.NoMatch
      return EvalResult.Match(rule, rule.keywords.joinToString(", "))
    }

    for (kw in rule.keywords) {
      val n = normKw(rule, kw)
      if (n.isNotEmpty() && containsKw(kwHaystack, n, rule.exactWordKw, rule.punctuationBoundary)) {
        return EvalResult.Match(rule, kw)
      }
    }
    return EvalResult.NoMatch
  }

  /** Normalization for keyword matching (also used for the channel/title filter). */
  private fun normKw(rule: Rule, text: String): String =
    TextNormalizer.normalize(text, rule.caseSensitive, rule.turkishSensitive)

  /** Normalization for exclude-keyword matching (independent of keyword settings). */
  private fun normExclude(rule: Rule, text: String): String =
    TextNormalizer.normalize(text, rule.caseSensitiveExclude, rule.turkishSensitiveExclude)
}
