import { useState, useEffect } from "react";
import { getKey } from "../lib/storage";
import { fmt } from "../lib/time";
import Sparkline from "../components/Sparkline";
import BackHead from "../components/BackHead";

// ---------- game detail ----------
export default function GameDetail({ game, routes, onBack, onOpenRoute, onNewRoute }) {
  const [details, setDetails] = useState({});

  useEffect(() => {
    (async () => {
      const d = {};
      for (const r of routes) {
        const full = await getKey(`pn_route_${r.id}`, null);
        const runs = await getKey(`pn_runs_${r.id}`, []);
        d[r.id] = { full, runs };
      }
      setDetails(d);
    })();
  }, [routes]);

  if (!game) return null;
  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="Game" title={game.name} />
      {routes.length === 0 && <div className="pn-empty">No routes yet for {game.name}.</div>}

      <div className="pn-tile-grid pn-stagger">
        {routes.map((r, i) => {
          const d = details[r.id];
          const sparkVals = d?.runs?.length ? d.runs.slice(0, 8).reverse().map((x) => x.total) : null;
          return (
            <div className="pn-tile" key={r.id} onClick={() => onOpenRoute(r.id)}>
              <div className="pn-tile-idx">{String(i + 1).padStart(2, "0")}</div>
              <div className="pn-tile-title">{r.name}</div>
              <div className="pn-tile-foot">
                <div className="pn-instrument-row">
                  <div className="pn-instrument">
                    <span className="pn-instrument-label">pb</span>
                    <span className="pn-mono pn-brass-text">{d?.full?.pb ? fmt(d.full.pb.total, false) : "—"}</span>
                  </div>
                  <div className="pn-instrument-divider" />
                  <div className="pn-instrument">
                    <span className="pn-instrument-label">runs</span>
                    <span className="pn-mono">{d?.runs?.length ?? 0}</span>
                  </div>
                </div>
                <Sparkline values={sparkVals} />
              </div>
            </div>
          );
        })}
        <button className="pn-tile-add" onClick={onNewRoute}>
          <span className="pn-tile-add-plus">+</span>
          New route
        </button>
      </div>
    </div>
  );
}
