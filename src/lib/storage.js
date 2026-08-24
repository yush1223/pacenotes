// ---------- storage ----------
// Local-only persistence via localStorage. Same async signatures as the
// original window.storage-backed helpers so call sites don't need to change
// when this eventually gets swapped for a real backend (see
// pacenotes-intent.md, "What needs to change to leave the artifacts sandbox").

export async function getKey(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export async function setKey(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("storage set failed", key, e);
    return false;
  }
}

export async function deleteKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (e) {}
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}
