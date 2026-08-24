import { useState } from "react";
import { useConfirm } from "./ConfirmProvider";
import GameSearchField from "./GameSearchField";

// ---------- persistent nav sidebar ----------
// Library and Explore are deliberately two real tabs, not one nav item
// buried in a list next to the other — different content, different
// purpose (yours vs. everyone's).
export default function Sidebar({ games, activeGameId, activeSection, totalRuns, onHome, onExplore, onSelectGame, onAddGame, onDeleteGame, username, onUpdateUsername, onViewProfile, onSignOut }) {
  const [adding, setAdding] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [name, setName] = useState("");
  const [steamPick, setSteamPick] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const confirm = useConfirm();

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

  const resetAddForm = () => { setAdding(false); setCustomMode(false); setName(""); setSteamPick(null); };

  const submit = () => {
    if (customMode) {
      if (name.trim()) { onAddGame(name.trim(), { custom: true }); resetAddForm(); }
    } else if (steamPick) {
      onAddGame(steamPick.name, steamPick);
      resetAddForm();
    }
  };

  return (
    <div className="pn-sidebar">
      <button className="pn-sidebar-brand" onClick={onHome}>
        <span className="pn-sidebar-brand-mark">PACE NOTES</span>
      </button>
      <div className="pn-sidebar-rule" />

      <div className="pn-sidebar-tabs">
        <button className={"pn-sidebar-tab" + (activeSection !== "explore" ? " pn-sidebar-tab-active" : "")} onClick={onHome}>Library</button>
        <button className={"pn-sidebar-tab" + (activeSection === "explore" ? " pn-sidebar-tab-active" : "")} onClick={onExplore}>Explore</button>
      </div>

      {activeSection === "explore" ? (
        <div className="pn-hint" style={{ marginTop: 14 }}>
          Browsing public guides. Anything you open here gets added to your library automatically.
        </div>
      ) : (
        <>
          <div className="pn-sidebar-nav">
            {games.map((g, i) => (
              <button
                key={g.id}
                className={"pn-nav-item" + (g.id === activeGameId ? " pn-nav-item-active" : "")}
                onClick={() => onSelectGame(g.id)}
              >
                <span className="pn-nav-item-idx">{String(i + 1).padStart(2, "0")}</span>
                <span className="pn-nav-item-name">{g.name}</span>
                <span
                  className="pn-nav-item-x"
                  onClick={async (e) => { e.stopPropagation(); if (await confirm(`Remove "${g.name}" from your library? Any routes you own for it are deleted too — routes you're just following stay untouched for their owner.`)) onDeleteGame(g.id); }}
                  role="button"
                  aria-label={`Remove ${g.name}`}
                >
                  ✕
                </span>
              </button>
            ))}
          </div>
          {adding ? (
            <div className="pn-inline-form" style={{ flexDirection: "column", gap: 6 }}>
              {customMode ? (
                <input
                  className="pn-input"
                  style={{ fontSize: 12.5 }}
                  autoFocus
                  placeholder="Game name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") resetAddForm(); }}
                />
              ) : (
                <GameSearchField
                  className="pn-input"
                  inputStyle={{ fontSize: 12.5 }}
                  autoFocus
                  placeholder="Search Steam for a game"
                  value={name}
                  onChange={(v) => { setName(v); setSteamPick(null); }}
                  onPick={(r) => { setName(r.name); setSteamPick(r); }}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") resetAddForm(); }}
                />
              )}
              <div className="pn-hint" style={{ fontSize: 10.5 }}>
                {customMode ? (
                  <>Custom — can't be published. <button className="pn-author-link" onClick={() => { setCustomMode(false); setName(""); }}>Search Steam instead</button></>
                ) : steamPick ? (
                  `Matched "${steamPick.name}".`
                ) : (
                  <>Pick a match. <button className="pn-author-link" onClick={() => { setCustomMode(true); setName(""); setSteamPick(null); }}>Add custom game</button></>
                )}
              </div>
              <div className="pn-btn-row">
                <button className="pn-btn pn-btn-ghost" style={{ padding: "6px 8px", fontSize: 11 }} onClick={resetAddForm}>Cancel</button>
                <button className="pn-btn pn-btn-primary" style={{ padding: "6px 8px", fontSize: 11 }} disabled={customMode ? !name.trim() : !steamPick} onClick={submit}>Add</button>
              </div>
            </div>
          ) : (
            <button className="pn-nav-add" onClick={() => setAdding(true)}>+ Log a game</button>
          )}
        </>
      )}

      <div className="pn-sidebar-spacer" />

      <div className="pn-sidebar-footer">
        <div className="pn-sidebar-footer-readout">
          {String(games.length).padStart(2, "0")} games logged<br />
          {String(totalRuns).padStart(3, "0")} runs recorded
        </div>
        {username && (
          <div className="pn-sidebar-account">
            {editingName ? (
              <div className="pn-sidebar-name-edit">
                <input
                  className="pn-input"
                  value={nameDraft}
                  autoFocus
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                />
                {nameError && <div className="pn-sidebar-name-error">{nameError}</div>}
                <div className="pn-btn-row">
                  <button className="pn-btn pn-btn-ghost" style={{ padding: "4px 8px", fontSize: 10.5 }} onClick={() => setEditingName(false)}>Cancel</button>
                  <button className="pn-btn pn-btn-primary" style={{ padding: "4px 8px", fontSize: 10.5 }} disabled={nameBusy} onClick={saveName}>Save</button>
                </div>
              </div>
            ) : (
              <div className="pn-sidebar-account-main">
                <button className="pn-sidebar-account-name" onClick={startEditName} title="Click to rename">{username}</button>
                {onViewProfile && <button className="pn-sidebar-view-profile" onClick={onViewProfile}>view public profile</button>}
              </div>
            )}
            {!editingName && <button className="pn-sidebar-signout" onClick={onSignOut}>sign out</button>}
          </div>
        )}
      </div>
    </div>
  );
}
