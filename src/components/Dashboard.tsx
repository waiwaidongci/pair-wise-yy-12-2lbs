import { useMemo, useState } from "react";
import type { AppData } from "../types";
import { daysBetween, revisitStatus, formatCN } from "../dateUtils";
import { horseStatuses } from "../store";

type FilterKey = "overdue" | "gait" | "replaced";

const FILTERS: { key: FilterKey; label: string; desc: string }[] = [
  { key: "gait", label: "步态异常", desc: "最近一次记录标记了异常步态" },
  { key: "replaced", label: "30天内换过蹄铁", desc: "近30天有更换蹄铁记录" },
  { key: "overdue", label: "复查逾期", desc: "存在已过期的复查日期" },
];

export default function Dashboard({
  data,
  today,
  onOpenHorse,
  onNewRecord,
}: {
  data: AppData;
  today: string;
  onOpenHorse: (horseId: string) => void;
  onNewRecord: (horseId?: string) => void;
}) {
  const [active, setActive] = useState<Set<FilterKey>>(new Set());

  const statuses = useMemo(() => horseStatuses(data, today), [data, today]);

  const metrics = useMemo(
    () => [
      {
        label: "待复查",
        value: statuses.filter((s) => s.revisitAt !== null && s.revisitAt <= today).length,
        sub: `其中逾期 ${statuses.filter((s) => s.overdue).length} 匹`,
      },
      { label: "异常步态", value: statuses.filter((s) => s.gaitAbnormal).length, sub: "最近记录异常" },
      { label: "30天内换过蹄铁", value: statuses.filter((s) => s.replacedRecently).length, sub: "需重点跟进" },
      { label: "马匹档案", value: statuses.length, sub: "全部在册马匹" },
    ],
    [statuses, today]
  );

  const filtered = useMemo(() => {
    const list = statuses.filter((s) => {
      if (active.has("overdue") && !s.overdue) return false;
      if (active.has("gait") && !s.gaitAbnormal) return false;
      if (active.has("replaced") && !s.replacedRecently) return false;
      return true;
    });
    // 逾期优先，然后按复查日期升序，未排期的沉底
    return list.sort((a, b) => {
      const ra = a.revisitAt ? a.revisitAt : "9999";
      const rb = b.revisitAt ? b.revisitAt : "9999";
      return ra.localeCompare(rb);
    });
  }, [statuses, active]);

  function toggle(key: FilterKey) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="dashboard">
      <div className="metrics">
        {metrics.map((m) => (
          <article key={m.label} className={m.label === "待复查" && Number(m.value) > 0 ? "metric-warn" : ""}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
            <em>{m.sub}</em>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="heading">
          <div>
            <p>复查提醒</p>
            <h2>首页工作台 · {formatCN(today)}</h2>
          </div>
          <button className="primary" onClick={() => onNewRecord()}>
            录入新修整记录
          </button>
        </div>

        <div className="chips filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={active.has(f.key) ? "chip-on" : ""}
              title={f.desc}
              onClick={() => toggle(f.key)}
            >
              {f.label}
            </button>
          ))}
          {active.size > 0 && (
            <button className="chip-clear" onClick={() => setActive(new Set())}>
              清除筛选
            </button>
          )}
        </div>

        <div className="horse-grid">
          {filtered.map((s) => {
            const status = s.revisitAt ? revisitStatus(s.revisitAt, today) : null;
            return (
              <article
                key={s.horse.id}
                className={`horse-card ${status === "overdue" ? "row-overdue" : ""}`}
                onClick={() => onOpenHorse(s.horse.id)}
              >
                <header>
                  <h3>{s.horse.id}</h3>
                  {s.horse.name && <span className="horse-name">{s.horse.name}</span>}
                  <span className="tag">{s.horse.category}</span>
                </header>
                <div className="revisit-line">
                  {s.revisitAt ? (
                    <>
                      <span className={status === "overdue" ? "text-red" : status === "today" ? "text-amber" : ""}>
                        {status === "overdue"
                          ? `复查已逾期 ${-daysBetween(today, s.revisitAt)} 天`
                          : status === "today"
                            ? "今日复查"
                            : `${daysBetween(today, s.revisitAt)} 天后复查`}
                      </span>
                      <small>{formatCN(s.revisitAt)}</small>
                    </>
                  ) : (
                    <span className="muted">尚无复查排期</span>
                  )}
                </div>
                <footer>
                  {s.gaitAbnormal && <span className="badge badge-gait">步态异常</span>}
                  {s.replacedRecently && <span className="badge badge-shoe">近期换铁</span>}
                  {s.overdue && <span className="badge badge-overdue">逾期</span>}
                  {!s.gaitAbnormal && !s.replacedRecently && !s.overdue && (
                    <span className="muted">状态平稳</span>
                  )}
                  <button
                    className="link-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewRecord(s.horse.id);
                    }}
                  >
                    登记修蹄 →
                  </button>
                </footer>
              </article>
            );
          })}
          {filtered.length === 0 && (
            <p className="empty-hint">没有符合筛选条件的马匹，清除筛选后可查看全部。</p>
          )}
        </div>
      </section>
    </div>
  );
}
