/**
 * Resolves a dot-notation i18n key against an already-loaded translation
 * object (as returned by `TranslateService.getTranslation(lang)`), without
 * touching the app's *active* language. This lets the report be generated in
 * a language the user picks in the dialog, independent of the current UI
 * language — switching `TranslateService.use()` would flicker the whole app.
 *
 * Falls back to returning the key itself when missing, matching
 * `@ngx-translate`'s own default missing-key behavior.
 */
export function resolveTranslationKey(
  translations: Record<string, unknown> | null | undefined,
  key: string,
  params?: Record<string, unknown>
): string {
  const value = resolvePath(translations, key);
  if (typeof value !== 'string') {
    return key;
  }
  if (!params) {
    return value;
  }
  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, paramName: string) => {
    const replacement = params[paramName];
    return replacement === undefined || replacement === null ? match : String(replacement);
  });
}

function resolvePath(obj: Record<string, unknown> | null | undefined, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, obj);
}
