import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { HoofId, HoofRecord, Horse } from "./types";
import { loadState, saveState } from "./lib/storage";
import { findSameDayRecord } from "./lib/selectors";
import { uid } from "./lib/utils";
import HomeView, { type FilterKey } from "./components/HomeView";
import HorseDetail from "./components/HorseDetail";
import Modal from "./components/Modal";
import RecordForm, { type RecordDraft } from "./components/RecordForm";

interface FormSession {
  horseId?: string; // 为空 = 新马
  presetHoof?: HoofId;
  // 每次打开换一个 token，强制表单重置为初始值
  token: number;
}

function buildRecord(draft: RecordDraft, createdAt: number): HoofRecord {
  return {
    id: uid("rec"),
    hoof: draft.hoof,
    date: draft.date,
    hoofShape: draft.hoofShape,
    gaitAbnormal: draft.gaitAbnormal,
    gaitNote: draft.gaitNote,
    shoeType: draft.shoeType,
    nailPosition: draft.nailPosition,
    replaced: draft.replaced,
    reviewDate: draft.reviewDate,
    note: draft.note,
    photos: draft.photos,
    createdAt,
  };
}

function App() {
  const [state, setState] = useState(loadState);
  const [view, setView] = useState<{ name: "home" } | { name: "horse"; id: string }>({ name: "home" });
  const [filter, setFilter] = useState<FilterKey>("all");
  const [session, setSession] = useState<FormSession | null>(null);
  const [highlightRecordId, setHighlightRecordId] = useState<string | undefined>();

  useEffect(() => {
    saveState(state);
  }, [state]);

  const currentHorse = useMemo<Horse | undefined>(() => {
    if (view.name !== "horse") return undefined;
    return state.horses.find((h) => h.id === view.id);
  }, [state, view]);

  const formHorse = session?.horseId
    ? state.horses.find((h) => h.id === session.horseId)
    : undefined;

  function openNew(horseId?: string, hoof?: HoofId) {
    setSession({ horseId, presetHoof: hoof, token: Date.now() });
  }

  function flashRecord(id: string) {
    setHighlightRecordId(id);
    setTimeout(() => {
      document.querySelector(".record-card.highlight")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
  }

  function handleSave(draft: RecordDraft) {
    const now = Date.now();

    if (draft.horseId) {
      const record = buildRecord(draft, now);
      setState((prev) => ({
        horses: prev.horses.map((h) =>
          h.id === draft.horseId ? { ...h, records: [...h.records, record] } : h
        ),
      }));
      const horseId = draft.horseId;
      setSession(null);
      setView({ name: "horse", id: horseId });
      flashRecord(record.id);
      return;
    }

    // 新马匹：录入首条记录的同时建立档案
    const horse: Horse = {
      id: uid("h"),
      code: draft.newCode ?? "",
      name: draft.newName ?? "",
      status: draft.newStatus ?? "运动马",
      createdAt: now,
      records: [buildRecord(draft, now)],
    };
    setState((prev) => ({ horses: [...prev.horses, horse] }));
    setSession(null);
    setView({ name: "horse", id: horse.id });
    flashRecord(horse.records[0].id);
  }

  function handleDeleteRecord(record: HoofRecord) {
    if (!window.confirm("确定删除这条修整记录？该蹄位的其他记录与照片不受影响。")) return;
    setState((prev) => ({
      horses: prev.horses.map((h) =>
        h.records.some((r) => r.id === record.id)
          ? { ...h, records: h.records.filter((r) => r.id !== record.id) }
          : h
      ),
    }));
    setHighlightRecordId(undefined);
  }

  function handleDeleteHorse(horse: Horse) {
    setState((prev) => ({ horses: prev.horses.filter((h) => h.id !== horse.id) }));
    setView({ name: "home" });
  }

  function handleRename(horse: Horse, patch: { name?: string; status?: string }) {
    setState((prev) => ({
      horses: prev.horses.map((h) => (h.id === horse.id ? { ...h, ...patch } : h)),
    }));
  }

  return (
    <main className="app">
      {view.name === "home" || !currentHorse ? (
        <HomeView
          horses={state.horses}
          filter={filter}
          onFilterChange={setFilter}
          onOpenHorse={(h) => {
            setHighlightRecordId(undefined);
            setView({ name: "horse", id: h.id });
          }}
          onNewRecord={() => openNew()}
        />
      ) : (
        <HorseDetail
          horse={currentHorse}
          highlightRecordId={highlightRecordId}
          onBack={() => setView({ name: "home" })}
          onAdd={(hoof) => openNew(currentHorse.id, hoof)}
          onDeleteRecord={handleDeleteRecord}
          onDeleteHorse={handleDeleteHorse}
          onRename={handleRename}
        />
      )}

      {session && (
        <Modal
          title={formHorse ? `为 ${formHorse.code} 新增修整记录` : "新增修整记录（新马匹）"}
          subtitle="保存后立即归档到对应马匹的左右前后蹄档案"
          onClose={() => setSession(null)}
        >
          <RecordForm
            key={session.token}
            horse={formHorse}
            presetHoof={session.presetHoof}
            lookupDuplicate={(hoof, date) => findSameDayRecord(formHorse, hoof, date)}
            onSave={handleSave}
            onCancel={() => setSession(null)}
          />
        </Modal>
      )}
    </main>
  );
}

export default App;
