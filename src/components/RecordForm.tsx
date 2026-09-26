import { useEffect, useState } from "react";
import type { HoofId, HoofRecord, Horse } from "../types";
import { HOOF_LABEL, HOOF_ORDER, SHOE_TYPES } from "../lib/selectors";
import { fileToThumbnail, formatCN, todayISO } from "../lib/utils";
import RecordCard from "./RecordCard";

export interface RecordDraft {
  horseId?: string;
  newCode?: string;
  newName?: string;
  newStatus?: string;
  hoof: HoofId;
  date: string;
  hoofShape: string;
  gaitAbnormal: boolean;
  gaitNote: string;
  shoeType: string;
  nailPosition: string;
  replaced: boolean;
  reviewDate: string;
  note: string;
  photos: string[];
}

interface Props {
  horse?: Horse;
  presetCode?: string;
  presetHoof?: HoofId;
  /** 按当前填写的蹄位+日期实时查找同日同蹄已有记录 */
  lookupDuplicate?: (hoof: HoofId, date: string) => HoofRecord | undefined;
  onSave: (draft: RecordDraft) => void;
  onCancel: () => void;
}

export default function RecordForm({ horse, presetCode, presetHoof, lookupDuplicate, onSave, onCancel }: Props) {
  const [code, setCode] = useState(horse?.code ?? presetCode ?? "");
  const [name, setName] = useState(horse?.name ?? "");
  const [status, setStatus] = useState(horse?.status ?? "运动马");
  const [hoof, setHoof] = useState<HoofId>(presetHoof ?? "LF");
  const [date, setDate] = useState(todayISO());
  const [hoofShape, setHoofShape] = useState("");
  const [gaitAbnormal, setGaitAbnormal] = useState(false);
  const [gaitNote, setGaitNote] = useState("");
  const [shoeType, setShoeType] = useState(SHOE_TYPES[0]);
  const [nailPosition, setNailPosition] = useState("");
  const [replaced, setReplaced] = useState(true);
  const [reviewDate, setReviewDate] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // 校验失败时只出提示，不清空任何已填内容
  const [dateError, setDateError] = useState("");
  const [askingDup, setAskingDup] = useState(false);

  const isNewHorse = !horse;
  // 实时查询：同马、同蹄、同一天是否已有记录
  const [existingRecord, setExistingRecord] = useState<HoofRecord | undefined>(undefined);
  useEffect(() => {
    setExistingRecord(lookupDuplicate ? lookupDuplicate(hoof, date) : undefined);
    setAskingDup(false);
  }, [lookupDuplicate, hoof, date]);
  const dup = !!existingRecord;

  function buildDraft(): RecordDraft {
    return {
      horseId: horse?.id,
      newCode: isNewHorse ? code.trim() : undefined,
      newName: isNewHorse ? name.trim() : undefined,
      newStatus: isNewHorse ? status : undefined,
      hoof,
      date,
      hoofShape: hoofShape.trim(),
      gaitAbnormal,
      gaitNote: gaitNote.trim(),
      shoeType,
      nailPosition: nailPosition.trim(),
      replaced,
      reviewDate,
      note: note.trim(),
      photos,
    };
  }

  function validate(): string {
    if (isNewHorse && !code.trim()) return "请填写马匹编号";
    if (!date) return "请选择修蹄日期";
    if (reviewDate && reviewDate < date)
      return `下次复查日期（${formatCN(reviewDate)}）早于修蹄日期（${formatCN(date)}），请修改后再保存。`;
    return "";
  }

  function handleSubmit(force = false) {
    const err = validate();
    if (err) {
      setDateError(err);
      return;
    }
    setDateError("");

    // 同一天同一蹄已有记录：先看已有记录，确认后才能追加
    if (dup && !force) {
      setAskingDup(true);
      return;
    }
    setAskingDup(false);
    onSave(buildDraft());
  }

  async function handlePhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError("");
    setPhotoBusy(true);
    try {
      const thumbs: string[] = [];
      for (const f of Array.from(files)) {
        thumbs.push(await fileToThumbnail(f));
      }
      // 新照片追加到本次记录；历史记录的照片不受影响
      setPhotos((prev) => [...prev, ...thumbs]);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "照片处理失败");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="form-stack">
      {isNewHorse && (
        <fieldset className="form-band">
          <legend>马匹档案</legend>
          <div className="field-grid">
            <label className="required">
              <span>马匹编号</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="如 HORSE-35" />
            </label>
            <label>
              <span>马名</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="选填" />
            </label>
            <label>
              <span>马匹状态</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option>运动马</option>
                <option>休养马</option>
              </select>
            </label>
          </div>
        </fieldset>
      )}

      <fieldset className="form-band">
        <legend>蹄位与日期</legend>
        <div className="field-grid">
          <label className="required">
            <span>蹄位（按左右前后归档）</span>
            <div className="hoof-toggle">
              {HOOF_ORDER.map((h) => (
                <button
                  type="button"
                  key={h}
                  className={hoof === h ? "active" : ""}
                  onClick={() => {
                    setHoof(h);
                    setAskingDup(false);
                  }}
                >
                  {HOOF_LABEL[h]}
                </button>
              ))}
            </div>
          </label>
          <label className="required">
            <span>修蹄日期</span>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => {
                setDate(e.target.value);
                setAskingDup(false);
              }}
            />
          </label>
          <label>
            <span>下次复查日期</span>
            <input
              type="date"
              value={reviewDate}
              min={date || undefined}
              onChange={(e) => setReviewDate(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-band">
        <legend>评估与蹄铁</legend>
        <div className="field-grid">
          <label className="field-full required">
            <span>蹄形评估</span>
            <textarea
              rows={2}
              value={hoofShape}
              onChange={(e) => setHoofShape(e.target.value)}
              placeholder="蹄壁角度、蹄底、蹄叉、磨耗情况…"
            />
          </label>

          <label className="field-checkbox">
            <input type="checkbox" checked={gaitAbnormal} onChange={(e) => setGaitAbnormal(e.target.checked)} />
            <span>步态异常（运动状态异常时勾选并标记）</span>
          </label>
          <label className="field-full">
            <span>步态问题描述</span>
            <input
              value={gaitNote}
              onChange={(e) => setGaitNote(e.target.value)}
              disabled={!gaitAbnormal}
              placeholder={gaitAbnormal ? "如 右前外侧磨耗、转弯不稳…" : "勾选步态异常后填写"}
            />
          </label>

          <label>
            <span>蹄铁类型</span>
            <select value={shoeType} onChange={(e) => setShoeType(e.target.value)}>
              {SHOE_TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field-checkbox">
            <input type="checkbox" checked={replaced} onChange={(e) => setReplaced(e.target.checked)} />
            <span>本次更换蹄铁（计入换铁历史，30 天内可筛出）</span>
          </label>
          <label className="field-full">
            <span>钉位</span>
            <input
              value={nailPosition}
              onChange={(e) => setNailPosition(e.target.value)}
              placeholder="如 内侧第1-3钉、外侧第2-4钉"
            />
          </label>
          <label className="field-full">
            <span>备注</span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="场地、用药、需教练复核等"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-band">
        <legend>照片归档（随本次记录保存，不会覆盖旧照片）</legend>
        <div className="photo-upload">
          <label className="upload-btn">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                handlePhotos(e.target.files);
                e.target.value = "";
              }}
            />
            {photoBusy ? "压缩处理中…" : "＋ 添加照片"}
          </label>
          {photoError && <span className="inline-error">{photoError}</span>}
          {photos.length > 0 && (
            <div className="photo-preview">
              {photos.map((src, i) => (
                <span key={i} className="preview-item">
                  <img src={src} alt={`待存照片 ${i + 1}`} />
                  <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </fieldset>

      {dateError && (
        <div className="banner banner-error" role="alert">
          ⚠ {dateError}
          <br />
          已填写的内容均已保留，请修改后再保存。
        </div>
      )}

      {askingDup && dup && existingRecord && (
        <div className="banner banner-warn" role="alert">
          <strong>
            {formatCN(date)} {HOOF_LABEL[hoof]} 已有一条记录
          </strong>
          <p>同一匹马同一天同一蹄重复保存会让档案难以对照，请先查看已有记录，确认不是重复录入。</p>
          <RecordCard record={existingRecord} compact />
          <div className="banner-actions">
            <button type="button" className="primary" onClick={() => onCancel()}>
              去看已有记录
            </button>
            <button type="button" onClick={() => handleSubmit(true)}>
              确属当天第二次修整，仍要追加
            </button>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="primary big" onClick={() => handleSubmit(false)}>
          保存并归档到马匹档案
        </button>
        <button type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
