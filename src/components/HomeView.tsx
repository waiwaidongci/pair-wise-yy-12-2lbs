import type { Horse } from "../types";
import {
  HOOF_LABEL,
  HOOF_ORDER,
  hasGaitIssue,
  hoofTimelines,
  latestRecord,
  nextReview,
  recordsNewestFirst,
  replacedWithinDays,
  uniqueHoofCount,
} from "../lib/selectors";
import { daysUntil, formatCN, reviewLabel } from "../lib/utils";

export type FilterKey =
  | "all"
  | "due"
  | "overdue"
  | "gait"
  | "shoe30"
  | "sport"
  | "rest"
  | "front"
  | "hind";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部马匹" },
  { key: "overdue", label: "逾期复查" },
  { key: "due", label: "近期复查(3天内)" },
  { key: "gait", label: "步态异常" },
  { key: "shoe30", label: "30天内换蹄铁" },
  { key: "sport", label: "运动马" },
  { key: "rest", label: "休养马" },
  { key: "front", label: "前蹄有记录" },
  { key: "hind", label: "后蹄有记录" },
];

interface Props {
  horses: Horse[];
  filter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
  onOpenHorse: (horse: Horse) => void;
  onNewRecord: () => void;
}

function matches(h: Horse, f: FilterKey): boolean {
  const review = nextReview(h);
  const n = review ? daysUntil(review) : null;
  const lines = hoofTimelines(h);
  switch (f) {
    case "all":
      return true;
    case "overdue":
      return n !== null && n < 0;
    case "due":
      return n !== null && n >= 0 && n <= 3;
    case "gait":
      return hasGaitIssue(h);
    case "shoe30":
      return replacedWithinDays(h, 30);
    case "sport":
      return h.status === "运动马";
    case "rest":
      return h.status === "休养马";
    case "front":
      return lines.LF.length + lines.RF.length > 0;
    case "hind":
      return lines.LH.length + lines.RH.length > 0;
  }
}

export default function HomeView({ horses, filter, onFilterChange, onOpenHorse, onNewRecord }: Props) {
  // 复查提醒：有复查日期的马，逾期在前，同档按日期升序
  const reminders = horses
    .map((h) => ({ horse: h, review: nextReview(h) }))
    .filter((x) => x.review)
    .sort((a, b) => {
      const na = daysUntil(a.review);
      const nb = daysUntil(b.review);
      if ((na < 0) !== (nb < 0)) return na < 0 ? -1 : 1;
      return a.review.localeCompare(b.review);
    });

  const overdueCount = reminders.filter((r) => daysUntil(r.review) < 0).length;
  const dueCount = reminders.filter((r) => {
    const n = daysUntil(r.review);
    return n >= 0 && n <= 3;
  }).length;
  const gaitCount = horses.filter(hasGaitIssue).length;
  const shoeCount = horses.filter((h) => replacedWithinDays(h, 30)).length;

  const visible = horses.filter((h) => matches(h, filter));

  return (
    <div className="home">
      <div className="home-head">
        <div>
          <h1>蹄铁师工作台</h1>
          <p>录入即按马匹与左右前后蹄归档，旧照片和换铁历史始终保留</p>
        </div>
        <button type="button" className="primary big" onClick={onNewRecord}>
          ＋ 新增修整记录
        </button>
      </div>

      <section className="metrics">
        <article className={overdueCount > 0 ? "metric-alert" : ""}>
          <small>待复查（逾期 / 3天内）</small>
          <strong>
            {overdueCount}
            <em> / {dueCount}</em>
          </strong>
        </article>
        <article className={gaitCount > 0 ? "metric-warn" : ""}>
          <small>步态异常马匹</small>
          <strong>{gaitCount}</strong>
        </article>
        <article>
          <small>30天内更换蹄铁</small>
          <strong>{shoeCount}</strong>
        </article>
        <article>
          <small>马匹档案</small>
          <strong>{horses.length}</strong>
        </article>
      </section>

      <section className="panel reminder-panel">
        <div className="heading">
          <div>
            <p>复查提醒</p>
            <h2>按下次复查日期排序</h2>
          </div>
        </div>
        {reminders.length === 0 ? (
          <p className="empty-line">暂无安排复查的马匹</p>
        ) : (
          <ul className="reminder-list">
            {reminders.map(({ horse, review }) => {
              const info = reviewLabel(review);
              return (
                <li key={horse.id}>
                  <button type="button" className={`reminder-row ${info.tone}`} onClick={() => onOpenHorse(horse)}>
                    <span className="reminder-code">{horse.code}</span>
                    <span className="reminder-name">{horse.name || "未命名"}</span>
                    <span className="reminder-date">{formatCN(review)}</span>
                    <span className={`review-pill ${info.tone}`}>{info.text}</span>
                    <span className="reminder-go">查看档案 →</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>快速筛选</p>
            <h2>马匹档案</h2>
          </div>
        </div>
        <div className="chips filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={filter === f.key ? "active" : ""}
              onClick={() => onFilterChange(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="empty-line">没有符合筛选条件的马匹。</p>
        ) : (
          <div className="horse-grid">
            {visible
              .slice()
              .sort((a, b) => (latestRecord(b)?.date ?? "").localeCompare(latestRecord(a)?.date ?? ""))
              .map((h) => {
                const latest = latestRecord(h);
                const review = nextReview(h);
                const info = reviewLabel(review);
                const lines = hoofTimelines(h);
                return (
                  <button
                    type="button"
                    key={h.id}
                    className="horse-card"
                    onClick={() => onOpenHorse(h)}
                  >
                    <header>
                      <h3>{h.code}</h3>
                      <span className="status-tag">{h.status}</span>
                    </header>
                    <p className="horse-name">{h.name || "未命名"}</p>

                    {review && (
                      <span className={`review-pill ${info.tone}`}>
                        {formatCN(review)} · {info.text}
                      </span>
                    )}

                    <div className="hoof-dots">
                      {HOOF_ORDER.map((hd) => (
                        <span
                          key={hd}
                          className={`hoof-dot ${lines[hd].length ? "filled" : ""} ${
                            lines[hd][0]?.replaced ? "replaced" : ""
                          } ${lines[hd][0]?.gaitAbnormal ? "gait" : ""}`}
                          title={`${HOOF_LABEL[hd]}：${lines[hd].length} 条`}
                        >
                          {HOOF_LABEL[hd].charAt(0)}
                        </span>
                      ))}
                    </div>

                    <dl className="horse-meta">
                      <div>
                        <dt>最近修蹄</dt>
                        <dd>{latest ? formatCN(latest.date) : "—"}</dd>
                      </div>
                      <div>
                        <dt>已归档蹄位</dt>
                        <dd>{uniqueHoofCount(h)}/4</dd>
                      </div>
                      <div>
                        <dt>记录数</dt>
                        <dd>{recordsNewestFirst(h).length}</dd>
                      </div>
                    </dl>

                    <div className="horse-flags">
                      {hasGaitIssue(h) && <span className="tag tag-gait">步态异常</span>}
                      {replacedWithinDays(h, 30) && <span className="tag tag-shoe">30天内换铁</span>}
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}
