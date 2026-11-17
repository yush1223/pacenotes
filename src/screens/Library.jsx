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
      <div className="pn-page-head">
        <div>
          <h1 className="pn-page-title">Library</h1>
          <div className="pn-page-sub">
            {games.length} {games.length === 1 ? "game" : "games"} · {totalRuns} {totalRuns === 1 ? "run" : "runs"}
          </div>
        </div>
        {games.length > 0 && (
          <div className="pn-page-actions">
            <div className="pn-search-field">
              <svg className="pn-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-dim)" strokeWidth="1.8" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="M11 11l3.5 3.5" /></svg>
              <input
                className="pn-input"
                placeholder="Search your library"
                aria-label="Search your library"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button className="pn-search-clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>
              )}
            </div>
            <button className="pn-btn pn-btn-primary" onClick={() => setAdding(true)}>Add a game</button>
          </div>
        )}
      </div>

      {games.length === 0 && !adding && (
        <div className="pn-empty-hero">
          <div className="pn-empty-hero-title">No games yet</div>
          Add the game you're running to start building a route, or find one someone's already published in Explore.
          <div className="pn-btn-row" style={{ marginTop: 20, justifyContent: "center" }}>
            <button className="pn-btn pn-btn-primary" style={{ flex: "0 0 auto" }} onClick={() => setAdding(true)}>Add a game</button>
            <button className="pn-btn pn-btn-ghost" style={{ flex: "0 0 auto" }} onClick={onExplore}>Browse Explore</button>
          </div>
        </div>
      )}

      {games.length > 0 && filteredGames.length === 0 && (
        <div className="pn-empty">No games in your library match "{query}".</div>
      )}

      <div className="pn-tile-grid pn-stagger">
        {filteredGames.map((g) => {
          const st = gameStats[g.id] || {};
          const routeCount = (routesByGame[g.id] || []).length;
          const routesLabel = `${routeCount} ${routeCount === 1 ? "route" : "routes"}`;
          return (
            <div
              className="pn-tile"
              key={g.id}
              role="link"
              tabIndex={0}
              onClick={() => onOpenGame(g.id)}
              onKeyDown={(e) => { if (e.key === "Enter") onOpenGame(g.id); }}
            >
              <button
                className="pn-tile-x"
                onClick={async (e) => { e.stopPropagation(); if (await confirm(`Remove "${g.name}" from your library?`)) onDeleteGame(g.id); }}
                aria-label={`Remove ${g.name}`}
              >
                ✕
              </button>
              {g.header_image ? (
                <div className="pn-tile-image" style={{ backgroundImage: `url(${g.header_image})` }} />
              ) : (
                <div className="pn-tile-image pn-explore-tile-image-empty" />
              )}
              <div className="pn-tile-body">
                <div className="pn-tile-text">
                  <div className="pn-tile-title">{g.name}</div>
                  <div className="pn-tile-meta">
                    {st.bestPb != null ? (
                      <><span className="pn-brass-text">PB {fmt(st.bestPb, false)}</span> · {routesLabel}</>
                    ) : (
                      <>{routesLabel} · no runs yet</>
                    )}
                  </div>
                </div>
                {st.sparkVals && st.sparkVals.length > 1 && <Sparkline values={st.sparkVals} />}
              </div>
            </div>
          );
        })}

        {(games.length > 0 || adding) &&
          (adding ? (
            <div className="pn-tile pn-tile-form" onClick={(e) => e.stopPropagation()}>
              <div className="pn-label" style={{ marginTop: 0 }}>Add a game</div>
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
              Add a game
            </button>
          ))}
      </div>
    </div>
  );
}
