/**
 * File-name and worksheet-name sanitization helpers.
 */

/** Characters that are illegal in file names across Windows/macOS/Linux. */
const ILLEGAL_FILE_CHARS = /[\\/:*?"<>|]/g;

/**
 * Produce a safe base file name: strips illegal characters, collapses
 * whitespace to single dashes and trims to a reasonable length.
 */
export function sanitizeFileName(name: string, fallback = 'report'): string {
  const cleaned = (name ?? '')
    .replace(ILLEGAL_FILE_CHARS, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 120)
    .trim();
  return cleaned || fallback;
}

/** Append a `yyyyMMdd-HHmm` timestamp to a base name. */
export function withTimestamp(baseName: string, date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${sanitizeFileName(baseName)}-${stamp}`;
}

/** Build a full file name with extension. */
export function buildFileName(baseName: string, extension: string, timestamp = true): string {
  const base = timestamp ? withTimestamp(baseName) : sanitizeFileName(baseName);
  const ext = extension.replace(/^\.+/, '');
  return `${base}.${ext}`;
}

/**
 * Sanitize an Excel worksheet name: max 31 chars and no `\ / ? * [ ] :`.
 * Excel silently corrupts workbooks with invalid sheet names, so this matters.
 */
export function sanitizeSheetName(name: string, fallback = 'Sheet1'): string {
  const cleaned = (name ?? '')
    .replace(/[\\/?*[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31);
  return cleaned || fallback;
}
