(() => {
  "use strict";

  // --- Bindestreck som används mellan artist och titel
  const DASH_CLASS = "(?:–|—|-)";

  // --- Joiners (återanvänds överallt)
  const JOINERS = Object.freeze([
    "vs.",
    "vs",
    "&",
    "and",
    "feat.",
    "feat",
    "ft.",
    "ft",
    "with",
  ]);

  // Kompat för äldre kod som läser globala symboler:
  window.DASH_CLASS = DASH_CLASS;
  window.RX = Object.assign({}, window.RX || {}, {
    dashBetweenArtistTitle: new RegExp("\\s*" + DASH_CLASS + "\\s+"),
  });

  // Förkompilerade regexar
  const RX = Object.freeze({
    // Används bl.a. av parseDiscogs och stripLeadingArtistPrefix
    dashBetweenArtistTitle: new RegExp("\\s*" + DASH_CLASS + "\\s+"),
    // Matchar joiners oavsett punkt/versaler
    JOINERS_RX: new RegExp(
      "\\b(?:" +
        ["vs\\.?", "&", "and", "feat\\.?", "ft\\.?", "with"].join("|") +
        ")\\b",
      "i"
    ),
  });

  const ARTIST_ALBUM_DASH = "–";
  const RX2 = Object.freeze({
    artistAlbumSep: /\s–\s/, // EN-DASH med mellanslag runt
  });

  window.DPT_CONSTANTS = { DASH_CLASS, JOINERS, RX, ARTIST_ALBUM_DASH, RX2 };
})();
