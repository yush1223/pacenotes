import { useState, useEffect } from "react";
import { fetchSteamGameImage } from "../lib/steam";

// ---------- big banner art: full-res only, no thumbnail flash ----------
// Never shows the tile-tier thumbnail here — it's a genuinely different
// picture (box art vs. gameplay) from the screenshot, so showing it first
// just reads as "wrong image, then it changes." Instead: a neutral
// loading pattern (same striped placeholder used everywhere else in the
// app for "no image yet") until the real screenshot has fully loaded,
// then a single hard swap straight to it.
export default function GameBanner({ steamAppid, thumb, className }) {
  const [hiRes, setHiRes] = useState(null);

  useEffect(() => {
    setHiRes(null);
    if (!steamAppid) return;
    let live = true;
    fetchSteamGameImage(steamAppid).then((d) => {
      if (!live || !d?.image) return;
      const img = new Image();
      img.onload = () => { if (live) setHiRes(d.image); };
      img.src = d.image;
    });
    return () => { live = false; };
  }, [steamAppid]);

  // Custom (non-Steam) games have no screenshot to fetch — just show
  // whatever thumbnail is on the game row, same as any tile.
  if (!steamAppid) {
    return thumb ? <div className={className} style={{ backgroundImage: `url(${thumb})` }} /> : null;
  }

  return (
    <div
      className={(className ? className + " " : "") + (hiRes ? "" : "pn-explore-tile-image-empty")}
      style={hiRes ? { backgroundImage: `url(${hiRes})` } : undefined}
    />
  );
}
