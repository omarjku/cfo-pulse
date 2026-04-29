const THINKING_TRIGGERS = /\b(should\s+we|compare|model|forecast|acquisition|accretive|dilutive|valuation|scenarios?|sensitivity|recommend|decide|strategy|worth\s+it)\b/i;

/**
 * Returns true if the request warrants extended thinking.
 * Heuristic: message matches strategic/comparative keywords OR multiple docs are active.
 */
export function shouldThink(userMessage, activeDocCount = 0) {
  return THINKING_TRIGGERS.test(userMessage) || activeDocCount > 2;
}
