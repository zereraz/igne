/**
 * Vault Picker — shown only when no vault is configured.
 *
 * If a vault was previously opened, we skip this entirely
 * and go straight to the vault (handled in useEffect).
 *
 * Design: minimal. One action. Get out of the way.
 */

import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigationContainerRef } from 'expo-router';
import { useVaultStore, type VaultEntry } from '../sources/stores/vaultStore';
import { pickVaultFolder } from '../sources/sync/icloud';
import { useColors } from '../sources/theme/colors';

export default function VaultPicker() {
  const c = useColors();
  const { vaults, lastOpenedUri, addVault, setLastOpened } = useVaultStore();
  const nav = useNavigationContainerRef();

  // Auto-open last vault — wait for navigator to be ready first
  useEffect(() => {
    if (!lastOpenedUri) return;
    const vault = vaults.find((v) => v.uri === lastOpenedUri);
    if (!vault) return;

    if (nav?.isReady()) {
      openVault(vault);
    } else {
      const unsub = nav?.addListener('state', () => {
        openVault(vault);
        unsub?.();
      });
      return () => unsub?.();
    }
  }, []);

  const openVault = (vault: VaultEntry) => {
    setLastOpened(vault.uri);
    router.replace({
      pathname: '/(vault)',
      params: { uri: vault.uri, name: vault.name },
    });
  };

  const handlePickFolder = async () => {
    const result = await pickVaultFolder();
    if (result) {
      addVault(result);
      openVault(result);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        {/* App identity — small and quiet */}
        <Text
          style={{
            fontSize: 32,
            fontWeight: '300',
            color: c.text,
            letterSpacing: -1,
          }}
        >
          igne
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: c.textMuted,
            marginTop: 8,
            marginBottom: 48,
            lineHeight: 22,
          }}
        >
          Open your vault folder{'\n'}to get started.
        </Text>

        {/* Previous vaults — if any */}
        {vaults.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            {vaults.map((vault) => (
              <Pressable
                key={vault.uri}
                onPress={() => openVault(vault)}
                style={({ pressed }) => ({
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: pressed ? c.surfaceHover : 'transparent',
                  borderBottomWidth: 1,
                  borderBottomColor: c.border,
                })}
              >
                <Text style={{ fontSize: 16, color: c.text }}>
                  {vault.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Open vault — the only action */}
        <Pressable
          onPress={handlePickFolder}
          style={({ pressed }) => ({
            paddingVertical: 14,
            paddingHorizontal: 20,
            backgroundColor: pressed ? c.surfaceHover : c.surface,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
          })}
        >
          <Text style={{ color: c.accent, fontSize: 15, fontWeight: '500' }}>
            Open vault folder
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
