import { describe, it, expect } from 'vitest';
import {
  parseHeadingRef,
  isHeadingRef,
  isHeadingPickerTrigger,
  extractHeading,
  extractNote,
  createHeadingRef,
} from '../headingParser';

describe('headingParser', () => {
  describe('parseHeadingRef', () => {
    it('should parse basic heading reference', () => {
      const result = parseHeadingRef('![[Note#Heading]]');
      expect(result).toEqual({
        note: 'Note',
        heading: 'Heading',
        hasEmptyHeading: false,
        isValid: true,
      });
    });

    it('should parse heading with spaces', () => {
      const result = parseHeadingRef('![[My Note#My Long Heading]]');
      expect(result).toEqual({
        note: 'My Note',
        heading: 'My Long Heading',
        hasEmptyHeading: false,
        isValid: true,
      });
    });

    it('should parse empty heading (picker mode)', () => {
      const result = parseHeadingRef('![[Note#]]');
      expect(result).toEqual({
        note: 'Note',
        heading: '',
        hasEmptyHeading: true,
        isValid: true,
      });
    });

    it('should parse heading with special characters', () => {
      const result = parseHeadingRef('![[Note#Heading with "quotes" and \'apostrophes\']]');
      expect(result).toEqual({
        note: 'Note',
        heading: 'Heading with "quotes" and \'apostrophes\'',
        hasEmptyHeading: false,
        isValid: true,
      });
    });

    it('should parse heading with symbols', () => {
      const result = parseHeadingRef('![[Note#Heading with @symbols # and $stuff]]');
      expect(result).toEqual({
        note: 'Note',
        heading: 'Heading with @symbols # and $stuff',
        hasEmptyHeading: false,
        isValid: true,
      });
    });

    it('should handle note with spaces', () => {
      const result = parseHeadingRef('![[My Note Name#Heading]]');
      expect(result).toEqual({
        note: 'My Note Name',
        heading: 'Heading',
        hasEmptyHeading: false,
        isValid: true,
      });
    });

    it('should return null for invalid syntax - missing closing brackets', () => {
      const result = parseHeadingRef('![[Note#Heading');
      expect(result).toBeNull();
    });

    it('should return null for invalid syntax - missing !', () => {
      const result = parseHeadingRef('[[Note#Heading]]');
      expect(result).toBeNull();
    });

    it('should return null for empty note', () => {
      const result = parseHeadingRef('![[#Heading]]');
      expect(result).toBeNull();
    });
  });

  describe('isHeadingRef', () => {
    it('should return true for valid heading reference', () => {
      expect(isHeadingRef('![[Note#Heading]]')).toBe(true);
    });

    it('should return true for picker mode', () => {
      expect(isHeadingRef('![[Note#]]')).toBe(true);
    });

    it('should return false for regular embed', () => {
      expect(isHeadingRef('![[Note]]')).toBe(false);
    });

    it('should return false for wikilink', () => {
      expect(isHeadingRef('[[Note#Heading]]')).toBe(false);
    });

    it('should return false for invalid syntax', () => {
      expect(isHeadingRef('![[Note]]')).toBe(false);
    });
  });

  describe('isHeadingPickerTrigger', () => {
    it('should return true for picker trigger', () => {
      expect(isHeadingPickerTrigger('![[Note#]]')).toBe(true);
    });

    it('should return false for regular heading reference', () => {
      expect(isHeadingPickerTrigger('![[Note#Heading]]')).toBe(false);
    });

    it('should return false for regular embed', () => {
      expect(isHeadingPickerTrigger('![[Note]]')).toBe(false);
    });
  });

  describe('extractHeading', () => {
    it('should extract heading text', () => {
      expect(extractHeading('![[Note#My Heading]]')).toBe('My Heading');
    });

    it('should return empty string for picker mode', () => {
      expect(extractHeading('![[Note#]]')).toBe('');
    });

    it('should return empty string for invalid input', () => {
      expect(extractHeading('![[Note]]')).toBe('');
    });
  });

  describe('extractNote', () => {
    it('should extract note name', () => {
      expect(extractNote('![[MyNote#Heading]]')).toBe('MyNote');
    });

    it('should extract note name with spaces', () => {
      expect(extractNote('![[My Note#Heading]]')).toBe('My Note');
    });

    it('should return empty string for invalid input', () => {
      expect(extractNote('![[#Heading]]')).toBe('');
    });
  });

  describe('createHeadingRef', () => {
    it('should create basic heading reference', () => {
      expect(createHeadingRef('Note', 'Heading')).toBe('![[Note#Heading]]');
    });

    it('should create picker mode reference', () => {
      expect(createHeadingRef('Note', '')).toBe('![[Note#]]');
    });

    it('should handle spaces in note and heading', () => {
      expect(createHeadingRef('My Note', 'My Heading')).toBe('![[My Note#My Heading]]');
    });
  });
});
