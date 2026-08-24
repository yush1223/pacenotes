import { useState } from "react";

// ---------- persistent nav sidebar ----------
export default function Sidebar({ games, activeGameId, totalRuns, onHome, onSelectGame, onAddGame, onDeleteGame }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const submit = () => {
    if (name.trim()) { onAddGame(name.trim()); setName(""); setAdding(false); }
  };

  return (
    <div className="pn-sidebar">
      <button className="pn-sidebar-brand" onClick={onHome}>
        <span className="pn-sidebar-brand-mark">PACE NOTES</span>
      </button>
      <div className="pn-sidebar-rule" />

      <div className="pn-sidebar-section-label">Games</div>
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
              onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${g.name}" and all its routes?`)) onDeleteGame(g.id); }}
              role="button"
              aria-label={`Delete ${g.name}`}
            >
              ✕
            </span>
          </button>
        ))}
      </div>
      {adding ? (
        <div className="pn-inline-form" style={{ flexDirection: "column", gap: 6 }}>
          <input
            className="pn-input"
            autoFocus
            placeholder="Game name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setAdding(false);
            }}
            style={{ fontSize: 12.5 }}
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
      </div>
    </div>
  );
}
