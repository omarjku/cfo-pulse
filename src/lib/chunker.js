/**
 * Split text into overlapping chunks for RAG ingestion.
 */
export function chunkText(text, { size = 1000, overlap = 200 } = {}) {
  if (!text || text.trim().length === 0) return [];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start += size - overlap;
  }
  return chunks;
}
