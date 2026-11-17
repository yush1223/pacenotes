// ---------- clock readout ----------
// Plain tabular numerals in the display face. The last digit (tenths) is
// greyed so the eye lands on the seconds that matter. Name kept from the
// old split-flap version so callers don't change.
export default function FlapClock({ text, size = "lg" }) {
  const dot = text.lastIndexOf(".");
  const main = dot === -1 ? text : text.slice(0, dot);
  const tenths = dot === -1 ? "" : text.slice(dot);
  return (
    <div className={"pn-flapclock pn-flapclock-" + size} aria-label={text}>
      <span>{main}</span>
      {tenths && <span className="pn-tenths">{tenths}</span>}
    </div>
  );
}
