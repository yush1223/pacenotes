// ---------- shared ----------
export default function BackHead({ onBack, eyebrow, title }) {
  return (
    <div className="pn-view-head">
      <button className="pn-back" onClick={onBack}>‹ back</button>
      <div className="pn-eyebrow">{eyebrow}</div>
      <div className="pn-h1">{title}</div>
    </div>
  );
}
