import { create } from 'zustand';
import { createMMKV, type MMKV } from 'react-native-mmkv';

let _storage: MMKV | null = null;
function getStorage(): MMKV {
  if (!_storage) _storage = createMMKV({ id: 'igne-vaults' });
  return _storage;
}

export interface VaultEntry {
  uri: string;
  name: string;
  lastOpened: number;
}

interface VaultState {
  vaults: VaultEntry[];
  lastOpenedUri: string | null;
  /** The last file the user was reading — restored on app open */
  lastOpenedFile: string | null;
  addVault: (vault: VaultEntry) => void;
  removeVault: (uri: string) => void;
  setLastOpened: (uri: string) => void;
  setLastOpenedFile: (fileUri: string | null) => void;
}

function loadVaults(): VaultEntry[] {
  const raw = getStorage().getString('vaults');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return [];
  }
}

function saveVaults(vaults: VaultEntry[]) {
  getStorage().set('vaults', JSON.stringify(vaults));
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vaults: loadVaults(),
  lastOpenedUri: getStorage().getString('lastOpenedUri') || null,
  lastOpenedFile: getStorage().getString('lastOpenedFile') || null,

  addVault: (vault) => {
    const existing = get().vaults;
    const filtered = existing.filter((v) => v.uri !== vault.uri);
    const updated = [{ ...vault, lastOpened: Date.now() }, ...filtered];
    saveVaults(updated);
    set({ vaults: updated });
  },

  removeVault: (uri) => {
    const updated = get().vaults.filter((v) => v.uri !== uri);
    saveVaults(updated);
    set({ vaults: updated });
  },

  setLastOpened: (uri) => {
    getStorage().set('lastOpenedUri', uri);
    const vaults = get().vaults.map((v) =>
      v.uri === uri ? { ...v, lastOpened: Date.now() } : v
    );
    saveVaults(vaults);
    set({ lastOpenedUri: uri, vaults });
  },

  setLastOpenedFile: (fileUri) => {
    if (fileUri) {
      getStorage().set('lastOpenedFile', fileUri);
    } else {
      getStorage().remove('lastOpenedFile');
    }
    set({ lastOpenedFile: fileUri });
  },
}));
