import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { fmt } from "../lib/time";
import BackHead from "../components/BackHead";
import GameBanner from "../components/GameBanner";

// ---------- explore public guides ----------
// A genuinely separate space from "my library": a visual browse
// experience. Nothing here is yours until you preview a route and
// explicitly add it. "Popular on Steam" is deliberately left out for now
// — with only a handful of guides published so far, a grid full of "no
// guides yet" tiles undersold the app rather than inviting exploration.
// It's easy to bring back once there's enough published content to fill
// it out; see fetchSteamPopular() in lib/steam.js.
export default function Explore({ userId, onBack, onPreviewRoute, onOpenProfile }) {
  const [published, setPublished] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    db.listPublicGames().then(setPublished);
  }, []);

  useEffect(() => {
    if (!selectedGame) return;
    setRoutes(null);
    const load = selectedGame.steam_appid
      ? db.listPublicRoutesBySteamAppid(selectedGame.steam_appid)
      : db.listPublicRoutes({ gameId: selectedGame.id });
    load.then(setRoutes);
  }, [selectedGame]);

  if (selectedGame) {
    return (
      <div className="pn-view">
        <BackHead onBack={() => setSelectedGame(null)} eyebrow="Explore" title={selectedGame.name} />
        <GameBanner steamAppid={selectedGame.steam_appid} thumb={selectedGame.image} className="pn-explore-banner" />
        {routes == null ? (
          <div className="pn-empty">Loading…</div>
        ) : routes.length === 0 ? (
          <div className="pn-empty-hero">
            <div className="pn-empty-hero-title">No public guides yet</div>
            Be the first — log this game and publish a route from its detail page.
          </div>
        ) : (
          <div className="pn-tile-grid pn-stagger">
            {routes.map((r, i) => (
              <div className="pn-tile" key={r.id} onClick={() => onPreviewRoute(r)}>
                <div className="pn-tile-idx">{String(i + 1).padStart(2, "0")}</div>
                <div className="pn-tile-title">{r.name}</div>
                <div className="pn-hint" style={{ marginBottom: 10 }}>
                  by{" "}
                  {r.profiles?.username && onOpenProfile ? (
                    <button
                      className="pn-author-link"
                      onClick={(e) => { e.stopPropagation(); onOpenProfile({ userId: r.owner_id, username: r.profiles.username }); }}
                    >
                      {r.profiles.username}
                    </button>
                  ) : (
                    r.profiles?.username || "unknown"
                  )}
                  {r.remixed_from_name && ` · remix`}
                </div>
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

  const filtered = published?.filter((g) => g.name.toLowerCase().includes(query.trim().toLowerCase())) ?? null;

  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="Explore" title="Discover" />

      {published != null && published.length > 0 && (
        <div className="pn-search-field">
          <input
            className="pn-input"
            placeholder="Search published games…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="pn-search-clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>
          )}
        </div>
      )}

      <label className="pn-label" style={published == null || published.length === 0 ? { marginTop: 0 } : undefined}>Published guides</label>
      <div className="pn-hint" style={{ marginBottom: 14 }}>Every game with at least one public guide.</div>
      {published == null ? (
        <div className="pn-empty">Loading…</div>
      ) : published.length === 0 ? (
        <div className="pn-empty-hero">
          <div className="pn-empty-hero-title">Nothing published yet</div>
          Publish a route from its detail page and it'll show up here for anyone to run.
        </div>
      ) : filtered.length === 0 ? (
        <div className="pn-empty">No published games match "{query}".</div>
      ) : (
        <div className="pn-explore-grid pn-stagger">
          {filtered.map((g) => (
            <div className="pn-explore-tile" key={g.id} onClick={() => setSelectedGame({ id: g.id, steam_appid: g.steam_appid, name: g.name, image: g.header_image })}>
              {g.header_image ? (
                <div className="pn-explore-tile-image" style={{ backgroundImage: `url(${g.header_image})` }} />
              ) : (
                <div className="pn-explore-tile-image pn-explore-tile-image-empty" />
              )}
              <div className="pn-explore-tile-body">
                <div className="pn-explore-tile-name">{g.name}</div>
                <div className="pn-explore-tile-count pn-brass-text">{g.routeCount} guide{g.routeCount === 1 ? "" : "s"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
