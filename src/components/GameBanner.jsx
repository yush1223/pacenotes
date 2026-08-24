import { useState, useEffect } from "react";
import { fetchSteamGameImage } from "../lib/steam";

// ---------- two-tier game art, crossfaded ----------
// The stored thumbnail (thumb) shows immediately; a real screenshot is
// fetched in the background and preloaded via a real Image() before it's
// ever shown, then faded in over the thumbnail. Swapping instantly (the
// old behavior) always read as a flash/pop no matter how fast the fetch
// was, because the two images are genuinely different pictures (box art
// vs. gameplay) — a hard cut between them looks broken even when nothing
// is. Fading solves that regardless of load speed.
export default function GameBanner({ steamAppid, thumb, className }) {
  const [hiRes, setHiRes] = useState(null);
  const [hiResVisible, setHiResVisible] = useState(false);

  useEffect(() => {
    setHiRes(null);
    setHiResVisible(false);
    if (!steamAppid) return;
    let live = true;
    fetchSteamGameImage(steamAppid).then((d) => {
      if (!live || !d?.image) return;
      const img = new Image();
      img.onload = () => {
        if (!live) return;
        setHiRes(d.image);
        // Next frame, so the browser has painted the base image and the
        // opacity transition actually animates instead of snapping in.
        requestAnimationFrame(() => requestAnimationFrame(() => setHiResVisible(true)));
      };
      img.src = d.image;
    });
    return () => { live = false; };
  }, [steamAppid]);

  if (!thumb && !hiRes) return null;
  return (
    <div className={(className ? className + " " : "") + "pn-banner-stack"}>
      {thumb && <div className="pn-banner-layer" style={{ backgroundImage: `url(${thumb})` }} />}
      {hiRes && (
        <div
          className={"pn-banner-layer pn-banner-hires" + (hiResVisible ? " pn-banner-hires-visible" : "")}
          style={{ backgroundImage: `url(${hiRes})` }}
        />
      )}
    </div>
  );
}
