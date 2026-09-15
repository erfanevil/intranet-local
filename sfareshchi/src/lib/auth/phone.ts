const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Convert Persian/Arabic digits to ASCII digits. */
export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

/**
 * Normalize any Iranian mobile input to the canonical `09xxxxxxxxx` form.
 * Accepts 9xxxxxxxxx, 09xxxxxxxxx, +989xxxxxxxxx, 00989xxxxxxxxx.
 * Returns null when the number is not a valid Iranian mobile.
 */
export function normalizeIranMobile(raw: string): string | null {
  let value = toEnglishDigits(String(raw ?? "")).replace(/[\s()\-.]/g, "");

  if (value.startsWith("+98")) value = `0${value.slice(3)}`;
  else if (value.startsWith("0098")) value = `0${value.slice(4)}`;
  else if (value.startsWith("98") && value.length === 12) value = `0${value.slice(2)}`;
  else if (value.startsWith("9") && value.length === 10) value = `0${value}`;

  return /^09\d{9}$/.test(value) ? value : null;
}

/** `09123456789` -> `۰۹۱۲ ۳۴۵ ۶۷۸۹` for display. */
export function formatMobileForDisplay(phone: string): string {
  const grouped = `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  return grouped.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** `09123456789` -> `0912***6789` (used in SMS-sent confirmations). */
export function maskMobile(phone: string): string {
  return `${phone.slice(0, 4)}***${phone.slice(7)}`;
}
