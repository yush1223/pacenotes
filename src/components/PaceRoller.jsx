// ---------- pace note roller (signature element) ----------
// Mirrors the physical device rally co-drivers use to read calls at speed.
// Every segment is listed — no windowed scroll with blank padding — and
// only the highlight band moves, sliding to whichever row is current.
export default function PaceRoller({ segments, currentIdx }) {
  const itemHeight = 34;
  const current = segments[currentIdx];

  return (
    <div className="pn-roller">
      <div className="pn-roller-status">
        <span className="pn-roller-status-idx">segment {String(currentIdx + 1).padStart(2, "0")} / {String(segments.length).padStart(2, "0")}</span>
        <span className="pn-roller-status-title">{current.title}</span>
      </div>
      <div className="pn-roller-list">
        <div className="pn-roller-highlight" style={{ transform: `translateY(${currentIdx * itemHeight}px)` }} />
        {segments.map((s, i) => (
          <div
            key={s.id}
            className={
              "pn-roller-row" +
              (i === currentIdx ? " pn-roller-row-current" : i < currentIdx ? " pn-roller-row-done" : " pn-roller-row-upcoming")
            }
          >
            <span className="pn-roller-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="pn-roller-text">{s.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
