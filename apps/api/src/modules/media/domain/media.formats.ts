const AUDIO_MIME_BY_FORMAT: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
};

/** Cloudinary raw assets keep their extension inside the public id, so it must be derived from the MIME type up front. */
const DOCUMENT_EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
};

export function documentExtension(mimeType: string): string | null {
  return DOCUMENT_EXTENSION_BY_MIME[mimeType] ?? null;
}

export function audioMimeType(format: string | null): string {
  return AUDIO_MIME_BY_FORMAT[format?.toLowerCase() ?? ""] ?? "application/octet-stream";
}
