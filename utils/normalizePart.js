(() => {
  function normalizePart(s, mode) {
    if (!s) return s;
    var x = clean(s);
    var ALBUM = mode === "album";

    // redan normaliserat?
    if (/\(Part\s+(?:\d+|[A-Z])\)/i.test(x)) return x;
    if (/[-–—]\s*Part\s+(?:\d+|[A-Z])\b/i.test(x)) return x;

    function normToken(t) {
      if (!t) return "";
      var tt = String(t).trim();
      if (/^[a-d]$/i.test(tt)) return tt.toUpperCase();
      var ri = window.romanToInt ? romanToInt(tt) : null;
      if (ri && ri > 0 && ri < 1000) return String(ri);
      if (/^\d{1,3}$/.test(tt)) return String(parseInt(tt, 10));
      return tt;
    }

    // 1) slutet: ", pt 2" / "pt, 2" / "part iv"
    x = x.replace(
      /(?:\s*,)?\s*(?:part|pt\.?)\s*[, ]*\s*([ivxlcdm]+|\d+|[a-d])\s*$/i,
      function (_, g) {
        var v = normToken(g);
        return ALBUM ? " - Part " + v : " (Part " + v + ")";
      }
    );

    // 2) före parentes: "pt 2 (Remix)"
    x = x.replace(
      /(?:\s*,)?\s*(?:part|pt\.?)\s*[, ]*\s*([ivxlcdm]+|\d+|[a-d])\s*(?=\()/i,
      function (_, g) {
        var v = normToken(g);
        return ALBUM ? " - Part " + v + " " : " (Part " + v + ") ";
      }
    );

    // 3) mitt i: före "Vol.", bindestreck eller strängslut
    //    t.ex. " ... pt 2 vol 3"  eller " ... pt 2 - "
    x = x.replace(
      /(?:\s*,)?\s*(?:part|pt\.?)\s*[, ]*\s*([ivxlcdm]+|\d+|[a-d])(?=\s+(?:vol\.?|[-–—]|$))/i,
      function (_, g) {
        var v = normToken(g);
        return ALBUM ? " - Part " + v : " (Part " + v + ")";
      }
    );

    return x.trim();
  }

  function normalizePartTitle(s) {
    return normalizePart(s, "title");
  }
  function normalizePartAlbum(s) {
    return normalizePart(s, "album");
  }

  window.normalizePart = normalizePart;
  window.normalizePartTitle = normalizePartTitle;
  window.normalizePartAlbum = normalizePartAlbum;
})();
