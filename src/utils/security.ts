// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\u0000-\u001f\u007f]/;
const PROTOCOL_REGEX = /^[a-z][a-z0-9+.-]*:/i;
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_URL_REGEX =
  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/;

export function escapeHtml(str: unknown): string {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isSafeImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("//")) return false;
  if (CONTROL_CHARS_REGEX.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (PROTOCOL_REGEX.test(trimmed)) return false;
  return !trimmed.includes("..");
}

export function isValidYouTubeId(id: string): boolean {
  return YOUTUBE_ID_REGEX.test(id);
}

export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return "";
  const cleaned = urlOrId.trim();
  if (YOUTUBE_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  const match = cleaned.match(YOUTUBE_URL_REGEX);
  return match && match[1] ? match[1] : cleaned;
}
