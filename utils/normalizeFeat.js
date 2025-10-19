(() => {
  "use strict";
  function normalizeFeat(value) {
    return String(value || "")
      .replace(/\b(ft|feat|featuring)\b\.?/gi, "feat.") // <-- .?
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  window.normalizeFeat = normalizeFeat;
})();
