import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { Strikethrough, Highlight, Wikilink, Embed, BlockID, Tag, TaskMarker } from './markdownExtensions';

export function createMarkdownLanguage() {
  return markdown({
    codeLanguages: languages,
    extensions: [
      // Our custom extensions first
      Wikilink,
      Embed,
      BlockID,
      Tag,
      TaskMarker,
      Strikethrough,
      Highlight,
    ],
  });
}
