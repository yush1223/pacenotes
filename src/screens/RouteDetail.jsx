import { useState, useEffect } from "react";
import { getKey, setKey } from "../lib/storage";
import { fmt, toDurations } from "../lib/time";
import BackHead from "../components/BackHead";
import { useConfirm } from "../components/ConfirmProvider";

// ---------- route detail (roadbook) ----------
export default function RouteDetail({ routeId, onBack, onEdit, onDelete, onStartRun, onHistory }) {
  const [route, setRoute] = useState(null);
  const confirm = useConfirm();
  useEffect(() => { (async () => setRoute(await getKey(`pn_route_${routeId}`, null)))(); }, [routeId]);
  if (!route) return <div className="pn-view">Loading…</div>;

  const pbDurations = route.pb ? toDurations(route.pb.segments) : null;

  const resetPB = async () => {
    if (!(await confirm(`Clear the personal best for "${route.name}"? This can't be undone — your next run starts fresh.`))) return;
    const updated = { ...route, pb: null };
    await setKey(`pn_route_${route.id}`, updated);
    setRoute(updated);
  };

  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="Route" title={route.name} />

      <div className="pn-split-cols">
        <div className="pn-split-col-sticky">
          <div className="pn-gauge-panel" style={{ flexDirection: "column", alignItems: "stretch", gap: 14, padding: "18px 16px" }}>
            <div className="pn-gauge" style={{ alignItems: "flex-start" }}>
              <span className="pn-gauge-label">personal best</span>
              <span className="pn-mono pn-gauge-value pn-brass-text">{route.pb ? fmt(route.pb.total, false) : "—"}</span>
            </div>
            {route.useTarget !== false && route.target != null && (
              <div className="pn-gauge" style={{ alignItems: "flex-start" }}>
                <span className="pn-gauge-label">target</span>
                <span className="pn-mono pn-gauge-value">{fmt(route.target, false)}</span>
              </div>
            )}
          </div>

          <button className="pn-btn pn-btn-primary pn-btn-full" style={{ marginTop: 14 }} onClick={onStartRun}>▶ Start run</button>
          <div className="pn-btn-row" style={{ marginTop: 8 }}>
            <button className="pn-btn pn-btn-ghost" onClick={() => onEdit(route)}>Edit</button>
            <button className="pn-btn pn-btn-ghost" onClick={onHistory}>History</button>
          </div>

          <button
            className="pn-btn pn-btn-ghost pn-btn-full"
            style={{ marginTop: 16 }}
            disabled={!route.pb}
            onClick={resetPB}
          >
            Reset PB
          </button>

          <button
            className="pn-btn pn-btn-danger-ghost pn-btn-full"
            style={{ marginTop: 10 }}
            onClick={async () => { if (await confirm(`Delete route "${route.name}"? This can't be undone.`)) onDelete(route); }}
          >
            Delete route
          </button>
        </div>

        <div>
          <label className="pn-label" style={{ marginTop: 0 }}>Roadbook</label>
          <div className="pn-roadbook pn-stagger">
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
                      {pbDurations && <span className="pn-bracket pn-brass-text">pb {fmt(pbDurations[i], false)}</span>}
                      {route.useTarget !== false && route.targets && route.targets[i] != null && <span className="pn-bracket">target {fmt(route.targets[i], false)}</span>}
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
        </div>
      </div>
    </div>
  );
}
