// ---------- pace note roller (signature element) ----------
// Mirrors the physical device rally co-drivers use to read calls at speed:
// a scroll of segment titles winding past a fixed point. The current
// segment is stated in plain text above (not left to a visual convention
// to explain itself) and gets a solid highlight band in the strip below —
// same "active" language as the sidebar nav, not a decorative marker.
export default function PaceRoller({ segments, currentIdx }) {
  const itemHeight = 34;
  const visibleWindow = 3;
  const offset = -(currentIdx * itemHeight) + visibleWindow * itemHeight;
  const current = segments[currentIdx];

  return (
    <div className="pn-roller">
      <div className="pn-roller-status">
        <span className="pn-roller-status-idx">segment {String(currentIdx + 1).padStart(2, "0")} / {String(segments.length).padStart(2, "0")}</span>
        <span className="pn-roller-status-title">{current.title}</span>
      </div>
      <div className="pn-roller-window">
        <div className="pn-roller-strip" style={{ transform: `translateY(${offset}px)` }}>
          {Array.from({ length: visibleWindow }).map((_, i) => (
            <div className="pn-roller-item pn-roller-pad" key={"pad-top-" + i} />
          ))}
          {segments.map((s, i) => (
            <div
              key={s.id}
              className={
                "pn-roller-item" +
                (i === currentIdx ? " pn-roller-current" : i < currentIdx ? " pn-roller-done" : " pn-roller-upcoming")
              }
            >
              <span className="pn-roller-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="pn-roller-text">{s.title}</span>
            </div>
          ))}
          {Array.from({ length: visibleWindow }).map((_, i) => (
            <div className="pn-roller-item pn-roller-pad" key={"pad-bot-" + i} />
          ))}
        </div>
      </div>
    </div>
  );
}
