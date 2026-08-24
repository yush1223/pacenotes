import { supabase } from "./supabaseClient";

const SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-search`;
const POPULAR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-popular`;
const DETAILS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-details`;

async function callFn(url) {
  const { data } = await supabase.auth.getSession();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${data.session?.access_token || anonKey}`,
      apikey: anonKey,
    },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.items || [];
}

// Steam's current top-sellers/new-releases, for the Explore tab's visual
// "browse by game" entry point — independent of whether anyone's
// published a guide for them yet.
export async function fetchSteamPopular() {
  try {
    return await callFn(POPULAR_URL);
  } catch {
    return [];
  }
}

// Searches Steam's public store-search catalog via the steam-search edge
// function (avoids CORS — store.steampowered.com doesn't allow browser
// cross-origin requests). Returns [] on any failure rather than throwing,
// since this only ever backs an optional autocomplete dropdown.
export async function searchSteamGames(term) {
  if (!term || !term.trim()) return [];
  try {
    return await callFn(`${SEARCH_URL}?term=${encodeURIComponent(term.trim())}`);
  } catch {
    return [];
  }
}

// Two tiers of art, both from the steam-details edge function (proxies
// Steam's appdetails for one appid):
//   - headerImage: the standard 460x215 store header (logo/box-art look,
//     small enough to be crisp on a tile without costing much bandwidth)
//   - image: a real 1920x1080 gameplay screenshot — every Steam store
//     page has one, however small the game, but it's a much bigger
//     download and a gameplay shot rather than branded art
// Tiles/grids use headerImage; the big banner on a game's own page (where
// a screenshot's extra resolution actually shows) fetches `image` lazily
// via this same call rather than storing it, so it's never paid for on
// pages that don't need it.
export async function fetchSteamGameImage(appid) {
  if (appid == null) return null;
  try {
    const { data } = await supabase.auth.getSession();
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const res = await fetch(`${DETAILS_URL}?appid=${appid}`, {
      headers: {
        Authorization: `Bearer ${data.session?.access_token || anonKey}`,
        apikey: anonKey,
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return { image: json.image || null, headerImage: json.headerImage || null };
  } catch {
    return null;
  }
}
