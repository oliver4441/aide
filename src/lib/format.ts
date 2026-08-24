export function formatMoney(amount: number, currency: string = "KSh"): string {
  return `${currency} ${Number(amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  });
}

export function timeAgo(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60);
  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}
