import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { fmt } from "../lib/time";
import BackHead from "../components/BackHead";
import { useConfirm } from "../components/ConfirmProvider";

// ---------- route detail (roadbook) ----------
export default function RouteDetail({ routeId, userId, onBack, onEdit, onDelete, onStartRun, onHistory, onVisibilityChange, flash }) {
  const [route, setRoute] = useState(null);
  const [pb, setPb] = useState(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    (async () => {
      setRoute(await db.getRoute(routeId));
      setPb(await db.getPB(routeId, userId));
    })();
  }, [routeId, userId]);

  if (!route) return <div className="pn-view">Loading…</div>;
  const isOwner = route.owner_id === userId;

  const resetPB = async () => {
    if (!(await confirm(`Clear your personal best for "${route.name}"? This can't be undone — your next run starts fresh.`))) return;
    await db.resetPB(route.id, userId);
    setPb(null);
  };

  const publish = async () => {
    const ok = await confirm(
      `Publish "${route.name}" to Explore? Anyone will be able to find it, follow it, and run it — you can unpublish any time.`,
      { danger: false, confirmLabel: "Publish" }
    );
    if (!ok) return;
    setPublishBusy(true);
    try {
      await db.setRouteVisibility(route.id, "public");
      setRoute((r) => ({ ...r, visibility: "public" }));
      onVisibilityChange?.();
      flash?.(`Published — "${route.name}" is now visible in Explore`);
    } finally {
      setPublishBusy(false);
    }
  };

  const unpublish = async () => {
    const ok = await confirm(
      `Unpublish "${route.name}"? It'll disappear from Explore, though anyone already following it keeps it in their library.`,
      { danger: true, confirmLabel: "Unpublish" }
    );
    if (!ok) return;
    setPublishBusy(true);
    try {
      await db.setRouteVisibility(route.id, "private");
      setRoute((r) => ({ ...r, visibility: "private" }));
      onVisibilityChange?.();
      flash?.("Unpublished — private again");
    } finally {
      setPublishBusy(false);
    }
  };

  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="Route" title={route.name} />

      <div className="pn-split-cols">
        <div className="pn-split-col-sticky">
          <div className="pn-gauge-panel" style={{ flexDirection: "column", alignItems: "stretch", gap: 14, padding: "18px 16px" }}>
            <div className="pn-gauge" style={{ alignItems: "flex-start" }}>
              <span className="pn-gauge-label">personal best</span>
              <span className="pn-mono pn-gauge-value pn-brass-text">{pb ? fmt(pb.total_ms, false) : "—"}</span>
            </div>
            {route.use_target !== false && route.target_ms != null && (
              <div className="pn-gauge" style={{ alignItems: "flex-start" }}>
                <span className="pn-gauge-label">target</span>
                <span className="pn-mono pn-gauge-value">{fmt(route.target_ms, false)}</span>
              </div>
            )}
          </div>

          <button className="pn-btn pn-btn-primary pn-btn-full" style={{ marginTop: 14 }} onClick={onStartRun}>▶ Start run</button>
          <div className="pn-btn-row" style={{ marginTop: 8 }}>
            {isOwner && <button className="pn-btn pn-btn-ghost" onClick={() => onEdit(route)}>Edit</button>}
            <button className="pn-btn pn-btn-ghost" onClick={onHistory}>History</button>
          </div>

          <button
            className="pn-btn pn-btn-ghost pn-btn-full"
            style={{ marginTop: 16 }}
            disabled={!pb}
            onClick={resetPB}
          >
            Reset PB
          </button>

          {isOwner && (
            <>
              <div className="pn-publish-box">
                <div className="pn-publish-status">
                  <span className={"pn-publish-dot" + (route.visibility === "public" ? " pn-publish-dot-live" : "")} />
                  <span className={route.visibility === "public" ? "pn-brass-text" : "pn-publish-status-text"}>
                    {route.visibility === "public" ? "Published — live in Explore" : "Private — only you"}
                  </span>
                </div>
                {route.visibility === "public" ? (
                  <button className="pn-btn pn-btn-ghost pn-btn-full" style={{ marginTop: 8 }} disabled={publishBusy} onClick={unpublish}>
                    Unpublish
                  </button>
                ) : (
                  <button className="pn-btn pn-btn-primary pn-btn-full" style={{ marginTop: 8 }} disabled={publishBusy} onClick={publish}>
                    Publish to Explore
                  </button>
                )}
              </div>

              <button
                className="pn-btn pn-btn-danger-ghost pn-btn-full"
                style={{ marginTop: 10 }}
                onClick={async () => { if (await confirm(`Delete route "${route.name}"? This can't be undone.`)) onDelete(route); }}
              >
                Delete route
              </button>
            </>
          )}
        </div>

        <div>
          <label className="pn-label" style={{ marginTop: 0 }}>Roadbook</label>
          <div className="pn-roadbook pn-stagger">
            {route.segments.map((s, i) => {
              const pbDur = pb ? toDuration(pb.splits, i) : null;
              return (
                <div className="pn-roadbook-row" key={s.id}>
                  <div className="pn-roadbook-scale">
                    <span className="pn-roadbook-tick" />
                    <span className="pn-roadbook-num">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="pn-roadbook-content">
                    <div className="pn-roadbook-title-row">
                      <div className="pn-roadbook-title">{s.title}</div>
                      <div className="pn-roadbook-times">
                        {pbDur != null && <span className="pn-bracket pn-brass-text">pb {fmt(pbDur, false)}</span>}
                        {route.use_target !== false && s.target_ms != null && <span className="pn-bracket">target {fmt(s.target_ms, false)}</span>}
                      </div>
                    </div>
                    {s.notes && (
                      <ul className="pn-note-steps">
                        {s.notes.split("\n").filter(Boolean).map((line, j) => <li key={j}>{line}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function toDuration(cumulativeSplits, i) {
  if (!cumulativeSplits || cumulativeSplits[i] == null) return null;
  return i === 0 ? cumulativeSplits[0] : cumulativeSplits[i] - cumulativeSplits[i - 1];
}
