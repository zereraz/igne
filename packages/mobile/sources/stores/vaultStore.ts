import { create } from 'zustand';
import { createMMKV, type MMKV } from 'react-native-mmkv';

const storage: MMKV = createMMKV({ id: 'igne-vaults' });

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
  const raw = storage.getString('vaults');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveVaults(vaults: VaultEntry[]) {
  storage.set('vaults', JSON.stringify(vaults));
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vaults: loadVaults(),
  lastOpenedUri: storage.getString('lastOpenedUri') ?? null,
  lastOpenedFile: storage.getString('lastOpenedFile') ?? null,

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
    storage.set('lastOpenedUri', uri);
    const vaults = get().vaults.map((v) =>
      v.uri === uri ? { ...v, lastOpened: Date.now() } : v
    );
    saveVaults(vaults);
    set({ lastOpenedUri: uri, vaults });
  },

  setLastOpenedFile: (fileUri) => {
    if (fileUri) {
      storage.set('lastOpenedFile', fileUri);
    } else {
      storage.remove('lastOpenedFile');
    }
    set({ lastOpenedFile: fileUri });
  },
}));
