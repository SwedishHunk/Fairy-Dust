(() => {
  function normalizeVs(s) {
    if (!s) return s;
    let x = s
      .replace(/\bvs\.\.+/gi, "vs.")
      .replace(/\bvs\s*\.\s*\.\s*/gi, "vs.")
      .replace(/\b(versus|vs)\b\.?/gi, "vs.");
    x = x.replace(/\s*vs\.\s*/gi, " vs. ");
    return clean(x);
  }
  window.normalizeVs = normalizeVs;
})();
