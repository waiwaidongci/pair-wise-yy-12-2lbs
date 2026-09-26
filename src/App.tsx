import { useEffect, useState } from "react";
import "./styles.css";
import type { Hoof, Horse, SubmitInput, SubmitResult, TrimmingRecord } from "./types";
import { todayISODate } from "./dateUtils";
import { findSameDayRecord, loadData, saveData } from "./store";
import Dashboard from "./components/Dashboard";
import EntryForm from "./components/EntryForm";
import Archive from "./components/Archive";

type View = "home" | "entry" | "archive";

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function App() {
  const [data, setData] = useState(loadData);
  const [view, setView] = useState<View>("home");
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);
  const [entryHorseId, setEntryHorseId] = useState<string | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const result = saveData(data);
    if (!result.ok) setStorageError(result.error);
    else setStorageError(null);
  }, [data]);

  function openHorse(horseId: string, recordId?: string, _hoof?: Hoof) {
    setSelectedHorseId(horseId);
    setHighlightedRecordId(recordId ?? null);
    setView("archive");
  }

  function openEntry(horseId?: string) {
    setEntryHorseId(horseId);
    setFormKey((k) => k + 1);
    setView("entry");
  }

  function handleSubmit(input: SubmitInput): SubmitResult {
    // 新马匹先建档（编号冲突在此兜底）
    let horse: Horse | undefined = data.horses.find((h) => h.id === input.horseId);
    if (input.isNewHorse) {
      if (horse) {
        return { ok: false, reason: "validation" };
      }
      horse = {
        id: input.horseId,
        name: input.newHorseName,
        category: input.newHorseCategory,
        createdAt: todayISODate(),
      };
    } else if (!horse) {
      return { ok: false, reason: "validation" };
    }

    // 同一天同一蹄已有记录：阻止保存，让师傅先看旧记录（含旧照片、更换历史）
    const existing = findSameDayRecord(data, input.horseId, input.hoof, input.trimmedAt);
    if (existing) {
      return { ok: false, reason: "duplicate", existing };
    }

    const record: TrimmingRecord = {
      id: newId("r"),
      horseId: input.horseId,
      hoof: input.hoof,
      trimmedAt: input.trimmedAt,
      revisitAt: input.revisitAt,
      hoofShape: input.hoofShape,
      gaitIssue: input.gaitIssue,
      gaitAbnormal: input.gaitAbnormal,
      shoeType: input.shoeType,
      shoeReplaced: input.shoeReplaced,
      nailPositions: input.nailPositions,
      note: input.note,
      photos: input.photos,
      createdAt: new Date().toISOString(),
    };

    setData((prev) => ({
      horses: horse && !prev.horses.some((h) => h.id === horse!.id) ? [...prev.horses, horse!] : prev.horses,
      records: [...prev.records, record],
    }));
    return { ok: true, recordId: record.id };
  }

  const today = todayISODate();

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView("home")}>
          <span className="brand-mark">蹄</span>
          <div>
            <h1>马术蹄铁修整档案</h1>
            <small>蹄铁师工作台 · 按马匹四蹄归档</small>
          </div>
        </div>
        <nav className="nav">
          <button className={view === "home" ? "nav-on" : ""} onClick={() => setView("home")}>
            首页 · 复查提醒
          </button>
          <button
            className={view === "entry" ? "nav-on" : ""}
            onClick={() => {
              if (view !== "entry") openEntry(entryHorseId);
            }}
          >
            录入修整
          </button>
          <button className={view === "archive" ? "nav-on" : ""} onClick={() => setView("archive")}>
            马匹档案
          </button>
        </nav>
      </header>

      {view === "home" && (
        <Dashboard data={data} today={today} onOpenHorse={openHorse} onNewRecord={openEntry} />
      )}

      {view === "entry" && (
        <EntryForm
          key={formKey}
          data={data}
          today={today}
          initialHorseId={entryHorseId}
          onSubmit={handleSubmit}
          onOpenHorse={openHorse}
        />
      )}

      {view === "archive" && (
        <Archive
          data={data}
          today={today}
          selectedHorseId={selectedHorseId}
          highlightedRecordId={highlightedRecordId}
          onSelectHorse={(id) => {
            setSelectedHorseId(id);
            setHighlightedRecordId(null);
          }}
          onNewRecord={openEntry}
        />
      )}

      {storageError && (
        <div className="storage-toast" role="alert">
          <strong>保存到本地失败：</strong>
          {storageError}
        </div>
      )}
    </main>
  );
}

export default App;
