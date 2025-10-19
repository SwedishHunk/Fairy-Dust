(() => {
  function normalizeSideInAlbum(s) {
    if (!s) return s;
    return clean(s)
      .replace(
        /(?:\s*[-–—]?\s*)?(?:\(\s*)?\bside\b\s+([a-z])\.?\s*(?:\))?\s*$/i,
        (_, g) => ` - Side ${g.toUpperCase()}`
      )
      .trim();
  }
  window.normalizeSideInAlbum = normalizeSideInAlbum;
})();
