import { supabase } from "./supabaseClient";

const SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-search`;
const POPULAR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-popular`;

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
