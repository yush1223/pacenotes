import { useState, useEffect, useRef, useCallback } from "react";
import { getKey, setKey } from "../lib/storage";
import { fmt, fmtDelta, toDurations, computeBPT } from "../lib/time";
import BackHead from "../components/BackHead";
import FlapClock from "../components/FlapClock";
import PaceRoller from "../components/PaceRoller";
import DeltaGraph from "../components/DeltaGraph";

// ---------- run screen ----------
export default function RunScreen({ routeId, onExit, onFinished }) {
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
      const durations = toDurations(newSplits);
      const prevGold = route.gold || route.segments.map(() => null);
      const newGold = prevGold.map((g, i) => (g == null || durations[i] < g ? durations[i] : g));
      const isNewPB = !route.pb || total < route.pb.total;
      const updatedRoute = { ...route, gold: newGold, pb: isNewPB ? { segments: newSplits, total } : route.pb };
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

  return (
    <div className="pn-view">
      <BackHead
        onBack={() => { if (running && !confirm("Run in progress — leave and lose it?")) return; onExit(); }}
        eyebrow="Run"
        title={route.name}
      />

      <div className="pn-clockbox">
        <FlapClock text={fmt(elapsed)} />
        {route.target != null && (
          <div className="pn-clock-vs">
            target {fmt(route.target, false)}
            {elapsed > 0 && <span className={elapsed - route.target > 0 ? "pn-bad" : "pn-good"}> ({fmtDelta(elapsed - route.target)})</span>}
          </div>
        )}
      </div>

      {!finished ? (
        <>
          <PaceRoller segments={route.segments} currentIdx={segIdx} />

          {currentSeg.notes && (
            <ul className="pn-note-steps pn-note-steps-run">
              {currentSeg.notes.split("\n").filter(Boolean).map((line, j) => <li key={j}>{line}</li>)}
            </ul>
          )}

          {lastDelta != null && (
            <div className={"pn-delta-readout " + (lastDelta > 0 ? "pn-bad" : "pn-good")}>
              {lastDelta > 0 ? "behind pb pace → " : "ahead of pb pace → "}{fmtDelta(lastDelta)}
            </div>
          )}

          <DeltaGraph pointsDelta={deltaSeries.length ? deltaSeries : null} />

          <div className="pn-btn-row" style={{ marginTop: 14 }}>
            <button className="pn-btn pn-btn-ghost" onClick={toggleRun}>{running ? "Pause" : elapsed === 0 ? "Start" : "Resume"}</button>
            <button className="pn-btn pn-btn-primary" style={{ flex: 2 }} onClick={doSplit} disabled={!running}>
              Split → {segIdx + 1 >= route.segments.length ? "Finish" : "next"}
            </button>
          </div>
          <button className="pn-btn pn-btn-ghost pn-btn-full" style={{ marginTop: 8 }} onClick={reset}>Reset run</button>
        </>
      ) : (
        <RunSummary route={route} splits={splits} onReset={reset} onExit={onExit} />
      )}
    </div>
  );
}

function RunSummary({ route, splits, onReset, onExit }) {
  const total = splits[splits.length - 1];
  const isPB = route.pb && route.pb.total === total;
  const durations = toDurations(splits);
  const bpt = computeBPT(route.gold);
  const deltaSeries = route.pb ? splits.map((s, i) => s - (isPB ? (route.pb.segments[i] ?? s) : route.pb.segments[i])) : [];

  return (
    <div>
      <div className={"pn-result-panel" + (isPB ? " pn-result-pb" : "")}>
        <div className="pn-result-label">{isPB ? "★ new personal best" : "run complete"}</div>
        <FlapClock text={fmt(total, false)} size="md" />
        {bpt != null && <div className="pn-result-sub">{fmtDelta(total - bpt)} off best possible time ({fmt(bpt, false)})</div>}
      </div>

      {!isPB && deltaSeries.length > 0 && <DeltaGraph pointsDelta={deltaSeries} />}

      <table className="pn-split-table">
        <thead>
          <tr><th>#</th><th>Segment</th><th>Split</th><th>Gold</th><th>Pbδ</th></tr>
        </thead>
        <tbody>
          {route.segments.map((s, i) => {
            const segTime = durations[i];
            const isGold = route.gold && route.gold[i] === segTime;
            const pbCum = route.pb && !isPB ? route.pb.segments[i] : null;
            const delta = pbCum != null ? splits[i] - pbCum : null;
            return (
              <tr key={s.id}>
                <td className="pn-ink-dim">{i + 1}</td>
                <td>{s.title}</td>
                <td className={"pn-mono" + (isGold ? " pn-brass-text" : "")}>{fmt(segTime, false)}{isGold && " ★"}</td>
                <td className="pn-mono pn-ink-dim">{route.gold?.[i] != null ? fmt(route.gold[i], false) : "—"}</td>
                <td className={"pn-mono " + (delta == null ? "" : delta > 0 ? "pn-bad" : "pn-good")}>{delta == null ? "—" : fmtDelta(delta)}</td>
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
