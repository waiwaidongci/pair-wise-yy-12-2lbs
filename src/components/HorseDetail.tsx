import { useState } from "react";
import type { HoofId, HoofRecord, Horse } from "../types";
import { HOOF_LABEL, HOOF_ORDER, HOOF_SIDE, hoofTimelines, nextReview } from "../lib/selectors";
import { formatCN, reviewLabel } from "../lib/utils";
import RecordCard from "./RecordCard";

interface Props {
  horse: Horse;
  highlightRecordId?: string;
  onBack: () => void;
  onAdd: (hoof: HoofId) => void;
  onDeleteRecord: (record: HoofRecord) => void;
  onDeleteHorse: (horse: Horse) => void;
  onRename: (horse: Horse, patch: { name?: string; status?: string }) => void;
}

export default function HorseDetail({
  horse,
  highlightRecordId,
  onBack,
  onAdd,
  onDeleteRecord,
  onDeleteHorse,
  onRename,
}: Props) {
  const lines = hoofTimelines(horse);
  const review = nextReview(horse);
  const reviewInfo = reviewLabel(review);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(horse.name);
  const [status, setStatus] = useState(horse.status);

  return (
    <div className="detail">
      <div className="detail-head panel">
        <button type="button" className="back-btn" onClick={onBack}>
          ← 返回工作台
        </button>
        <div className="detail-title">
          <div>
            <h1>{horse.code}</h1>
            <p className="sub">
              {horse.name || "未命名"} · {horse.status} · 共 {horse.records.length} 条修整记录 · 覆盖{" "}
              {HOOF_ORDER.filter((h) => lines[h].length > 0).length}/4 蹄
            </p>
          </div>
          <div className="detail-head-right">
            {review && (
              <span className={`review-pill large ${reviewInfo.tone}`}>
                下次复查 {formatCN(review)} · {reviewInfo.text}
              </span>
            )}
            <button type="button" className="primary" onClick={() => onAdd("LF")}>
              ＋ 新增修整记录
            </button>
          </div>
        </div>
        <div className="detail-tools">
          {editing ? (
            <span className="inline-edit">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="马名" />
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option>运动马</option>
                <option>休养马</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  onRename(horse, { name: name.trim(), status });
                  setEditing(false);
                }}
              >
                保存
              </button>
              <button type="button" onClick={() => setEditing(false)}>
                取消
              </button>
            </span>
          ) : (
            <button type="button" className="link-btn" onClick={() => setEditing(true)}>
              编辑马名/状态
            </button>
          )}
          <button
            type="button"
            className="link-danger"
            onClick={() => {
              if (window.confirm(`确定删除马匹 ${horse.code} 及其全部 ${horse.records.length} 条记录？`)) {
                onDeleteHorse(horse);
              }
            }}
          >
            删除马匹档案
          </button>
        </div>
      </div>

      <div className="hoof-grid">
        {HOOF_ORDER.map((h) => (
          <section key={h} className="panel hoof-panel" data-side={HOOF_SIDE[h]}>
            <header className="hoof-head">
              <div>
                <h2>{HOOF_LABEL[h]}</h2>
                <small>
                  {lines[h].length > 0 ? `${lines[h].length} 条记录` : "暂无记录"}
                  {lines[h][0] && (
                    <>
                      {" "}
                      · 最近 {formatCN(lines[h][0].date)}
                      {lines[h][0].replaced && " · 已换铁"}
                    </>
                  )}
                </small>
              </div>
              <button type="button" onClick={() => onAdd(h)}>
                ＋ 记一蹄
              </button>
            </header>

            <div className="hoof-timeline">
              {lines[h].length === 0 ? (
                <p className="empty-hoof">还没有{HOOF_LABEL[h]}的修整记录</p>
              ) : (
                lines[h].map((r) => (
                  <RecordCard
                    key={r.id}
                    record={r}
                    highlight={r.id === highlightRecordId}
                    onDelete={onDeleteRecord}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
