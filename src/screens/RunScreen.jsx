import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getKey, setKey } from "../lib/storage";
import { fmt, fmtDelta, toDurations } from "../lib/time";
import BackHead from "../components/BackHead";
import FlapClock from "../components/FlapClock";
import PaceRoller from "../components/PaceRoller";
import DeltaGraph from "../components/DeltaGraph";
import { useConfirm } from "../components/ConfirmProvider";

// ---------- run screen ----------
export default function RunScreen({ routeId, onExit, onFinished }) {
  const confirm = useConfirm();
  const [route, setRoute] = useState(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [segIdx, setSegIdx] = useState(0);
  const [splits, setSplits] = useState([]);
  const [finished, setFinished] = useState(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => { (async () => setRoute(await getKey(`pn_route_${routeId}`, null)))(); }, [routeId]);

  const tick = useCallback(() => {
    if (!startRef.current) return;
    setElapsed(performance.now() - startRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const toggleRun = () => {
    if (!running) {
      startRef.current = performance.now() - elapsed;
      setRunning(true);
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setRunning(false);
      cancelAnimationFrame(rafRef.current);
    }
  };

  const reset = () => {
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
    setElapsed(0);
    setSegIdx(0);
    setSplits([]);
    setFinished(false);
    startRef.current = null;
  };

  const doSplit = async () => {
    if (!running || !route) return;
    const now = performance.now() - startRef.current;
    const newSplits = [...splits, now];
    setSplits(newSplits);

    if (segIdx + 1 >= route.segments.length) {
      setRunning(false);
      cancelAnimationFrame(rafRef.current);
      setFinished(true);

      const total = now;
      const isNewPB = !route.pb || total < route.pb.total;
      const updatedRoute = { ...route, pb: isNewPB ? { segments: newSplits, total } : route.pb };
      await setKey(`pn_route_${route.id}`, updatedRoute);
      setRoute(updatedRoute);

      const runs = await getKey(`pn_runs_${route.id}`, []);
      await setKey(`pn_runs_${route.id}`, [{ date: Date.now(), total, segments: newSplits }, ...runs].slice(0, 25));
      const tr = await getKey("pn_total_runs", 0);
      await setKey("pn_total_runs", tr + 1);
      onFinished();
    } else {
      setSegIdx(segIdx + 1);
    }
  };

  if (!route) return <div className="pn-view">Loading…</div>;

  const pbAtSplit = (i) => (route.pb && route.pb.segments[i] != null ? route.pb.segments[i] : null);
  const currentSeg = route.segments[segIdx];
  const deltaSeries = splits.map((s, i) => (pbAtSplit(i) != null ? s - pbAtSplit(i) : null)).filter((d) => d != null);
  const lastDelta = deltaSeries.length ? deltaSeries[deltaSeries.length - 1] : null;

  // What to aim for on each segment: PB's own time for that segment once
  // one exists (it's the thing the graph is already racing against), else
  // the optional manual target as a stand-in — unless the route's target
  // toggle (set in the route editor) is off, in which case target never
  // counts, even as a fallback. Each aim tracks its own source so the UI
  // can label it (and give PB the brass treatment every other "record"
  // gets here). Once a PB exists, target stops driving anything — it just
  // rides along as a plain reference number, per route.useTarget.
  const useTarget = route.useTarget !== false;
  const pbDurations = route.pb ? toDurations(route.pb.segments) : null;
  const aims = route.segments.map((_, i) => {
    if (pbDurations && pbDurations[i] != null) return { value: pbDurations[i], isPb: true };
    if (useTarget && route.targets && route.targets[i] != null) return { value: route.targets[i], isPb: false };
    return null;
  });
  const actualDurations = toDurations(splits);

  // Live in-segment pace: how long you've spent on the CURRENT segment so
  // far, against what it took last time (or the target) — updates every
  // frame, not just at split points, so it actually answers "am I on
  // pace right now" rather than reporting stale info from the last split.
  const segStartElapsed = segIdx === 0 ? 0 : (splits[segIdx - 1] ?? 0);
  const elapsedInSeg = Math.max(0, elapsed - segStartElapsed);
  const currentAim = aims[segIdx];
  const liveSegDelta = currentAim != null && elapsed > 0 ? elapsedInSeg - currentAim.value : null;
  // Shown only as an extra reference alongside the PB comparison, never
  // driving the color/delta itself, when the primary aim above is a PB.
  const currentTargetRef = useTarget && route.targets && route.targets[segIdx] != null ? route.targets[segIdx] : null;

  // Live bar for the graph specifically compares against PB only (the
  // graph is captioned "vs personal best" — target isn't part of that
  // promise). Counts down from -pbDuration toward 0 as you spend time in
  // the segment, crossing into red/positive once you've gone over pace.
  const pbDurationForCurrent = pbDurations && pbDurations[segIdx] != null ? pbDurations[segIdx] : null;
  const livePbDelta = pbDurationForCurrent != null && elapsed > 0 ? elapsedInSeg - pbDurationForCurrent : null;

  return (
    <div className="pn-view">
      <BackHead
        onBack={async () => { if (running && !(await confirm("Run in progress — leave and lose it?"))) return; onExit(); }}
        eyebrow="Run"
        title={route.name}
      />

      <div className="pn-clockbox">
        <FlapClock text={fmt(elapsed)} />
        {currentAim != null ? (
          <div className="pn-clock-vs">
            this split {fmt(elapsedInSeg, false)} / <span className={currentAim.isPb ? "pn-brass-text" : ""}>{currentAim.isPb ? "pb" : "target"} {fmt(currentAim.value, false)}</span>
            {liveSegDelta != null && <span className={liveSegDelta > 0 ? "pn-bad" : "pn-good"}> ({fmtDelta(liveSegDelta)})</span>}
            {currentAim.isPb && currentTargetRef != null && (
              <span className="pn-clock-vs-ref"> · target {fmt(currentTargetRef, false)}</span>
            )}
          </div>
        ) : (
          <div className="pn-clock-vs pn-ink-dim">no pb{useTarget ? " or target" : ""} set for this segment yet</div>
        )}
      </div>

      {!finished ? (
        <div className="pn-run-grid">
          <div>
            <PaceRoller segments={route.segments} currentIdx={segIdx} aims={aims} actuals={actualDurations} />
            {currentSeg.notes && (
              <>
                <label className="pn-label">Notes</label>
                <ul className="pn-note-steps pn-note-steps-run">
                  {currentSeg.notes.split("\n").filter(Boolean).map((line, j) => <li key={j}>{line}</li>)}
                </ul>
              </>
            )}
          </div>

          <div>
            <div className="pn-roller-status" style={{ visibility: "hidden" }} aria-hidden="true">&nbsp;</div>
            {lastDelta != null && (
              <div className={"pn-delta-readout " + (lastDelta > 0 ? "pn-bad" : "pn-good")}>
                {lastDelta > 0 ? "behind pb pace → " : "ahead of pb pace → "}{fmtDelta(lastDelta)}
              </div>
            )}

            <DeltaGraph pointsDelta={deltaSeries.length ? deltaSeries : null} livePoint={livePbDelta} />

            <div className="pn-btn-row" style={{ marginTop: 14 }}>
              <button className="pn-btn pn-btn-ghost" onClick={toggleRun}>{running ? "Pause" : elapsed === 0 ? "Start" : "Resume"}</button>
              <button className="pn-btn pn-btn-primary" style={{ flex: 2 }} onClick={doSplit} disabled={!running}>
                Split → {segIdx + 1 >= route.segments.length ? "Finish" : "next"}
              </button>
            </div>
            <button className="pn-btn pn-btn-ghost pn-btn-full" style={{ marginTop: 8 }} onClick={reset}>Reset run</button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <RunSummary route={route} splits={splits} onReset={reset} onExit={onExit} />
        </div>
      )}
    </div>
  );
}

function PBBurst() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
        const dist = 70 + Math.random() * 50;
        return { sx: Math.cos(angle) * dist, sy: Math.sin(angle) * dist, delay: Math.random() * 120 };
      }),
    []
  );
  return (
    <>
      <span className="pn-pb-ring" />
      <span className="pn-pb-ring" />
      {sparks.map((s, i) => (
        <span key={i} className="pn-pb-spark" style={{ "--sx": `${s.sx}px`, "--sy": `${s.sy}px`, animationDelay: `${s.delay}ms` }} />
      ))}
    </>
  );
}

function RunSummary({ route, splits, onReset, onExit }) {
  const total = splits[splits.length - 1];
  const isPB = route.pb && route.pb.total === total;
  const durations = toDurations(splits);
  const deltaSeries = route.pb ? splits.map((s, i) => s - (isPB ? (route.pb.segments[i] ?? s) : route.pb.segments[i])) : [];
  const useTarget = route.useTarget !== false;

  return (
    <div>
      <div className={"pn-result-panel" + (isPB ? " pn-result-pb" : "")}>
        {isPB && <PBBurst />}
        <div className="pn-result-label">{isPB ? "★ new personal best" : "run complete"}</div>
        <FlapClock text={fmt(total, false)} size="md" />
      </div>

      {!isPB && deltaSeries.length > 0 && <DeltaGraph pointsDelta={deltaSeries} />}

      <table className="pn-split-table">
        <thead>
          <tr><th>#</th><th>Segment</th><th>Split</th><th>Pbδ</th>{useTarget && <th>Targetδ</th>}</tr>
        </thead>
        <tbody>
          {route.segments.map((s, i) => {
            const segTime = durations[i];
            const pbCum = route.pb && !isPB ? route.pb.segments[i] : null;
            const delta = pbCum != null ? splits[i] - pbCum : null;
            const target = useTarget && route.targets && route.targets[i] != null ? route.targets[i] : null;
            const targetDelta = target != null ? segTime - target : null;
            return (
              <tr key={s.id}>
                <td className="pn-ink-dim">{i + 1}</td>
                <td>{s.title}</td>
                <td className="pn-mono">{fmt(segTime, false)}</td>
                <td className={"pn-mono " + (delta == null ? "" : delta > 0 ? "pn-bad" : "pn-good")}>{delta == null ? "—" : fmtDelta(delta)}</td>
                {useTarget && (
                  <td className={"pn-mono " + (targetDelta == null ? "" : targetDelta > 0 ? "pn-bad" : "pn-good")}>{targetDelta == null ? "—" : fmtDelta(targetDelta)}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pn-btn-row" style={{ marginTop: 16 }}>
        <button className="pn-btn pn-btn-ghost" onClick={onReset}>Run again</button>
        <button className="pn-btn pn-btn-primary" onClick={onExit}>Done</button>
      </div>
    </div>
  );
}
