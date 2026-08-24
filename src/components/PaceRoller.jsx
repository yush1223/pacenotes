// ---------- pace note roller (signature element) ----------
// Mirrors the physical device rally co-drivers use to read calls at speed:
// a scroll of segment titles winding past a fixed read-line.
export default function PaceRoller({ segments, currentIdx }) {
  const itemHeight = 34;
  const visibleWindow = 3;
  const offset = -(currentIdx * itemHeight) + visibleWindow * itemHeight;

  return (
    <div className="pn-roller">
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
        <div className="pn-roller-readline" />
      </div>
    </div>
  );
}
