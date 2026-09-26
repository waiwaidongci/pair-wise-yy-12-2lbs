import type { HoofId, HoofRecord, Horse } from "../types";
import { diffDays, todayISO } from "./utils";

export const HOOF_ORDER: HoofId[] = ["LF", "RF", "LH", "RH"];

export const HOOF_LABEL: Record<HoofId, string> = {
  LF: "左前蹄",
  RF: "右前蹄",
  LH: "左后蹄",
  RH: "右后蹄",
};

export const HOOF_SIDE: Record<HoofId, "前蹄" | "后蹄"> = {
  LF: "前蹄",
  RF: "前蹄",
  LH: "后蹄",
  RH: "后蹄",
};

export const SHOE_TYPES = ["普通钢蹄铁", "铝蹄铁", "塑料蹄铁", "加护蹄垫", "矫正蹄铁", "未钉蹄铁/裸蹄"];

export function recordsNewestFirst(horse: Horse): HoofRecord[] {
  return [...horse.records].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );
}

/** 一匹马最新一条记录 */
export function latestRecord(horse: Horse): HoofRecord | undefined {
  return recordsNewestFirst(horse)[0];
}

/** 每蹄的时间线（新→旧），用于左右前后对比归档 */
export function hoofTimelines(horse: Horse): Record<HoofId, HoofRecord[]> {
  const map = { LF: [], RF: [], LH: [], RH: [] } as Record<HoofId, HoofRecord[]>;
  for (const r of recordsNewestFirst(horse)) map[r.hoof].push(r);
  return map;
}

/** 该马最近一次复查日期（取所有记录里最新的下次复查） */
export function nextReview(horse: Horse): string {
  let result = "";
  for (const r of horse.records) {
    if (r.reviewDate && r.reviewDate > result) result = r.reviewDate;
  }
  return result;
}

export function hasGaitIssue(horse: Horse): boolean {
  return horse.records.some((r) => r.gaitAbnormal);
}

/** days 天内（按修蹄日期，含今天）是否换过蹄铁 */
export function replacedWithinDays(horse: Horse, days = 30): boolean {
  const t = todayISO();
  return horse.records.some((r) => {
    if (!r.replaced) return false;
    const ago = diffDays(r.date, t); // 距今天的天数：过去为正
    return ago >= 0 && ago <= days;
  });
}

/** 同马同蹄在指定日期是否已有记录 */
export function findSameDayRecord(horse: Horse | undefined, hoof: HoofId, date: string): HoofRecord | undefined {
  if (!horse || !date) return undefined;
  return horse.records.find((r) => r.hoof === hoof && r.date === date);
}

export function uniqueHoofCount(horse: Horse): number {
  return new Set(horse.records.map((r) => r.hoof)).size;
}
