import { useEffect, useMemo, useState } from "react";
import type { AppData, Hoof, Photo, TrimmingRecord } from "../types";
import { HOOFS, HOOF_LABELS } from "../types";
import { daysBetween, formatCN, revisitStatus } from "../dateUtils";
import { recordsOf, shoeHistory } from "../store";

type HoofTab = "ALL" | Hoof;

export default function Archive({
  data,
  today,
  selectedHorseId,
  highlightedRecordId,
  onSelectHorse,
  onNewRecord,
}: {
  data: AppData;
  today: string;
  selectedHorseId: string | null;
  highlightedRecordId: string | null;
  onSelectHorse: (id: string) => void;
  onNewRecord: (horseId?: string) => void;
}) {
  const [tab, setTab] = useState<HoofTab>("ALL");
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  // 切换到另一匹马且未指定记录时，回到四蹄总览
  useEffect(() => {
    if (!highlightedRecordId) setTab("ALL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHorseId]);

  // 从提醒/重复提示跳转过来时，切到对应蹄位
  useEffect(() => {
    if (!highlightedRecordId) return;
    const rec = data.records.find((r) => r.id === highlightedRecordId);
    if (rec) setTab(rec.hoof);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedRecordId]);

  useEffect(() => {
    if (highlightedRecordId) {
      const t = setTimeout(() => {
        document.getElementById(`record-${highlightedRecordId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 60);
      return () => clearTimeout(t);
    }
  }, [highlightedRecordId, selectedHorseId, tab]);

  const horse = data.horses.find((h) => h.id === selectedHorseId) ?? data.horses[0] ?? null;
  const allRecords = useMemo(
    () => (horse ? recordsOf(data, horse.id) : []),
    [data, horse]
  );
  const historyAll = useMemo(
    () => (horse ? shoeHistory(data, horse.id) : []),
    [data, horse]
  );

  function hoofSummary(h: Hoof): TrimmingRecord | undefined {
    return allRecords.find((r) => r.hoof === h);
  }

  const visibleRecords = tab === "ALL" ? allRecords : allRecords.filter((r) => r.hoof === tab);
  const visibleHistory = tab === "ALL" ? historyAll : historyAll.filter((r) => r.hoof === tab);

  return (
    <div className="archive-layout">
      <aside className="panel horse-list">
        <h2>马匹档案</h2>
        <div className="chips vertical-chips">
          {data.horses.map((h) => (
            <button
              key={h.id}
              className={horse?.id === h.id ? "chip-on" : ""}
              onClick={() => {
                onSelectHorse(h.id);
                setTab("ALL");
              }}
            >
              {h.id}
              {h.name ? ` · ${h.name}` : ""}
            </button>
          ))}
          {data.horses.length === 0 && <p className="empty-hint">还没有马匹，先去录入一匹。</p>}
        </div>
      </aside>

      {horse ? (
        <section className="panel archive-detail">
          <div className="heading">
            <div>
              <p>{horse.category}{horse.name ? ` · ${horse.name}` : ""}</p>
              <h2>{horse.id} 修蹄档案</h2>
            </div>
            <button className="primary" onClick={() => onNewRecord(horse.id)}>
              给这匹马登记修蹄
            </button>
          </div>

          <div className="hoof-overview">
            {HOOFS.map((h) => {
              const r = hoofSummary(h);
              const status = r ? revisitStatus(r.revisitAt, today) : null;
              return (
                <button
                  key={h}
                  className={`hoof-card ${tab === h ? "hoof-card-on" : ""} ${status === "overdue" ? "row-overdue" : ""}`}
                  onClick={() => setTab(h)}
                >
                  <b>{HOOF_LABELS[h]}</b>
                  {r ? (
                    <>
                      <span>{formatCN(r.trimmedAt)}</span>
                      <small>{r.shoeType}</small>
                      <small className={status === "overdue" ? "text-red" : "muted"}>
                        {status === "overdue"
                          ? `复查逾期 ${-daysBetween(today, r.revisitAt)} 天`
                          : `复查 ${formatCN(r.revisitAt)}`}
                      </small>
                      {r.gaitAbnormal && <span className="badge badge-gait">步态异常</span>}
                    </>
                  ) : (
                    <small className="muted">尚无记录</small>
                  )}
                </button>
              );
            })}
          </div>

          <div className="tabbar">
            <button className={tab === "ALL" ? "tab-on" : ""} onClick={() => setTab("ALL")}>
              四蹄总览
            </button>
            {HOOFS.map((h) => (
              <button key={h} className={tab === h ? "tab-on" : ""} onClick={() => setTab(h)}>
                {HOOF_LABELS[h]}
              </button>
            ))}
          </div>

          {visibleHistory.length > 0 && (
            <div className="history-strip">
              <h3>蹄铁更换历史（{visibleHistory.length} 次，旧记录不会被覆盖）</h3>
              <ol>
                {visibleHistory.map((r) => (
                  <li key={r.id} className={tab === "ALL" ? "with-hoof" : ""}>
                    {tab === "ALL" && <span className="tag">{HOOF_LABELS[r.hoof]}</span>}
                    <b>{formatCN(r.trimmedAt)}</b>
                    <span>{r.shoeType}</span>
                    {r.nailPositions && <small>钉位：{r.nailPositions}</small>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="record-timeline">
            {visibleRecords.map((r) => (
              <RecordCard
                key={r.id}
                record={r}
                today={today}
                highlight={r.id === highlightedRecordId}
                onPhoto={(p) => setLightbox(p)}
                onJump={(h) => setTab(h)}
              />
            ))}
            {visibleRecords.length === 0 && (
              <p className="empty-hint">
                {tab === "ALL" ? "这匹马还没有修整记录。" : `${HOOF_LABELS[tab as Hoof]}还没有记录。`}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="panel">
          <p className="empty-hint">请先在录入页添加一匹马。</p>
        </section>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.dataUrl} alt={lightbox.name} />
            <figcaption>
              <span>{lightbox.name}</span>
              <button onClick={() => setLightbox(null)}>关闭</button>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}

function RecordCard({
  record,
  highlight,
  today,
  onPhoto,
  onJump,
}: {
  record: TrimmingRecord;
  highlight: boolean;
  today: string;
  onPhoto: (p: Photo) => void;
  onJump: (h: Hoof) => void;
}) {
  const status = revisitStatus(record.revisitAt, today);
  return (
    <article id={`record-${record.id}`} className={`record-card ${highlight ? "record-flash" : ""}`}>
      <header>
        <button type="button" className="hoof-tag" onClick={() => onJump(record.hoof)}>
          {HOOF_LABELS[record.hoof]}
        </button>
        <b>修蹄 {formatCN(record.trimmedAt)}</b>
        <span className={status === "overdue" ? "text-red" : status === "today" ? "text-amber" : "muted"}>
          {status === "overdue"
            ? `复查已逾期 ${-daysBetween(today, record.revisitAt)} 天（${formatCN(record.revisitAt)}）`
            : status === "today"
              ? `今日复查（${formatCN(record.revisitAt)}）`
              : `复查 ${formatCN(record.revisitAt)}`}
        </span>
      </header>
      <div className="record-badges">
        {record.gaitAbnormal && <span className="badge badge-gait">步态异常</span>}
        {record.shoeReplaced ? (
          <span className="badge badge-shoe">更换蹄铁</span>
        ) : (
          <span className="badge badge-muted">沿用旧蹄铁</span>
        )}
        {record.photos.length > 0 && <span className="badge badge-muted">照片 {record.photos.length} 张</span>}
      </div>
      <dl className="record-fields">
        <div>
          <dt>蹄形评估</dt>
          <dd>{record.hoofShape || "—"}</dd>
        </div>
        <div>
          <dt>蹄铁类型</dt>
          <dd>{record.shoeType || "—"}</dd>
        </div>
        <div>
          <dt>钉位</dt>
          <dd>{record.nailPositions || "—"}</dd>
        </div>
        <div>
          <dt>步态问题</dt>
          <dd>{record.gaitIssue || "—"}</dd>
        </div>
        {record.note && (
          <div className="full">
            <dt>备注</dt>
            <dd>{record.note}</dd>
          </div>
        )}
      </dl>
      {record.photos.length > 0 && (
        <div className="photo-grid">
          {record.photos.map((p) => (
            <button type="button" key={p.id} className="photo-thumb photo-btn" onClick={() => onPhoto(p)}>
              <img src={p.dataUrl} alt={p.name} />
              <span className="photo-name" title={p.name}>{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
