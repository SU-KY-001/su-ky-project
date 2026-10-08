const AUDIO_MIME_BY_FORMAT: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
};

export function audioMimeType(format: string | null): string {
  return AUDIO_MIME_BY_FORMAT[format?.toLowerCase() ?? ""] ?? "application/octet-stream";
}
