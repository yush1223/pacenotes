import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { supabase } from "../lib/supabaseClient";
import { fmt } from "../lib/time";
import Sparkline from "../components/Sparkline";
import BackHead from "../components/BackHead";
import GameBanner from "../components/GameBanner";

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
      <GameBanner steamAppid={game.steam_appid} thumb={game.header_image} className="pn-explore-banner" />
      {routes.length === 0 && <div className="pn-empty">No routes yet for {game.name}. Start one below.</div>}

      <h2 className="pn-section-title" style={{ marginTop: 0 }}>Routes</h2>
      <div className="pn-tile-grid pn-stagger" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {routes.map((r) => {
          const d = details[r.id];
          const sparkVals = d?.runs?.length ? d.runs.slice().reverse().map((x) => x.total_ms) : null;
          const isMine = r.owner_id === userId;
          const runCount = d?.runs?.length ?? 0;
          return (
            <div
              className="pn-route-tile"
              key={r.id}
              role="link"
              tabIndex={0}
              onClick={() => onOpenRoute(r.id)}
              onKeyDown={(e) => { if (e.key === "Enter") onOpenRoute(r.id); }}
            >
              <div>
                <div className="pn-route-tile-title">{r.name}</div>
                <div className="pn-hint" style={{ marginTop: 2 }}>
                  {r.segments?.length ?? 0} segments
                  {!isMine && <> · by {owners[r.owner_id] || "…"}{r.remixed_from_name && " · remix"}</>}
                  {isMine && r.remixed_from_name && <> · remix of "{r.remixed_from_name}"</>}
                </div>
              </div>
              <div className="pn-tile-foot">
                <div className="pn-tile-meta">
                  {d?.pb ? <span className="pn-brass-text">PB {fmt(d.pb.total_ms, false)}</span> : "No PB yet"} · {runCount}{runCount === 8 ? "+" : ""} {runCount === 1 ? "run" : "runs"}
                </div>
                {sparkVals && sparkVals.length > 1 && <Sparkline values={sparkVals} />}
              </div>
            </div>
          );
        })}
        <button className="pn-tile-add pn-route-tile-add" onClick={onNewRoute}>
          <span className="pn-tile-add-plus">+</span>
          New route
        </button>
      </div>
    </div>
  );
}
