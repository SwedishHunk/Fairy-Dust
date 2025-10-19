(() => {
  function stripArtistSuffix(name) {
    return clean(name)
      .replace(/\s*\(\d+\)\s*$/g, "")
      .trim();
  }
  window.stripArtistSuffix = stripArtistSuffix;
})();
