import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { Strikethrough as GFMStrikethrough, Table, TaskList } from '@lezer/markdown';
import { Highlight, Wikilink, Embed, BlockID, Tag } from './markdownExtensions';

export function createMarkdownLanguage() {
  return markdown({
    codeLanguages: languages,
    extensions: [
      // Our custom extensions first
      Wikilink,
      Embed,
      BlockID,
      Tag,
      // GFM extensions for better compatibility
      Table,           // Built-in table support: | col | col |
      TaskList,        // Built-in task list support: - [ ] and - [x]
      GFMStrikethrough, // Built-in strikethrough: ~~text~~
      Highlight,       // Our custom highlight: ==text==
    ],
  });
}
