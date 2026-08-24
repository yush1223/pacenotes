// ---------- time helpers ----------
export function fmt(ms, showTenths = true) {
  if (ms == null || isNaN(ms)) return "—";
  const neg = ms < 0;
  ms = Math.abs(ms);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const t = Math.floor((ms % 1000) / 100);
  let str = "";
  if (h > 0) str = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  else str = `${m}:${String(s).padStart(2, "0")}`;
  if (showTenths) str += `.${t}`;
  return (neg ? "-" : "") + str;
}

export function fmtDelta(ms) {
  if (ms == null || isNaN(ms)) return null;
  const sign = ms > 0 ? "+" : ms < 0 ? "−" : "";
  return sign + fmt(Math.abs(ms), true);
}

export function parseTargetInput(str) {
  if (!str) return null;
  const parts = str.split(":").map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p))) return null;
  let ms = 0;
  if (parts.length === 3) ms = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  else if (parts.length === 2) ms = (parts[0] * 60 + parts[1]) * 1000;
  else if (parts.length === 1) ms = parts[0] * 1000;
  else return null;
  return ms;
}

export function relTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function toDurations(cum) {
  return cum.map((c, i) => (i === 0 ? c : c - cum[i - 1]));
}
