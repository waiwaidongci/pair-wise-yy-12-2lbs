import { useMemo, useState } from "react";
import type { AppData, HorseCategory, Hoof, Photo, SubmitInput, SubmitResult, TrimmingRecord } from "../types";
import { HOOFS, HOOF_LABELS, HOOF_SHAPES, NAIL_PRESETS, SHOE_TYPES } from "../types";
import { addDays, daysBetween, formatCN, revisitStatus, todayISODate } from "../dateUtils";
import { recordsOf } from "../store";
import { fileToPhoto } from "../photo";

type FormError =
  | { kind: "validation"; message: string }
  | { kind: "revisit-order" }
  | { kind: "duplicate"; existing: TrimmingRecord };

export default function EntryForm({
  data,
  today,
  initialHorseId,
  onSubmit,
  onOpenHorse,
}: {
  data: AppData;
  today: string;
  initialHorseId?: string;
  onSubmit: (input: SubmitInput) => SubmitResult;
  onOpenHorse: (horseId: string, recordId?: string, hoof?: Hoof) => void;
}) {
  const existingHorses = data.horses;
  const defaultHorse =
    initialHorseId && existingHorses.some((h) => h.id === initialHorseId)
      ? initialHorseId
      : existingHorses[0]?.id ?? "";

  const [isNewHorse, setIsNewHorse] = useState(false);
  const [horseId, setHorseId] = useState(defaultHorse);
  const [newHorseId, setNewHorseId] = useState("");
  const [newHorseName, setNewHorseName] = useState("");
  const [newHorseCategory, setNewHorseCategory] = useState<HorseCategory>("运动马");

  const [hoof, setHoof] = useState<Hoof>("LF");
  const [trimmedAt, setTrimmedAt] = useState(todayISODate());
  const [revisitAt, setRevisitAt] = useState(addDays(todayISODate(), 14));

  const [hoofShape, setHoofShape] = useState("");
  const [gaitIssue, setGaitIssue] = useState("");
  const [gaitAbnormal, setGaitAbnormal] = useState(false);
  const [shoeType, setShoeType] = useState(SHOE_TYPES[0]);
  const [shoeReplaced, setShoeReplaced] = useState(true);
  const [nailPositions, setNailPositions] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [error, setError] = useState<FormError | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);

  const effectiveHorseId = (isNewHorse ? newHorseId : horseId).trim().toUpperCase();

  const recent = useMemo(
    () => (effectiveHorseId ? recordsOf(data, effectiveHorseId).slice(0, 6) : []),
    [data, effectiveHorseId]
  );

  const revisitTooEarly = trimmedAt && revisitAt && revisitAt < trimmedAt;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const converted: Photo[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        converted.push(await fileToPhoto(f));
      }
      setPhotos((prev) => [...prev, ...converted]);
    } catch {
      setPhotoError("有图片读取失败，请换一张照片重试。");
    } finally {
      setPhotoBusy(false);
    }
  }

  function clearAfterSave() {
    // 保留马匹/蹄/日期，方便连续录入同一匹马的其它蹄；清空本次评估内容与照片
    setHoofShape("");
    setGaitIssue("");
    setGaitAbnormal(false);
    setShoeType(SHOE_TYPES[0]);
    setShoeReplaced(true);
    setNailPositions("");
    setNote("");
    setPhotos([]);
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    setSavedRecordId(null);

    if (!effectiveHorseId) {
      setError({ kind: "validation", message: "请选择马匹，或填写新马匹编号。" });
      return;
    }
    if (isNewHorse && !newHorseName.trim()) {
      setError({ kind: "validation", message: "新马匹请填写称呼/名字。" });
      return;
    }
    if (
      isNewHorse &&
      existingHorses.some((h) => h.id === effectiveHorseId)
    ) {
      setError({ kind: "validation", message: "该马匹编号已存在，请直接从已有马匹中选择。" });
      return;
    }
    if (!trimmedAt) {
      setError({ kind: "validation", message: "请填写修蹄日期。" });
      return;
    }
    if (revisitTooEarly) {
      // 复查日期早于修蹄日期：不保存，已填内容原样保留
      setError({ kind: "revisit-order" });
      return;
    }
    if (!revisitAt) {
      setError({ kind: "validation", message: "请填写下次复查日期。" });
      return;
    }

    const result = onSubmit({
      horseId: effectiveHorseId,
      isNewHorse,
      newHorseName: newHorseName.trim(),
      newHorseCategory,
      hoof,
      trimmedAt,
      revisitAt,
      hoofShape: hoofShape.trim(),
      gaitIssue: gaitIssue.trim(),
      gaitAbnormal,
      shoeType,
      shoeReplaced,
      nailPositions: nailPositions.trim(),
      note: note.trim(),
      photos,
    });

    if (!result.ok) {
      // 校验失败时不清空任何已填内容
      if (result.reason === "duplicate" && result.existing) {
        setError({ kind: "duplicate", existing: result.existing });
      } else if (result.reason === "revisit-order") {
        setError({ kind: "revisit-order" });
      } else {
        setError({ kind: "validation", message: "提交失败，请检查填写内容后重试。" });
      }
      return;
    }

    setSavedRecordId(result.recordId);
    clearAfterSave();
  }

  return (
    <div className="entry-layout">
      <section className="panel form-panel">
        <div className="heading">
          <div>
            <p>修蹄录入工作台</p>
            <h2>新增修整记录</h2>
          </div>
          <button className="primary" onClick={handleSubmit}>
            保存记录
          </button>
        </div>

        {savedRecordId && (
          <div className="alert alert-ok">
            <span>✓ 已保存，并归入这匹马的「{HOOF_LABELS[hoof]}」档案。</span>
            <button className="link-btn" onClick={() => onOpenHorse(effectiveHorseId, savedRecordId, hoof)}>
              打开马匹档案查看 →
            </button>
          </div>
        )}

        {error?.kind === "validation" && <div className="alert alert-warn">{error.message}（已填内容已保留）</div>}
        {error?.kind === "revisit-order" && (
          <div className="alert alert-warn">
            复查日期（{formatCN(revisitAt)}）早于修蹄日期（{formatCN(trimmedAt)}），本次不保存。
            请调整日期后再保存，表单里已填的内容都还在。
          </div>
        )}
        {error?.kind === "duplicate" && (
          <div className="alert alert-block">
            <div>
              <strong>这匹马的「{HOOF_LABELS[error.existing.hoof]}」在 {formatCN(error.existing.trimmedAt)} 已有记录。</strong>
              <p>请先查看已有记录，确认后再决定是否另选日期录入，避免旧照片和蹄铁更换历史被盖住。</p>
            </div>
            <button
              className="link-btn"
              onClick={() => onOpenHorse(effectiveHorseId, error.existing.id, error.existing.hoof)}
            >
              查看已有记录 →
            </button>
          </div>
        )}

        <div className="form-section">
          <h3>1 · 马匹</h3>
          <div className="seg">
            <button
              type="button"
              className={!isNewHorse ? "seg-on" : ""}
              onClick={() => {
                setIsNewHorse(false);
                setError(null);
              }}
            >
              已有马匹
            </button>
            <button
              type="button"
              className={isNewHorse ? "seg-on" : ""}
              onClick={() => {
                setIsNewHorse(true);
                setError(null);
              }}
            >
              新马匹
            </button>
          </div>

          {!isNewHorse ? (
            <div className="field-grid">
              <label>
                <span>马匹编号</span>
                <select value={horseId} onChange={(e) => setHorseId(e.target.value)}>
                  {existingHorses.length === 0 && <option value="">（暂无马匹，请选"新马匹"）</option>}
                  {existingHorses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.id}
                      {h.name ? ` · ${h.name}` : ""} · {h.category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="field-grid">
              <label>
                <span>马匹编号（唯一，如 HORSE-33）</span>
                <input
                  value={newHorseId}
                  placeholder="HORSE-33"
                  onChange={(e) => setNewHorseId(e.target.value.toUpperCase())}
                />
              </label>
              <label>
                <span>称呼 / 名字</span>
                <input value={newHorseName} placeholder="如 小栗" onChange={(e) => setNewHorseName(e.target.value)} />
              </label>
              <label>
                <span>马匹类型</span>
                <select
                  value={newHorseCategory}
                  onChange={(e) => setNewHorseCategory(e.target.value as HorseCategory)}
                >
                  <option value="运动马">运动马</option>
                  <option value="休养马">休养马</option>
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="form-section">
          <h3>2 · 蹄位与日期</h3>
          <div className="hoof-picker">
            {HOOFS.map((h) => (
              <button
                type="button"
                key={h}
                className={hoof === h ? "hoof-on" : ""}
                onClick={() => setHoof(h)}
              >
                {HOOF_LABELS[h]}
              </button>
            ))}
          </div>
          <div className="field-grid">
            <label>
              <span>修蹄日期</span>
              <input type="date" value={trimmedAt} max={today} onChange={(e) => setTrimmedAt(e.target.value)} />
            </label>
            <label>
              <span>下次复查日期</span>
              <input
                type="date"
                value={revisitAt}
                className={revisitTooEarly ? "input-error" : ""}
                onChange={(e) => setRevisitAt(e.target.value)}
              />
              {revisitTooEarly && <small className="field-error">复查日期不能早于修蹄日期</small>}
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>3 · 评估与蹄铁</h3>
          <div className="field-grid">
            <label>
              <span>蹄形评估</span>
              <input list="hoof-shapes" value={hoofShape} placeholder="选择或填写蹄形情况" onChange={(e) => setHoofShape(e.target.value)} />
              <datalist id="hoof-shapes">
                {HOOF_SHAPES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label>
              <span>蹄铁类型</span>
              <input list="shoe-types" value={shoeType} onChange={(e) => setShoeType(e.target.value)} />
              <datalist id="shoe-types">
                {SHOE_TYPES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className="full">
              <span>钉位</span>
              <input value={nailPositions} placeholder="如 内外侧 4+4，外侧第2钉略前移" onChange={(e) => setNailPositions(e.target.value)} />
              <div className="chips mini-chips">
                {NAIL_PRESETS.map((p) => (
                  <button type="button" key={p} onClick={() => setNailPositions(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </label>
            <label className="full">
              <span>步态问题</span>
              <textarea
                rows={2}
                value={gaitIssue}
                placeholder="描述落蹄、步幅、磨耗等步态表现"
                onChange={(e) => setGaitIssue(e.target.value)}
              />
              <label className="check-line">
                <input type="checkbox" checked={gaitAbnormal} onChange={(e) => setGaitAbnormal(e.target.checked)} />
                <span className={gaitAbnormal ? "text-red" : ""}>标记为异常步态（首页可快速筛出）</span>
              </label>
            </label>
            <label className="check-line">
              <input type="checkbox" checked={shoeReplaced} onChange={(e) => setShoeReplaced(e.target.checked)} />
              <span>本次更换了蹄铁（计入蹄铁更换历史，30 天内首页可筛）</span>
            </label>
            <label className="full">
              <span>备注</span>
              <textarea rows={2} value={note} placeholder="用药、护理、与教练沟通事项等" onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>4 · 照片</h3>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={photoBusy}
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {photoBusy && <small className="muted">正在压缩照片…</small>}
          {photoError && <small className="field-error">{photoError}</small>}
          {photos.length > 0 && (
            <div className="photo-grid">
              {photos.map((p) => (
                <figure key={p.id} className="photo-thumb">
                  <img src={p.dataUrl} alt={p.name} />
                  <figcaption>
                    <span title={p.name}>{p.name}</span>
                    <button type="button" className="link-btn" onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}>
                      移除
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="panel recent-panel">
        <h2>{effectiveHorseId || "马匹"} · 近期记录</h2>
        <p className="muted small">不用翻上次治疗：保存后新记录会立刻出现在这里。</p>
        {recent.length === 0 && <p className="empty-hint">这匹马还没有记录，保存第一条后即归档到此。</p>}
        <div className="recent-list">
          {recent.map((r) => {
            const status = revisitStatus(r.revisitAt, today);
            return (
              <button
                type="button"
                key={r.id}
                className={`recent-item ${status === "overdue" ? "row-overdue" : ""}`}
                onClick={() => onOpenHorse(r.horseId, r.id, r.hoof)}
              >
                <div className="recent-head">
                  <b>{HOOF_LABELS[r.hoof]}</b>
                  <span>{formatCN(r.trimmedAt)}</span>
                </div>
                <p>
                  {r.shoeType}
                  {r.shoeReplaced ? " · 换铁" : " · 沿用旧铁"}
                  {r.gaitAbnormal ? " · 步态异常" : ""}
                  {r.photos.length ? ` · 📷 ${r.photos.length}` : ""}
                </p>
                <small className={status === "overdue" ? "text-red" : status === "today" ? "text-amber" : "muted"}>
                  {status === "overdue"
                    ? `复查逾期 ${-daysBetween(today, r.revisitAt)} 天`
                    : status === "today"
                      ? "今日复查"
                      : `复查 ${formatCN(r.revisitAt)}`}
                </small>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
