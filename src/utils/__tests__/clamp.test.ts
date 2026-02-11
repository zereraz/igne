import { describe, it, expect } from 'vitest';
import { clamp, safeArrayIndex } from '../clamp';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min when below', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max when above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles equal min and max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(0, -10, -1)).toBe(-1);
    expect(clamp(-15, -10, -1)).toBe(-10);
  });
});

describe('safeArrayIndex', () => {
  it('returns -1 for empty array', () => {
    expect(safeArrayIndex(0, 0)).toBe(-1);
    expect(safeArrayIndex(5, 0)).toBe(-1);
  });

  it('returns valid index when within bounds', () => {
    expect(safeArrayIndex(2, 5)).toBe(2);
  });

  it('clamps to 0 for negative index', () => {
    expect(safeArrayIndex(-1, 5)).toBe(0);
  });

  it('clamps to last index when exceeding length', () => {
    expect(safeArrayIndex(10, 5)).toBe(4);
  });

  it('handles single element array', () => {
    expect(safeArrayIndex(0, 1)).toBe(0);
    expect(safeArrayIndex(5, 1)).toBe(0);
    expect(safeArrayIndex(-1, 1)).toBe(0);
  });
});

/**
 * Bug regression tests
 *
 * Document the bug pattern that safeArrayIndex prevents.
 */
describe('Bug regressions - selectedIndex bounds', () => {
  // This test documents the bug pattern that was found in multiple components:
  // - QuickSwitcher
  // - CommandPalette
  // - Editor (wikilink search)
  // - BlockPicker
  // - TemplateInsertModal

  it('prevents accessing undefined array element', () => {
    const results = ['a', 'b', 'c'];
    let selectedIndex = 5; // Stale index from when array was longer

    // Bug: This would return undefined
    // const selected = results[selectedIndex];

    // Fix: Use safeArrayIndex
    const safeIndex = safeArrayIndex(selectedIndex, results.length);
    const selected = results[safeIndex];

    expect(selected).toBe('c'); // Gets last item instead of undefined
  });

  it('handles race condition where results update but index does not', () => {
    // Simulates: user types quickly, results change, selectedIndex is stale
    let results = ['match1', 'match2', 'match3', 'match4', 'match5'];
    let selectedIndex = 4; // User navigated to index 4

    // Results update due to new search query
    results = ['newMatch1']; // Now only 1 result

    // Without fix: results[4] would be undefined
    // With fix: safeArrayIndex returns 0
    const safeIndex = safeArrayIndex(selectedIndex, results.length);
    expect(safeIndex).toBe(0);
    expect(results[safeIndex]).toBe('newMatch1');
  });
});
