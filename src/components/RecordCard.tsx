import type { HoofRecord } from "../types";
import { formatCN, reviewLabel } from "../lib/utils";
import PhotoGrid from "./PhotoGrid";

interface Props {
  record: HoofRecord;
  highlight?: boolean;
  compact?: boolean;
  onDelete?: (record: HoofRecord) => void;
}

/** 一条蹄部修整记录；蹄形、步态、蹄铁、钉位、照片各占独立区块，追加而非覆盖 */
export default function RecordCard({ record, highlight, compact, onDelete }: Props) {
  const review = reviewLabel(record.reviewDate);

  return (
    <article className={`record-card${highlight ? " highlight" : ""}`}>
      <header className="record-head">
        <div>
          <strong>{formatCN(record.date)} 修蹄</strong>
          {record.replaced && <span className="tag tag-shoe">换蹄铁</span>}
          {record.gaitAbnormal && <span className="tag tag-gait">步态异常</span>}
        </div>
        {record.reviewDate && <span className={`review-pill ${review.tone}`}>{review.text}</span>}
      </header>

      <dl className="record-grid">
        <div>
          <dt>蹄形评估</dt>
          <dd>{record.hoofShape || "—"}</dd>
        </div>
        <div>
          <dt>步态</dt>
          <dd>
            {record.gaitAbnormal ? (
              <span className="gait-bad">异常：{record.gaitNote || "未描述"}</span>
            ) : (
              <span className="gait-ok">正常{record.gaitNote ? `（${record.gaitNote}）` : ""}</span>
            )}
          </dd>
        </div>
        <div>
          <dt>蹄铁类型</dt>
          <dd>
            {record.shoeType || "—"}
            {record.replaced ? "（本次更换）" : record.shoeType ? "（沿用）" : ""}
          </dd>
        </div>
        <div>
          <dt>钉位</dt>
          <dd>{record.nailPosition || "—"}</dd>
        </div>
        {!compact && (
          <div className="record-wide">
            <dt>下次复查</dt>
            <dd>{record.reviewDate ? formatCN(record.reviewDate) : "未安排"}</dd>
          </div>
        )}
        {!compact && record.note && (
          <div className="record-wide">
            <dt>备注</dt>
            <dd>{record.note}</dd>
          </div>
        )}
      </dl>

      <PhotoGrid photos={record.photos} />

      {onDelete && (
        <button type="button" className="link-danger" onClick={() => onDelete(record)}>
          删除这条记录
        </button>
      )}
    </article>
  );
}
