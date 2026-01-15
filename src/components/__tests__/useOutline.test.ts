import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOutline } from '../useOutline';

describe('useOutline', () => {
  describe('basic heading extraction', () => {
    it('should extract h1 heading', () => {
      const { result } = renderHook(() => useOutline('# Heading 1'));
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toMatchObject({
        level: 1,
        text: 'Heading 1',
        line: 1,
      });
    });

    it('should extract multiple levels of headings', () => {
      const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current).toHaveLength(6);
      expect(result.current.map((h) => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should extract heading text correctly', () => {
      const content = `# First Heading
## Second Heading with spaces
### Third: with special chars!`;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current[0].text).toBe('First Heading');
      expect(result.current[1].text).toBe('Second Heading with spaces');
      expect(result.current[2].text).toBe('Third: with special chars!');
    });

    it('should return empty array for content without headings', () => {
      const { result } = renderHook(() => useOutline('No headings here\nJust text'));
      expect(result.current).toHaveLength(0);
    });

    it('should not match heading without space after #', () => {
      const { result } = renderHook(() => useOutline('#NoSpace'));
      expect(result.current).toHaveLength(0);
    });

    it('should not match more than 6 #', () => {
      const { result } = renderHook(() => useOutline('####### Not a heading'));
      expect(result.current).toHaveLength(0);
    });
  });

  describe('code block handling', () => {
    it('should ignore headings inside fenced code blocks with backticks', () => {
      const content = `# Real Heading

\`\`\`bash
# This is a comment, not a heading
echo "hello"
\`\`\`

## Another Real Heading`;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current).toHaveLength(2);
      expect(result.current[0].text).toBe('Real Heading');
      expect(result.current[1].text).toBe('Another Real Heading');
    });

    it('should ignore headings inside fenced code blocks with tildes', () => {
      const content = `# Real Heading

~~~python
# Python comment
def foo():
    pass
~~~

## Another Real Heading`;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current).toHaveLength(2);
      expect(result.current[0].text).toBe('Real Heading');
      expect(result.current[1].text).toBe('Another Real Heading');
    });

    it('should handle multiple code blocks', () => {
      const content = `# First

\`\`\`
# Not a heading
\`\`\`

## Second

\`\`\`bash
# Also not a heading
# Neither is this
\`\`\`

### Third`;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current).toHaveLength(3);
      expect(result.current.map((h) => h.text)).toEqual(['First', 'Second', 'Third']);
    });

    it('should handle code block with language specifier', () => {
      const content = `# Heading

\`\`\`javascript
// comment
# This looks like a heading but it's in code
const x = 1;
\`\`\`

## Real`;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current).toHaveLength(2);
      expect(result.current[0].text).toBe('Heading');
      expect(result.current[1].text).toBe('Real');
    });

    it('should handle nested-looking code blocks correctly', () => {
      const content = `# Start

\`\`\`markdown
# Markdown heading inside code
## Another one
\`\`\`

# End`;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current).toHaveLength(2);
      expect(result.current[0].text).toBe('Start');
      expect(result.current[1].text).toBe('End');
    });

    it('should handle unclosed code block (treats rest as code)', () => {
      const content = `# Before

\`\`\`
# Inside unclosed block
## Also inside`;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current).toHaveLength(1);
      expect(result.current[0].text).toBe('Before');
    });
  });

  describe('line numbers and positions', () => {
    it('should track correct line numbers', () => {
      const content = `# Line 1

Some text

## Line 5`;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current[0].line).toBe(1);
      expect(result.current[1].line).toBe(5);
    });

    it('should calculate correct positions', () => {
      const content = `# H1
## H2`;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current[0].position).toBe(0);
      // Position of H2 = length of "# H1\n" = 5
      expect(result.current[1].position).toBe(5);
    });
  });

  describe('ID generation', () => {
    it('should generate lowercase IDs', () => {
      const { result } = renderHook(() => useOutline('# My Heading'));
      expect(result.current[0].id).toBe('my-heading');
    });

    it('should replace spaces with hyphens', () => {
      const { result } = renderHook(() => useOutline('# Multiple   Spaces   Here'));
      expect(result.current[0].id).toBe('multiple-spaces-here');
    });

    it('should remove special characters', () => {
      const { result } = renderHook(() => useOutline('# Heading with @special! chars?'));
      expect(result.current[0].id).toBe('heading-with-special-chars');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const { result } = renderHook(() => useOutline(''));
      expect(result.current).toHaveLength(0);
    });

    it('should handle content with only code blocks', () => {
      const content = `\`\`\`
# Comment
\`\`\``;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current).toHaveLength(0);
    });

    it('should handle inline code (not a code block)', () => {
      const content = `# Heading with \`inline code\`
Some text with \`# not a heading\` in it
## Real Heading`;
      const { result } = renderHook(() => useOutline(content));
      expect(result.current).toHaveLength(2);
    });
  });
});
