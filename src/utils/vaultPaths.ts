/**
 * Vault Path Utilities
 *
 * Convert between OS-absolute paths and vault-relative (vault-absolute) paths.
 * Vault-absolute paths are relative to the vault root and start with '/'.
 * They work across different machines and operating systems.
 */

/**
 * Convert OS absolute path to vault-absolute path
 * Example: /Users/name/Vault/Folder/Note.md -> /Folder/Note.md
 * Example: C:\Users\name\Vault\Folder\Note.md -> /Folder/Note.md
 *
 * @param osPath - The OS-absolute file path
 * @param vaultRoot - The OS-absolute path to the vault root
 * @returns The vault-absolute path (always starts with /)
 */
export function toVaultPath(osPath: string, vaultRoot: string): string {
  // Normalize both paths to use forward slashes
  const normalizedOsPath = osPath.replace(/\\/g, '/');
  const normalizedVaultRoot = vaultRoot.replace(/\\/g, '/');

  // Remove trailing slash from vault root if present
  const cleanVaultRoot = normalizedVaultRoot.endsWith('/')
    ? normalizedVaultRoot.slice(0, -1)
    : normalizedVaultRoot;

  // Check if the path is within the vault
  if (!normalizedOsPath.startsWith(cleanVaultRoot)) {
    // Path is outside vault, return as-is (or could throw error)
    return osPath;
  }

  // Remove vault root prefix and ensure leading slash
  let vaultPath = normalizedOsPath.slice(cleanVaultRoot.length);
  if (!vaultPath.startsWith('/')) {
    vaultPath = '/' + vaultPath;
  }

  return vaultPath;
}

/**
 * Convert vault-absolute path to OS path
 * Example: /Folder/Note.md -> /Users/name/Vault/Folder/Note.md
 * Example: /Folder/Note.md -> C:\Users\name\Vault\Folder\Note.md (Windows)
 *
 * @param vaultPath - The vault-absolute path (starts with /)
 * @param vaultRoot - The OS-absolute path to the vault root
 * @returns The OS-absolute file path
 */
export function toOsPath(vaultPath: string, vaultRoot: string): string {
  const shouldUseBackslashes =
    vaultRoot.includes('\\') || /^[A-Za-z]:[\\/]/.test(vaultRoot);

  // Normalize vault root for OS
  const normalizedVaultRoot = vaultRoot.replace(/\\/g, '/');

  // Normalize vault path - ensure it starts with / for path joining
  let cleanVaultPath = vaultPath.replace(/\\/g, '/');
  if (!cleanVaultPath.startsWith('/')) {
    cleanVaultPath = '/' + cleanVaultPath;
  }

  // Remove leading slash for joining
  const relativePath = cleanVaultPath.startsWith('/')
    ? cleanVaultPath.slice(1)
    : cleanVaultPath;

  // Join vault root with relative path
  const osPath = `${normalizedVaultRoot}/${relativePath}`;

  // Convert back to OS-specific separators
  if (shouldUseBackslashes) {
    return osPath.replace(/\//g, '\\');
  }

  return osPath;
}

/**
 * Normalize a path to use forward slashes consistently
 * Useful for display and comparison purposes
 *
 * @param path - The path to normalize
 * @returns The path with forward slashes
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Get the directory name of a vault-absolute path
 * Example: /Folder/SubFolder/Note.md -> /Folder/SubFolder
 * Example: /Note.md -> /
 *
 * @param vaultPath - The vault-absolute path
 * @returns The directory path
 */
export function getVaultDirname(vaultPath: string): string {
  const normalized = normalizePath(vaultPath);
  const lastSlashIndex = normalized.lastIndexOf('/');

  if (lastSlashIndex <= 0) {
    return '/';
  }

  return normalized.slice(0, lastSlashIndex);
}

/**
 * Get the file name from a vault-absolute path
 * Example: /Folder/SubFolder/Note.md -> Note.md
 * Example: /Note.md -> Note.md
 *
 * @param vaultPath - The vault-absolute path
 * @returns The file name with extension
 */
export function getVaultBasename(vaultPath: string): string {
  const normalized = normalizePath(vaultPath);
  const lastSlashIndex = normalized.lastIndexOf('/');

  if (lastSlashIndex === -1) {
    return normalized;
  }

  return normalized.slice(lastSlashIndex + 1);
}

/**
 * Join multiple path segments into a vault-absolute path
 * Example: joinVaultPaths('/Folder', 'SubFolder', 'Note.md') -> /Folder/SubFolder/Note.md
 *
 * @param segments - Path segments to join
 * @returns The joined vault-absolute path
 */
export function joinVaultPaths(...segments: string[]): string {
  const normalized = segments
    .map(s => s.replace(/\\/g, '/'))
    .filter(s => s !== '')
    .join('/');

  // Ensure starts with / if the first segment was absolute
  const firstSegment = segments[0] || '';
  if (firstSegment.startsWith('/') && !normalized.startsWith('/')) {
    return '/' + normalized;
  }

  return normalized;
}

/**
 * Check if a path is a vault-absolute path
 * A vault-absolute path starts with /
 *
 * @param path - The path to check
 * @returns True if the path is vault-absolute
 */
export function isVaultAbsolutePath(path: string): boolean {
  return path.startsWith('/');
}

/**
 * Resolve a relative path against a base vault path
 * Example: resolveVaultPath('/Folder/Note.md', '../Other.md') -> /Other.md
 *
 * @param basePath - The base vault path
 * @param relativePath - The relative path to resolve
 * @returns The resolved vault-absolute path
 */
export function resolveVaultPath(basePath: string, relativePath: string): string {
  const baseDir = getVaultDirname(basePath);
  const parts = baseDir === '/' ? [] : baseDir.split('/').slice(1);
  const relativeParts = relativePath.replace(/\\/g, '/').split('/');

  for (const part of relativeParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }

  return '/' + parts.join('/');
}
