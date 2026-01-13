// =============================================================================
// PDF Embed Parser Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import { parsePdfEmbed, isPdfEmbed } from '../embedParser';

describe('parsePdfEmbed', () => {
  it('should parse PDF embed with page number', () => {
    const result = parsePdfEmbed('document.pdf#page=5');
    expect(result).not.toBeNull();
    expect(result?.path).toBe('document.pdf');
    expect(result?.page).toBe(5);
  });

  it('should parse PDF embed without page number and default to page 1', () => {
    const result = parsePdfEmbed('document.pdf');
    expect(result).not.toBeNull();
    expect(result?.path).toBe('document.pdf');
    expect(result?.page).toBe(1);
  });

  it('should parse PDF embed with path separators', () => {
    const result = parsePdfEmbed('documents/reports/quarterly.pdf#page=3');
    expect(result).not.toBeNull();
    expect(result?.path).toBe('documents/reports/quarterly.pdf');
    expect(result?.page).toBe(3);
  });

  it('should parse PDF embed with spaces in filename', () => {
    const result = parsePdfEmbed('my document.pdf#page=2');
    expect(result).not.toBeNull();
    expect(result?.path).toBe('my document.pdf');
    expect(result?.page).toBe(2);
  });

  it('should handle uppercase PDF extension', () => {
    const result = parsePdfEmbed('DOCUMENT.PDF#page=1');
    expect(result).not.toBeNull();
    expect(result?.path).toBe('DOCUMENT.PDF');
    expect(result?.page).toBe(1);
  });

  it('should handle mixed case PDF extension', () => {
    const result = parsePdfEmbed('document.Pdf');
    expect(result).not.toBeNull();
    expect(result?.path).toBe('document.Pdf');
    expect(result?.page).toBe(1);
  });

  it('should handle double-digit page numbers', () => {
    const result = parsePdfEmbed('document.pdf#page=42');
    expect(result).not.toBeNull();
    expect(result?.path).toBe('document.pdf');
    expect(result?.page).toBe(42);
  });

  it('should return null for non-PDF files', () => {
    const result = parsePdfEmbed('document.md');
    expect(result).toBeNull();
  });

  it('should return null for image files', () => {
    const result = parsePdfEmbed('image.png');
    expect(result).toBeNull();
  });

  it('should return null for strings without PDF extension', () => {
    const result = parsePdfEmbed('just-a-file');
    expect(result).toBeNull();
  });

  it('should handle PDF with additional hash fragments', () => {
    // Additional hash fragments after page parameter are not supported
    // The regex won't match, so this returns null
    const result = parsePdfEmbed('file.pdf#page=5#section');
    expect(result).toBeNull();
  });

  it('should handle complex nested paths', () => {
    const result = parsePdfEmbed('a/b/c/d/e/f.pdf#page=10');
    expect(result).not.toBeNull();
    expect(result?.path).toBe('a/b/c/d/e/f.pdf');
    expect(result?.page).toBe(10);
  });

  it('should handle PDF at root level', () => {
    const result = parsePdfEmbed('/root.pdf');
    expect(result).not.toBeNull();
    expect(result?.path).toBe('/root.pdf');
    expect(result?.page).toBe(1);
  });

  it('should handle PDF with special characters in name', () => {
    const result = parsePdfEmbed('document_v2.0.pdf#page=3');
    expect(result).not.toBeNull();
    expect(result?.path).toBe('document_v2.0.pdf');
    expect(result?.page).toBe(3);
  });

  it('should return null for malformed page parameter', () => {
    // The regex requires digits after #page=, so non-digits won't match
    const result = parsePdfEmbed('document.pdf#page=abc');
    expect(result).toBeNull();
  });

  it('should handle page parameter with leading zeros', () => {
    const result = parsePdfEmbed('document.pdf#page=007');
    expect(result).not.toBeNull();
    expect(result?.page).toBe(7); // parseInt strips leading zeros
  });

  it('should handle very large page numbers', () => {
    const result = parsePdfEmbed('document.pdf#page=9999');
    expect(result).not.toBeNull();
    expect(result?.page).toBe(9999);
  });
});

describe('isPdfEmbed', () => {
  it('should return true for PDF files', () => {
    expect(isPdfEmbed('document.pdf')).toBe(true);
    expect(isPdfEmbed('file.PDF')).toBe(true);
    expect(isPdfEmbed('doc.Pdf')).toBe(true);
  });

  it('should return true for PDF files with page parameter', () => {
    expect(isPdfEmbed('document.pdf#page=5')).toBe(true);
    expect(isPdfEmbed('file.PDF#page=10')).toBe(true);
  });

  it('should return false for non-PDF files', () => {
    expect(isPdfEmbed('document.md')).toBe(false);
    expect(isPdfEmbed('image.png')).toBe(false);
    expect(isPdfEmbed('file.txt')).toBe(false);
    expect(isPdfEmbed('data.json')).toBe(false);
  });

  it('should return false for strings without extension', () => {
    expect(isPdfEmbed('document')).toBe(false);
    expect(isPdfEmbed('myfile')).toBe(false);
  });

  it('should handle paths with directories', () => {
    expect(isPdfEmbed('path/to/document.pdf')).toBe(true);
    expect(isPdfEmbed('a/b/c/file.pdf#page=3')).toBe(true);
    expect(isPdfEmbed('path/to/image.png')).toBe(false);
  });

  it('should handle files with PDF in name but not extension', () => {
    expect(isPdfEmbed('my-pdf-file.md')).toBe(false);
    expect(isPdfEmbed('pdf-notes.txt')).toBe(false);
  });
});
