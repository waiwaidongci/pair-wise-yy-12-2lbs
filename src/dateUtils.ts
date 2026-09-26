/** 本地时区下取 YYYY-MM-DD，避免 UTC toISOString 造成的日期偏移 */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISODate(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + days);
  return toISODate(base);
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 复查状态：逾期（< 今天）/ 今日复查 / 正常 */
export function revisitStatus(
  revisitAt: string,
  today: string
): "overdue" | "today" | "upcoming" {
  if (revisitAt < today) return "overdue";
  if (revisitAt === today) return "today";
  return "upcoming";
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms = parseDate(toISO).getTime() - parseDate(fromISO).getTime();
  return Math.round(ms / 86400000);
}

/** 30 天内（含今天）是否换过蹄铁 */
export function replacedWithin(isoDate: string, today: string, days = 30): boolean {
  const diff = daysBetween(isoDate, today);
  return diff >= 0 && diff <= days;
}

export function formatCN(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}
