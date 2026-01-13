/**
 * Parse PDF embed syntax to extract path and page number
 *
 * Supports:
 * - `![[file.pdf#page=5]]` -> { path: 'file.pdf', page: 5 }
 * - `![[document.pdf]]` -> { path: 'document.pdf', page: 1 }
 *
 * @param embedText The raw embed text (e.g., "file.pdf#page=5")
 * @returns Object with path and page number
 */
export interface PdfEmbedInfo {
  path: string;
  page: number;
}

export function parsePdfEmbed(embedText: string): PdfEmbedInfo | null {
  // Check if this is a PDF file
  const pdfRegex = /^(.+?\.pdf)(?:#page=(\d+))?$/i;
  const match = embedText.match(pdfRegex);

  if (!match) {
    return null;
  }

  const path = match[1];
  const page = match[2] ? parseInt(match[2], 10) : 1;

  return { path, page };
}

/**
 * Check if an embed target is a PDF file
 */
export function isPdfEmbed(embedText: string): boolean {
  return /\.pdf$/i.test(embedText.split('#')[0]);
}
