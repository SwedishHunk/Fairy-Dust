(() => {
  "use strict";

  function stripLeadingArtistPrefix(title, artist) {
    const a = String(artist || "").trim();
    let t = String(title || "").trim();
    if (!a || !t) return t;

    // Använd central DASH_CLASS (fallback för säkerhets skull)
    const dashClass =
      (window.DPT_CONSTANTS && window.DPT_CONSTANTS.DASH_CLASS) || "(?:–|—|-)";

    // Escapa artist för regex
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ^  Artist  <dash>  [space]  Title...
    const rx = new RegExp("^\\s*" + esc(a) + "\\s*" + dashClass + "\\s*", "i");
    return t.replace(rx, "");
  }

  window.stripLeadingArtistPrefix = stripLeadingArtistPrefix;
})();
