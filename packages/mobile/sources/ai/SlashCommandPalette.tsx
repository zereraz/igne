/**
 * SlashCommandPalette — overlay for AI slash commands.
 *
 * Shows when the user types "/" at the start of a line.
 * Commands: /summarize, /continue, /fix, /ask
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import type { Colors } from '../theme/colors';
import { useAIStore } from './aiStore';
import { complete } from './aiService';
import { summarizePrompt, continuePrompt, fixPrompt, askPrompt } from './prompts';

type ResultMode = 'insert' | 'replace';

interface SlashCommandPaletteProps {
  visible: boolean;
  noteContent: string;
  selection: string;
  colors: Colors & { isDark: boolean };
  onDismiss: () => void;
  onResult: (text: string, mode: ResultMode) => void;
}

type CommandId = 'summarize' | 'continue' | 'fix' | 'ask';

const commands: { id: CommandId; label: string; desc: string; needsSelection?: boolean }[] = [
  { id: 'summarize', label: '/summarize', desc: 'Summarize this note' },
  { id: 'continue', label: '/continue', desc: 'Continue writing' },
  { id: 'fix', label: '/fix', desc: 'Fix grammar & spelling', needsSelection: true },
  { id: 'ask', label: '/ask', desc: 'Ask a question about this note' },
];

export function SlashCommandPalette({
  visible,
  noteContent,
  selection,
  colors: c,
  onDismiss,
  onResult,
}: SlashCommandPaletteProps) {
  const { serverUrl, provider, model, isGenerating, setGenerating } = useAIStore();
  const [askMode, setAskMode] = useState(false);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setAskMode(false);
    setQuestion('');
    setError(null);
  }, []);

  const handleDismiss = useCallback(() => {
    if (isGenerating) {
      // Cancel by dismissing — the promise will resolve but we ignore the result
      setGenerating(false);
    }
    reset();
    onDismiss();
  }, [isGenerating, setGenerating, reset, onDismiss]);

  const runCommand = useCallback(
    async (cmd: CommandId, askQuestion?: string) => {
      if (!serverUrl) {
        setError('Set your AI server URL in Settings');
        return;
      }

      setError(null);
      setGenerating(true);
      Keyboard.dismiss();

      try {
        let messages;
        let mode: ResultMode = 'insert';

        switch (cmd) {
          case 'summarize':
            messages = summarizePrompt(noteContent);
            break;
          case 'continue':
            messages = continuePrompt(noteContent);
            break;
          case 'fix':
            messages = fixPrompt(selection);
            mode = 'replace';
            break;
          case 'ask':
            messages = askPrompt(noteContent, askQuestion || '');
            break;
        }

        const result = await complete(serverUrl, provider, model, messages);
        // Check if we were cancelled during the request
        if (!useAIStore.getState().isGenerating) return;

        setGenerating(false);
        reset();
        onResult(result, mode);
      } catch (err: any) {
        setGenerating(false);
        setError(err.message || 'Something went wrong');
      }
    },
    [serverUrl, provider, model, noteContent, selection, setGenerating, reset, onResult]
  );

  const handleCommand = useCallback(
    (cmd: CommandId) => {
      if (cmd === 'ask') {
        setAskMode(true);
        return;
      }
      runCommand(cmd);
    },
    [runCommand]
  );

  const handleAskSubmit = useCallback(() => {
    if (!question.trim()) return;
    runCommand('ask', question.trim());
  }, [question, runCommand]);

  if (!visible) return null;

  // Loading state
  if (isGenerating) {
    return (
      <View
        style={{
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <ActivityIndicator color={c.accent} />
        <Text style={{ color: c.textSecondary, fontSize: 14, flex: 1 }}>
          Generating...
        </Text>
        <Pressable
          onPress={handleDismiss}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ color: c.textMuted, fontSize: 14 }}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // Ask mode — question input
  if (askMode) {
    return (
      <View
        style={{
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
          padding: 12,
        }}
      >
        {error && (
          <Text style={{ color: '#e64553', fontSize: 12, marginBottom: 8 }}>{error}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => { setAskMode(false); setError(null); }}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ color: c.textMuted, fontSize: 18 }}>‹</Text>
          </Pressable>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask a question about this note..."
            placeholderTextColor={c.textMuted}
            returnKeyType="send"
            onSubmitEditing={handleAskSubmit}
            autoFocus
            autoCorrect={false}
            style={{
              flex: 1,
              padding: 10,
              backgroundColor: c.bg,
              color: c.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: c.border,
            }}
          />
          <Pressable
            onPress={handleAskSubmit}
            disabled={!question.trim()}
            hitSlop={8}
            style={({ pressed }) => ({
              opacity: pressed || !question.trim() ? 0.4 : 1,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: c.accent,
            })}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Ask</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Command list
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderTopWidth: 1,
        borderTopColor: c.border,
      }}
    >
      {error && (
        <Text style={{ color: '#e64553', fontSize: 12, paddingHorizontal: 16, paddingTop: 8 }}>
          {error}
        </Text>
      )}
      {commands.map((cmd) => {
        const disabled = cmd.needsSelection && !selection;
        return (
          <Pressable
            key={cmd.id}
            onPress={() => handleCommand(cmd.id)}
            disabled={disabled}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: pressed ? c.surfaceHover : 'transparent',
              opacity: disabled ? 0.4 : 1,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            })}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: c.accent,
                width: 90,
              }}
            >
              {cmd.label}
            </Text>
            <Text style={{ fontSize: 14, color: c.textSecondary, flex: 1 }}>
              {cmd.desc}
              {disabled ? ' (select text first)' : ''}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={handleDismiss}
        style={({ pressed }) => ({
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: pressed ? c.surfaceHover : 'transparent',
          alignItems: 'center',
        })}
      >
        <Text style={{ fontSize: 13, color: c.textMuted }}>Dismiss</Text>
      </Pressable>
    </View>
  );
}
