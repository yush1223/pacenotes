import { useState } from "react";
import { useConfirm } from "./ConfirmProvider";
import GameSearchField from "./GameSearchField";

// ---------- persistent nav sidebar ----------
export default function Sidebar({ games, activeGameId, totalRuns, onHome, onExplore, onSelectGame, onAddGame, onDeleteGame, userEmail, onSignOut }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [steamPick, setSteamPick] = useState(null);
  const confirm = useConfirm();

  const submit = () => {
    if (name.trim()) { onAddGame(name.trim(), steamPick); setName(""); setSteamPick(null); setAdding(false); }
  };

  return (
    <div className="pn-sidebar">
      <button className="pn-sidebar-brand" onClick={onHome}>
        <span className="pn-sidebar-brand-mark">PACE NOTES</span>
      </button>
      <div className="pn-sidebar-rule" />

      <div className="pn-sidebar-nav" style={{ marginBottom: 14 }}>
        <button className="pn-nav-item" onClick={onExplore}>
          <span className="pn-nav-item-idx">→</span>
          <span className="pn-nav-item-name">Explore</span>
        </button>
      </div>

      <div className="pn-sidebar-section-label">My library</div>
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
          <GameSearchField
            className="pn-input"
            inputStyle={{ fontSize: 12.5 }}
            autoFocus
            placeholder="Game name"
            value={name}
            onChange={(v) => { setName(v); setSteamPick(null); }}
            onPick={(r) => { setName(r.name); setSteamPick(r); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <div className="pn-btn-row">
            <button className="pn-btn pn-btn-ghost" style={{ padding: "6px 8px", fontSize: 11 }} onClick={() => setAdding(false)}>Cancel</button>
            <button className="pn-btn pn-btn-primary" style={{ padding: "6px 8px", fontSize: 11 }} onClick={submit}>Add</button>
          </div>
        </div>
      ) : (
        <button className="pn-nav-add" onClick={() => setAdding(true)}>+ Log a game</button>
      )}

      <div className="pn-sidebar-spacer" />

      <div className="pn-sidebar-footer">
        <div className="pn-sidebar-footer-readout">
          {String(games.length).padStart(2, "0")} games logged<br />
          {String(totalRuns).padStart(3, "0")} runs recorded
        </div>
        {userEmail && (
          <div className="pn-sidebar-account">
            <span className="pn-sidebar-account-email" title={userEmail}>{userEmail}</span>
            <button className="pn-sidebar-signout" onClick={onSignOut}>sign out</button>
          </div>
        )}
      </div>
    </div>
  );
}
