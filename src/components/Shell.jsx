import "../styles.css";
import Sidebar from "./Sidebar";

// ---------- app shell ----------
export default function Shell({ children, toast, sidebarProps, wide }) {
  return (
    <div className="pn-app">
      {sidebarProps && <Sidebar {...sidebarProps} />}
      <div className="pn-main">
        <div className={"pn-main-inner" + (wide ? " pn-main-inner-wide" : "")}>{children}</div>
      </div>
      {toast && <div className="pn-toast">{toast}</div>}
    </div>
  );
}
