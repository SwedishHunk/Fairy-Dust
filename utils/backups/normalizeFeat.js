(() => {
  function normalizeFeat(s) {
    if (!s) return s;
    let x = s.replace(/\bfeat(?:uring)?\b\s*\.*\s*/giu, " feat. ");
    x = x.replace(/\s*feat\.\s*/giu, " feat. ");
    x = x.replace(/\bfeat\.\.+/giu, "feat.");
    return clean(x);
  }
  window.normalizeFeat = normalizeFeat;
})();
