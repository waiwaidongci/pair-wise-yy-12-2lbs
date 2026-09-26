export type Hoof = "LF" | "RF" | "LH" | "RH";
export type HorseCategory = "运动马" | "休养马";

export interface Horse {
  id: string; // 马匹编号，如 HORSE-18
  name?: string;
  category: HorseCategory;
  createdAt: string;
}

export interface Photo {
  id: string;
  name: string;
  dataUrl: string;
  addedAt: string;
}

export interface TrimmingRecord {
  id: string;
  horseId: string;
  hoof: Hoof;
  trimmedAt: string; // 修蹄日期 YYYY-MM-DD
  revisitAt: string; // 下次复查日期 YYYY-MM-DD
  hoofShape: string; // 蹄形评估
  gaitIssue: string; // 步态问题描述
  gaitAbnormal: boolean; // 异常步态标记
  shoeType: string; // 蹄铁类型
  shoeReplaced: boolean; // 本次是否更换蹄铁
  nailPositions: string; // 钉位
  note: string; // 备注
  photos: Photo[];
  createdAt: string;
}

export interface AppData {
  horses: Horse[];
  records: TrimmingRecord[];
}

export const HOOFS: Hoof[] = ["LF", "RF", "LH", "RH"];

export const HOOF_LABELS: Record<Hoof, string> = {
  LF: "左前蹄",
  RF: "右前蹄",
  LH: "左后蹄",
  RH: "右后蹄",
};

export const SHOE_TYPES = [
  "普通钢蹄铁",
  "铝蹄铁",
  "加护蹄垫",
  "防滑蹄铁",
  "矫正蹄铁",
  "无蹄铁（裸蹄修整）",
];

export const HOOF_SHAPES = [
  "角度正常",
  "前倾",
  "后跟过低",
  "蹄壁裂",
  "磨耗不均",
  "蹄叉萎缩",
];

export const NAIL_PRESETS = ["内外侧 4+4", "内外侧 3+3", "内侧加密", "外侧加密"];

/** 表单提交输入 */
export interface SubmitInput {
  horseId: string;
  isNewHorse: boolean;
  newHorseName: string;
  newHorseCategory: HorseCategory;
  hoof: Hoof;
  trimmedAt: string;
  revisitAt: string;
  hoofShape: string;
  gaitIssue: string;
  gaitAbnormal: boolean;
  shoeType: string;
  shoeReplaced: boolean;
  nailPositions: string;
  note: string;
  photos: Photo[];
}

export type SubmitResult =
  | { ok: true; recordId: string }
  | { ok: false; reason: "validation" | "revisit-order" | "duplicate"; existing?: TrimmingRecord };
