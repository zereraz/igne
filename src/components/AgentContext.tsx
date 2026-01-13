/**
 * Agent Context Controls Component for Phase H: AI-First Layer
 *
 * Controls for scoping agent context:
 * - Select folders/notes to include
 * - Attach currently open note
 * - Limit to read-only mode
 * - Set max iterations
 */

import React, { useState } from 'react';
import { Folder, File, Lock, Settings, X } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface AgentContextConfig {
  /**
   * Folders to include in agent context
   */
  folders: string[];

  /**
   * Specific notes to include
   */
  notes: string[];

  /**
   * Attach the currently open note
   */
  attachOpenNote: boolean;

  /**
   * Read-only mode (no modifications)
   */
  readOnly: boolean;

  /**
   * Maximum iterations for agent execution
   */
  maxIterations: number;
}

interface AgentContextProps {
  /**
   * Current configuration
   */
  config: AgentContextConfig;

  /**
   * Callback when configuration changes
   */
  onConfigChange: (config: AgentContextConfig) => void;

  /**
   * Available folders in the vault
   */
  availableFolders?: string[];

  /**
   * Currently open note path
   */
  openNotePath?: string;
}

// =============================================================================
// Helper Components
// =============================================================================

function ContextItem({
  type,
  path,
  onRemove,
}: {
  type: 'folder' | 'note';
  path: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
      {type === 'folder' ? (
        <Folder className="w-4 h-4 text-blue-500" />
      ) : (
        <File className="w-4 h-4 text-green-500" />
      )}
      <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{path}</span>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        title="Remove"
      >
        <X className="w-3 h-3 text-gray-500" />
      </button>
    </div>
  );
}

function AddContextDialog({
  availableFolders,
  onAddFolder,
  onAddNote,
  onClose,
}: {
  availableFolders?: string[];
  onAddFolder: (path: string) => void;
  onAddNote: (path: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'folder' | 'note'>('folder');
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!input.trim()) return;

    if (tab === 'folder') {
      onAddFolder(input.trim());
    } else {
      onAddNote(input.trim());
    }
    setInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Context</h3>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-700">
          <button
            onClick={() => setTab('folder')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              tab === 'folder'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Folder
          </button>
          <button
            onClick={() => setTab('note')}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              tab === 'note'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Note
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {tab === 'folder' && availableFolders && availableFolders.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Select a folder:</p>
              {availableFolders.map(folder => (
                <button
                  key={folder}
                  onClick={() => {
                    onAddFolder(folder);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300"
                >
                  {folder}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={tab === 'folder' ? 'Folder path (e.g., docs/)' : 'Note path (e.g., docs/note.md)'}
                className="w-full px-3 py-2 border rounded dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AgentContext({ config, onConfigChange, availableFolders, openNotePath }: AgentContextProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleRemoveFolder = (path: string) => {
    onConfigChange({
      ...config,
      folders: config.folders.filter(f => f !== path),
    });
  };

  const handleRemoveNote = (path: string) => {
    onConfigChange({
      ...config,
      notes: config.notes.filter(n => n !== path),
    });
  };

  const handleAddFolder = (path: string) => {
    onConfigChange({
      ...config,
      folders: [...config.folders, path],
    });
  };

  const handleAddNote = (path: string) => {
    onConfigChange({
      ...config,
      notes: [...config.notes, path],
    });
  };

  const hasContext = config.folders.length > 0 || config.notes.length > 0 || config.attachOpenNote;

  return (
    <div className="p-4 bg-white dark:bg-gray-800 border rounded-lg dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Agent Context</h3>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          {showAdvanced ? 'Basic' : 'Advanced'}
        </button>
      </div>

      {/* Basic Controls */}
      <div className="space-y-3">
        {/* Attach Open Note */}
        {openNotePath && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.attachOpenNote}
              onChange={(e) =>
                onConfigChange({ ...config, attachOpenNote: e.target.checked })
              }
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Attach current note
            </span>
          </label>
        )}

        {/* Read-only mode */}
        <label className="flex items-center gap-2 cursor-pointer">
          <Lock className="w-4 h-4 text-gray-500" />
          <input
            type="checkbox"
            checked={config.readOnly}
            onChange={(e) =>
              onConfigChange({ ...config, readOnly: e.target.checked })
            }
            className="rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Read-only mode
          </span>
        </label>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-4">
          {/* Add context items */}
          <button
            onClick={() => setShowAddDialog(true)}
            className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-dashed dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded"
          >
            + Add folder or note
          </button>

          {/* Context items list */}
          {(config.folders.length > 0 || config.notes.length > 0) && (
            <div className="space-y-2">
              {config.folders.map(folder => (
                <ContextItem
                  key={folder}
                  type="folder"
                  path={folder}
                  onRemove={() => handleRemoveFolder(folder)}
                />
              ))}
              {config.notes.map(note => (
                <ContextItem
                  key={note}
                  type="note"
                  path={note}
                  onRemove={() => handleRemoveNote(note)}
                />
              ))}
            </div>
          )}

          {/* Max iterations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max iterations: {config.maxIterations}
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={config.maxIterations}
              onChange={(e) =>
                onConfigChange({ ...config, maxIterations: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Context summary */}
      {hasContext && (
        <div className="mt-4 pt-3 border-t dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Agent will have access to{' '}
            {config.folders.length > 0 && `${config.folders.length} folder${config.folders.length > 1 ? 's' : ''}`}
            {config.folders.length > 0 && config.notes.length > 0 && ', '}
            {config.notes.length > 0 && `${config.notes.length} note${config.notes.length > 1 ? 's' : ''}`}
            {config.attachOpenNote && ' and the current note'}
            {config.readOnly && ' (read-only)'}
          </p>
        </div>
      )}

      {/* Add dialog */}
      {showAddDialog && (
        <AddContextDialog
          availableFolders={availableFolders}
          onAddFolder={handleAddFolder}
          onAddNote={handleAddNote}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}
