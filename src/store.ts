import type { AppData, Horse, Hoof, TrimmingRecord } from "./types";
import { addDays, replacedWithin, todayISODate } from "./dateUtils";

const STORAGE_KEY = "farrier-workbench-v1";

function rid(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedData(): AppData {
  const today = todayISODate();
  const horses: Horse[] = [
    { id: "HORSE-18", name: "追风", category: "运动马", createdAt: addDays(today, -120) },
    { id: "HORSE-27", name: "云雀", category: "休养马", createdAt: addDays(today, -90) },
    { id: "HORSE-31", name: "墨青", category: "运动马", createdAt: addDays(today, -60) },
  ];

  const records: TrimmingRecord[] = [
    {
      id: rid(),
      horseId: "HORSE-18",
      hoof: "RF",
      trimmedAt: addDays(today, -18),
      revisitAt: addDays(today, -4),
      hoofShape: "磨耗不均",
      gaitIssue: "右前蹄外侧磨耗，落地时重心略偏外",
      gaitAbnormal: false,
      shoeType: "铝蹄铁",
      shoeReplaced: true,
      nailPositions: "内外侧 4+4",
      note: "外侧支设稍外移，复查确认着地轨迹",
      photos: [],
      createdAt: addDays(today, -18),
    },
    {
      id: rid(),
      horseId: "HORSE-18",
      hoof: "RF",
      trimmedAt: addDays(today, -46),
      revisitAt: addDays(today, -18),
      hoofShape: "角度正常",
      gaitIssue: "",
      gaitAbnormal: false,
      shoeType: "普通钢蹄铁",
      shoeReplaced: true,
      nailPositions: "内外侧 4+4",
      note: "定期修整",
      photos: [],
      createdAt: addDays(today, -46),
    },
    {
      id: rid(),
      horseId: "HORSE-18",
      hoof: "LF",
      trimmedAt: addDays(today, -46),
      revisitAt: addDays(today, -18),
      hoofShape: "角度正常",
      gaitIssue: "",
      gaitAbnormal: false,
      shoeType: "普通钢蹄铁",
      shoeReplaced: true,
      nailPositions: "内外侧 4+4",
      note: "定期修整",
      photos: [],
      createdAt: addDays(today, -46),
    },
    {
      id: rid(),
      horseId: "HORSE-27",
      hoof: "LH",
      trimmedAt: addDays(today, -10),
      revisitAt: addDays(today, 10),
      hoofShape: "蹄壁裂",
      gaitIssue: "后蹄裂纹，快步时偶发短促步幅",
      gaitAbnormal: false,
      shoeType: "加护蹄垫",
      shoeReplaced: true,
      nailPositions: "内侧加密",
      note: "裂纹处拍照归档，加护蹄垫减载，观察裂纹延伸",
      photos: [],
      createdAt: addDays(today, -10),
    },
    {
      id: rid(),
      horseId: "HORSE-31",
      hoof: "LF",
      trimmedAt: addDays(today, -6),
      revisitAt: addDays(today, 1),
      hoofShape: "后跟过低",
      gaitIssue: "步态轻微不稳，左前步幅偏短，需教练复核",
      gaitAbnormal: true,
      shoeType: "矫正蹄铁",
      shoeReplaced: true,
      nailPositions: "内侧加密",
      note: "矫正后跟角度，14 天后复查步态",
      photos: [],
      createdAt: addDays(today, -6),
    },
    {
      id: rid(),
      horseId: "HORSE-31",
      hoof: "RF",
      trimmedAt: addDays(today, -6),
      revisitAt: addDays(today, 1),
      hoofShape: "角度正常",
      gaitIssue: "",
      gaitAbnormal: false,
      shoeType: "普通钢蹄铁",
      shoeReplaced: false,
      nailPositions: "内外侧 4+4",
      note: "与左前同时修整，右前沿用旧蹄铁",
      photos: [],
      createdAt: addDays(today, -6),
    },
  ];

  return { horses, records };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (Array.isArray(parsed.horses) && Array.isArray(parsed.records)) {
        return parsed;
      }
    }
  } catch {
    // 数据损坏时回落到示例数据
  }
  return seedData();
}

export function saveData(data: AppData): { ok: true } | { ok: false; error: string } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof DOMException &&
        (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")
          ? "本地存储空间不足，照片可能过多/过大。旧记录没有被覆盖，请删除部分照片后再保存。"
          : "无法写入本地存储，请确认浏览器未禁用本地数据。",
    };
  }
}

/* ---------------- 选择器（归档、提醒、筛选） ---------------- */

export function recordsOf(data: AppData, horseId: string): TrimmingRecord[] {
  return data.records
    .filter((r) => r.horseId === horseId)
    .sort(compareRecords);
}

/** 修蹄日期新→旧；同日期按录入时间新→旧，再以 id 兜底（顺序完全确定） */
function compareRecords(a: TrimmingRecord, b: TrimmingRecord): number {
  if (a.trimmedAt !== b.trimmedAt) return b.trimmedAt.localeCompare(a.trimmedAt);
  if (a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt);
  return a.id.localeCompare(b.id);
}

export function latestByHoof(data: AppData, horseId: string): Map<Hoof, TrimmingRecord> {
  const map = new Map<Hoof, TrimmingRecord>();
  for (const r of recordsOf(data, horseId)) {
    if (!map.has(r.hoof)) map.set(r.hoof, r);
  }
  return map;
}

/** 该马最近一次复查日期（取所有记录中"未来或当前"的最早一个；都过期则取最晚的） */
export function nextRevisit(data: AppData, horseId: string, today: string): string | null {
  const dates = recordsOf(data, horseId).map((r) => r.revisitAt);
  if (dates.length === 0) return null;
  const future = dates.filter((d) => d >= today).sort();
  if (future.length) return future[0];
  return dates.sort()[dates.length - 1];
}

export interface HorseStatus {
  horse: Horse;
  revisitAt: string | null;
  overdue: boolean;
  gaitAbnormal: boolean;
  replacedRecently: boolean;
}

export function horseStatuses(data: AppData, today: string): HorseStatus[] {
  return data.horses.map((horse) => {
    const mine = recordsOf(data, horse.id);
    const latest = latestByHoof(data, horse.id);
    return {
      horse,
      revisitAt: nextRevisit(data, horse.id, today),
      overdue: mine.some((r) => r.revisitAt < today),
      gaitAbnormal: [...latest.values()].some((r) => r.gaitAbnormal),
      replacedRecently: mine.some((r) => r.shoeReplaced && replacedWithin(r.trimmedAt, today)),
    };
  });
}

/** 蹄铁更换历史（仅更换过的记录，新→旧） */
export function shoeHistory(data: AppData, horseId: string, hoof?: Hoof): TrimmingRecord[] {
  return recordsOf(data, horseId)
    .filter((r) => r.shoeReplaced && (hoof === undefined || r.hoof === hoof));
}

/** 同一天同一蹄是否已有记录 */
export function findSameDayRecord(
  data: AppData,
  horseId: string,
  hoof: Hoof,
  trimmedAt: string
): TrimmingRecord | undefined {
  return data.records.find(
    (r) => r.horseId === horseId && r.hoof === hoof && r.trimmedAt === trimmedAt
  );
}
