export type HoofId = "LF" | "RF" | "LH" | "RH";

export interface HoofRecord {
  id: string;
  hoof: HoofId;
  date: string; // 修蹄日期 yyyy-mm-dd
  hoofShape: string; // 蹄形评估
  gaitAbnormal: boolean; // 步态是否异常
  gaitNote: string; // 步态问题描述
  shoeType: string; // 蹄铁类型
  nailPosition: string; // 钉位
  replaced: boolean; // 本次是否更换蹄铁
  reviewDate: string; // 下次复查日期（可空）
  note: string; // 备注
  photos: string[]; // 照片（压缩后的 dataURL）
  createdAt: number;
}

export interface Horse {
  id: string; // 内部 id
  code: string; // 马匹编号
  name: string; // 马名（可空）
  status: string; // 运动马 / 休养马
  records: HoofRecord[];
  createdAt: number;
}

export interface AppState {
  horses: Horse[];
}
