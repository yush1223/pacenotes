import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { fmt, relTime } from "../lib/time";
import BackHead from "../components/BackHead";

// ---------- history ----------
export default function HistoryScreen({ routeId, userId, onBack }) {
  const [route, setRoute] = useState(null);
  const [pb, setPb] = useState(null);
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    (async () => {
      setRoute(await db.getRoute(routeId));
      setPb(await db.getPB(routeId, userId));
      setRuns(await db.listRuns(routeId, userId, 25));
    })();
  }, [routeId, userId]);

  if (!route) return <div className="pn-view">Loading…</div>;
  const trendVals = runs.length > 1 ? runs.slice().reverse().map((r) => r.total_ms) : null;

  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="History" title={route.name} />
      {trendVals && (
        <div className="pn-scope" style={{ marginBottom: 18 }}>
          <svg viewBox="0 0 340 64" className="pn-scope-svg" preserveAspectRatio="none">
            {(() => {
              const min = Math.min(...trendVals);
              const max = Math.max(...trendVals);
              const range = max - min || 1;
              const pts = trendVals.map((v, i) => [
                (i / (trendVals.length - 1)) * 340,
                64 - ((v - min) / range) * 54 - 5,
              ]);
              const improving = trendVals[trendVals.length - 1] <= trendVals[0];
              return (
                <>
                  {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" y1={64 * f} x2="340" y2={64 * f} stroke="var(--hairline)" strokeWidth="1" />)}
                  <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={improving ? "var(--good)" : "var(--bad)"} strokeWidth="1.8" />
                  {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill={improving ? "var(--good)" : "var(--bad)"} />)}
                </>
              );
            })()}
          </svg>
          <div className="pn-scope-caption">total time trend, oldest → newest</div>
        </div>
      )}
      {runs.length === 0 ? (
        <div className="pn-empty">No runs logged yet. Finish a run to see it here.</div>
      ) : (
        <div className="pn-ledger pn-stagger">
          {runs.map((run, i) => {
            const isPB = pb && pb.total_ms === run.total_ms;
            return (
              <div className="pn-ledger-row pn-ledger-row-static" key={run.id}>
                <span className={"pn-ledger-idx" + (isPB ? " pn-brass-text" : "")}>{isPB ? "★" : String(runs.length - i).padStart(2, "0")}</span>
                <span className="pn-ledger-main">
                  <span className="pn-ledger-title pn-mono">{fmt(run.total_ms, false)}{isPB && <span className="pn-brass-text"> — PB</span>}</span>
                  <span className="pn-ledger-sub">{relTime(new Date(run.created_at).getTime())}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
