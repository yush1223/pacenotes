// ---------- live delta graph (oscilloscope panel) ----------
export default function DeltaGraph({ pointsDelta, height = 72 }) {
  if (!pointsDelta || pointsDelta.length === 0) {
    return <div className="pn-scope-empty">graph engages once a pb exists to race against</div>;
  }
  const width = 400;
  const maxAbs = Math.max(2000, ...pointsDelta.map((d) => Math.abs(d)));
  const n = pointsDelta.length;
  const xFor = (i) => (n === 1 ? width / 2 : (i / (n - 1)) * width);
  const yFor = (d) => height / 2 - (d / maxAbs) * (height / 2 - 6);
  const pts = pointsDelta.map((d, i) => [xFor(i), yFor(d)]);
  const last = pointsDelta[pointsDelta.length - 1];
  return (
    <div className="pn-scope">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="pn-scope-svg">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={height * f} x2={width} y2={height * f} stroke="var(--hairline)" strokeWidth="1" />
        ))}
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--ink-dim)" strokeWidth="1" strokeDasharray="2 4" />
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={last > 0 ? "var(--bad)" : "var(--good)"} strokeWidth="1.8" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.6" fill={pointsDelta[i] > 0 ? "var(--bad)" : "var(--good)"} />
        ))}
      </svg>
      <div className="pn-scope-caption">pace vs personal best</div>
    </div>
  );
}
