/**
 * Parse heading transclusion syntax: ![[Note#Heading]] or ![[Note#]]
 *
 * Examples:
 * - ![[Note#My Heading]] -> { note: "Note", heading: "My Heading" }
 * - ![[Note#]] -> { note: "Note", heading: "" } (for picker)
 * - ![[Note#Heading With Spaces]] -> { note: "Note", heading: "Heading With Spaces" }
 * - ![[Note#Heading, with! punctuation?]] -> { note: "Note", heading: "Heading, with! punctuation?" }
 */

export interface ParsedHeadingRef {
  note: string;
  heading: string;
  hasEmptyHeading: boolean; // true for ![[Note#]] (picker mode)
  isValid: boolean;
}

/**
 * Parse a heading transclusion string
 * @param text - The text to parse (e.g., "![[Note#Heading]]")
 * @returns Parsed heading reference or null if invalid
 */
export function parseHeadingRef(text: string): ParsedHeadingRef | null {
  // Match ![[Note#Heading]] or ![[Note#]]
  const match = text.match(/^!\[\[([^#\]]+)#([^\]]*)\]\]$/);
  if (!match) {
    return null;
  }

  const note = match[1].trim();
  const heading = match[2].trim();

  if (!note) {
    return null;
  }

  return {
    note,
    heading,
    hasEmptyHeading: heading === '',
    isValid: true,
  };
}

/**
 * Check if a string is a heading transclusion
 * @param text - The text to check
 * @returns true if the text is a heading transclusion (including picker mode ![[Note#]])
 */
export function isHeadingRef(text: string): boolean {
  return /^!\[\[.+#([^\]]*)?\]\]$/.test(text);
}

/**
 * Check if a string is a heading picker trigger (![[Note#]])
 * @param text - The text to check
 * @returns true if the text is a heading picker trigger
 */
export function isHeadingPickerTrigger(text: string): boolean {
  return /^!\[\[.+#\]\]$/.test(text);
}

/**
 * Extract the heading part from a heading reference
 * @param text - The heading reference text
 * @returns The heading text or empty string
 */
export function extractHeading(text: string): string {
  const parsed = parseHeadingRef(text);
  return parsed?.heading || '';
}

/**
 * Extract the note part from a heading reference
 * @param text - The heading reference text
 * @returns The note name
 */
export function extractNote(text: string): string {
  const parsed = parseHeadingRef(text);
  return parsed?.note || '';
}

/**
 * Create a heading reference string from note and heading
 * @param note - The note name
 * @param heading - The heading text (empty for picker mode)
 * @returns The heading reference string (e.g., "![[Note#Heading]]")
 */
export function createHeadingRef(note: string, heading: string): string {
  return `![[${note}#${heading}]]`;
}
