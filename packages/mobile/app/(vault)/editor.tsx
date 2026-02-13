/**
 * The Editor — where you read and write.
 *
 * Design:
 * - Header: just the filename + a tiny unsaved dot. Nothing else.
 * - The CM6 WebView fills everything. Content is king.
 * - Swipe-back gesture works (enabled in layout). No back button needed.
 * - Auto-save with 2s debounce. Flush on unmount so nothing is lost.
 * - Wikilink clicks resolve to real files and push a new editor screen.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { EditorWebView } from '../../sources/editor/EditorWebView';
import { readFileContent, writeFileContent } from '../../sources/sync/icloud';
import { useFileStore } from '../../sources/stores/fileStore';
import { useVaultStore } from '../../sources/stores/vaultStore';
import { useColors } from '../../sources/theme/colors';

export default function EditorScreen() {
  const params = useLocalSearchParams<{
    file: string;
    uri: string;
    name: string;
  }>();
  const file = Array.isArray(params.file) ? params.file[0] : params.file;
  const uri = Array.isArray(params.uri) ? params.uri[0] : params.uri;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;
  const c = useColors();
  const [content, setContent] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<string | null>(null);

  const { resolveWikilink } = useFileStore();
  const { setLastOpenedFile } = useVaultStore();

  const fileName = file
    ? decodeURIComponent(file.split('/').pop() || '').replace(/\.md$/, '') || 'Untitled'
    : 'Untitled';

  // Track this as the last opened file
  useEffect(() => {
    if (file) setLastOpenedFile(file);
  }, [file]);

  // Load file content
  useEffect(() => {
    if (file) {
      readFileContent(file).then((text) => {
        setContent(text);
        latestContentRef.current = text;
      });
    }
  }, [file]);

  // Flush any pending save on unmount — never lose edits
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (file && latestContentRef.current !== null) {
        // Fire-and-forget save of latest content
        writeFileContent(file, latestContentRef.current);
      }
    };
  }, [file]);

  // Auto-save with debounce
  const scheduleSave = useCallback(
    (newContent: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        if (file) {
          await writeFileContent(file, newContent);
          setIsDirty(false);
        }
      }, 2000);
    },
    [file]
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      latestContentRef.current = newContent;
      setIsDirty(true);
      scheduleSave(newContent);
    },
    [scheduleSave]
  );

  const handleWikilinkClick = useCallback(
    (target: string) => {
      const resolved = resolveWikilink(target);
      if (resolved) {
        router.push({
          pathname: '/(vault)/editor',
          params: { file: resolved, uri: uri!, name: name! },
        });
      }
      // If unresolved, do nothing — don't create files on mobile
    },
    [resolveWikilink, uri, name]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({
            paddingRight: 12,
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Text style={{ fontSize: 22, color: c.accent }}>‹</Text>
        </Pressable>
        {isDirty && (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: c.dirty,
              marginRight: 8,
            }}
          />
        )}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '500',
            color: c.text,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {fileName}
        </Text>
      </View>

      {/* Editor — takes everything */}
      {content !== null ? (
        <EditorWebView
          content={content}
          theme={c.isDark ? 'dark' : 'light'}
          onChange={handleContentChange}
          onWikilinkClick={handleWikilinkClick}
          style={{ backgroundColor: c.bg }}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: c.textMuted, fontSize: 14 }}>Loading...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
