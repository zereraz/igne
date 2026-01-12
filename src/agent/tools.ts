/**
 * Agent Tool API for Phase H: AI-First Layer
 *
 * Tools that map agent operations to commands in the command registry.
 * Agents use these tools to interact with the vault through the same surface
 * available to UI and plugins.
 */

import type { Result } from '../tools/types';
import type { CommandSource } from '../tools/types';

// =============================================================================
// Agent Tool Types
// =============================================================================

/**
 * Schema for a tool parameter
 */
export interface ToolParameterSchema {
  type: 'string' | 'boolean' | 'number' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: unknown;
}

/**
 * Schema for an agent tool
 */
export interface AgentToolSchema {
  /**
   * Unique identifier for this tool
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Description of what the tool does
   */
  description: string;

  /**
   * Parameters schema for this tool
   */
  parameters: Record<string, ToolParameterSchema>;

  /**
   * Command ID in the command registry
   */
  commandId: string;
}

/**
 * Input to an agent tool
 */
export type AgentToolInput = Record<string, unknown>;

/**
 * Output from an agent tool execution
 */
export interface AgentToolOutput {
  success: boolean;
  data?: unknown;
  error?: string;
  duration?: number; // Execution time in milliseconds
}

// =============================================================================
// Agent Tool Definitions
// =============================================================================

/**
 * Agent tools that map to commands
 *
 * Each tool defines:
 * - The schema for its parameters (for validation and AI understanding)
 * - The command ID it maps to in the command registry
 */
export const AGENT_TOOLS: Record<string, AgentToolSchema> = {
  // File operations
  note_read: {
    id: 'note_read',
    name: 'Read Note',
    description: 'Read the content of a note file',
    parameters: {
      path: {
        type: 'string',
        description: 'Path to the note file',
        required: true,
      },
    },
    commandId: 'file.read',
  },

  note_write: {
    id: 'note_write',
    name: 'Write Note',
    description: 'Write content to an existing note file',
    parameters: {
      path: {
        type: 'string',
        description: 'Path to the note file',
        required: true,
      },
      content: {
        type: 'string',
        description: 'Content to write to the file',
        required: true,
      },
    },
    commandId: 'file.write',
  },

  note_create: {
    id: 'note_create',
    name: 'Create Note',
    description: 'Create a new note file with content',
    parameters: {
      path: {
        type: 'string',
        description: 'Path where the note should be created',
        required: true,
      },
      content: {
        type: 'string',
        description: 'Initial content for the note',
        required: false,
        default: '',
      },
    },
    commandId: 'file.new',
  },

  note_rename: {
    id: 'note_rename',
    name: 'Rename Note',
    description: 'Rename or move a note file',
    parameters: {
      oldPath: {
        type: 'string',
        description: 'Current path of the note',
        required: true,
      },
      newPath: {
        type: 'string',
        description: 'New path for the note',
        required: true,
      },
    },
    commandId: 'file.rename',
  },

  note_delete: {
    id: 'note_delete',
    name: 'Delete Note',
    description: 'Delete a note file',
    parameters: {
      path: {
        type: 'string',
        description: 'Path to the note to delete',
        required: true,
      },
    },
    commandId: 'file.delete',
  },

  // Search
  search_query: {
    id: 'search_query',
    name: 'Search Notes',
    description: 'Search for notes by content or title',
    parameters: {
      query: {
        type: 'string',
        description: 'Search query string',
        required: true,
      },
    },
    commandId: 'search.query',
  },

  // Navigation
  nav_open: {
    id: 'nav_open',
    name: 'Open Note',
    description: 'Open a note in the editor',
    parameters: {
      path: {
        type: 'string',
        description: 'Path to the note to open',
        required: true,
      },
      newTab: {
        type: 'boolean',
        description: 'Whether to open in a new tab',
        required: false,
        default: false,
      },
    },
    commandId: 'file.open',
  },

  // Workspace
  ws_split_horizontal: {
    id: 'ws_split_horizontal',
    name: 'Split Workspace Horizontal',
    description: 'Split the workspace horizontally',
    parameters: {},
    commandId: 'workspace.splitHorizontal',
  },

  ws_split_vertical: {
    id: 'ws_split_vertical',
    name: 'Split Workspace Vertical',
    description: 'Split the workspace vertically',
    parameters: {},
    commandId: 'workspace.splitVertical',
  },

  // Vault operations
  vault_open: {
    id: 'vault_open',
    name: 'Open Vault',
    description: 'Open a vault by path',
    parameters: {
      path: {
        type: 'string',
        description: 'Path to the vault directory',
        required: true,
      },
    },
    commandId: 'vault.open',
  },

  vault_create: {
    id: 'vault_create',
    name: 'Create Vault',
    description: 'Create a new vault',
    parameters: {
      path: {
        type: 'string',
        description: 'Path where the vault should be created',
        required: true,
      },
      name: {
        type: 'string',
        description: 'Name for the vault',
        required: true,
      },
    },
    commandId: 'vault.create',
  },

  // Template operations
  template_insert: {
    id: 'template_insert',
    name: 'Insert Template',
    description: 'Insert a template into the current note or create a new note from a template',
    parameters: {
      templatePath: {
        type: 'string',
        description: 'Path to the template file',
        required: true,
      },
      fileName: {
        type: 'string',
        description: 'File name if creating a new note from template',
        required: false,
      },
    },
    commandId: 'workspace.template',
  },

  // Daily notes
  daily_note_open: {
    id: 'daily_note_open',
    name: 'Open Daily Note',
    description: 'Open or create today\'s daily note',
    parameters: {},
    commandId: 'workspace.dailyNote',
  },
};

// =============================================================================
// Agent Tool Registry
// =============================================================================

/**
 * Get a tool schema by ID
 */
export function getToolSchema(toolId: string): AgentToolSchema | undefined {
  return AGENT_TOOLS[toolId];
}

/**
 * Get all tool schemas
 */
export function getAllToolSchemas(): AgentToolSchema[] {
  return Object.values(AGENT_TOOLS);
}

/**
 * Get tools by category (inferred from tool ID prefix)
 */
export function getToolsByCategory(category: string): AgentToolSchema[] {
  const prefixMap: Record<string, string> = {
    file: 'note_',
    search: 'search_',
    nav: 'nav_',
    workspace: 'ws_',
    vault: 'vault_',
    template: 'template_',
    daily: 'daily_',
  };

  const prefix = prefixMap[category];
  if (!prefix) return [];

  return Object.values(AGENT_TOOLS).filter(tool => tool.id.startsWith(prefix));
}

/**
 * Validate tool input against schema
 */
export function validateToolInput(
  toolId: string,
  input: AgentToolInput
): { valid: boolean; errors: string[] } {
  const tool = AGENT_TOOLS[toolId];
  if (!tool) {
    return { valid: false, errors: [`Tool "${toolId}" not found`] };
  }

  const errors: string[] = [];

  for (const [paramName, schema] of Object.entries(tool.parameters)) {
    // Check required parameters
    if (schema.required && !(paramName in input)) {
      errors.push(`Missing required parameter: ${paramName}`);
      continue;
    }

    // Skip validation if parameter is not provided and not required
    if (!(paramName in input)) continue;

    const value = input[paramName];

    // Type validation
    switch (schema.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Parameter "${paramName}" must be a string`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Parameter "${paramName}" must be a boolean`);
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          errors.push(`Parameter "${paramName}" must be a number`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`Parameter "${paramName}" must be an object`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Parameter "${paramName}" must be an array`);
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Convert tool to OpenAI function calling format (for external AI integration)
 */
export function toolToOpenAIFunction(tool: AgentToolSchema): {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
} {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [paramName, schema] of Object.entries(tool.parameters)) {
    properties[paramName] = {
      type: schema.type,
      description: schema.description,
      ...(schema.default !== undefined && { default: schema.default }),
    };

    if (schema.required) {
      required.push(paramName);
    }
  }

  return {
    type: 'function',
    function: {
      name: tool.id,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  };
}

/**
 * Get all tools in OpenAI function calling format
 */
export function getAllToolsAsOpenAIFunctions(): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}> {
  return Object.values(AGENT_TOOLS).map(toolToOpenAIFunction);
}
