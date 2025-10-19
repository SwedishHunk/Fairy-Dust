(() => {
  function sanitizeYear(v) {
    const s = String(v ?? "").trim();
    return /^\d{4}$/.test(s) ? s : "";
  }
  window.sanitizeYear = sanitizeYear;
})();
