(() => {
  "use strict";

  // Är träffen inne i samma parentespar?
  function isInsideParens(s, idx) {
    const open = s.lastIndexOf("(", idx);
    if (open === -1) return false;
    const close = s.indexOf(")", idx);
    if (close === -1) return false;
    return open < idx && idx < close;
  }

  function wrapGenericRemix(value) {
    let x = String(value || "");

    // 1) Normalisera befintliga "( Remix )" -> "(Remix)" (samma för Mix)
    x = x.replace(/\(\s*(Remix|Mix)\s*\)/gi, "($1)");

    // 2) Idempotens: om exakt "(Remix|Mix)" redan finns -> gör inget
    if (/\((?:Remix|Mix)\)/i.test(x)) return x;

    // 3) Om Remix/Mix ligger i parentes med annat innehåll -> rör inte
    if (/\((?!\s*(?:Remix|Mix)\s*\))[^)]*\b(Remix|Mix)\b[^)]*\)/i.test(x)) {
      return x;
    }

    // 4) Kapsla första nakna "Remix|Mix" som INTE redan ligger i parentes
    return x.replace(/\b(Remix|Mix)\b/i, (m, _p1, offset) => {
      return isInsideParens(x, offset) ? m : `(${m})`;
    });
  }

  window.wrapGenericRemix = wrapGenericRemix;
})();
