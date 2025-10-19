(() => {
  function normalizeRemix(s) {
    if (!s) return s;
    let x = String(s)
      // rmx / r.m.x / Rmx → Remix (svälj ev. avslutande punkt)
      .replace(/\b(?:r\.?m\.?x|rmx)\b\.?/gi, "Remix")
      .replace(/\bremix\b/gi, "Remix")
      .replace(/\bmix\b/gi, "Mix");

    // Om "Remix." eller "Mix." råkar finnas på slutet → ta bort punkten
    x = x.replace(/(Remix|Mix)\.(?=\s|$)/gi, "$1");

    return x;
  }
  window.normalizeRemix = normalizeRemix;
})();
