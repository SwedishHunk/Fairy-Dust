(() => {
  "use strict";

  // Basnormalisering för titel/albumtitel (utan album-specifika suffix)
  function normalizeTitleOrAlbum(s) {
    let x = clean(s);
    x = normalizeFeat(x);
    x = normalizeRemix(x);
    x = normalizeInlinePt(x);
    x = normalizeVol(x);

    // Anropa central ellips-normalisering från textTransforms
    const { normalizeEllipsisSpacing } = window.DPT_TextTransforms;
    x = normalizeEllipsisSpacing(x);

    x = smartCapitalize(x);
    // Possessiv: 90'S → 90's (gäller även ord + 'S)
    x = x.replace(/(['’])S\b/g, "$1s");
    return x;
  }

  window.normalizeTitleOrAlbum = normalizeTitleOrAlbum;
})();
