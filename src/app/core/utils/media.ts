/**
 * Media kinds and limits shared with the backend (`MediaValidation.java`). Uploads are checked
 * here first so a bad file is explained before anything is sent, and the same rules the server
 * applies are shown to the user.
 */

export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'other';

export interface MediaKindRule {
  kind: MediaKind;
  label: string;
  maxBytes: number;
  accept: string;
}

const MB = 1024 * 1024;

export const MEDIA_KIND_RULES: MediaKindRule[] = [
  { kind: 'image', label: 'Image', maxBytes: 5 * MB, accept: 'image/png,image/jpeg,image/gif,image/webp,image/bmp' },
  { kind: 'video', label: 'Video', maxBytes: 50 * MB, accept: 'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/mpeg,video/3gpp' },
  { kind: 'audio', label: 'Audio', maxBytes: 10 * MB, accept: 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/flac' },
  { kind: 'document', label: 'Document', maxBytes: 20 * MB, accept: 'application/pdf' }
];

/** What the file input should accept: every supported media type. */
export const MEDIA_ACCEPT = MEDIA_KIND_RULES.map((rule) => rule.accept).join(',');

/** Chat attachments may be any file up to the multipart limit. */
export const MAX_ATTACHMENT_BYTES = 50 * MB;

export const MEDIA_HINT =
  'PNG, JPEG, GIF, WebP or BMP (5 MB), MP4, WebM, MOV, AVI, MKV, MPEG or 3GP (50 MB), ' +
  'MP3, WAV, OGG, M4A or FLAC (10 MB), or PDF (20 MB)';

const IMAGE_RULE = MEDIA_KIND_RULES.find((rule) => rule.kind === 'image')!;

/** What an image-only input should accept (`MediaValidation.validateImage`). */
export const IMAGE_ACCEPT = IMAGE_RULE.accept;

export const IMAGE_HINT = 'PNG, JPEG, GIF, WebP or BMP (5 MB)';

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp)$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv|mpe?g|3gp)$/i;
const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|m4a|flac)$/i;

/**
 * The exact MIME types the server accepts (`MediaContentTypes`). Anything else - including other
 * `image/*` subtypes such as SVG or TIFF - is rejected, so the UI never offers a file the server
 * will refuse.
 */
const IMAGE_TYPES = new Set(IMAGE_RULE.accept.split(','));
const VIDEO_TYPES = new Set(MEDIA_KIND_RULES.find((rule) => rule.kind === 'video')!.accept.split(','));
const AUDIO_TYPES = new Set(MEDIA_KIND_RULES.find((rule) => rule.kind === 'audio')!.accept.split(','));

/** Works out the kind of media from the declared MIME type, falling back to the file name. */
export function mediaKindOf(file: File): MediaKind {
  return mediaKindFromType(file.type) ?? mediaKindFromName(file.name) ?? 'other';
}

function mediaKindFromType(contentType: string): MediaKind | null {
  const type = (contentType || '').toLowerCase();
  if (!type) {
    return null;
  }
  if (IMAGE_TYPES.has(type)) return 'image';
  if (VIDEO_TYPES.has(type)) return 'video';
  if (AUDIO_TYPES.has(type)) return 'audio';
  if (type === 'application/pdf') return 'document';
  return null;
}

function mediaKindFromName(fileName: string): MediaKind | null {
  const name = (fileName || '').toLowerCase();
  if (IMAGE_EXTENSIONS.test(name)) return 'image';
  if (VIDEO_EXTENSIONS.test(name)) return 'video';
  if (AUDIO_EXTENSIONS.test(name)) return 'audio';
  if (name.endsWith('.pdf')) return 'document';
  return null;
}

export function isSupportedMedia(file: File): boolean {
  return mediaKindOf(file) !== 'other';
}

/** A short "5 MB" style label for a byte count. */
export function formatBytes(bytes: number): string {
  if (bytes >= MB) {
    return `${Math.round(bytes / MB)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * The reason a file cannot be uploaded, or null when it is fine. Mirrors the server rules
 * (byte-sniffing is left to the server, which sees the real bytes).
 */
export function mediaError(file: File): string | null {
  const kind = mediaKindOf(file);
  if (kind === 'other') {
    return `${file.name || 'This file'} is not a supported media type. Use ${MEDIA_HINT}.`;
  }
  const rule = MEDIA_KIND_RULES.find((candidate) => candidate.kind === kind);
  if (rule && file.size > rule.maxBytes) {
    return `The ${rule.label.toLowerCase()} is ${formatBytes(file.size)}. The limit is ${formatBytes(rule.maxBytes)}.`;
  }
  return null;
}

/** The reason a file cannot be used where only an image is accepted (`MediaValidation.validateImage`). */
export function imageError(file: File): string | null {
  if (mediaKindOf(file) !== 'image') {
    return `${file.name || 'This file'} is not an image. Use ${IMAGE_HINT}.`;
  }
  return mediaError(file);
}

/** How a piece of media can be shown in the browser, if at all. */
export type MediaPreviewKind = 'image' | 'video' | 'audio' | 'pdf' | null;

export function previewKindFor(contentType: string | null | undefined, fileName?: string | null): MediaPreviewKind {
  const type = (contentType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();
  if (IMAGE_TYPES.has(type) || IMAGE_EXTENSIONS.test(name)) return 'image';
  if (VIDEO_TYPES.has(type) || VIDEO_EXTENSIONS.test(name)) return 'video';
  if (AUDIO_TYPES.has(type) || AUDIO_EXTENSIONS.test(name)) return 'audio';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  return null;
}
