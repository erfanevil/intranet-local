export function formatDateFA(dateStr: string): string {
  const d = new Date(dateStr);
  // Convert to Iran timezone
  const iranDate = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tehran" }));
  
  const year = new Intl.DateTimeFormat("fa-IR", { year: "numeric", timeZone: "Asia/Tehran" }).format(d);
  const month = new Intl.DateTimeFormat("fa-IR", { month: "long", timeZone: "Asia/Tehran" }).format(d);
  const day = new Intl.DateTimeFormat("fa-IR", { day: "numeric", timeZone: "Asia/Tehran" }).format(d);
  const time = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(d);
  
  return `${day} ${month} ${year} - ${time}`;
}

export function formatTimeFA(dateStr: string): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(d);
}

export function formatShortDateFA(dateStr: string): string {
  const d = new Date(dateStr);
  const date = new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric", timeZone: "Asia/Tehran" }).format(d);
  const time = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(d);
  return `${date} ${time}`;
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diff < 60) return "لحظاتی پیش";
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} روز پیش`;
  
  return formatShortDateFA(dateStr);
}

export function getTodayFA(): string {
  const d = new Date();
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tehran",
  }).format(d);
}
