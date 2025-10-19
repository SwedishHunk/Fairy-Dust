(() => {
  function escapeRegExp(s) {
    return (s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  window.escapeRegExp = escapeRegExp;
})();
