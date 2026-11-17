import { useState, useEffect, useRef } from "react";

// ---------- top bar ----------
// Library and Explore are two real tabs (yours vs. everyone's). Games are
// listed on the Library page itself, so the bar stays a bar: brand, tabs,
// account. Kept the Sidebar name and props so App doesn't have to change.
export default function Sidebar({ games, activeSection, totalRuns, onHome, onLibraryTab, onExplore, username, onUpdateUsername, onViewProfile, onSignIn, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) { setMenuOpen(false); setEditingName(false); } };
    const esc = (e) => { if (e.key === "Escape") { setMenuOpen(false); setEditingName(false); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [menuOpen]);

  const startEditName = () => { setNameDraft(username || ""); setNameError(""); setEditingName(true); };
  const saveName = async () => {
    setNameBusy(true);
    setNameError("");
    try {
      await onUpdateUsername(nameDraft);
      setEditingName(false);
    } catch (e) {
      setNameError(e.message || "Couldn't save that username.");
    } finally {
      setNameBusy(false);
    }
  };

  return (
    <header className="pn-topbar">
      <div className="pn-topbar-left">
        <button className="pn-brand" onClick={onHome} aria-label="Pacenotes home">
          <svg className="pn-brand-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="11" r="7.75" stroke="currentColor" strokeWidth="2.5" />
            <path d="M10 6.5V11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M8 1.5h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="pn-brand-mark">Pacenotes</span>
        </button>
        <nav className="pn-tabs" aria-label="Sections">
          <button className={"pn-tab" + (activeSection === "library" ? " pn-tab-active" : "")} onClick={onLibraryTab} aria-current={activeSection === "library" ? "page" : undefined}>Library</button>
          <button className={"pn-tab" + (activeSection === "explore" ? " pn-tab-active" : "")} onClick={onExplore} aria-current={activeSection === "explore" ? "page" : undefined}>Explore</button>
        </nav>
      </div>

      <div className="pn-topbar-right">
        {username ? (
          <div className="pn-account" ref={menuRef}>
            <button className="pn-account-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-haspopup="menu">
              <span className="pn-avatar" aria-hidden="true">{username.slice(0, 1)}</span>
              {username}
            </button>
            {menuOpen && (
              <div className="pn-account-menu" role="menu">
                {editingName ? (
                  <div className="pn-sidebar-name-edit">
                    <label className="pn-label" style={{ margin: 0 }} htmlFor="pn-rename">Username</label>
                    <input
                      id="pn-rename"
                      className="pn-input"
                      value={nameDraft}
                      autoFocus
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                    />
                    {nameError && <div className="pn-sidebar-name-error">{nameError}</div>}
                    <div className="pn-btn-row">
                      <button className="pn-btn pn-btn-ghost" onClick={() => setEditingName(false)}>Cancel</button>
                      <button className="pn-btn pn-btn-primary" disabled={nameBusy} onClick={saveName}>Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="pn-account-menu-head">
                      <div className="pn-account-menu-name">{username}</div>
                      <div className="pn-account-menu-meta">{games.length} {games.length === 1 ? "game" : "games"} · {totalRuns} {totalRuns === 1 ? "run" : "runs"}</div>
                    </div>
                    {onViewProfile && <button className="pn-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); onViewProfile(); }}>Public profile</button>}
                    <button className="pn-menu-item" role="menuitem" onClick={startEditName}>Change username</button>
                    <button className="pn-menu-item pn-menu-item-danger" role="menuitem" onClick={() => { setMenuOpen(false); onSignOut(); }}>Sign out</button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          onSignIn && <button className="pn-btn pn-btn-primary" style={{ minHeight: 40, padding: "8px 20px", fontSize: 15 }} onClick={onSignIn}>Sign in</button>
        )}
      </div>
    </header>
  );
}
