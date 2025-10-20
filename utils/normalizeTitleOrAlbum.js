(() => {
  // Se till att hjälpmoduleerna (inkl. DPT_TextTransforms) är laddade innan vi använder dem
  // Denna rad garanterar ordningen oavsett zip-packning/laddningssekvens.
  localRequirejs("loadModules");

  // Basnormalisering för titel/albumtitel (utan album-specifika suffix)
  function normalizeTitleOrAlbum(s) {
    let x = clean(s);
    x = normalizeFeat(x);
    x = normalizeRemix(x);
    x = normalizeInlinePt(x);
    x = normalizeVol(x);

    // Anropa den centrala ellips-normaliseringen från textTransforms (ingen fallback)
    const { normalizeEllipsisSpacing } = window.DPT_TextTransforms;
    x = normalizeEllipsisSpacing(x);

    x = smartCapitalize(x);
    // Possessiv: 90'S → 90's (gäller även ord + 'S)
    x = x.replace(/(['’])S\b/g, "$1s");
    return x;
  }

  window.normalizeTitleOrAlbum = normalizeTitleOrAlbum;
})();
