/**
 * Template loader utility
 */

import { invoke } from '@tauri-apps/api/core';
import { applyTemplate, getDefaultTemplateVariables } from './template';

export interface Template {
  name: string;
  path: string;
  content: string;
}

/**
 * Load all templates from the Templates folder
 */
export async function loadTemplates(vaultPath: string): Promise<Template[]> {
  const templatesPath = `${vaultPath}/Templates`;

  try {
    // Check if Templates folder exists
    await invoke('read_directory', { path: templatesPath });

    // Get all markdown files in Templates folder
    const entries = await invoke<any[]>('read_directory', { path: templatesPath });
    const templates: Template[] = [];

    for (const entry of entries) {
      if (!entry.is_dir && entry.name.endsWith('.md')) {
        try {
          const content = await invoke<string>('read_file', { path: entry.path });
          templates.push({
            name: entry.name.replace('.md', ''),
            path: entry.path,
            content,
          });
        } catch (error) {
          console.error(`Failed to read template ${entry.path}:`, error);
        }
      }
    }

    return templates;
  } catch (error) {
    // Templates folder doesn't exist, return empty array
    return [];
  }
}

/**
 * Insert template content at cursor position
 */
export async function insertTemplateAtCursor(
  templatePath: string,
  cursorPosition: number,
  currentContent: string,
  _vaultPath: string
): Promise<{ content: string; cursorPosition: number }> {
  try {
    const templateContent = await invoke<string>('read_file', { path: templatePath });
    const variables = getDefaultTemplateVariables();
    const processedContent = applyTemplate(templateContent, variables);

    // Insert template at cursor position
    const newContent =
      currentContent.slice(0, cursorPosition) +
      processedContent +
      currentContent.slice(cursorPosition);

    return {
      content: newContent,
      cursorPosition: cursorPosition + processedContent.length,
    };
  } catch (error) {
    console.error('Failed to insert template:', error);
    throw error;
  }
}

/**
 * Create new file from template
 */
export async function createFileFromTemplate(
  templatePath: string,
  fileName: string,
  vaultPath: string
): Promise<{ path: string; content: string }> {
  try {
    // Ensure .md extension
    if (!fileName.endsWith('.md')) {
      fileName += '.md';
    }

    const templateContent = await invoke<string>('read_file', { path: templatePath });
    const variables = getDefaultTemplateVariables(fileName.replace('.md', ''));
    const processedContent = applyTemplate(templateContent, variables);

    // Create file in vault root
    const filePath = `${vaultPath}/${fileName}`;

    await invoke('write_file', {
      path: filePath,
      content: processedContent,
    });

    return {
      path: filePath,
      content: processedContent,
    };
  } catch (error) {
    console.error('Failed to create file from template:', error);
    throw error;
  }
}

/**
 * Insert template into current file
 */
export async function insertTemplateIntoFile(
  templatePath: string,
  currentContent: string,
  cursorPosition: number
): Promise<{ content: string; newPosition: number }> {
  const templateContent = await invoke<string>('read_file', { path: templatePath });
  const variables = getDefaultTemplateVariables();
  const processedContent = applyTemplate(templateContent, variables);

  const newContent =
    currentContent.slice(0, cursorPosition) +
    '\n' +
    processedContent +
    '\n' +
    currentContent.slice(cursorPosition);

  return {
    content: newContent,
    newPosition: cursorPosition + processedContent.length + 2, // +2 for the newlines
  };
}
