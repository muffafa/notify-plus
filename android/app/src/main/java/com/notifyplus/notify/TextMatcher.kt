package com.notifyplus.notify

/** Result of evaluating a single rule against one notification. */
data class MatchResult(
  val rule: Rule,
  /** The original-form keyword that matched, or "" for ALL-mode rules. */
  val matchedKeyword: String,
)

object TextMatcher {

  /**
   * Does [rule] apply to a notification from [sourcePackage] with this [title]?
   * (Package + title gating, before any keyword test.)
   */
  fun sourceMatches(rule: Rule, sourcePackage: String, normalizedTitle: String): Boolean {
    if (sourcePackage !in rule.effectivePackages()) return false
    if (rule.sourceTitleContains.isEmpty()) return true
    return rule.sourceTitleContains.any { needle ->
      val n = TextNormalizer.normalize(needle)
      n.isNotEmpty() && normalizedTitle.contains(n)
    }
  }

  /**
   * Evaluate the keyword/exclude logic against an already-normalized haystack
   * (normally the normalized title + all text fields joined).
   * Returns the matched keyword (original form) on success, or null if the rule does not match.
   */
  fun evaluate(rule: Rule, normalizedHaystack: String): MatchResult? {
    // Exclusions win.
    for (ex in rule.excludeKeywords) {
      val n = TextNormalizer.normalize(ex)
      if (n.isNotEmpty() && normalizedHaystack.contains(n)) return null
    }

    if (rule.mode == RuleMode.ALL) {
      return MatchResult(rule, "")
    }

    for (kw in rule.keywords) {
      val n = TextNormalizer.normalize(kw)
      if (n.isNotEmpty() && normalizedHaystack.contains(n)) {
        return MatchResult(rule, kw)
      }
    }
    return null
  }
}
