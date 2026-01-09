import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { searchStore } from '../stores/searchStore';

export function wikilinkAutocompletion() {
  return autocompletion({
    override: [wikilinkCompletionSource],
  });
}

function wikilinkCompletionSource(
  context: CompletionContext
): CompletionResult | null {
  const match = context.matchBefore(/\[\[[^\]]*/);

  // Only trigger if we're inside [[ and haven't closed it yet
  if (!match || (match.from === match.to && !context.explicit)) {
    return null;
  }

  // Don't trigger if we've already closed the wikilink
  const textAfterCursor = context.state.doc
    .toString()
    .slice(context.pos, context.pos + 2);
  if (textAfterCursor.startsWith(']]')) {
    return null;
  }

  // Get all note names as completion options
  const noteNames = searchStore.getAllNoteNames();

  const options = noteNames.map((name) => ({
    label: name,
    type: 'text',
    info: `Link to ${name}`,
    apply: (view: any) => {
      // Get the text before the cursor inside the [[ ]]
      const currentText = match ? match.text.slice(2) : ''; // Remove [[ prefix

      // Find the common prefix to replace
      let commonPrefix = '';
      for (let i = 0; i < currentText.length && i < name.length; i++) {
        if (currentText[i].toLowerCase() === name[i].toLowerCase()) {
          commonPrefix += currentText[i];
        } else {
          break;
        }
      }

      // Replace from the start of the common prefix (after [[)
      const from = match.from + 2; // After [[
      const to = context.pos;

      view.dispatch({
        changes: {
          from,
          to,
          insert: name + ']]',
        },
        selection: {
          anchor: from + name.length + 2,
        },
      });
    },
  }));

  return {
    from: match.from,
    options,
  };
}
