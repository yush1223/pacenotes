import { supabase } from "./supabaseClient";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/steam-search`;

// Searches Steam's public store-search catalog via the steam-search edge
// function (avoids CORS — store.steampowered.com doesn't allow browser
// cross-origin requests). Returns [] on any failure rather than throwing,
// since this only ever backs an optional autocomplete dropdown.
export async function searchSteamGames(term) {
  if (!term || !term.trim()) return [];
  try {
    const { data } = await supabase.auth.getSession();
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const res = await fetch(`${FN_URL}?term=${encodeURIComponent(term.trim())}`, {
      headers: {
        Authorization: `Bearer ${data.session?.access_token || anonKey}`,
        apikey: anonKey,
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.items || [];
  } catch {
    return [];
  }
}
