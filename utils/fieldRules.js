(() => {
  // Liten hjälpare: kör fn om det verkligen är en funktion
  function apply(fn, v) {
    try {
      return typeof fn === "function" ? fn(v) : v;
    } catch {
      return v;
    }
  }

  // Hämtar referens till global funktion, men tolererar att den saknas
  function g(name) {
    return typeof window[name] === "function" ? window[name] : null;
  }

  // Pipelines per fält (ordningen spelar roll)
  const PIPELINES = {
    trackTitle: [
      g("clean"),
      g("normalizeFeat"),
      g("normalizeInlinePt"),
      g("normalizePartInTitle"),
      g("normalizeRemix"),
      g("normalizeVol"),
      g("smartCapitalize"),
      g("wrapGenericRemix"),
      // possessiv: 90'S → 90's
      (x) => String(x || "").replace(/(['’])S\b/g, "$1s"),
    ],

    albumTitle: [
      g("clean"),
      g("normalizeFeat"),
      g("normalizeInlinePt"),
      g("normalizePartInAlbum"),
      g("normalizeRemix"),
      g("normalizeSideInAlbum"),
      g("normalizeVol"),
      g("smartCapitalize"),
      (x) => String(x || "").replace(/(['’])S\b/g, "$1s"),
    ],

    trackArtist: [g("cleanArtistName")],
    albumArtist: [g("cleanArtistName")],
  };

  function runPipeline(name, s) {
    return (PIPELINES[name] || []).reduce((v, fn) => apply(fn, v), s);
  }

  // Publika, tydliga wrappers (lätta att söka på)
  function cleanTrackTitle(s) {
    return runPipeline("trackTitle", s);
  }
  function cleanAlbumTitle(s) {
    return runPipeline("albumTitle", s);
  }
  function cleanTrackArtist(s) {
    return runPipeline("trackArtist", s);
  }
  function cleanAlbumArtist(s) {
    return runPipeline("albumArtist", s);
  }

  // Exportera
  window.normalizeField = runPipeline; // om du vill anropa dynamiskt
  window.cleanTrackTitle = cleanTrackTitle;
  window.cleanAlbumTitle = cleanAlbumTitle;
  window.cleanTrackArtist = cleanTrackArtist;
  window.cleanAlbumArtist = cleanAlbumArtist;
})();
