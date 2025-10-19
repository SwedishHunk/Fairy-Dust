(() => {
  "use strict";
  function normalizeWith(value) {
    const JOINERS_RX = window.DPT_CONSTANTS?.RX?.JOINERS_RX;
    return String(value || "")
      .replace(/\b(with)\b/gi, "with")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  window.normalizeWith = normalizeWith;
})();
