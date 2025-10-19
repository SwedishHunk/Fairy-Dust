(() => {
  function normalizeCatNo(s) {
    if (!s) return s;
    let x = clean(s);
    x = x.replace(/\s*-\s*/g, "-"); // " - " → "-"
    const m = x.match(/^UTPCD\s*-?\s*(\d{1,3})$/i); // UTPCD → UTPCD-XX
    if (m) return `UTPCD-${m[1].padStart(2, "0")}`.toUpperCase();
    return x.replace(/\s+/g, " ").trim();
  }
  window.normalizeCatNo = normalizeCatNo;
})();
