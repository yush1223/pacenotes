// ---------- sparkline ----------
export default function Sparkline({ values, width = 60, height = 22 }) {
  if (!values || values.length < 2) return <span className="pn-spark-empty">no trend yet</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - ((v - min) / range) * height]);
  const trendGood = values[values.length - 1] <= values[0];
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} className="pn-spark">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={trendGood ? "var(--good)" : "var(--bad)"} strokeWidth="1.4" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={trendGood ? "var(--good)" : "var(--bad)"} />
    </svg>
  );
}
