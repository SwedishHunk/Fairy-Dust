(() => {
  function clean(s) {
    return (s || "")
      .normalize("NFC")
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .replace(/\u00A0/g, " ")
      .replace(/[★☆•*]/g, "")
      .trim();
  }
  window.clean = clean;
})();
