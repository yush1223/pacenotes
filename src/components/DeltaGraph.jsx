import { fmtDelta } from "../lib/time";

// ---------- live delta bar chart ----------
// One bar per completed split, above the line = behind PB (red), below =
// ahead (green), each labeled with the actual time so it reads as data,
// not just a trend shape.
export default function DeltaGraph({ pointsDelta, height = 108 }) {
  if (!pointsDelta || pointsDelta.length === 0) {
    return <div className="pn-scope-empty">graph engages once a pb exists to race against</div>;
  }
  const width = 400;
  const zeroY = height / 2;
  const halfSpan = height / 2 - 18;
  const maxAbs = Math.max(1000, ...pointsDelta.map((d) => Math.abs(d)));
  const n = pointsDelta.length;
  const gap = width / n;
  const barW = Math.min(30, gap * 0.5);

  return (
    <div className="pn-scope">
      <svg viewBox={`0 0 ${width} ${height}`} className="pn-scope-svg pn-scope-bars" preserveAspectRatio="none">
        <text x="6" y="11" className="pn-scope-axislabel">behind</text>
        <text x="6" y={height - 5} className="pn-scope-axislabel">ahead</text>
        <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="var(--hairline-soft)" strokeWidth="1" />
        {pointsDelta.map((d, i) => {
          const barH = Math.max((Math.abs(d) / maxAbs) * halfSpan, 2);
          const behind = d > 0;
          const x = i * gap + gap / 2 - barW / 2;
          const y = behind ? zeroY : zeroY - barH;
          const color = behind ? "var(--bad)" : d < 0 ? "var(--good)" : "var(--ink-dimmer)";
          const labelY = behind ? y + barH + 11 : y - 5;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} fill={color} />
              <text x={x + barW / 2} y={labelY} textAnchor="middle" className="pn-scope-barlabel" fill={color}>
                {fmtDelta(d)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="pn-scope-caption">delta per split vs personal best</div>
    </div>
  );
}
