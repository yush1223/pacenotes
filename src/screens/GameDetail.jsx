import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { supabase } from "../lib/supabaseClient";
import { fmt } from "../lib/time";
import Sparkline from "../components/Sparkline";
import BackHead from "../components/BackHead";

// ---------- game detail ----------
export default function GameDetail({ game, routes, userId, onBack, onOpenRoute, onNewRoute }) {
  const [details, setDetails] = useState({});
  const [owners, setOwners] = useState({});

  useEffect(() => {
    (async () => {
      const d = {};
      for (const r of routes) {
        const pb = await db.getPB(r.id, userId);
        const runs = await db.listRuns(r.id, userId, 8);
        d[r.id] = { pb, runs };
      }
      setDetails(d);

      const otherOwnerIds = [...new Set(routes.filter((r) => r.owner_id !== userId).map((r) => r.owner_id))];
      if (otherOwnerIds.length) {
        const { data } = await supabase.from("profiles").select("id,username").in("id", otherOwnerIds);
        const map = {};
        for (const p of data || []) map[p.id] = p.username;
        setOwners(map);
      }
    })();
  }, [routes, userId]);

  if (!game) return null;
  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="Game" title={game.name} />
      {routes.length === 0 && <div className="pn-empty">No routes yet for {game.name}.</div>}

      <div className="pn-tile-grid pn-stagger">
        {routes.map((r, i) => {
          const d = details[r.id];
          const sparkVals = d?.runs?.length ? d.runs.slice().reverse().map((x) => x.total_ms) : null;
          const isMine = r.owner_id === userId;
          return (
            <div className="pn-tile" key={r.id} onClick={() => onOpenRoute(r.id)}>
              <div className="pn-tile-idx">{String(i + 1).padStart(2, "0")}</div>
              <div className="pn-tile-title">{r.name}</div>
              {!isMine && <div className="pn-hint" style={{ marginTop: -8, marginBottom: 10 }}>by {owners[r.owner_id] || "…"}</div>}
              <div className="pn-tile-foot">
                <div className="pn-instrument-row">
                  <div className="pn-instrument">
                    <span className="pn-instrument-label">pb</span>
                    <span className="pn-mono pn-brass-text">{d?.pb ? fmt(d.pb.total_ms, false) : "—"}</span>
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
