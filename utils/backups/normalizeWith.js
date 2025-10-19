(() => {
  function normalizeWith(s) {
    if (!s) return s;
    let x = String(s);

    // Gör with case-insensitive och med exakt ett blank runt
    x = x.replace(/\bwith\b/gi, " with ");
    x = x.replace(/\s*with\s*/gi, " with ");

    // Ta bort överflödiga komman/spaces generellt
    x = x.replace(/\s*,\s*/g, " ");
    x = x.replace(/\s{2,}/g, " ").trim();
    return x;
  }
  window.normalizeWith = normalizeWith;
})();
