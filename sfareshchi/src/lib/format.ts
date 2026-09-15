const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Convert Latin digits in a string/number to Persian digits. */
export function toFaDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** 1285000 -> "۱,۲۸۵,۰۰۰" */
export function faNumber(value: number): string {
  return toFaDigits(new Intl.NumberFormat("en-US").format(value));
}

/** 1285000 -> "۱,۲۸۵,۰۰۰ تومان" */
export function faToman(value: number): string {
  return `${faNumber(value)} تومان`;
}

/** Format a Date as a short Persian datetime. */
export function faDateTime(date: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت شد",
  preparing: "در حال آماده‌سازی",
  sent: "ارسال شد",
  delivered: "تحویل شد",
};

export const STATUS_ORDER = ["pending", "paid", "preparing", "sent", "delivered"] as const;

const englishToPersianPlan: Record<string, string> = {
  free: "رایگان",
  pro: "حرفه‌ای",
  business: "فروشگاهی",
};

export function faPlan(plan: string | null | undefined): string {
  return englishToPersianPlan[plan ?? ""] ?? plan ?? "";
}
