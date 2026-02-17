/**
 * The Stream — your vault as a river of notes.
 *
 * Design:
 * - Search bar always visible at top (doubles as quick switcher)
 * - Notes shown as title + first-line preview
 * - Tap → opens note in CM6 editor
 * - Pull to refresh
 * - If you had a file open last time, a subtle "resume" bar appears at top
 * - Settings gear opens theme picker
 *
 * No folders. No hierarchy. Just your notes, sorted by name.
 * The search bar IS the navigation. Type 2 letters → you're there.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  Keyboard,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFileStore, type FileEntry } from '../../sources/stores/fileStore';
import { useVaultStore } from '../../sources/stores/vaultStore';
import { useColors, useThemeStore, themes } from '../../sources/theme/colors';
import { createNote } from '../../sources/sync/icloud';
import { useAIStore } from '../../sources/ai/aiStore';

export default function Stream() {
  const params = useLocalSearchParams<{ uri: string; name: string }>();
  const uri = Array.isArray(params.uri) ? params.uri[0] : params.uri;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;

  const c = useColors();
  const { themeId, setTheme } = useThemeStore();
  const { serverUrl, provider: aiProvider, model: aiModel, setServerUrl, setProvider: setAIProvider, setModel: setAIModel } = useAIStore();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const searchRef = useRef<TextInput>(null);

  const { files, loading, loadFiles, searchFiles } = useFileStore();
  const { lastOpenedFile, setLastOpenedFile } = useVaultStore();

  useEffect(() => {
    if (uri) {
      setError(null);
      loadFiles(uri).catch((_err) => {
        setError('Failed to read vault');
      });
    } else {
      setError('No vault selected');
    }
  }, [uri]);

  const filteredFiles = query ? searchFiles(query) : files;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    if (uri) {
      try {
        await loadFiles(uri);
      } catch (_err) {
        setError('Failed to read vault');
      }
    }
    setRefreshing(false);
  }, [uri]);

  const openFile = (file: FileEntry) => {
    Keyboard.dismiss();
    setLastOpenedFile(file.path);
    router.push({
      pathname: '/(vault)/editor',
      params: { file: file.path, uri: uri!, name: name! },
    });
  };

  const resumeLastFile = () => {
    if (lastOpenedFile) {
      router.push({
        pathname: '/(vault)/editor',
        params: { file: lastOpenedFile, uri: uri!, name: name! },
      });
    }
  };

  const handleNewNote = () => {
    Keyboard.dismiss();
    Alert.prompt(
      'New note',
      'Enter a name for your note',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: (noteName?: string) => {
            if (!noteName?.trim() || !uri) return;
            const fileUri = createNote(uri, noteName.trim());
            if (fileUri) {
              // Refresh file list and open the new note
              loadFiles(uri);
              setLastOpenedFile(fileUri);
              router.push({
                pathname: '/(vault)/editor',
                params: { file: fileUri, uri: uri!, name: name! },
              });
            } else {
              Alert.alert('Could not create note', 'A note with that name may already exist.');
            }
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const displayName = (file: FileEntry) =>
    file.name.replace(/\.md$/, '');

  const lastFileName = lastOpenedFile
    ? decodeURIComponent(lastOpenedFile.split('/').pop() || '').replace(/\.md$/, '')
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header row: search + settings gear */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 4,
          gap: 10,
        }}
      >
        <TextInput
          ref={searchRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search notes..."
          placeholderTextColor={c.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          style={{
            flex: 1,
            padding: 12,
            backgroundColor: c.surface,
            color: c.text,
            fontSize: 16,
            borderWidth: 1,
            borderColor: query ? c.accent : c.border,
          }}
        />
        <Pressable
          onPress={handleNewNote}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Text style={{ fontSize: 24, color: c.accent, fontWeight: '300' }}>+</Text>
        </Pressable>
        <Pressable
          onPress={() => setSettingsOpen(true)}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 36,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Text style={{ fontSize: 20, color: c.textMuted }}>{'\u2699\uFE0E'}</Text>
        </Pressable>
      </View>

      {/* Resume bar — shows only when there's a last-opened file and no search */}
      {!query && lastFileName && (
        <Pressable
          onPress={resumeLastFile}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: pressed ? c.surfaceHover : 'transparent',
            borderBottomWidth: 1,
            borderBottomColor: c.border,
          })}
        >
          <View
            style={{
              width: 3,
              height: 16,
              backgroundColor: c.accent,
              marginRight: 12,
            }}
          />
          <Text style={{ fontSize: 14, color: c.textSecondary }} numberOfLines={1}>
            Continue reading
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: c.text,
              fontWeight: '500',
              marginLeft: 6,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {lastFileName}
          </Text>
        </Pressable>
      )}

      {/* The stream */}
      <FlatList
        data={filteredFiles}
        keyExtractor={(item) => item.path}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.textMuted}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openFile(item)}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: pressed ? c.surfaceHover : 'transparent',
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            })}
          >
            <Text
              style={{
                fontSize: 16,
                color: c.text,
                fontWeight: '500',
                lineHeight: 22,
              }}
              numberOfLines={1}
            >
              {displayName(item)}
            </Text>
            {item.preview ? (
              <Text
                style={{
                  fontSize: 13,
                  color: c.textMuted,
                  marginTop: 3,
                  lineHeight: 18,
                }}
                numberOfLines={1}
              >
                {item.preview}
              </Text>
            ) : null}
            {item.folder ? (
              <Text
                style={{
                  fontSize: 11,
                  color: c.textMuted,
                  marginTop: 2,
                  opacity: 0.7,
                }}
                numberOfLines={1}
              >
                {item.folder}
              </Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ padding: 48, alignItems: 'center' }}>
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center' }}>
              {loading
                ? 'Loading...'
                : error
                  ? error
                  : query
                    ? 'No notes match your search'
                    : 'No markdown files found'}
            </Text>
          </View>
        }
      />

      {/* Settings modal — theme picker */}
      <Modal
        visible={settingsOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: c.bg }}>
          {/* Modal header */}
          <SafeAreaView edges={['top']}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '600', color: c.text }}>
                Settings
              </Text>
              <Pressable
                onPress={() => setSettingsOpen(false)}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <Text style={{ fontSize: 16, color: c.accent }}>Done</Text>
              </Pressable>
            </View>
          </SafeAreaView>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* Theme section */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.textMuted, marginBottom: 10, letterSpacing: 0.5 }}>
              THEME
            </Text>

            {/* System default option */}
            <Pressable
              onPress={() => setTheme('system')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 14,
                backgroundColor: pressed ? c.surfaceHover : c.surface,
                borderWidth: 1,
                borderColor: themeId === 'system' ? c.accent : c.border,
                marginBottom: 8,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: c.text, fontWeight: '500' }}>System</Text>
                <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>Follow device appearance</Text>
              </View>
              {themeId === 'system' && (
                <Text style={{ fontSize: 18, color: c.accent }}>&#10003;</Text>
              )}
            </Pressable>

            {/* Theme list */}
            {themes.map((theme) => (
              <Pressable
                key={theme.id}
                onPress={() => setTheme(theme.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  backgroundColor: pressed ? c.surfaceHover : c.surface,
                  borderWidth: 1,
                  borderColor: themeId === theme.id ? c.accent : c.border,
                  marginBottom: 8,
                })}
              >
                {/* Color preview dots */}
                <View style={{ flexDirection: 'row', marginRight: 12, gap: 4 }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: c.border }} />
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.accent }} />
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.text, borderWidth: 1, borderColor: c.border }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: c.text, fontWeight: '500' }}>{theme.label}</Text>
                  <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>
                    {theme.isDark ? 'Dark' : 'Light'}
                  </Text>
                </View>
                {themeId === theme.id && (
                  <Text style={{ fontSize: 18, color: c.accent }}>&#10003;</Text>
                )}
              </Pressable>
            ))}

            {/* AI section */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.textMuted, marginTop: 24, marginBottom: 10, letterSpacing: 0.5 }}>
              AI (PI MONO)
            </Text>

            {/* Server URL */}
            <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 6 }}>
              Server URL
            </Text>
            <TextInput
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.x.x:9091"
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                padding: 12,
                backgroundColor: c.surface,
                color: c.text,
                fontSize: 15,
                borderWidth: 1,
                borderColor: serverUrl ? c.accent : c.border,
                marginBottom: 12,
              }}
            />

            {/* Provider */}
            <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 6 }}>
              Provider
            </Text>
            <TextInput
              value={aiProvider}
              onChangeText={setAIProvider}
              placeholder="anthropic"
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                padding: 12,
                backgroundColor: c.surface,
                color: c.text,
                fontSize: 15,
                borderWidth: 1,
                borderColor: c.border,
                marginBottom: 12,
              }}
            />

            {/* Model */}
            <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 6 }}>
              Model
            </Text>
            <TextInput
              value={aiModel}
              onChangeText={setAIModel}
              placeholder="claude-sonnet-4-20250514"
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                padding: 12,
                backgroundColor: c.surface,
                color: c.text,
                fontSize: 15,
                borderWidth: 1,
                borderColor: c.border,
                marginBottom: 6,
              }}
            />
            <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 16 }}>
              Run the proxy: bun run scripts/ai-proxy.ts
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
