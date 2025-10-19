(() => {
  "use strict";
  function normalizeVs(value) {
    return String(value || "")
      .replace(/\b(vs|versus)\b\.?/gi, "vs.") // <-- .? gör den idempotent
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  window.normalizeVs = normalizeVs;
})();
