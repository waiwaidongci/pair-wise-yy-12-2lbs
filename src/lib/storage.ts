import type { AppState, HoofId, HoofRecord } from "../types";
import { addDaysISO, placeholderPhoto, todayISO, uid } from "./utils";

const STORAGE_KEY = "farrier-workbench-v1";

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (Array.isArray(parsed.horses)) return parsed;
    }
  } catch {
    // 损坏的缓存直接回落到示例数据
  }
  return seedState();
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 通常是照片太多超容量；精简后重试一次
    try {
      const slim: AppState = {
        horses: state.horses.map((h) => ({
          ...h,
          records: h.records.map((r) => ({ ...r, photos: r.photos.slice(0, 2) })),
        })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
      alert("本地存储空间不足，请删除部分旧照片后再保存。");
    }
  }
}

function rec(
  hoof: HoofId,
  daysAgo: number,
  data: Partial<HoofRecord> & Pick<HoofRecord, "hoofShape" | "shoeType" | "nailPosition">
): HoofRecord {
  const date = addDaysISO(todayISO(), -daysAgo);
  return {
    id: uid("rec"),
    hoof,
    date,
    hoofShape: data.hoofShape,
    gaitAbnormal: data.gaitAbnormal ?? false,
    gaitNote: data.gaitNote ?? "",
    shoeType: data.shoeType,
    nailPosition: data.nailPosition,
    replaced: data.replaced ?? false,
    reviewDate: data.reviewDate ?? "",
    note: data.note ?? "",
    photos: data.photos ?? [],
    createdAt: Date.now() - daysAgo * 86400000,
  };
}

/** 首次使用时的示例档案：包含逾期复查、异常步态、近期换铁三类情况 */
function seedState(): AppState {
  const t = todayISO();
  return {
    horses: [
      {
        id: uid("h"),
        code: "HORSE-18",
        name: "疾风",
        status: "运动马",
        createdAt: Date.now() - 40 * 86400000,
        records: [
          rec("RF", 34, {
            hoofShape: "右前蹄外侧壁磨耗明显，蹄叉偏小",
            shoeType: "铝蹄铁",
            nailPosition: "内侧第1-3钉，外侧第2-4钉",
            replaced: true,
            reviewDate: addDaysISO(addDaysISO(t, -34), 14),
            gaitAbnormal: true,
            gaitNote: "右前蹄外侧磨耗，慢步时点头",
            note: "外侧蹄壁偏薄，下次评估角度",
            photos: [placeholderPhoto("HORSE-18 右前 初诊", "#78350f")],
          }),
          rec("RF", 12, {
            hoofShape: "外侧壁磨耗减轻，蹄底平整",
            shoeType: "铝蹄铁（加宽外侧支）",
            nailPosition: "内侧第2-4钉，外侧第2-3钉",
            replaced: true,
            reviewDate: addDaysISO(addDaysISO(t, -12), 14),
            gaitNote: "点头明显改善",
            note: "14天后复查角度",
            photos: [placeholderPhoto("HORSE-18 右前 复查", "#92400e")],
          }),
          rec("LF", 12, {
            hoofShape: "左前蹄形态正常",
            shoeType: "铝蹄铁",
            nailPosition: "常规六钉位",
            reviewDate: addDaysISO(addDaysISO(t, -12), 21),
            note: "对比观察",
          }),
        ],
      },
      {
        id: uid("h"),
        code: "HORSE-27",
        name: "栗子",
        status: "休养马",
        createdAt: Date.now() - 25 * 86400000,
        records: [
          rec("RH", 20, {
            hoofShape: "右后蹄掌侧裂纹约 2cm",
            shoeType: "加护蹄垫",
            nailPosition: "避开创裂处，前四钉固定",
            replaced: true,
            reviewDate: addDaysISO(addDaysISO(t, -20), 10),
            gaitAbnormal: false,
            note: "裂纹处已拍照归档，避免潮湿场地",
            photos: [placeholderPhoto("HORSE-27 右后 裂纹", "#166534")],
          }),
        ],
      },
      {
        id: uid("h"),
        code: "HORSE-31",
        name: "银影",
        status: "运动马",
        createdAt: Date.now() - 15 * 86400000,
        records: [
          rec("LF", 6, {
            hoofShape: "左前蹄蹄叉轻度萎缩",
            shoeType: "蹄铁待教练复核",
            nailPosition: "暂用五钉，留外侧调整余量",
            replaced: true,
            reviewDate: addDaysISO(addDaysISO(t, -6), 7),
            gaitAbnormal: true,
            gaitNote: "转弯时步态轻微不稳，已标记需教练复核",
            note: "已标记",
            photos: [placeholderPhoto("HORSE-31 左前", "#2563eb")],
          }),
        ],
      },
    ],
  };
}
