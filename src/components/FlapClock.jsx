// ---------- split-flap clock (signature element) ----------
export default function FlapClock({ text, size = "lg" }) {
  const chars = text.split("");
  return (
    <div className={"pn-flapclock pn-flapclock-" + size}>
      {chars.map((c, i) => (
        <span key={i} className={"pn-flap" + (/[0-9]/.test(c) ? "" : " pn-flap-punct")}>
          <span className="pn-flap-char">{c}</span>
          <span className="pn-flap-seam" />
        </span>
      ))}
    </div>
  );
}
