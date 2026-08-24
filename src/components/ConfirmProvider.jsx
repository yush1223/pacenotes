import { createContext, useContext, useState, useCallback, useRef } from "react";

// ---------- in-app confirm (not window.confirm) ----------
// Native confirm()/alert() are unreliable here: they silently return false
// (or throw) in sandboxed/embedded preview contexts that don't grant the
// browser's modals permission, which made every destructive action look
// like it was doing nothing when the dialog just never actually appeared.
// This renders a real in-page dialog instead, so it works everywhere.
const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirmAction = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message, danger: options.danger !== false, confirmLabel: options.confirmLabel || "Confirm" });
    });
  }, []);

  const settle = (result) => {
    setState(null);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={confirmAction}>
      {children}
      {state && (
        <div className="pn-confirm-overlay" onClick={() => settle(false)}>
          <div className="pn-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="pn-confirm-message">{state.message}</div>
            <div className="pn-btn-row" style={{ marginTop: 16 }}>
              <button className="pn-btn pn-btn-ghost" onClick={() => settle(false)} autoFocus>Cancel</button>
              <button className={"pn-btn " + (state.danger ? "pn-btn-danger-ghost" : "pn-btn-primary")} onClick={() => settle(true)}>
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}
