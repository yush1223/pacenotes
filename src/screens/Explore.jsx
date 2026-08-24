import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { fetchSteamPopular } from "../lib/steam";
import { fmt } from "../lib/time";
import BackHead from "../components/BackHead";

// ---------- explore public guides ----------
// A genuinely separate space from "my library": a visual, Steam-flavored
// browse experience. Nothing here is yours until you open a route and it
// gets added to your library.
export default function Explore({ userId, onBack, onOpenRoute, onOpenProfile }) {
  const [popular, setPopular] = useState(null);
  const [published, setPublished] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [routes, setRoutes] = useState(null);

  useEffect(() => {
    // Steam's featured-categories response occasionally repeats an appid
    // across sections (e.g. both top-sellers and new-releases) — dedupe so
    // React keys stay unique and the grid doesn't show the same game twice.
    fetchSteamPopular().then((items) => {
      const seen = new Set();
      setPopular((items || []).filter((p) => (seen.has(p.appid) ? false : (seen.add(p.appid), true))));
    });
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
        {selectedGame.image && <div className="pn-explore-banner" style={{ backgroundImage: `url(${selectedGame.image})` }} />}
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
              <div className="pn-tile" key={r.id} onClick={() => onOpenRoute(r)}>
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

  const publishedByAppid = {};
  for (const g of published || []) if (g.steam_appid) publishedByAppid[g.steam_appid] = g;

  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="Explore" title="Discover" />

      <label className="pn-label" style={{ marginTop: 0 }}>Popular on Steam</label>
      <div className="pn-hint" style={{ marginBottom: 14 }}>Browse by game — pick one to see published guides, or be the first to write one.</div>
      {popular == null ? (
        <div className="pn-empty">Loading…</div>
      ) : (
        <div className="pn-explore-grid pn-stagger">
          {popular.map((p) => {
            const count = publishedByAppid[p.appid]?.routeCount ?? 0;
            return (
              <div
                className="pn-explore-tile"
                key={p.appid}
                onClick={() => setSelectedGame({ steam_appid: p.appid, name: p.name, image: p.image })}
              >
                <div className="pn-explore-tile-image" style={{ backgroundImage: `url(${p.image})` }} />
                <div className="pn-explore-tile-body">
                  <div className="pn-explore-tile-name">{p.name}</div>
                  <div className={"pn-explore-tile-count" + (count > 0 ? " pn-brass-text" : " pn-ink-dim")}>
                    {count > 0 ? `${count} guide${count === 1 ? "" : "s"}` : "no guides yet"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <label className="pn-label" style={{ marginTop: 28 }}>Published guides</label>
      <div className="pn-hint" style={{ marginBottom: 14 }}>Every game with at least one public guide, Steam-popular or not.</div>
      {published == null ? (
        <div className="pn-empty">Loading…</div>
      ) : published.length === 0 ? (
        <div className="pn-empty-hero">
          <div className="pn-empty-hero-title">Nothing published yet</div>
          Publish a route from its detail page and it'll show up here for anyone to run.
        </div>
      ) : (
        <div className="pn-explore-grid pn-stagger">
          {published.map((g) => (
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
