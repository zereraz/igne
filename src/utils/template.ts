/**
 * Template utility functions for variable substitution
 */

interface TemplateVariables {
  title: string;
  date: string;
  time: string;
  datetime: string;
  year: string;
  month: string;
  day: string;
  [key: string]: string;
}

/**
 * Format a date according to a format string
 */
export function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('YY', String(year).slice(-2))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Get default template variables
 */
export function getDefaultTemplateVariables(customTitle?: string): TemplateVariables {
  const now = new Date();

  return {
    title: customTitle || '',
    date: formatDate(now, 'YYYY-MM-DD'),
    time: formatDate(now, 'HH:mm'),
    datetime: formatDate(now, 'YYYY-MM-DD HH:mm'),
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, '0'),
    day: String(now.getDate()).padStart(2, '0'),
  };
}

/**
 * Apply template variables to a template string
 */
export function applyTemplate(template: string, variables: TemplateVariables): string {
  let result = template;

  // Replace all {{variable}} placeholders
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  });

  return result;
}

/**
 * Create a new file from a template
 */
export async function createFileFromTemplate(
  templatePath: string,
  targetPath: string,
  variables: TemplateVariables
): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');

  // Read template
  let template: string;
  try {
    template = await invoke('read_file', { path: templatePath });
  } catch (e) {
    throw new Error(`Failed to read template: ${templatePath}`);
  }

  // Apply variables
  const content = applyTemplate(template, variables);

  // Write to target
  await invoke('write_file', { path: targetPath, content });
}

/**
 * Get template variables from user input
 */
export function parseTemplateVariables(template: string, userInput: Record<string, string>): TemplateVariables {
  const variables = getDefaultTemplateVariables();

  // Extract custom variables from template ({{custom_var}})
  const customVarRegex = /{{([a-zA-Z_][a-zA-Z0-9_]*)}}/g;
  let match;
  const customVars = new Set<string>();

  while ((match = customVarRegex.exec(template)) !== null) {
    const varName = match[1];
    if (!variables.hasOwnProperty(varName)) {
      customVars.add(varName);
    }
  }

  // Add custom variables from user input
  customVars.forEach((varName) => {
    if (userInput[varName]) {
      variables[varName] = userInput[varName];
    }
  });

  return variables;
}
