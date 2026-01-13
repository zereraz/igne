import { describe, it, expect } from 'vitest';
import {
  findAllHeadings,
  findHeading,
  extractHeadingContent,
  getHeadingHierarchy,
  searchHeadings,
  headingCache,
} from '../headingFinder';

describe('headingFinder', () => {
  const sampleContent = `# Top Level Heading

This is content under the top level heading.

## Second Level Heading

Content under second level.

### Third Level Heading

Content under third level.

# Another Top Level

More content here.`;

  describe('findAllHeadings', () => {
    it('should find all headings in content', () => {
      const headings = findAllHeadings(sampleContent);
      expect(headings).toHaveLength(4);

      expect(headings[0].text).toBe('Top Level Heading');
      expect(headings[0].level).toBe(1);

      expect(headings[1].text).toBe('Second Level Heading');
      expect(headings[1].level).toBe(2);

      expect(headings[2].text).toBe('Third Level Heading');
      expect(headings[2].level).toBe(3);

      expect(headings[3].text).toBe('Another Top Level');
      expect(headings[3].level).toBe(1);
    });

    it('should return empty array for content without headings', () => {
      const headings = findAllHeadings('Just some content\nwithout any headings.');
      expect(headings).toHaveLength(0);
    });

    it('should handle heading with trailing spaces', () => {
      const content = `# Heading with spaces

Content here.`;
      const headings = findAllHeadings(content);
      expect(headings).toHaveLength(1);
      expect(headings[0].text).toBe('Heading with spaces');
    });

    it('should calculate line numbers correctly', () => {
      const headings = findAllHeadings(sampleContent);
      expect(headings[0].line).toBe(0);
      expect(headings[1].line).toBe(4);
      expect(headings[2].line).toBe(8);
    });
  });

  describe('findHeading', () => {
    it('should find exact heading match', () => {
      const heading = findHeading(sampleContent, 'Second Level Heading');
      expect(heading).not.toBeNull();
      expect(heading?.text).toBe('Second Level Heading');
      expect(heading?.level).toBe(2);
    });

    it('should find case-insensitive match', () => {
      const heading = findHeading(sampleContent, 'second level heading');
      expect(heading).not.toBeNull();
      expect(heading?.text).toBe('Second Level Heading');
    });

    it('should return null for non-existent heading', () => {
      const heading = findHeading(sampleContent, 'Non Existent Heading');
      expect(heading).toBeNull();
    });

    it('should handle headings with special characters', () => {
      const content = `# Heading with "quotes"

Content.`;
      const heading = findHeading(content, 'Heading with "quotes"');
      expect(heading).not.toBeNull();
    });
  });

  describe('extractHeadingContent', () => {
    it('should extract content under heading', () => {
      const result = extractHeadingContent(sampleContent, 'Second Level Heading');
      expect(result).not.toBeNull();
      expect(result?.heading.text).toBe('Second Level Heading');
      expect(result?.content).toContain('Content under second level.');
    });

    it('should stop at next same-level heading', () => {
      const result = extractHeadingContent(sampleContent, 'Top Level Heading');
      expect(result).not.toBeNull();
      expect(result?.content).toContain('This is content under the top level heading.');
      expect(result?.content).toContain('Second Level Heading'); // Should include nested
      expect(result?.content).not.toContain('Another Top Level'); // Should stop at next H1
    });

    it('should include nested headings in content', () => {
      const content = `# Main Section

Intro content.

## Subsection One

Sub content one.

## Subsection Two

Sub content two.

# Next Section`;

      const result = extractHeadingContent(content, 'Main Section');
      expect(result).not.toBeNull();
      expect(result?.includesNested).toBe(true);
      expect(result?.content).toContain('Subsection One');
      expect(result?.content).toContain('Subsection Two');
    });

    it('should stop at same-level heading', () => {
      const result = extractHeadingContent(sampleContent, 'Second Level Heading');
      expect(result).not.toBeNull();
      expect(result?.content).toContain('Content under second level.');
      expect(result?.content).toContain('Third Level Heading'); // Should include nested H3
    });

    it('should handle empty content under heading', () => {
      const content = `# Heading

# Next Heading`;

      const result = extractHeadingContent(content, 'Heading');
      expect(result).not.toBeNull();
      expect(result?.content).toBe('');
    });

    it('should return null for non-existent heading', () => {
      const result = extractHeadingContent(sampleContent, 'Non Existent');
      expect(result).toBeNull();
    });
  });

  describe('getHeadingHierarchy', () => {
    it('should build heading tree structure', () => {
      const content = `# H1
## H1-1
### H1-1-1
## H1-2
# H2
## H2-1`;

      const hierarchy = getHeadingHierarchy(content);
      expect(hierarchy).toHaveLength(2);

      expect(hierarchy[0].text).toBe('H1');
      expect(hierarchy[0].children).toHaveLength(2);
      expect(hierarchy[0].children[0].text).toBe('H1-1');
      expect(hierarchy[0].children[0].children[0].text).toBe('H1-1-1');
      expect(hierarchy[0].children[1].text).toBe('H1-2');

      expect(hierarchy[1].text).toBe('H2');
      expect(hierarchy[1].children[0].text).toBe('H2-1');
    });

    it('should handle flat structure', () => {
      const content = `# H1
# H2
# H3`;

      const hierarchy = getHeadingHierarchy(content);
      expect(hierarchy).toHaveLength(3);
      expect(hierarchy[0].children).toHaveLength(0);
      expect(hierarchy[1].children).toHaveLength(0);
      expect(hierarchy[2].children).toHaveLength(0);
    });

    it('should handle level jumps', () => {
      const content = `# H1
### H3
## H2
#### H4`;

      const hierarchy = getHeadingHierarchy(content);
      expect(hierarchy).toHaveLength(1);
      expect(hierarchy[0].text).toBe('H1');
      expect(hierarchy[0].children).toHaveLength(2); // H3, H2 (both under H1)
      expect(hierarchy[0].children[0].text).toBe('H3');
      expect(hierarchy[0].children[1].text).toBe('H2');
      expect(hierarchy[0].children[1].children).toHaveLength(1); // H4 under H2
      expect(hierarchy[0].children[1].children[0].text).toBe('H4');
    });
  });

  describe('searchHeadings', () => {
    it('should find headings matching query', () => {
      const results = searchHeadings(sampleContent, 'Top');
      expect(results).toHaveLength(2);
      expect(results[0].text).toBe('Top Level Heading');
      expect(results[1].text).toBe('Another Top Level');
    });

    it('should be case-insensitive', () => {
      const results = searchHeadings(sampleContent, 'top');
      expect(results).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      const results = searchHeadings(sampleContent, 'NonExistent');
      expect(results).toHaveLength(0);
    });

    it('should find partial matches', () => {
      const results = searchHeadings(sampleContent, 'Level');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('headingCache', () => {
    it('should cache and retrieve headings', () => {
      const filePath = '/test/path.md';
      const content = `# Test Heading

Test content.`;

      headingCache.set(filePath, content);
      const headings = headingCache.get(filePath);

      expect(headings).not.toBeNull();
      expect(headings).toHaveLength(1);
      expect(headings![0].text).toBe('Test Heading');
    });

    it('should find specific heading in cache', () => {
      const filePath = '/test/path2.md';
      const content = `# First
# Second
# Third`;

      headingCache.set(filePath, content);
      const heading = headingCache.find(filePath, 'Second');

      expect(heading).not.toBeNull();
      expect(heading?.text).toBe('Second');
    });

    it('should cache heading content results', () => {
      const filePath = '/test/path3.md';
      const headingText = 'Test Heading';
      const result = { content: 'Test content', headingLevel: 1 };

      headingCache.setHeadingContent(filePath, headingText, result);
      const cached = headingCache.getHeadingContent(filePath, headingText);

      expect(cached).toEqual(result);
    });

    it('should return null for uncached heading content', () => {
      const cached = headingCache.getHeadingContent('/nonexistent/path.md', 'Non Existent');
      expect(cached).toBeNull();
    });

    it('should clear cache for specific file', () => {
      const filePath = '/test/path4.md';
      const content = `# Test`;
      const headingText = 'Test';

      headingCache.set(filePath, content);
      headingCache.setHeadingContent(filePath, headingText, { content: 'x', headingLevel: 1 });

      expect(headingCache.get(filePath)).not.toBeNull();

      headingCache.clear(filePath);

      expect(headingCache.get(filePath)).toBeNull();
      expect(headingCache.getHeadingContent(filePath, headingText)).toBeNull();
    });
  });
});
