(() => {
  // Gör "—" tomt (för fält som inte är gemensamma)
  function dashToEmpty(v) {
    return v === "—" ? "" : v;
  }
  window.dashToEmpty = dashToEmpty;
})();
