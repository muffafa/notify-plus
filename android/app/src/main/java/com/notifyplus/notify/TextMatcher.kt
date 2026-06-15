package com.notifyplus.notify

/** Result of evaluating a single rule against one notification. */
data class MatchResult(
  val rule: Rule,
  /** The original-form keyword that matched, or "" for ALL-mode rules. */
  val matchedKeyword: String,
)

object TextMatcher {

  /**
   * Does [rule] apply to a notification from [sourcePackage] with this [rawTitle]?
   * (Package + title gating, before any keyword test.)
   */
  fun sourceMatches(rule: Rule, sourcePackage: String, rawTitle: String): Boolean {
    if (sourcePackage !in rule.effectivePackages()) return false
    if (rule.sourceTitleContains.isEmpty()) return true
    val normTitle = norm(rule, rawTitle)
    return rule.sourceTitleContains.any { needle ->
      val n = norm(rule, needle)
      n.isNotEmpty() && normTitle.contains(n)
    }
  }

  /**
   * Evaluate the keyword/exclude logic against the raw title and body.
   * Applies per-rule normalization and searchTitle / exactWord flags.
   */
  fun evaluate(rule: Rule, rawTitle: String, rawBody: String): MatchResult? {
    val searchText = if (rule.searchTitle) "$rawTitle $rawBody" else rawBody
    val haystack = norm(rule, searchText)

    for (ex in rule.excludeKeywords) {
      val n = norm(rule, ex)
      if (n.isNotEmpty() && containsKw(haystack, n, rule.exactWord)) return null
    }

    if (rule.mode == RuleMode.ALL) return MatchResult(rule, "")

    if (rule.requireAllKeywords) {
      val allMatch = rule.keywords.all { kw ->
        val n = norm(rule, kw)
        n.isNotEmpty() && containsKw(haystack, n, rule.exactWord)
      }
      if (!allMatch) return null
      return MatchResult(rule, rule.keywords.joinToString(", "))
    }

    for (kw in rule.keywords) {
      val n = norm(rule, kw)
      if (n.isNotEmpty() && containsKw(haystack, n, rule.exactWord)) {
        return MatchResult(rule, kw)
      }
    }
    return null
  }

  private fun norm(rule: Rule, text: String): String =
    TextNormalizer.normalize(text, rule.caseSensitive, rule.turkishSensitive)

  private fun containsKw(haystack: String, kw: String, exactWord: Boolean): Boolean {
    if (!exactWord) return haystack.contains(kw)
    return " $haystack ".contains(" $kw ")
  }
}
