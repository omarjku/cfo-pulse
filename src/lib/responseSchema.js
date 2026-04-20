/**
 * @typedef {{ label: string, data: number[] }} RichDataset
 */

/**
 * @typedef {{
 *   title: string,
 *   type: 'line' | 'bar' | 'pie',
 *   labels: string[],
 *   datasets: RichDataset[]
 * }} RichChart
 */

/**
 * @typedef {{
 *   title: string,
 *   headers: string[],
 *   rows: (string | number)[][]
 * }} RichTable
 */

/**
 * @typedef {{
 *   filename: string,
 *   date_range_start: string | null,
 *   date_range_end: string | null,
 *   description: string
 * }} DocumentTimeline
 */

/**
 * @typedef {{
 *   narrative: string,
 *   document_timelines: DocumentTimeline[],
 *   tables: RichTable[],
 *   charts: RichChart[],
 *   flags: string[],
 *   actions: string[],
 *   healthScore?: number,
 *   income?: object,
 *   balance?: object,
 *   cashFlow?: object,
 *   prior?: object,
 *   monthlyTrend?: object[],
 *   analysis?: object
 * }} RichResponse
 */

const JSON_FENCE_RE = /```json\s*([\s\S]*?)\s*```/;

/**
 * @param {string} text
 * @returns {string}
 */
export function stripJsonBlock(text) {
  return text.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
}

/**
 * Returns true if parsed has a non-empty narrative — the minimum signal that
 * Claude emitted a rich response rather than the legacy dashboard-only block.
 * @param {unknown} parsed
 * @returns {parsed is RichResponse}
 */
export function isRich(parsed) {
  return (
    parsed !== null &&
    typeof parsed === 'object' &&
    typeof parsed.narrative === 'string' &&
    parsed.narrative.length > 0
  );
}

/**
 * Extract and parse the JSON fenced block from Claude's streamed text.
 * Returns the parsed RichResponse if the block is present and has a narrative;
 * returns null for raw text, invalid JSON, or legacy dashboard-only blocks.
 * @param {string} text
 * @returns {RichResponse | null}
 */
export function parseRichResponse(text) {
  const match = text.match(JSON_FENCE_RE);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return isRich(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
