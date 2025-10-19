(() => {
  // === flyttad från init.js ===
  function normalizeInlinePt(s) {
    if (!s) return s;
    // (Pt. 1) / (Pt 2) / (Pt. a) → (Part 1/A)
    return s.replace(/\(\s*pt\.?\s*([a-d]|\d+)\s*\.?\s*\)/gi, (_, g1) => {
      const v = /^[a-d]$/i.test(g1) ? g1.toUpperCase() : g1;
      return `(Part ${v})`;
    });
  }
  // behåll globalt namn så alla gamla anrop fortsätter fungera
  window.normalizeInlinePt = normalizeInlinePt;
})();
