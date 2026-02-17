import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';

let _storage: ReturnType<typeof createMMKV> | null = null;
function getStorage() {
  if (!_storage) _storage = createMMKV({ id: 'igne-ai' });
  return _storage;
}

interface AIState {
  /** URL of the local pi-mono proxy (e.g. http://192.168.0.10:9091) */
  serverUrl: string;
  /** Provider to use on the proxy (e.g. anthropic, openai) */
  provider: string;
  /** Model ID to use (e.g. claude-sonnet-4-20250514) */
  model: string;
  isGenerating: boolean;
  setServerUrl: (url: string) => void;
  setProvider: (p: string) => void;
  setModel: (m: string) => void;
  setGenerating: (b: boolean) => void;
}

export const useAIStore = create<AIState>((set) => ({
  serverUrl: getStorage().getString('serverUrl') || '',
  provider: getStorage().getString('provider') || 'anthropic',
  model: getStorage().getString('model') || 'claude-sonnet-4-20250514',
  isGenerating: false,
  setServerUrl: (url) => {
    getStorage().set('serverUrl', url);
    set({ serverUrl: url });
  },
  setProvider: (p) => {
    getStorage().set('provider', p);
    set({ provider: p });
  },
  setModel: (m) => {
    getStorage().set('model', m);
    set({ model: m });
  },
  setGenerating: (b) => set({ isGenerating: b }),
}));
