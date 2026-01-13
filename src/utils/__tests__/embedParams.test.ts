// =============================================================================
// Embed Parameters Parser Tests
// =============================================================================

import {
  parseEmbedTarget,
  parseEmbedParams,
  stringifyEmbedParams,
  getFileExtension,
  isImageFile,
  isVideoFile,
  isPdfFile,
  getEmbedStyles,
  type EmbedParams,
} from '../embedParams';

describe('embedParams', () => {
  describe('parseEmbedTarget', () => {
    it('should parse target without parameters', () => {
      const result = parseEmbedTarget('image.png');
      expect(result.path).toBe('image.png');
      expect(result.params).toEqual({});
    });

    it('should parse target with single parameter', () => {
      const result = parseEmbedTarget('image.png#width=300');
      expect(result.path).toBe('image.png');
      expect(result.params.width).toBe(300);
    });

    it('should parse target with multiple parameters using &', () => {
      const result = parseEmbedTarget('image.png#width=300&height=200');
      expect(result.path).toBe('image.png');
      expect(result.params.width).toBe(300);
      expect(result.params.height).toBe(200);
    });

    it('should parse target with multiple parameters using #', () => {
      const result = parseEmbedTarget('file.pdf#page=5#width=600');
      expect(result.path).toBe('file.pdf');
      expect(result.params.page).toBe(5);
      expect(result.params.width).toBe(600);
    });

    it('should parse target with path containing directory', () => {
      const result = parseEmbedTarget('assets/images/photo.png#width=50%');
      expect(result.path).toBe('assets/images/photo.png');
      expect(result.params.width).toBe('50%');
    });

    it('should handle target with special characters in path', () => {
      const result = parseEmbedTarget('my file (1).png#width=300');
      expect(result.path).toBe('my file (1).png');
      expect(result.params.width).toBe(300);
    });
  });

  describe('parseEmbedParams', () => {
    it('should parse empty params', () => {
      const result = parseEmbedParams('');
      expect(result).toEqual({ raw: '' });
    });

    it('should parse width as number', () => {
      const result = parseEmbedParams('width=300');
      expect(result.width).toBe(300);
    });

    it('should parse width as percentage string', () => {
      const result = parseEmbedParams('width=50%');
      expect(result.width).toBe('50%');
    });

    it('should parse height as number', () => {
      const result = parseEmbedParams('height=400');
      expect(result.height).toBe(400);
    });

    it('should parse page parameter', () => {
      const result = parseEmbedParams('page=5');
      expect(result.page).toBe(5);
    });

    it('should parse maxLines parameter', () => {
      const result = parseEmbedParams('maxLines=10');
      expect(result.maxLines).toBe(10);
    });

    it('should parse align parameter', () => {
      const result = parseEmbedParams('align=center');
      expect(result.align).toBe('center');
    });

    it('should reject invalid align values', () => {
      const result = parseEmbedParams('align=invalid');
      expect(result.align).toBeUndefined();
    });

    it('should parse alt text', () => {
      const result = parseEmbedParams('alt=My beautiful image');
      expect(result.alt).toBe('My beautiful image');
    });

    it('should parse title text', () => {
      const result = parseEmbedParams('title=Image Title');
      expect(result.title).toBe('Image Title');
    });

    it('should parse heading parameter', () => {
      const result = parseEmbedParams('heading=Introduction');
      expect(result.heading).toBe('Introduction');
    });

    it('should parse block parameter', () => {
      const result = parseEmbedParams('block=my-block-id');
      expect(result.block).toBe('my-block-id');
    });

    it('should parse boolean flags as true', () => {
      const result = parseEmbedParams('autoplay=true');
      expect(result.autoplay).toBe(true);
    });

    it('should parse boolean flags with 1 as true', () => {
      const result = parseEmbedParams('loop=1');
      expect(result.loop).toBe(true);
    });

    it('should parse boolean flags with 0 as false', () => {
      const result = parseEmbedParams('muted=0');
      expect(result.muted).toBe(false);
    });

    it('should parse standalone flag as true', () => {
      const result = parseEmbedParams('autoplay');
      expect(result.autoplay).toBe(true);
    });

    it('should parse collapse flag as true', () => {
      const result = parseEmbedParams('collapse');
      expect(result.collapse).toBe(true);
    });

    it('should parse noHeading flag as true', () => {
      const result = parseEmbedParams('noHeading');
      expect(result.noHeading).toBe(true);
    });

    it('should parse toolbar=false flag', () => {
      const result = parseEmbedParams('toolbar=false');
      expect(result.toolbar).toBe(false);
    });

    it('should parse multiple parameters with & separator', () => {
      const result = parseEmbedParams('width=300&height=200&align=center');
      expect(result.width).toBe(300);
      expect(result.height).toBe(200);
      expect(result.align).toBe('center');
    });

    it('should parse multiple parameters with # separator', () => {
      const result = parseEmbedParams('width=300#height=200#align=center');
      expect(result.width).toBe(300);
      expect(result.height).toBe(200);
      expect(result.align).toBe('center');
    });

    it('should parse mixed separators', () => {
      const result = parseEmbedParams('width=300#height=200&align=center');
      expect(result.width).toBe(300);
      expect(result.height).toBe(200);
      expect(result.align).toBe('center');
    });

    it('should handle extra whitespace', () => {
      const result = parseEmbedParams('width = 300 & height = 200');
      expect(result.width).toBe(300);
      expect(result.height).toBe(200);
    });

    it('should store raw string', () => {
      const result = parseEmbedParams('width=300&height=200');
      expect(result.raw).toBe('width=300&height=200');
    });
  });

  describe('stringifyEmbedParams', () => {
    it('should stringify empty params', () => {
      const result = stringifyEmbedParams({});
      expect(result).toBe('');
    });

    it('should stringify width and height', () => {
      const params: EmbedParams = { width: 300, height: 200 };
      const result = stringifyEmbedParams(params);
      expect(result).toBe('width=300&height=200');
    });

    it('should stringify boolean true values as flags', () => {
      const params: EmbedParams = { autoplay: true, loop: true };
      const result = stringifyEmbedParams(params);
      expect(result).toBe('autoplay&loop');
    });

    it('should skip boolean false values', () => {
      const params: EmbedParams = { autoplay: false, loop: false };
      const result = stringifyEmbedParams(params);
      expect(result).toBe('');
    });

    it('should stringify percentage width', () => {
      const params: EmbedParams = { width: '50%' };
      const result = stringifyEmbedParams(params);
      expect(result).toBe('width=50%');
    });

    it('should stringify align parameter', () => {
      const params: EmbedParams = { align: 'center' };
      const result = stringifyEmbedParams(params);
      expect(result).toBe('align=center');
    });

    it('should stringify alt text with spaces', () => {
      const params: EmbedParams = { alt: 'My beautiful image' };
      const result = stringifyEmbedParams(params);
      expect(result).toBe('alt=My beautiful image');
    });

    it('should skip undefined values', () => {
      const params: EmbedParams = { width: 300, height: undefined };
      const result = stringifyEmbedParams(params);
      expect(result).toBe('width=300');
    });

    it('should skip null values', () => {
      const params: EmbedParams = { width: 300, height: null };
      const result = stringifyEmbedParams(params);
      expect(result).toBe('width=300');
    });

    it('should skip raw property', () => {
      const params: EmbedParams = { width: 300, raw: 'width=300' };
      const result = stringifyEmbedParams(params);
      expect(result).toBe('width=300');
    });
  });

  describe('getFileExtension', () => {
    it('should extract extension from simple filename', () => {
      expect(getFileExtension('image.png')).toBe('png');
    });

    it('should extract extension from path', () => {
      expect(getFileExtension('assets/images/photo.png')).toBe('png');
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('my.file.name.pdf')).toBe('pdf');
    });

    it('should handle uppercase extensions', () => {
      expect(getFileExtension('image.PNG')).toBe('png');
    });

    it('should return empty string for no extension', () => {
      expect(getFileExtension('filename')).toBe('');
    });

    it('should return empty string for dot at end', () => {
      expect(getFileExtension('filename.')).toBe('');
    });
  });

  describe('isImageFile', () => {
    it('should return true for png', () => {
      expect(isImageFile('image.png')).toBe(true);
    });

    it('should return true for jpg', () => {
      expect(isImageFile('photo.jpg')).toBe(true);
    });

    it('should return true for jpeg', () => {
      expect(isImageFile('photo.jpeg')).toBe(true);
    });

    it('should return true for gif', () => {
      expect(isImageFile('animation.gif')).toBe(true);
    });

    it('should return true for webp', () => {
      expect(isImageFile('image.webp')).toBe(true);
    });

    it('should return true for svg', () => {
      expect(isImageFile('vector.svg')).toBe(true);
    });

    it('should return false for pdf', () => {
      expect(isImageFile('document.pdf')).toBe(false);
    });

    it('should return false for video', () => {
      expect(isImageFile('video.mp4')).toBe(false);
    });

    it('should handle uppercase extensions', () => {
      expect(isImageFile('image.PNG')).toBe(true);
    });
  });

  describe('isVideoFile', () => {
    it('should return true for mp4', () => {
      expect(isVideoFile('video.mp4')).toBe(true);
    });

    it('should return true for webm', () => {
      expect(isVideoFile('video.webm')).toBe(true);
    });

    it('should return true for ogg', () => {
      expect(isVideoFile('video.ogg')).toBe(true);
    });

    it('should return true for mov', () => {
      expect(isVideoFile('video.mov')).toBe(true);
    });

    it('should return false for image', () => {
      expect(isVideoFile('image.png')).toBe(false);
    });

    it('should return false for pdf', () => {
      expect(isVideoFile('document.pdf')).toBe(false);
    });
  });

  describe('isPdfFile', () => {
    it('should return true for pdf', () => {
      expect(isPdfFile('document.pdf')).toBe(true);
    });

    it('should return false for image', () => {
      expect(isPdfFile('image.png')).toBe(false);
    });

    it('should return false for video', () => {
      expect(isPdfFile('video.mp4')).toBe(false);
    });

    it('should handle uppercase', () => {
      expect(isPdfFile('document.PDF')).toBe(true);
    });
  });

  describe('getEmbedStyles', () => {
    it('should return empty object for no params', () => {
      const result = getEmbedStyles({});
      expect(result).toEqual({});
    });

    it('should convert width number to px', () => {
      const result = getEmbedStyles({ width: 300 });
      expect(result.width).toBe('300px');
    });

    it('should keep width percentage as string', () => {
      const result = getEmbedStyles({ width: '50%' });
      expect(result.width).toBe('50%');
    });

    it('should convert height number to px', () => {
      const result = getEmbedStyles({ height: 200 });
      expect(result.height).toBe('200px');
    });

    it('should keep height percentage as string', () => {
      const result = getEmbedStyles({ height: '50%' });
      expect(result.height).toBe('50%');
    });

    it('should add center alignment styles', () => {
      const result = getEmbedStyles({ align: 'center' });
      expect(result.display).toBe('block');
      expect(result.marginLeft).toBe('auto');
      expect(result.marginRight).toBe('auto');
    });

    it('should add left alignment styles', () => {
      const result = getEmbedStyles({ align: 'left' });
      expect(result.display).toBe('block');
      expect(result.marginLeft).toBe('0');
      expect(result.marginRight).toBe('auto');
    });

    it('should add right alignment styles', () => {
      const result = getEmbedStyles({ align: 'right' });
      expect(result.display).toBe('block');
      expect(result.marginLeft).toBe('auto');
      expect(result.marginRight).toBe('0');
    });

    it('should combine width and alignment', () => {
      const result = getEmbedStyles({ width: 300, align: 'center' });
      expect(result.width).toBe('300px');
      expect(result.display).toBe('block');
      expect(result.marginLeft).toBe('auto');
      expect(result.marginRight).toBe('auto');
    });
  });
});
