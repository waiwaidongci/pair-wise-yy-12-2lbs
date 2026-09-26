// 日期统一按本地 yyyy-mm-dd 字符串比较，避免 UTC 偏移

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysISO(baseISO: string, days: number): string {
  const [y, m, d] = baseISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
}

export function diffDays(fromISO: string, toISO: string): number {
  const [y1, m1, d1] = fromISO.split("-").map(Number);
  const [y2, m2, d2] = toISO.split("-").map(Number);
  const a = new Date(y1, m1 - 1, d1).getTime();
  const b = new Date(y2, m2 - 1, d2).getTime();
  return Math.round((b - a) / 86400000);
}

/** 复查日期相对今天：负数=逾期天数，0=今天，正数=还有几天 */
export function daysUntil(iso: string): number {
  return diffDays(todayISO(), iso);
}

export function formatCN(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

export function reviewLabel(iso: string): { text: string; tone: "overdue" | "today" | "soon" | "ok" } {
  if (!iso) return { text: "未安排复查", tone: "ok" };
  const n = daysUntil(iso);
  if (n < 0) return { text: `逾期 ${-n} 天`, tone: "overdue" };
  if (n === 0) return { text: "今天复查", tone: "today" };
  if (n <= 3) return { text: `${n} 天后复查`, tone: "soon" };
  return { text: `${n} 天后复查`, tone: "ok" };
}

let seq = 0;
export function uid(prefix = "r"): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 把上传照片压到最长边 900、jpeg 0.72，避免 localStorage 爆掉 */
export function fileToThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("照片读取失败"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("照片解析失败"));
      img.onload = () => {
        const MAX = 900;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("照片压缩失败"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** 演示数据用的简易占位照片（纯色 + 文字 dataURL） */
export function placeholderPhoto(label: string, color: string): string {
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 320;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 480, 320);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 240, 160);
  return c.toDataURL("image/jpeg", 0.8);
}
