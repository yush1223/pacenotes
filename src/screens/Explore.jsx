import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { fmt } from "../lib/time";
import BackHead from "../components/BackHead";

// ---------- explore public guides ----------
// Distinct from "my library": nothing here is yours until you open a route
// and it gets added — this is just the shared, browsable catalog of
// guides anyone has published.
export default function Explore({ userId, onBack, onOpenRoute }) {
  const [games, setGames] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [routes, setRoutes] = useState(null);

  useEffect(() => {
    db.listPublicGames().then(setGames);
  }, []);

  useEffect(() => {
    if (!selectedGame) return;
    setRoutes(null);
    db.listPublicRoutes({ gameId: selectedGame.id }).then(setRoutes);
  }, [selectedGame]);

  if (selectedGame) {
    return (
      <div className="pn-view">
        <BackHead onBack={() => setSelectedGame(null)} eyebrow="Explore" title={selectedGame.name} />
        {routes == null ? (
          <div className="pn-empty">Loading…</div>
        ) : routes.length === 0 ? (
          <div className="pn-empty">No public guides for this game yet.</div>
        ) : (
          <div className="pn-tile-grid pn-stagger">
            {routes.map((r, i) => (
              <div className="pn-tile" key={r.id} onClick={() => onOpenRoute(r)}>
                <div className="pn-tile-idx">{String(i + 1).padStart(2, "0")}</div>
                <div className="pn-tile-title">{r.name}</div>
                <div className="pn-hint" style={{ marginBottom: 10 }}>by {r.profiles?.username || "unknown"}</div>
                <div className="pn-instrument-row">
                  <div className="pn-instrument">
                    <span className="pn-instrument-label">segments</span>
                    <span className="pn-mono">{r.segments?.length ?? 0}</span>
                  </div>
                  {r.target_ms != null && (
                    <>
                      <div className="pn-instrument-divider" />
                      <div className="pn-instrument">
                        <span className="pn-instrument-label">target</span>
                        <span className="pn-mono">{fmt(r.target_ms, false)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="Explore" title="Public guides" />
      {games == null ? (
        <div className="pn-empty">Loading…</div>
      ) : games.length === 0 ? (
        <div className="pn-empty-hero">
          <div className="pn-empty-hero-title">Nothing published yet</div>
          Be the first — publish a route from its detail page and it'll show up here for anyone to run.
        </div>
      ) : (
        <div className="pn-tile-grid pn-stagger">
          {games.map((g, i) => (
            <div className="pn-tile" key={g.id} onClick={() => setSelectedGame(g)}>
              <div className="pn-tile-idx">{String(i + 1).padStart(2, "0")}</div>
              <div className="pn-tile-title">{g.name}</div>
              <div className="pn-instrument-row">
                <div className="pn-instrument">
                  <span className="pn-instrument-label">public guides</span>
                  <span className="pn-mono">{g.routeCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
