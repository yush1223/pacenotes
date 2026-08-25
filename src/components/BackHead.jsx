// ---------- shared ----------
// accent="public" marks a screen as part of the shared/public space (Explore,
// a route preview, someone's profile) rather than your own library — colors
// the eyebrow so that signal is visible before you've even read the word.
export default function BackHead({ onBack, eyebrow, title, accent }) {
  return (
    <div className="pn-view-head">
      <button className="pn-back" onClick={onBack}>‹ back</button>
      <div className={"pn-eyebrow" + (accent === "public" ? " pn-eyebrow-public" : "")}>{eyebrow}</div>
      <div className="pn-h1">{title}</div>
    </div>
  );
}
