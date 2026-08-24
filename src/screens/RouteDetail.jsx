import { useState, useEffect } from "react";
import { getKey } from "../lib/storage";
import { fmt, toDurations, computeBPT } from "../lib/time";
import BackHead from "../components/BackHead";

// ---------- route detail (roadbook) ----------
export default function RouteDetail({ routeId, onBack, onEdit, onDelete, onStartRun, onHistory }) {
  const [route, setRoute] = useState(null);
  useEffect(() => { (async () => setRoute(await getKey(`pn_route_${routeId}`, null)))(); }, [routeId]);
  if (!route) return <div className="pn-view">Loading…</div>;

  const bpt = computeBPT(route.gold);
  const pbDurations = route.pb ? toDurations(route.pb.segments) : null;

  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="Route" title={route.name} />

      <div className="pn-gauge-panel">
        <div className="pn-gauge">
          <span className="pn-gauge-label">target</span>
          <span className="pn-mono pn-gauge-value">{route.target != null ? fmt(route.target, false) : "—"}</span>
        </div>
        <div className="pn-gauge-divider" />
        <div className="pn-gauge">
          <span className="pn-gauge-label">personal best</span>
          <span className="pn-mono pn-gauge-value pn-brass-text">{route.pb ? fmt(route.pb.total, false) : "—"}</span>
        </div>
        <div className="pn-gauge-divider" />
        <div className="pn-gauge">
          <span className="pn-gauge-label">best possible</span>
          <span className="pn-mono pn-gauge-value">{bpt != null ? fmt(bpt, false) : "—"}</span>
        </div>
      </div>

      <div className="pn-btn-row">
        <button className="pn-btn pn-btn-primary" style={{ flex: 2 }} onClick={onStartRun}>▶ Start run</button>
        <button className="pn-btn pn-btn-ghost" onClick={() => onEdit(route)}>Edit</button>
      </div>
      <button className="pn-btn pn-btn-ghost pn-btn-full" style={{ marginTop: 8 }} onClick={onHistory}>Run history</button>

      <label className="pn-label" style={{ marginTop: 22 }}>Roadbook</label>
      <div className="pn-roadbook">
        {route.segments.map((s, i) => (
          <div className="pn-roadbook-row" key={s.id}>
            <div className="pn-roadbook-scale">
              <span className="pn-roadbook-tick" />
              <span className="pn-roadbook-num">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="pn-roadbook-content">
              <div className="pn-roadbook-title-row">
                <div className="pn-roadbook-title">{s.title}</div>
                <div className="pn-roadbook-times">
                  {route.gold && route.gold[i] != null && <span className="pn-bracket pn-brass-text">gold {fmt(route.gold[i], false)}</span>}
                  {pbDurations && <span className="pn-bracket">pb {fmt(pbDurations[i], false)}</span>}
                </div>
              </div>
              {s.notes && (
                <ul className="pn-note-steps">
                  {s.notes.split("\n").filter(Boolean).map((line, j) => <li key={j}>{line}</li>)}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        className="pn-btn pn-btn-danger-ghost pn-btn-full"
        style={{ marginTop: 22 }}
        onClick={() => { if (confirm(`Delete route "${route.name}"? This can't be undone.`)) onDelete(route); }}
      >
        Delete route
      </button>
    </div>
  );
}
