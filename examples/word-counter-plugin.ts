/**
 * Word Counter Plugin
 * Counts words in the active document and displays in status bar
 */

import { Plugin, Notice } from '../src/obsidian/Plugin';
import type { App, Editor } from '../src/obsidian/App';

export default class WordCounterPlugin extends Plugin {
  private statusItem: HTMLElement | null = null;
  private editorChangeHandler?: () => void;

  async onload() {
    console.log('Loading Word Counter plugin');

    // Add status bar item
    this.statusItem = this.addStatusBarItem();
    this.statusItem.setText('Words: 0');

    // Add command to count words manually
    this.addCommand({
      id: 'count-words',
      name: 'Count Words',
      callback: () => {
        this.countWords();
      }
    });

    // Register event for editor changes
    this.editorChangeHandler = () => {
      this.updateWordCount();
    };

    this.registerEvent(
      this.app.workspace.on('editor-change', this.editorChangeHandler)
    );

    // Initial count
    this.updateWordCount();

    console.log('Word Counter plugin loaded');
  }

  private countWords() {
    const editor = this.getActiveEditor();
    if (!editor) {
      new Notice('No active editor');
      return;
    }

    const content = editor.getValue();
    const words = this.countWordsInText(content);

    new Notice(`Word count: ${words}`);
  }

  private updateWordCount() {
    const editor = this.getActiveEditor();
    if (!editor || !this.statusItem) {
      return;
    }

    const content = editor.getValue();
    const words = this.countWordsInText(content);

    this.statusItem.setText(`Words: ${words}`);
  }

  private countWordsInText(text: string): number {
    // Remove code blocks
    const withoutCodeBlocks = text.replace(/```[\s\S]*?```/g, '');

    // Remove inline code
    const withoutInlineCode = withoutCodeBlocks.replace(/`[^`]+`/g, '');

    // Count words (split by whitespace)
    const words = withoutInlineCode
      .split(/\s+/)
      .filter(word => word.trim().length > 0)
      .length;

    return words;
  }

  private getActiveEditor(): Editor | null {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return null;

    // Get the active editor view
    return this.app.workspace.activeEditor || null;
  }

  onunload() {
    if (this.editorChangeHandler) {
      this.app.workspace.off('editor-change', this.editorChangeHandler);
    }
    console.log('Unloading Word Counter plugin');
  }
}
