import { useState, useEffect, useRef, useCallback } from "react";
import * as db from "../lib/db";
import { fmt, relTime } from "../lib/time";
import BackHead from "../components/BackHead";
import FlapClock from "../components/FlapClock";
import { useConfirm } from "../components/ConfirmProvider";

// ---------- practice (segment drilling) ----------
// The companion to a full timed run: pick one segment, replay it as many
// times as you want, log each attempt. Nothing here touches your PB —
// PBs stay a whole-route thing — but your fastest logged rep becomes a
// suggested target for that segment (shown here, in the roadbook, and as
// a one-click fill-in back in the route editor).
export default function PracticeScreen({ routeId, userId, onExit }) {
  const confirm = useConfirm();
  const [route, setRoute] = useState(null);
  const [segIdx, setSegIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [reps, setReps] = useState(null);
  const [bests, setBests] = useState({});
  const [busy, setBusy] = useState(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    db.getRoute(routeId).then(setRoute);
    db.getPracticeBests(routeId, userId).then(setBests);
  }, [routeId, userId]);

  const seg = route?.segments[segIdx];

  useEffect(() => {
    if (!seg) return;
    setReps(null);
    db.listPracticeSplits(routeId, userId, seg.id).then(setReps);
  }, [seg?.id, routeId, userId]);

  const tick = useCallback(() => {
    if (!startRef.current) return;
    setElapsed(performance.now() - startRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = () => {
    startRef.current = performance.now() - elapsed;
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopAndLog = async () => {
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
    const dur = elapsed;
    startRef.current = null;
    setElapsed(0);
    if (dur <= 0) return;
    setBusy(true);
    try {
      const saved = await db.logPracticeSplit(routeId, userId, seg.id, dur);
      setReps((r) => [saved, ...(r || [])]);
      setBests((b) => ({ ...b, [seg.id]: b[seg.id] == null ? saved.duration_ms : Math.min(b[seg.id], saved.duration_ms) }));
    } finally {
      setBusy(false);
    }
  };

  const discard = () => {
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setElapsed(0);
  };

  const removeRep = async (id) => {
    await db.deletePracticeSplit(id);
    setReps((r) => r.filter((x) => x.id !== id));
    db.getPracticeBests(routeId, userId).then(setBests);
  };

  const selectSeg = (i) => {
    if (running) return;
    setSegIdx(i);
  };

  if (!route) return <div className="pn-view">Loading…</div>;

  const best = bests[seg.id];
  const authorTarget = route.use_target !== false && seg.target_ms != null ? seg.target_ms : null;

  return (
    <div className="pn-view">
      <BackHead
        onBack={async () => { if (running && !(await confirm("Timing in progress — leave without logging this rep?"))) return; onExit(); }}
        eyebrow="Practice"
        title={route.name}
      />
      <div className="pn-hint" style={{ marginBottom: 18 }}>
        Drill one segment at a time and replay it as often as you like — these times never touch your PB (that stays a full-run thing). Your fastest rep here becomes a suggested target instead.
      </div>

      <label className="pn-label" style={{ marginTop: 0 }}>Segment</label>
      <div className="pn-practice-seg-picker">
        {route.segments.map((s, i) => (
          <button
            key={s.id}
            className={"pn-practice-seg-btn" + (i === segIdx ? " pn-practice-seg-btn-active" : "")}
            disabled={running}
            onClick={() => selectSeg(i)}
          >
            <span className="pn-mono" style={{ opacity: 0.6 }}>{String(i + 1).padStart(2, "0")}</span> {s.title}
          </button>
        ))}
      </div>

      <div className="pn-clockbox" style={{ marginTop: 22 }}>
        <FlapClock text={fmt(elapsed)} />
        <div className="pn-clock-vs">
          {best != null ? (
            <>your best <span className="pn-brass-text">{fmt(best, false)}</span></>
          ) : (
            "no reps logged yet for this segment"
          )}
          {authorTarget != null && <span className="pn-clock-vs-ref"> · author target {fmt(authorTarget, false)}</span>}
        </div>
      </div>

      <div className="pn-btn-row" style={{ marginTop: 14, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
        <button className="pn-btn pn-btn-ghost" onClick={discard} disabled={elapsed === 0 && !running}>Discard</button>
        <button className="pn-btn pn-btn-primary" style={{ flex: 2 }} disabled={busy} onClick={running ? stopAndLog : start}>
          {running ? "Stop & log" : "Start"}
        </button>
      </div>

      {seg.notes && (
        <>
          <label className="pn-label">Notes</label>
          <ul className="pn-note-steps">
            {seg.notes.split("\n").filter(Boolean).map((line, j) => <li key={j}>{line}</li>)}
          </ul>
        </>
      )}

      <label className="pn-label">Logged reps for this segment</label>
      {reps == null ? (
        <div className="pn-empty">Loading…</div>
      ) : reps.length === 0 ? (
        <div className="pn-hint">Nothing logged yet — hit Start, run the segment, then Stop &amp; log to save your first rep.</div>
      ) : (
        <div className="pn-practice-reps">
          {reps.map((r) => (
            <div className="pn-practice-rep" key={r.id}>
              <span className={"pn-mono" + (r.duration_ms === best ? " pn-brass-text" : "")}>{fmt(r.duration_ms, false)}</span>
              <span className="pn-hint" style={{ margin: 0 }}>{relTime(new Date(r.created_at).getTime())}</span>
              <button className="pn-mini-btn pn-mini-btn-danger" onClick={() => removeRep(r.id)} aria-label="Delete rep">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
