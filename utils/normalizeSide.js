(() => {
  function normalizeSide(s) {
    if (!s) return s;
    var x = clean(s);
    // redan " - Side X" ?
    if (/[-–—]\s*Side\s+[A-Z]\b/.test(x)) return x;

    // fångar "(side a.)", "- side b", "side c" i slutet
    x = x.replace(
      /(?:\s*[-–—]?\s*)?(?:\(\s*)?\bside\b\s+([a-z])\.?\s*(?:\))?\s*$/i,
      function (_, g) {
        return " - Side " + String(g || "").toUpperCase();
      }
    );
    return x.trim();
  }
  window.normalizeSide = normalizeSide;
})();
