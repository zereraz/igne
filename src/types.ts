export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileEntry[];
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
}
