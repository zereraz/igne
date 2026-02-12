/**
 * The Stream — your vault as a river of notes.
 *
 * Design:
 * - Search bar always visible at top (doubles as quick switcher)
 * - Notes shown as title + first-line preview
 * - Tap → opens note in CM6 editor
 * - Pull to refresh
 * - If you had a file open last time, a subtle "resume" bar appears at top
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFileStore, type FileEntry } from '../../sources/stores/fileStore';
import { useVaultStore } from '../../sources/stores/vaultStore';
import { useColors } from '../../sources/theme/colors';

export default function Stream() {
  const { uri, name } = useLocalSearchParams<{ uri: string; name: string }>();
  const c = useColors();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const searchRef = useRef<TextInput>(null);

  const { files, loading, loadFiles, searchFiles } = useFileStore();
  const { lastOpenedFile, setLastOpenedFile } = useVaultStore();

  useEffect(() => {
    if (uri) loadFiles(uri);
  }, [uri]);

  const filteredFiles = query ? searchFiles(query) : files;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (uri) await loadFiles(uri);
    setRefreshing(false);
  }, [uri]);

  const openFile = (file: FileEntry) => {
    Keyboard.dismiss();
    setLastOpenedFile(file.path);
    router.push({
      pathname: '/(vault)/[file]',
      params: { file: file.path, uri: uri!, name: name! },
    });
  };

  const resumeLastFile = () => {
    if (lastOpenedFile) {
      router.push({
        pathname: '/(vault)/[file]',
        params: { file: lastOpenedFile, uri: uri!, name: name! },
      });
    }
  };

  // Extract display name from a file path
  const displayName = (file: FileEntry) =>
    file.name.replace(/\.md$/, '');

  // Extract the last file's name for the resume bar
  const lastFileName = lastOpenedFile
    ? decodeURIComponent(lastOpenedFile.split('/').pop() || '').replace(/\.md$/, '')
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Search — always visible, always ready */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 4,
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
            padding: 12,
            backgroundColor: c.surface,
            color: c.text,
            fontSize: 16,
            borderWidth: 1,
            borderColor: query ? c.accent : c.border,
          }}
        />
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
                : query
                  ? 'No notes match your search'
                  : 'No markdown files found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
