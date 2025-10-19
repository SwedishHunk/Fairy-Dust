(() => {
  function cleanArtistName(name) {
    let x = clean(name)
      .replace(/\s*\(\d+\)\s*/g, " ")
      .replace(/\*+$/g, "");
    x = normalizeFeat(x);
    x = normalizeVs(x);
    x = normalizeWith(x);
    return clean(x);
  }
  window.cleanArtistName = cleanArtistName;
})();
