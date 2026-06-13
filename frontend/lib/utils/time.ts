/**
 * Time helpers — countdown formatting in HH:MM:SS.
 */

export function formatCountdown(ms: number): { hours: number; minutes: number; seconds: number; padded: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { hours, minutes, seconds, padded: `${pad(hours)} : ${pad(minutes)} : ${pad(seconds)}` };
}

export function formatTimeOfDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diff = (then.getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  const sign = diff < 0 ? "ago" : "from now";
  if (abs < 60) return `just now`;
  if (abs < 3600) return `${Math.floor(abs / 60)} min ${sign}`;
  if (abs < 86400) return `${Math.floor(abs / 3600)} hr ${sign}`;
  return `${Math.floor(abs / 86400)} day ${sign}`;
}
