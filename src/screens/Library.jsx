import { useState, useEffect } from "react";
import { getKey } from "../lib/storage";
import { fmt } from "../lib/time";

// ---------- library ----------
export default function Library({ games, routesByGame, onOpenGame, onAddGame, onDeleteGame }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [totalRuns, setTotalRuns] = useState(0);
  const [gameStats, setGameStats] = useState({});

  useEffect(() => {
    (async () => {
      setTotalRuns(await getKey("pn_total_runs", 0));
      const stats = {};
      for (const g of games) {
        const routes = routesByGame[g.id] || [];
        let bestPb = null;
        for (const r of routes) {
          const full = await getKey(`pn_route_${r.id}`, null);
          if (full?.pb && (bestPb == null || full.pb.total < bestPb)) bestPb = full.pb.total;
        }
        stats[g.id] = { routeCount: routes.length, bestPb };
      }
      setGameStats(stats);
    })();
  }, [games, routesByGame]);

  return (
    <div className="pn-view">
      <div className="pn-masthead">
        <div className="pn-masthead-mark">PACE NOTES</div>
        <div className="pn-masthead-rule" />
        <div className="pn-masthead-readout">
          {String(games.length).padStart(2, "0")} GAMES LOGGED · {String(totalRuns).padStart(3, "0")} RUNS RECORDED
        </div>
      </div>

      {games.length === 0 && <div className="pn-empty">No games yet. Add the one you're running.</div>}

      <div className="pn-ledger">
        {games.map((g, i) => {
          const st = gameStats[g.id] || {};
          return (
            <div className="pn-ledger-row" key={g.id} onClick={() => onOpenGame(g.id)}>
              <span className="pn-ledger-idx">{String(i + 1).padStart(2, "0")}</span>
              <span className="pn-ledger-main">
                <span className="pn-ledger-title">{g.name}</span>
                <span className="pn-ledger-sub">
                  {st.routeCount ?? 0} route{st.routeCount === 1 ? "" : "s"}
                  {st.bestPb != null && <> · best <span className="pn-brass-text">{fmt(st.bestPb, false)}</span></>}
                </span>
              </span>
              <button
                className="pn-x"
                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${g.name}" and all its routes?`)) onDeleteGame(g.id); }}
                aria-label="Delete game"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="pn-inline-form">
          <input
            className="pn-input"
            autoFocus
            placeholder="Game name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) { onAddGame(name.trim()); setName(""); setAdding(false); }
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <button className="pn-btn pn-btn-primary" onClick={() => { if (name.trim()) { onAddGame(name.trim()); setName(""); setAdding(false); } }}>Add</button>
          <button className="pn-btn pn-btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <button className="pn-btn pn-btn-primary pn-btn-full" onClick={() => setAdding(true)}>+ Log a game</button>
      )}
    </div>
  );
}
