const CHUNK_SIZE_CHARS = 1200;
const CHUNK_OVERLAP_CHARS = 150;

/**
 * Splits text into overlapping, bounded chunks. Overlap keeps context from
 * being severed at a chunk boundary during retrieval.
 */
export function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE_CHARS,
  overlap = CHUNK_OVERLAP_CHARS,
): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const piece = normalized.slice(start, end).trim();
    if (piece.length > 0) {
      chunks.push(piece);
    }

    if (end === normalized.length) {
      break;
    }

    start = end - overlap;
  }

  return chunks;
}
