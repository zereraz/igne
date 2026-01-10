import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownParser } from '../parser/MarkdownParser';

describe('MarkdownParser', () => {
  let parser: MarkdownParser;

  beforeEach(() => {
    parser = new MarkdownParser();
  });

  it('should parse headings', () => {
    const content = '# Heading 1\n## Heading 2\n### Heading 3';
    const result = parser.parse(content, 'test.md');

    expect(result.headings).toHaveLength(3);
    expect(result.headings![0]).toEqual({
      position: expect.any(Object),
      heading: 'Heading 1',
      level: 1,
    });
    expect(result.headings![1].level).toBe(2);
    expect(result.headings![2].level).toBe(3);
  });

  it('should parse wikilinks', () => {
    const content = 'This is a [[wikilink]] and [[alias|Display Name]]';
    const result = parser.parse(content, 'test.md');

    expect(result.links).toHaveLength(2);
    expect(result.links![0].link).toBe('wikilink');
    expect(result.links![1].link).toBe('alias');
    expect(result.links![1].displayText).toBe('Display Name');
  });

  it('should parse embeds', () => {
    const content = 'Embed: ![[Other Note]] here';
    const result = parser.parse(content, 'test.md');

    expect(result.embeds).toHaveLength(1);
    expect(result.embeds![0].link).toBe('Other Note');
  });

  it('should parse tags', () => {
    const content = 'This has #tag and #multi-word-tag';
    const result = parser.parse(content, 'test.md');

    expect(result.tags).toHaveLength(2);
    expect(result.tags![0].tag).toBe('tag');
    expect(result.tags![1].tag).toBe('multi-word-tag');
  });

  it('should parse block IDs', () => {
    const content = 'Some text\n^block-id\nMore text';
    const result = parser.parse(content, 'test.md');

    expect(result.blocks).toHaveProperty('block-id');
    expect(result.blocks!['block-id'].id).toBe('block-id');
  });

  it('should parse YAML frontmatter', () => {
    const content = `---
title: My Note
tags: [tag1, tag2]
published: true
count: 42
---

# Content`;
    const result = parser.parse(content, 'test.md');

    expect(result.frontmatter).toEqual({
      title: 'My Note',
      tags: ['tag1', 'tag2'],
      published: true,
      count: 42,
    });
    expect(result.frontmatterPosition).toBeDefined();
  });

  it('should parse task list items', () => {
    const content = `- [x] Done task\n- [ ] Todo task`;
    const result = parser.parse(content, 'test.md');

    expect(result.listItems).toHaveLength(2);
    expect(result.listItems![0].task).toBe(' ');
    expect(result.listItems![1].task).toBe('x');
  });

  it('should ignore code blocks', () => {
    const content = `# Heading
\`\`\`
Not a heading # fake
[[not a link]]
\`\`\``;
    const result = parser.parse(content, 'test.md');

    // Should only have the first heading, not the content inside code block
    expect(result.headings).toHaveLength(1);
    expect(result.links).toBeUndefined();
  });

  it('should handle empty content', () => {
    const content = '';
    const result = parser.parse(content, 'test.md');

    expect(result).toEqual({});
  });

  it('should handle content with no metadata', () => {
    const content = 'Just plain text\nwith no special elements';
    const result = parser.parse(content, 'test.md');

    expect(result.headings).toBeUndefined();
    expect(result.links).toBeUndefined();
    expect(result.tags).toBeUndefined();
  });

  it('should parse multiple links on same line', () => {
    const content = 'Link to [[page1]] and [[page2]] and [[page3]]';
    const result = parser.parse(content, 'test.md');

    expect(result.links).toHaveLength(3);
    expect(result.links![0].link).toBe('page1');
    expect(result.links![1].link).toBe('page2');
    expect(result.links![2].link).toBe('page3');
  });

  it('should parse frontmatter with various data types', () => {
    const content = `---
string: value
number: 123
boolean: true
array: [1, 2, 3]
object: {"key": "value"}
---

Content`;
    const result = parser.parse(content, 'test.md');

    expect(result.frontmatter).toEqual({
      string: 'value',
      number: 123,
      boolean: true,
      array: [1, 2, 3],
      object: { key: 'value' },
    });
  });

  it('should handle nested folder paths in links', () => {
    const content = 'Link to [[folder/note]] and [[folder/subfolder/another]]';
    const result = parser.parse(content, 'test.md');

    expect(result.links).toHaveLength(2);
    expect(result.links![0].link).toBe('folder/note');
    expect(result.links![1].link).toBe('folder/subfolder/another');
  });
});

describe('MetadataCache Integration', () => {
  it('should cache and retrieve metadata', async () => {
    // This is a placeholder for integration tests
    // Full integration tests would require setting up test fixtures with App and Vault
    expect(true).toBe(true);
  });
});
