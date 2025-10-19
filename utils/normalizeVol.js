(() => {
  function normalizeVol(s) {
    if (!s) return s;
    let x = s;
    // Säkerställ punkt efter Vol
    x = x.replace(/\bVol\b\.?/gi, "Vol.");
    // Och exakt ett mellanslag efter "Vol." om nästa tecken inte är blank
    x = x.replace(/\bVol\.\s*(?=\S)/gi, "Vol. ");
    // Komprimera ev. överflödiga mellanrum efter Vol.
    x = x.replace(/\bVol\.\s{2,}/gi, "Vol. ");
    return x;
  }
  window.normalizeVol = normalizeVol;
})();
