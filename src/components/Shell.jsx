import "../styles.css";

// ---------- shell ----------
export default function Shell({ children, toast }) {
  return (
    <div className="pn-app">
      <div className="pn-frame">
        <div className="pn-content">{children}</div>
        {toast && <div className="pn-toast">{toast}</div>}
      </div>
    </div>
  );
}
