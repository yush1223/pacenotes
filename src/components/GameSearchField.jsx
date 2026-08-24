import { useState, useEffect, useRef } from "react";
import { searchSteamGames } from "../lib/steam";

// ---------- game name input with Steam autocomplete ----------
// Freeform text still works for anything not on Steam — picking a
// suggestion is optional, just a way to dedupe against the shared catalog
// cleanly and pick up box art.
export default function GameSearchField({ value, onChange, onPick, placeholder, className, inputStyle, autoFocus, onKeyDown }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || !value.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const items = await searchSteamGames(value);
      setResults(items);
      setOpen(true);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  return (
    <div className="pn-game-search">
      <input
        className={className}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        style={inputStyle}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {open && results.length > 0 && (
        <div className="pn-game-search-dropdown">
          {results.map((r) => (
            <div key={r.appid} className="pn-game-search-item" onMouseDown={() => { onPick(r); setOpen(false); }}>
              {r.image && <img src={r.image} alt="" className="pn-game-search-thumb" />}
              <span className="pn-game-search-name">{r.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
