import { useState, useEffect } from "react";
import * as db from "../lib/db";

// ---------- landing page for guests ----------
// Where a signed-out visitor actually lands, instead of being dropped
// straight into the Discover grid with zero context for what the app even
// is. Two honest doors out: browse without an account, or sign in to
// build something of your own.
export default function Home({ onExplore, onSignIn }) {
  const [published, setPublished] = useState(null);

  useEffect(() => {
    db.listPublicGames().then(setPublished);
  }, []);

  const gameCount = published?.length ?? 0;
  const guideCount = published ? published.reduce((sum, g) => sum + g.routeCount, 0) : 0;

  return (
    <div className="pn-view">
      <div className="pn-masthead">
        <div className="pn-masthead-mark">PACENOTES</div>
        <div className="pn-masthead-tag">Route notes and a live split timer, for any game.</div>
        <div className="pn-masthead-rule" />
        <div className="pn-masthead-readout">
          {published == null ? (
            "loading…"
          ) : (
            <><span className="pn-mono-num">{String(gameCount).padStart(2, "0")}</span> games with published guides · <span className="pn-mono-num">{String(guideCount).padStart(2, "0")}</span> guides to follow</>
          )}
        </div>
      </div>

      <div className="pn-home-pitch">
        Write segment-by-segment route notes for any game, time yourself against them with a
        live split timer, and track personal bests per segment. Publish a route so anyone can
        follow it, or find one someone else already wrote and make it your own.
      </div>

      <div className="pn-btn-row" style={{ marginTop: 20, marginBottom: 28 }}>
        <button className="pn-btn pn-btn-primary" onClick={onExplore}>Explore public guides →</button>
        <button className="pn-btn pn-btn-ghost" onClick={onSignIn}>Sign in to start your own</button>
      </div>

      {published && published.length > 0 && (
        <>
          <label className="pn-label" style={{ marginTop: 0 }}>Recently published</label>
          <div className="pn-explore-grid pn-stagger">
            {published.slice(0, 6).map((g) => (
              <div className="pn-explore-tile" key={g.id} onClick={onExplore}>
                {g.header_image ? (
                  <div className="pn-explore-tile-image" style={{ backgroundImage: `url(${g.header_image})` }} />
                ) : (
                  <div className="pn-explore-tile-image pn-explore-tile-image-empty" />
                )}
                <div className="pn-explore-tile-body">
                  <div className="pn-explore-tile-name">{g.name}</div>
                  <div className="pn-explore-tile-count">{g.routeCount} guide{g.routeCount === 1 ? "" : "s"}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
