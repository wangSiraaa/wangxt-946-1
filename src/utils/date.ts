export function formatDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateTime(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${formatDate(date)} ${h}:${mi}`;
}

export function formatTime(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${mi}:${s}`;
}

export function formatTimeInput(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${mi}`;
}

export function diffMinutes(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, Math.floor((e - s) / 60000));
}

export function addMinutes(timeStr: string, minutes: number): string {
  const base = new Date(timeStr);
  base.setMinutes(base.getMinutes() + minutes);
  return base.toISOString();
}

export function isLate(signTime: string, startTime: string, threshold: number): boolean {
  return diffMinutes(startTime, signTime) > threshold;
}

export function genId(prefix: string = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function getToday(): string {
  return formatDate(new Date());
}
