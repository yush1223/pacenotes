import { fmtDelta } from "../lib/time";

// ---------- live delta bar chart ----------
// One bar per completed split, above the line = behind PB (red), below =
// ahead (green), each labeled with the actual time so it reads as data,
// not just a trend shape. The current in-progress segment gets an extra
// live bar (lighter, faster transition) that counts up from -pbDuration
// toward zero as you spend time in it, crossing into red once you've
// gone over pace — updates every frame, same data the clock subtitle uses.
export default function DeltaGraph({ pointsDelta, livePoint, height = 108 }) {
  const completed = pointsDelta || [];
  const points = livePoint != null ? [...completed, livePoint] : completed;
  if (points.length === 0) {
    return <div className="pn-scope-empty">graph engages once a pb exists to race against</div>;
  }
  const liveIdx = livePoint != null ? completed.length : -1;
  const width = 400;
  const zeroY = height / 2;
  const halfSpan = height / 2 - 18;
  // Scale comes from finalized splits only. The live point grows every
  // frame while a segment is in progress — if it fed into the scale too,
  // every other bar would visibly shrink and resize each tick as it grew,
  // which reads as jittery rather than smooth. It clamps to the same
  // scale instead (capping out at the edge is normal chart behavior).
  const maxAbs = Math.max(1000, ...completed.map((d) => Math.abs(d)));
  const n = points.length;
  const gap = width / n;
  const barW = Math.min(30, gap * 0.5);

  return (
    <div className="pn-scope">
      <svg viewBox={`0 0 ${width} ${height}`} className="pn-scope-svg pn-scope-bars" preserveAspectRatio="none">
        <text x="6" y="11" className="pn-scope-axislabel">behind</text>
        <text x="6" y={height - 5} className="pn-scope-axislabel">ahead</text>
        <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="var(--hairline-soft)" strokeWidth="1" />
        {points.map((d, i) => {
          const isLive = i === liveIdx;
          const barH = Math.min(Math.max((Math.abs(d) / maxAbs) * halfSpan, 2), halfSpan);
          const behind = d > 0;
          const x = i * gap + gap / 2 - barW / 2;
          const y = behind ? zeroY : zeroY - barH;
          const color = behind ? "var(--bad)" : d < 0 ? "var(--good)" : "var(--ink-dimmer)";
          const labelY = behind ? y + barH + 11 : y - 5;
          return (
            <g key={i} className={isLive ? "pn-scope-bar-live" : undefined}>
              <rect x={x} y={y} width={barW} height={barH} fill={color} />
              <text x={x + barW / 2} y={labelY} textAnchor="middle" className="pn-scope-barlabel" fill={color}>
                {fmtDelta(d)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="pn-scope-caption">delta per split vs personal best{liveIdx >= 0 ? " · current segment live" : ""}</div>
    </div>
  );
}
