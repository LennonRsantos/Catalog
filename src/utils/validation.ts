export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

// "#" + 3-20 letters/digits/underscore. No spaces, no other symbols.
export const TAG_RE = /^#[a-zA-Z0-9_]{3,20}$/;

export function isValidTag(tag: string): boolean {
  return TAG_RE.test(tag.trim());
}

// Valid calendar date, not in the future, and a plausible age (13-120).
export function isValidBirthdate(value: string): boolean {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  if (date.getTime() > now.getTime()) return false;

  const age = now.getFullYear() - date.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
  const exactAge = hadBirthdayThisYear ? age : age - 1;

  return exactAge >= 13 && exactAge <= 120;
}
