import { fmt, fmtDelta } from "../lib/time";

// ---------- pace note roller (signature element) ----------
// Mirrors the physical device rally co-drivers use to read calls at speed.
// Every segment is listed — no windowed scroll with blank padding — and
// only the highlight band moves, sliding to whichever row is current.
// Each row states real numbers: what to aim for (PB pace once one
// exists — brass, like every other record in this app — else the
// optional target), and once a segment is done, what you actually took
// and the delta between the two.
export default function PaceRoller({ segments, currentIdx, aims, actuals }) {
  const itemHeight = 34;
  const current = segments[currentIdx];
  const currentAim = aims?.[currentIdx];

  return (
    <div className="pn-roller">
      <div className="pn-roller-status">
        <span className="pn-roller-status-idx">segment {String(currentIdx + 1).padStart(2, "0")} / {String(segments.length).padStart(2, "0")}</span>
        <span className="pn-roller-status-title">{current.title}</span>
        {currentAim != null && (
          <span className={"pn-roller-status-aim" + (currentAim.isPb ? " pn-brass-text" : "")}>
            {currentAim.isPb ? "pb" : "target"} {fmt(currentAim.value, false)}
          </span>
        )}
      </div>
      <div className="pn-roller-list">
        <div className="pn-roller-highlight" style={{ transform: `translateY(${currentIdx * itemHeight}px)` }} />
        {segments.map((s, i) => {
          const done = i < currentIdx;
          const aim = aims?.[i];
          const actual = done ? actuals?.[i] : null;
          const delta = done && actual != null && aim != null ? actual - aim.value : null;
          return (
            <div
              key={s.id}
              className={"pn-roller-row" + (i === currentIdx ? " pn-roller-row-current" : done ? " pn-roller-row-done" : " pn-roller-row-upcoming")}
            >
              <span className="pn-roller-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="pn-roller-text">{s.title}</span>
              <span className="pn-roller-stats">
                {done ? (
                  <>
                    {actual != null && <span className="pn-mono pn-roller-actual">{fmt(actual, false)}</span>}
                    {delta != null && (
                      <span className={"pn-mono pn-roller-delta " + (delta > 0 ? "pn-bad" : "pn-good")}>{fmtDelta(delta)}</span>
                    )}
                  </>
                ) : (
                  aim != null && (
                    <span className={"pn-mono pn-roller-aim" + (aim.isPb ? " pn-brass-text" : "")}>{fmt(aim.value, false)}</span>
                  )
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
