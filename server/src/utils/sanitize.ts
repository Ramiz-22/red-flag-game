export function sanitizeNickname(raw: unknown): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw
    .trim()
    .replace(/[<>&"'\/\\]/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
  if (cleaned.length < 2 || cleaned.length > 15) return null;
  return cleaned;
}
