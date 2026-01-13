// =============================================================================
// Embed Parameters Parser
// =============================================================================
// Parses embed parameters in the format: ![[target#key=value&key2=value2]]
// Supports Obsidian-compatible embed parameters for sizing, positioning, and content selection.

export interface EmbedParams {
  // Sizing parameters
  width?: string | number;
  height?: string | number;

  // Content selection parameters
  page?: number;
  heading?: string;
  block?: string;

  // Alignment
  align?: 'left' | 'center' | 'right';

  // Display options
  alt?: string;
  title?: string;

  // Video parameters
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;

  // PDF parameters
  toolbar?: boolean;

  // Heading/Block embed parameters
  collapse?: boolean;
  noHeading?: boolean;
  maxLines?: number;

  // Original params string for debugging
  raw?: string;
}

/**
 * Parse embed parameters from a target string
 * @param target - The full target string (e.g., "image.png#width=300" or "file.pdf#page=5&width=600")
 * @returns An object with the target path and parsed parameters
 */
export function parseEmbedTarget(target: string): { path: string; params: EmbedParams } {
  // Split on # to separate path from parameters
  const hashIndex = target.indexOf('#');
  const path = hashIndex >= 0 ? target.substring(0, hashIndex) : target;
  const paramString = hashIndex >= 0 ? target.substring(hashIndex + 1) : '';

  const params: EmbedParams = paramString ? parseEmbedParams(paramString) : {};

  return { path, params };
}

/**
 * Parse embed parameters from a parameter string
 * @param paramString - The parameter string (e.g., "width=300&height=200")
 * @returns Parsed parameters object
 */
export function parseEmbedParams(paramString: string): EmbedParams {
  const params: EmbedParams = { raw: paramString };

  // Handle both & and # as separators (Obsidian uses #key=value or #key=value#key2=value2)
  const segments = paramString.split(/[#&]/);

  for (const segment of segments) {
    if (!segment) continue;

    // Check if this is a key=value pair or just a flag
    const eqIndex = segment.indexOf('=');
    if (eqIndex >= 0) {
      const key = segment.substring(0, eqIndex).trim();
      const value = segment.substring(eqIndex + 1).trim();

      switch (key) {
        case 'width':
        case 'height':
          // Parse as number if it's just digits, otherwise keep as string (for percentages)
          // Check if value ends with % or contains non-digit characters
          if (value.endsWith('%') || isNaN(parseInt(value, 10))) {
            (params as any)[key] = value;
          } else {
            const numValue = parseInt(value, 10);
            (params as any)[key] = isNaN(numValue) ? value : numValue;
          }
          break;

        case 'page':
        case 'maxLines':
          params[key] = parseInt(value, 10);
          break;

        case 'align':
          if (['left', 'center', 'right'].includes(value.toLowerCase())) {
            params.align = value.toLowerCase() as 'left' | 'center' | 'right';
          }
          break;

        case 'alt':
        case 'title':
        case 'heading':
        case 'block':
          params[key] = value;
          break;

        case 'autoplay':
        case 'loop':
        case 'muted':
        case 'controls':
        case 'collapse':
        case 'noHeading':
        case 'toolbar':
          params[key] = value.toLowerCase() === 'true' || value === '1';
          break;

        default:
          // Store unknown params as-is for forward compatibility
          (params as any)[key] = value;
      }
    } else {
      // Flag without value (e.g., #autoplay)
      const key = segment.trim();
      switch (key) {
        case 'autoplay':
        case 'loop':
        case 'muted':
        case 'collapse':
        case 'noHeading':
          params[key] = true;
          break;

        case 'controls':
        case 'toolbar':
          params[key] = false; // These default to false when flag is present (to hide)
          break;

        default:
          (params as any)[key] = true;
      }
    }
  }

  return params;
}

/**
 * Convert parameters back to a string format
 * @param params - The parameters object
 * @returns A parameter string (e.g., "width=300&height=200")
 */
export function stringifyEmbedParams(params: EmbedParams): string {
  const segments: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (key === 'raw') continue; // Skip the raw string
    if (value === undefined || value === null) continue;

    if (typeof value === 'boolean') {
      if (value) {
        segments.push(key);
      }
    } else {
      segments.push(`${key}=${value}`);
    }
  }

  return segments.join('&');
}

/**
 * Extract file extension from a path
 * @param path - The file path
 * @returns The file extension (e.g., "png", "pdf", "mp4")
 */
export function getFileExtension(path: string): string {
  const match = path.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Determine if a file is an image based on extension
 * @param path - The file path
 * @returns True if the file is an image
 */
export function isImageFile(path: string): boolean {
  const ext = getFileExtension(path);
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
}

/**
 * Determine if a file is a video based on extension
 * @param path - The file path
 * @returns True if the file is a video
 */
export function isVideoFile(path: string): boolean {
  const ext = getFileExtension(path);
  return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext);
}

/**
 * Determine if a file is a PDF based on extension
 * @param path - The file path
 * @returns True if the file is a PDF
 */
export function isPdfFile(path: string): boolean {
  return getFileExtension(path) === 'pdf';
}

/**
 * Get CSS styles for an element based on embed parameters
 * @param params - The embed parameters
 * @returns CSS properties object
 */
export function getEmbedStyles(params: EmbedParams): React.CSSProperties {
  const styles: React.CSSProperties = {};

  if (params.width) {
    styles.width = typeof params.width === 'number' ? `${params.width}px` : params.width;
  }

  if (params.height) {
    styles.height = typeof params.height === 'number' ? `${params.height}px` : params.height;
  }

  if (params.align) {
    styles.display = 'block';
    styles.marginLeft = params.align === 'center' || params.align === 'right' ? 'auto' : '0';
    styles.marginRight = params.align === 'center' || params.align === 'left' ? 'auto' : '0';
  }

  return styles;
}
