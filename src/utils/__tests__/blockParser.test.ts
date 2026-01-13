import { describe, it, expect } from 'vitest';
import {
  parseBlockReference,
  parseEmbedBlockReference,
  isEmptyBlockReference,
  formatBlockReference,
  normalizeBlockId,
} from '../blockParser';

describe('blockParser', () => {
  describe('parseBlockReference', () => {
    it('parses simple block reference', () => {
      const result = parseBlockReference('![[Note#^abc123]]');
      expect(result).toEqual({
        note: 'Note',
        blockId: 'abc123',
        isBlockRef: true,
      });
    });

    it('parses block reference with hyphens', () => {
      const result = parseBlockReference('![[My Note#^my-block]]');
      expect(result).toEqual({
        note: 'My Note',
        blockId: 'my-block',
        isBlockRef: true,
      });
    });

    it('parses block reference with numbers', () => {
      const result = parseBlockReference('![[Note#^block123]]');
      expect(result).toEqual({
        note: 'Note',
        blockId: 'block123',
        isBlockRef: true,
      });
    });

    it('parses empty block ID', () => {
      const result = parseBlockReference('![[Note#^]]');
      expect(result).toEqual({
        note: 'Note',
        blockId: '',
        isBlockRef: true,
      });
    });

    it('returns null for non-block reference embed', () => {
      const result = parseBlockReference('![[Note]]');
      expect(result).toBeNull();
    });

    it('returns null for regular wikilink', () => {
      const result = parseBlockReference('[[Note#^blockid]]');
      // Should still parse if no ! prefix (wikilink syntax with block ref)
      expect(result).toEqual({
        note: 'Note',
        blockId: 'blockid',
        isBlockRef: true,
      });
    });

    it('returns null for reference without #^', () => {
      const result = parseBlockReference('![[Note#section]]');
      expect(result).toBeNull();
    });

    it('handles note names with spaces', () => {
      const result = parseBlockReference('![[My Long Note Name#^blockid]]');
      expect(result).toEqual({
        note: 'My Long Note Name',
        blockId: 'blockid',
        isBlockRef: true,
      });
    });

    it('handles nested paths', () => {
      const result = parseBlockReference('![[folder/note#^blockid]]');
      expect(result).toEqual({
        note: 'folder/note',
        blockId: 'blockid',
        isBlockRef: true,
      });
    });
  });

  describe('parseEmbedBlockReference', () => {
    it('is an alias for parseBlockReference', () => {
      const result1 = parseBlockReference('![[Note#^abc]]');
      const result2 = parseEmbedBlockReference('![[Note#^abc]]');
      expect(result1).toEqual(result2);
    });
  });

  describe('isEmptyBlockReference', () => {
    it('returns true for empty block ID', () => {
      expect(isEmptyBlockReference('![[Note#^]]')).toBe(true);
    });

    it('returns false for non-empty block ID', () => {
      expect(isEmptyBlockReference('![[Note#^abc]]')).toBe(false);
    });

    it('returns false for non-block reference', () => {
      expect(isEmptyBlockReference('![[Note]]')).toBe(false);
    });
  });

  describe('formatBlockReference', () => {
    it('formats as embed by default', () => {
      const result = formatBlockReference('Note', 'abc123');
      expect(result).toBe('![[Note#^abc123]]');
    });

    it('formats as wikilink when embed is false', () => {
      const result = formatBlockReference('Note', 'abc123', false);
      expect(result).toBe('[[Note#^abc123]]');
    });
  });

  describe('normalizeBlockId', () => {
    it('removes invalid characters', () => {
      expect(normalizeBlockId('my_block!id')).toBe('myblockid');
      expect(normalizeBlockId('block@id')).toBe('blockid');
      expect(normalizeBlockId('block#id')).toBe('blockid');
    });

    it('keeps valid characters', () => {
      expect(normalizeBlockId('my-block-123')).toBe('my-block-123');
      expect(normalizeBlockId('ABC123')).toBe('ABC123');
      expect(normalizeBlockId('abc')).toBe('abc');
    });

    it('handles empty string', () => {
      expect(normalizeBlockId('')).toBe('');
    });
  });
});
