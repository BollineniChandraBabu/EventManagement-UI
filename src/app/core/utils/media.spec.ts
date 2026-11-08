import { IMAGE_ACCEPT, IMAGE_HINT, MEDIA_ACCEPT, MAX_ATTACHMENT_BYTES, formatBytes, imageError, mediaError, mediaKindOf, previewKindFor } from './media';

const file = (name: string, type: string, size = 1024): File => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('media rules', () => {
  it('keeps the image accept list image-only', () => {
    expect(IMAGE_ACCEPT).toBe('image/png,image/jpeg,image/gif,image/webp,image/bmp');
    expect(IMAGE_HINT).toContain('5 MB');
    expect(IMAGE_HINT).not.toContain('video');
    expect(MEDIA_ACCEPT).toContain('video/mp4');
    expect(MEDIA_ACCEPT).toContain('application/pdf');
  });

  it('classifies media from the declared type, then the extension', () => {
    expect(mediaKindOf(file('a.png', 'image/png'))).toBe('image');
    expect(mediaKindOf(file('a.mp4', 'video/mp4'))).toBe('video');
    expect(mediaKindOf(file('a.mp3', 'audio/mpeg'))).toBe('audio');
    expect(mediaKindOf(file('a.pdf', 'application/pdf'))).toBe('document');
    expect(mediaKindOf(file('a.bin', ''))).toBe('other');
    expect(mediaKindOf(file('clip.mov', ''))).toBe('video');
  });

  it('applies the per-kind size limit', () => {
    expect(mediaError(file('big.png', 'image/png', 6 * 1024 * 1024))).toContain('5 MB');
    expect(mediaError(file('ok.mp4', 'video/mp4', 40 * 1024 * 1024))).toBeNull();
    expect(mediaError(file('big.mp4', 'video/mp4', 60 * 1024 * 1024))).toContain('50 MB');
    expect(mediaError(file('note.txt', 'text/plain'))).toContain('not a supported media type');
  });

  it('never treats an SVG as a supported image', () => {
    expect(mediaError(file('logo.svg', 'image/svg+xml'))).toContain('not a supported media type');
  });

  it('keeps image-only fields image-only', () => {
    expect(imageError(file('me.png', 'image/png'))).toBeNull();
    expect(imageError(file('clip.mp4', 'video/mp4'))).toContain('is not an image');
    expect(imageError(file('big.png', 'image/png', 6 * 1024 * 1024))).toContain('5 MB');
  });

  it('reports the preview kind and formats sizes', () => {
    expect(previewKindFor('video/mp4')).toBe('video');
    expect(previewKindFor('application/pdf')).toBe('pdf');
    expect(previewKindFor('application/zip')).toBeNull();
    expect(formatBytes(MAX_ATTACHMENT_BYTES)).toBe('50 MB');
  });
});
