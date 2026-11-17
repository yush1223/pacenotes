import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { fmt } from "../lib/time";
import BackHead from "../components/BackHead";
import { useConfirm } from "../components/ConfirmProvider";

// ---------- route detail (roadbook) ----------
export default function RouteDetail({ routeId, userId, onBack, onEdit, onRemix, onDelete, onStartRun, onPractice, onHistory, onVisibilityChange, onOpenProfile, flash }) {
  const [route, setRoute] = useState(null);
  const [pb, setPb] = useState(null);
  const [practiceBests, setPracticeBests] = useState({});
  const [publishBusy, setPublishBusy] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    (async () => {
      setRoute(await db.getRoute(routeId));
      setPb(await db.getPB(routeId, userId));
      setPracticeBests(await db.getPracticeBests(routeId, userId));
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
    } catch (e) {
      flash?.(e.message || "Couldn't publish that route.");
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
      <BackHead onBack={onBack} eyebrow={route.games?.name || "Route"} title={route.name} />
      {route.remixed_from_name && (
        <div className="pn-remix-credit" style={{ marginTop: -12, marginBottom: 20 }}>
          ↻ Remixed from "{route.remixed_from_name}"
          {route.remix_owner?.username && onOpenProfile ? (
            <>
              {" "}by{" "}
              <button
                className="pn-author-link"
                onClick={() => onOpenProfile({ userId: route.remixed_from_owner_id, username: route.remix_owner.username })}
              >
                {route.remix_owner.username}
              </button>
            </>
          ) : route.remix_owner?.username ? (
            ` by ${route.remix_owner.username}`
          ) : (
            " by a deleted account"
          )}
        </div>
      )}

      <div className="pn-stat-row">
        <div className="pn-stat pn-stat-pb">
          <div className="pn-stat-label">Personal best</div>
          <div className={"pn-stat-value" + (pb ? "" : " pn-stat-value-empty")}>{pb ? fmt(pb.total_ms, false) : "—"}</div>
        </div>
        {route.use_target !== false && route.target_ms != null && (
          <div className="pn-stat">
            <div className="pn-stat-label">Target</div>
            <div className="pn-stat-value">{fmt(route.target_ms, false)}</div>
          </div>
        )}
        <div className="pn-stat">
          <div className="pn-stat-label">Segments</div>
          <div className="pn-stat-value">{route.segments.length}</div>
        </div>
      </div>

      <div className="pn-action-row">
        <button className="pn-btn pn-btn-primary pn-btn-lg" onClick={onStartRun}>Start run</button>
        <button className="pn-btn pn-btn-ghost" onClick={onPractice} title="Drill one segment at a time — doesn't touch your PB">Practice</button>
        {isOwner ? (
          <button className="pn-btn pn-btn-ghost" onClick={() => onEdit(route)}>Edit</button>
        ) : (
          onRemix && (
            <button className="pn-btn pn-btn-ghost" onClick={() => onRemix(route)} title="Make your own editable copy — credit to the original stays attached">
              Remix
            </button>
          )
        )}
        <button className="pn-btn pn-btn-ghost" onClick={onHistory}>History</button>
        {isOwner && (
          <div className="pn-action-row-end">
            {route.games?.steam_appid ? (
              <span className="pn-publish-status">
                <span className={"pn-publish-dot" + (route.visibility === "public" ? " pn-publish-dot-live" : "")} />
                <span className={route.visibility === "public" ? "pn-public-text" : "pn-publish-status-text"}>
                  {route.visibility === "public" ? "Published" : "Private"}
                </span>
              </span>
            ) : (
              <span className="pn-publish-status pn-publish-status-text">Custom game · can't publish</span>
            )}
          </div>
        )}
      </div>

      <h2 className="pn-section-title">Segments</h2>
      <div className="pn-roadbook pn-stagger">
        {route.segments.map((s, i) => {
          const pbDur = pb ? toDuration(pb.splits, i) : null;
          const practiceBest = practiceBests[s.id];
          const target = route.use_target !== false && s.target_ms != null ? s.target_ms : null;
          return (
            <div className="pn-roadbook-row" key={s.id}>
              <span className="pn-roadbook-num">{String(i + 1).padStart(2, "0")}</span>
              <div className="pn-roadbook-content">
                <div className="pn-roadbook-title">{s.title}</div>
                {s.notes && (
                  <ul className="pn-note-steps">
                    {s.notes.split("\n").filter(Boolean).map((line, j) => <li key={j}>{line}</li>)}
                  </ul>
                )}
              </div>
              <div className="pn-roadbook-times">
                {pbDur != null && <span className="pn-bracket pn-brass-text" title="Your PB run's time for this segment">{fmt(pbDur, false)}</span>}
                {target != null && <span className="pn-bracket" title="Target">target {fmt(target, false)}</span>}
                {practiceBest != null && <span className="pn-bracket" title="Your fastest logged practice rep">practice {fmt(practiceBest, false)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pn-manage">
        {isOwner && route.games?.steam_appid && (
          route.visibility === "public" ? (
            <button className="pn-btn pn-btn-outline" disabled={publishBusy} onClick={unpublish}>Unpublish from Explore</button>
          ) : (
            <button className="pn-btn pn-btn-primary" disabled={publishBusy} onClick={publish}>Publish to Explore</button>
          )
        )}
        <button className="pn-btn-text" disabled={!pb} onClick={resetPB}>Reset PB</button>
        {isOwner && (
          <button
            className="pn-btn-text pn-btn-text-danger"
            onClick={async () => { if (await confirm(`Delete route "${route.name}"? This can't be undone.`)) onDelete(route); }}
          >
            Delete route
          </button>
        )}
      </div>
    </div>
  );
}

function toDuration(cumulativeSplits, i) {
  if (!cumulativeSplits || cumulativeSplits[i] == null) return null;
  return i === 0 ? cumulativeSplits[0] : cumulativeSplits[i] - cumulativeSplits[i - 1];
}
