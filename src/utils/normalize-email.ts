export function normalizeEmail(email?: string | null): string | null {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail || null;
}
