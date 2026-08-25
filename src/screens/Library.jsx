import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { fmt } from "../lib/time";
import Sparkline from "../components/Sparkline";
import GameSearchField from "../components/GameSearchField";
import { useConfirm } from "../components/ConfirmProvider";

// ---------- home dashboard ----------
export default function Library({ games, routesByGame, totalRuns, userId, onOpenGame, onAddGame, onDeleteGame, onExplore }) {
  const [adding, setAdding] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [name, setName] = useState("");
  const [steamPick, setSteamPick] = useState(null);
  const [gameStats, setGameStats] = useState({});
  const [query, setQuery] = useState("");
  const confirm = useConfirm();

  const resetAddForm = () => { setAdding(false); setCustomMode(false); setName(""); setSteamPick(null); };

  useEffect(() => {
    (async () => {
      const stats = {};
      for (const g of games) {
        const routes = routesByGame[g.id] || [];
        let bestPb = null;
        let sparkVals = null;
        let mostRuns = 0;
        for (const r of routes) {
          const pb = await db.getPB(r.id, userId);
          if (pb && (bestPb == null || pb.total_ms < bestPb)) bestPb = pb.total_ms;
          const runs = await db.listRuns(r.id, userId, 8);
          if (runs.length > mostRuns) {
            mostRuns = runs.length;
            sparkVals = runs.slice().reverse().map((x) => x.total_ms);
          }
        }
        stats[g.id] = { routeCount: routes.length, bestPb, sparkVals };
      }
      setGameStats(stats);
    })();
  }, [games, routesByGame, userId]);

  const filteredGames = games.filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase()));

  const submitAdd = () => {
    if (customMode) {
      if (name.trim()) { onAddGame(name.trim(), { custom: true }); resetAddForm(); }
    } else if (steamPick) {
      onAddGame(steamPick.name, steamPick);
      resetAddForm();
    }
  };

  return (
    <div className="pn-view">
      <div className="pn-masthead">
        <div className="pn-masthead-mark">PACENOTES</div>
        <div className="pn-masthead-tag">Route notes and a live split timer, for any game.</div>
        <div className="pn-masthead-rule" />
        <div className="pn-masthead-readout">
          <span className="pn-mono-num">{String(games.length).padStart(2, "0")}</span> games logged · <span className="pn-mono-num">{String(totalRuns).padStart(3, "0")}</span> runs recorded
        </div>
      </div>

      <button className="pn-btn pn-btn-ghost pn-btn-full" style={{ marginBottom: 20 }} onClick={onExplore}>
        Explore public guides →
      </button>

      {games.length > 0 && (
        <div className="pn-search-field">
          <input
            className="pn-input"
            placeholder="Search your library…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="pn-search-clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>
          )}
        </div>
      )}

      {games.length === 0 && !adding && (
        <div className="pn-empty-hero">
          <div className="pn-empty-hero-title">No games yet</div>
          Log the game you're running to start building a route, or find one someone's already published in Explore.
          <div style={{ marginTop: 18 }}>
            <button className="pn-btn pn-btn-primary" onClick={() => setAdding(true)}>+ Log a game</button>
          </div>
        </div>
      )}

      {games.length > 0 && filteredGames.length === 0 && (
        <div className="pn-empty">No games in your library match "{query}".</div>
      )}

      <div className="pn-tile-grid pn-stagger">
        {filteredGames.map((g, i) => {
          const st = gameStats[g.id] || {};
          return (
            <div className="pn-tile" key={g.id} onClick={() => onOpenGame(g.id)}>
              <button
                className="pn-tile-x"
                onClick={async (e) => { e.stopPropagation(); if (await confirm(`Remove "${g.name}" from your library?`)) onDeleteGame(g.id); }}
                aria-label="Remove game"
              >
                ✕
              </button>
              {g.header_image ? (
                <div className="pn-tile-image" style={{ backgroundImage: `url(${g.header_image})` }} />
              ) : (
                <div className="pn-tile-image pn-explore-tile-image-empty" />
              )}
              <div className="pn-tile-idx">{String(i + 1).padStart(2, "0")}</div>
              <div className="pn-tile-title">{g.name}</div>
              <div className="pn-tile-foot">
                <div className="pn-instrument-row">
                  <div className="pn-instrument">
                    <span className="pn-instrument-label">routes</span>
                    <span className="pn-mono">{st.routeCount ?? 0}</span>
                  </div>
                  <div className="pn-instrument-divider" />
                  <div className="pn-instrument">
                    <span className="pn-instrument-label">pb</span>
                    <span className="pn-mono pn-brass-text">{st.bestPb != null ? fmt(st.bestPb, false) : "—"}</span>
                  </div>
                </div>
                <Sparkline values={st.sparkVals} />
              </div>
            </div>
          );
        })}

        {(games.length > 0 || adding) &&
          (adding ? (
            <div className="pn-tile" style={{ cursor: "default" }} onClick={(e) => e.stopPropagation()}>
              <div className="pn-label" style={{ marginTop: 0 }}>New game</div>
              {customMode ? (
                <>
                  <input
                    className="pn-input"
                    autoFocus
                    placeholder="Game name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitAdd();
                      if (e.key === "Escape") resetAddForm();
                    }}
                  />
                  <div className="pn-hint" style={{ marginTop: 6 }}>
                    Custom game — not on Steam, so routes here can't be published to Explore.{" "}
                    <button className="pn-author-link" onClick={() => { setCustomMode(false); setName(""); }}>Search Steam instead</button>
                  </div>
                </>
              ) : (
                <>
                  <GameSearchField
                    className="pn-input"
                    autoFocus
                    placeholder="Search Steam for a game"
                    value={name}
                    onChange={(v) => { setName(v); setSteamPick(null); }}
                    onPick={(r) => { setName(r.name); setSteamPick(r); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitAdd();
                      if (e.key === "Escape") resetAddForm();
                    }}
                  />
                  <div className="pn-hint" style={{ marginTop: 6 }}>
                    {steamPick ? `Matched "${steamPick.name}" on Steam.` : "Pick a match from the dropdown — only verified Steam games can be logged."}{" "}
                    <button className="pn-author-link" onClick={() => { setCustomMode(true); setName(""); setSteamPick(null); }}>Can't find it? Add a custom game</button>
                  </div>
                </>
              )}
              <div className="pn-btn-row" style={{ marginTop: 10 }}>
                <button className="pn-btn pn-btn-ghost" onClick={resetAddForm}>Cancel</button>
                <button className="pn-btn pn-btn-primary" disabled={customMode ? !name.trim() : !steamPick} onClick={submitAdd}>Add</button>
              </div>
            </div>
          ) : (
            <button className="pn-tile-add" onClick={() => setAdding(true)}>
              <span className="pn-tile-add-plus">+</span>
              Log a game
            </button>
          ))}
      </div>
    </div>
  );
}
