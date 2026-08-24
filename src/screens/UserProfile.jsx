import { useState, useEffect } from "react";
import * as db from "../lib/db";
import { fmt } from "../lib/time";
import BackHead from "../components/BackHead";

// ---------- public author profile ----------
// Everything a given user has published, visually — reached by clicking
// their username anywhere it appears (Explore bylines, your own sidebar).
export default function UserProfile({ userId, username, onBack, onPreviewRoute }) {
  const [routes, setRoutes] = useState(null);

  useEffect(() => {
    setRoutes(null);
    db.listPublicRoutesByUser(userId).then(setRoutes);
  }, [userId]);

  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="Profile" title={username || "…"} />

      {routes == null ? (
        <div className="pn-empty">Loading…</div>
      ) : routes.length === 0 ? (
        <div className="pn-empty-hero">
          <div className="pn-empty-hero-title">Nothing published yet</div>
          {username} hasn't published any guides.
        </div>
      ) : (
        <>
          <div className="pn-hint" style={{ marginBottom: 14 }}>
            {routes.length} published guide{routes.length === 1 ? "" : "s"}
          </div>
          <div className="pn-explore-grid pn-stagger">
            {routes.map((r) => (
              <div className="pn-route-card" key={r.id} onClick={() => onPreviewRoute(r)}>
                {r.games?.header_image ? (
                  <div className="pn-route-card-image" style={{ backgroundImage: `url(${r.games.header_image})` }} />
                ) : (
                  <div className="pn-route-card-image pn-explore-tile-image-empty" />
                )}
                <div className="pn-route-card-body">
                  <div className="pn-explore-tile-name">{r.name}</div>
                  <div className="pn-hint" style={{ margin: "2px 0 10px" }}>
                    {r.games?.name}
                    {r.remixed_from_name && ` · remix of "${r.remixed_from_name}"`}
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
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
