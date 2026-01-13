import { describe, it, expect, beforeEach } from 'vitest';
import {
  findBlocks,
  findBlockById,
  extractBlockId,
  extractBlockContent,
  getBlockList,
  clearBlockCache,
  type BlockType,
} from '../blockFinder';

describe('blockFinder', () => {
  const sampleNote = `# Sample Note

This is a paragraph block ^para1

This is another paragraph ^para2

- List item one ^list1
- List item two ^list2
  - Nested item ^list3

> [!info] Callout block ^callout1
> With some content

> Quote block here ^quote1

\`\`\`javascript
const code = "block";
\`\`\` ^code1

## Heading block ^heading1

- [ ] Task one ^task1
- [x] Task two ^task2
`;

  beforeEach(() => {
    clearBlockCache();
  });

  describe('extractBlockId', () => {
    it('extracts block ID from end of line', () => {
      expect(extractBlockId('Paragraph ^myblock')).toBe('myblock');
    });

    it('extracts block ID with hyphens', () => {
      expect(extractBlockId('Paragraph ^my-block-id')).toBe('my-block-id');
    });

    it('extracts block ID with numbers', () => {
      expect(extractBlockId('Paragraph ^block123')).toBe('block123');
    });

    it('returns null if no block ID', () => {
      expect(extractBlockId('Paragraph')).toBeNull();
    });

    it('handles block ID with trailing spaces', () => {
      expect(extractBlockId('Paragraph ^myblock   ')).toBe('myblock');
    });
  });

  describe('findBlocks', () => {
    it('finds all blocks in a note', () => {
      const blocks = findBlocks(sampleNote);
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks.some((b) => b.id === 'para1')).toBe(true);
      expect(blocks.some((b) => b.id === 'list1')).toBe(true);
      expect(blocks.some((b) => b.id === 'callout1')).toBe(true);
    });

    it('sets correct line numbers', () => {
      const blocks = findBlocks(sampleNote);
      const para1 = blocks.find((b) => b.id === 'para1');
      expect(para1?.line).toBe(3); // Line 3 (1-indexed)
    });

    it('detects block types', () => {
      const blocks = findBlocks(sampleNote);

      const para1 = blocks.find((b) => b.id === 'para1');
      expect(para1?.type).toBe('paragraph');

      const list1 = blocks.find((b) => b.id === 'list1');
      expect(list1?.type).toBe('list');

      const callout1 = blocks.find((b) => b.id === 'callout1');
      expect(callout1?.type).toBe('callout');

      const quote1 = blocks.find((b) => b.id === 'quote1');
      expect(quote1?.type).toBe('quote');

      const code1 = blocks.find((b) => b.id === 'code1');
      expect(code1?.type).toBe('code');

      const heading1 = blocks.find((b) => b.id === 'heading1');
      expect(heading1?.type).toBe('heading');

      const task1 = blocks.find((b) => b.id === 'task1');
      expect(task1?.type).toBe('task');
    });

    it('caches results by note path', () => {
      const blocks1 = findBlocks(sampleNote, 'test.md');
      const blocks2 = findBlocks(sampleNote, 'test.md');
      expect(blocks1).toBe(blocks2); // Same reference
    });

    it('returns empty array for note with no blocks', () => {
      const blocks = findBlocks('# Note\nNo blocks here');
      expect(blocks).toEqual([]);
    });
  });

  describe('findBlockById', () => {
    it('finds specific block by ID', () => {
      const block = findBlockById(sampleNote, 'para1');
      expect(block).not.toBeNull();
      expect(block?.id).toBe('para1');
      expect(block?.type).toBe('paragraph');
    });

    it('returns null for non-existent block', () => {
      const block = findBlockById(sampleNote, 'nonexistent');
      expect(block).toBeNull();
    });
  });

  describe('extractBlockContent', () => {
    it('extracts paragraph content', () => {
      const block = findBlockById(sampleNote, 'para1');
      expect(block).not.toBeNull();
      const content = extractBlockContent(sampleNote, block!);
      expect(content).toContain('This is a paragraph block');
    });

    it('extracts list with nested items', () => {
      const block = findBlockById(sampleNote, 'list1');
      expect(block).not.toBeNull();
      const content = extractBlockContent(sampleNote, block!);
      expect(content).toContain('List item one');
      expect(content).toContain('List item two');
      expect(content).toContain('Nested item');
    });

    it('extracts callout content', () => {
      const block = findBlockById(sampleNote, 'callout1');
      expect(block).not.toBeNull();
      const content = extractBlockContent(sampleNote, block!);
      expect(content).toContain('[!info]');
      expect(content).toContain('Callout block');
      // The continuation line should be included
      expect(content).toContain('With some content');
    });
  });

  describe('getBlockList', () => {
    it('returns list of blocks with previews', () => {
      const list = getBlockList(sampleNote);

      expect(list.length).toBeGreaterThan(0);

      const para1 = list.find((b) => b.id === 'para1');
      expect(para1?.preview).toBe('This is a paragraph block');
    });

    it('includes block metadata', () => {
      const list = getBlockList(sampleNote);

      const para1 = list.find((b) => b.id === 'para1');
      expect(para1).toMatchObject({
        id: 'para1',
        line: 3,
        type: 'paragraph' as BlockType,
      });
    });
  });

  describe('clearBlockCache', () => {
    it('clears cache for specific note', () => {
      const blocks1 = findBlocks(sampleNote, 'test.md');
      clearBlockCache('test.md');
      // Should create new entry on next call (not the same reference)
      const blocks2 = findBlocks(sampleNote, 'test.md');
      expect(blocks1).not.toBe(blocks2);
    });

    it('clears all cache when no path specified', () => {
      const blocks1a = findBlocks(sampleNote, 'test1.md');
      const blocks2a = findBlocks(sampleNote, 'test2.md');
      clearBlockCache();
      // Should create new entries
      const blocks1b = findBlocks(sampleNote, 'test1.md');
      const blocks2b = findBlocks(sampleNote, 'test2.md');
      expect(blocks1a).not.toBe(blocks1b);
      expect(blocks2a).not.toBe(blocks2b);
    });
  });
});
