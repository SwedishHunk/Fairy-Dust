(() => {
  "use strict";

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Konverterar Tracklist/Promise/Array/Set/Map → Array (tyst safe)
  async function toArray(tl) {
    if (!tl) return [];
    if (typeof tl.then === "function") {
      try { tl = await tl; } catch { return []; }
    }
    if (Array.isArray(tl)) return tl;

    try {
      if (typeof tl.forEach === "function") {
        const a = []; tl.forEach((x) => a.push(x)); return a;
      }
      if (tl && typeof tl.length === "number") {
        const a = []; for (let i=0;i<tl.length;i++) a.push(tl[i]); return a;
      }
      if (typeof tl.count === "number" && typeof tl.getValue === "function") {
        const a = []; for (let i=0;i<tl.count;i++) a.push(tl.getValue(i)); return a;
      }
      if (tl instanceof Set)  return Array.from(tl);
      if (tl instanceof Map)  return Array.from(tl.values());
    } catch {}
    return [];
  }

  // Vänta tills MM:s uitools finns
  async function waitForUitools(tries = 240, delay = 50) {
    for (let i = 0; i < tries; i++) {
      if (window.uitools && typeof uitools.getSelectedTracklist === "function")
        return true;
      await sleep(delay);
    }
    return false;
  }

  // Hämta valda spår som Array (safe)
  async function getSelectedArray() {
    const ready = await waitForUitools();
    if (!ready) return [];
    let tl;
    try { tl = uitools.getSelectedTracklist(); } catch { return []; }
    return await toArray(tl);
  }

  // Export
  window.DPT_MM = { sleep, toArray, waitForUitools, getSelectedArray };
})();
