(() => {
  function normalizePartInAlbum(s) {
    if (!s) return s;
    return clean(s)
      .replace(
        /(?:\s*[-–—]?\s*)?(?:\(\s*)?(?:part|pt\.?)\s*(\d+|[a-z])\.?\s*(?:\))?\s*$/i,
        (_, g) => ` - Part ${/^\d+$/.test(g) ? g : g.toUpperCase()}`
      )
      .trim();
  }
  window.normalizePartInAlbum = normalizePartInAlbum;
})();
