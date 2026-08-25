import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { fmt } from "../lib/time";
import BackHead from "../components/BackHead";

// ---------- read-only quick look at a public route ----------
// The stop between "saw it in Explore" and "it's in my library" — nothing
// is added until you say so. Segments/notes render exactly like the real
// roadbook, just without PB/target-per-segment (you haven't run it yet).
export default function RoutePreview({ route, userId, onBack, onAdd, onRequireAuth, onOpenProfile }) {
  const [busy, setBusy] = useState(false);
  const [alreadyMine, setAlreadyMine] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    db.isInLibrary(route.id, userId).then((v) => { if (live) setAlreadyMine(v); });
    return () => { live = false; };
  }, [route.id, userId]);

  const handleAdd = async () => {
    if (!userId) { onRequireAuth?.(route); return; }
    setBusy(true);
    try {
      await onAdd(route);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pn-view pn-public-wash">
      <BackHead onBack={onBack} eyebrow="Preview" title={route.name} accent="public" />
      <div className="pn-hint" style={{ marginBottom: 4 }}>
        by{" "}
        {route.profiles?.username && onOpenProfile ? (
          <button
            className="pn-author-link"
            onClick={() => onOpenProfile({ userId: route.owner_id, username: route.profiles.username })}
          >
            {route.profiles.username}
          </button>
        ) : (
          route.profiles?.username || "unknown"
        )}
        {route.remixed_from_name && ` · remixed from "${route.remixed_from_name}"`}
      </div>

      <div className="pn-instrument-row" style={{ margin: "14px 0 20px" }}>
        <div className="pn-instrument">
          <span className="pn-instrument-label">segments</span>
          <span className="pn-mono">{route.segments?.length ?? 0}</span>
        </div>
        {route.target_ms != null && route.use_target !== false && (
          <>
            <div className="pn-instrument-divider" />
            <div className="pn-instrument">
              <span className="pn-instrument-label">target</span>
              <span className="pn-mono">{fmt(route.target_ms, false)}</span>
            </div>
          </>
        )}
      </div>

      <button className="pn-btn pn-btn-primary pn-btn-full" disabled={busy} onClick={handleAdd} style={{ marginBottom: 24 }}>
        {!userId ? "Sign in to add to your library" : alreadyMine ? "Open in your library →" : "+ Add to your library"}
      </button>

      <label className="pn-label" style={{ marginTop: 0 }}>Roadbook</label>
      <div className="pn-roadbook pn-stagger">
        {(route.segments || []).map((s, i) => (
          <div className="pn-roadbook-row" key={s.id ?? i}>
            <div className="pn-roadbook-scale">
              <span className="pn-roadbook-tick" />
              <span className="pn-roadbook-num">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="pn-roadbook-content">
              <div className="pn-roadbook-title-row">
                <div className="pn-roadbook-title">{s.title}</div>
                {route.use_target !== false && s.target_ms != null && (
                  <div className="pn-roadbook-times">
                    <span className="pn-bracket">target {fmt(s.target_ms, false)}</span>
                  </div>
                )}
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
  );
}
