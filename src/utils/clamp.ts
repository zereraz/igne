/**
 * Clamp a number between min and max values (inclusive).
 *
 * @param value - The value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Get a safe array index, clamped to valid bounds.
 * Returns -1 for empty arrays.
 *
 * Bug this prevents:
 * - selectedIndex could become stale when array length changes
 * - Accessing array[selectedIndex] could return undefined and crash
 *
 * @param index - The desired index
 * @param arrayLength - The length of the array
 * @returns A valid index within [0, arrayLength-1], or -1 if array is empty
 */
export function safeArrayIndex(index: number, arrayLength: number): number {
  if (arrayLength <= 0) return -1;
  return clamp(index, 0, arrayLength - 1);
}
