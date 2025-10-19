(() => {
  // Albumtitel = bas + album-specifika regler (Side/Part i slutet)
  function normalizeAlbumFull(s) {
    let x = normalizeTitleOrAlbum(s);
    x = normalizeSideInAlbum(x);
    x = normalizePartInAlbum(x);
    return x;
  }
  window.normalizeAlbumFull = normalizeAlbumFull;
})();
