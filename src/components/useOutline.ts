import { useMemo } from 'react';

export interface Heading {
  id: string;
  level: number;
  text: string;
  line: number;
  position: number;
}

export function useOutline(content: string): Heading[] {
  return useMemo(() => {
    const headings: Heading[] = [];
    const lines = content.split('\n');
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for fenced code block delimiters (``` or ~~~)
      if (line.match(/^```|^~~~/)) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Skip headings inside code blocks
      if (inCodeBlock) {
        continue;
      }

      const match = line.match(/^(#{1,6})\s+(.+)$/);

      if (match) {
        const level = match[1].length;
        const text = match[2].trim();

        // Generate an ID from the heading text
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '') // Remove special chars
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim();

        // Calculate position (sum of line lengths + newlines)
        const position = lines.slice(0, i).reduce((acc, l) => acc + l.length + 1, 0);

        headings.push({
          id,
          level,
          text,
          line: i + 1,
          position,
        });
      }
    }

    return headings;
  }, [content]);
}
