// ---------- toggle switch ----------
export default function Switch({ checked, onChange, label }) {
  return (
    <div className="pn-switch-row">
      <label className="pn-switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="pn-switch-track">
          <span className="pn-switch-thumb" />
        </span>
      </label>
      {label && <span className="pn-switch-label">{label}</span>}
    </div>
  );
}
