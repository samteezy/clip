/**
 * Simple glob pattern matching for tool names.
 * Supports * as wildcard for any characters.
 *
 * Examples:
 *   "server__*" matches "server__read", "server__write"
 *   "*__dangerous" matches "any__dangerous"
 *   "exact_match" matches only "exact_match"
 */
export function matchesGlob(name: string, pattern: string): boolean {
  // Escape regex special chars except *, then convert * to .*
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(name);
}

/**
 * Check if a name matches any of the given patterns
 */
export function matchesAnyGlob(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesGlob(name, pattern));
}
