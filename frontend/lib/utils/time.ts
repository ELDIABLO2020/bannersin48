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
