import { useResumeStore } from "@/lib/resume/store";

/**
 * FR-SEC-106: every browser-storage key the client app writes.
 *
 * - localStorage `chambers-studio`: the Zustand persist key for the resume
 *   store (resume, master, snapshot, notes, posting, letter, versions).
 * - sessionStorage `grok-auth.bearer-token`: the live-preview auth bearer
 *   token (`@/lib/auth/client`). Empty outside the embedded preview.
 *
 * The client app opens no IndexedDB database and uses no Cache Storage. The
 * `chambers` prefix sweeps below are defensive only, so a key added later
 * under the app's own prefix is not left behind.
 */
export const LOCAL_STORAGE_KEYS = ["chambers-studio"] as const;
export const SESSION_STORAGE_KEYS = ["grok-auth.bearer-token"] as const;
const PREFIX = "chambers";

function sweep(store: Storage, known: readonly string[]) {
  const keys = new Set<string>(known);
  for (let i = 0; i < store.length; i += 1) {
    const k = store.key(i);
    if (k && k.toLowerCase().startsWith(PREFIX)) keys.add(k);
  }
  for (const k of keys) store.removeItem(k);
}

async function sweepIndexedDb() {
  if (typeof indexedDB === "undefined" || typeof indexedDB.databases !== "function") return;
  const dbs = await indexedDB.databases();
  await Promise.all(
    dbs
      .map((d) => d.name)
      .filter((n): n is string => Boolean(n && n.toLowerCase().startsWith(PREFIX)))
      .map(
        (name) =>
          new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve();
          }),
      ),
  );
}

/**
 * Erase everything Chambers stored in this browser. Returns false if any
 * storage area could not be cleared, so the caller can say so.
 * The caller must follow with a full document load so the in-memory stores
 * restart from their initial state.
 */
export async function eraseDeviceData(): Promise<boolean> {
  let ok = true;
  try {
    // Cancels the store's debounced write, then removes its key.
    useResumeStore.persist.clearStorage();
  } catch {
    ok = false;
  }
  try {
    sweep(window.localStorage, LOCAL_STORAGE_KEYS);
  } catch {
    ok = false;
  }
  try {
    sweep(window.sessionStorage, SESSION_STORAGE_KEYS);
  } catch {
    ok = false;
  }
  try {
    await sweepIndexedDb();
  } catch {
    ok = false;
  }
  return ok;
}
