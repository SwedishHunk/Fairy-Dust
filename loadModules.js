(() => {
  "use strict";

  function loadAllModules() {
    localRequirejs("utils/packs/00-core.pack");
    localRequirejs("utils/packs/10-helpers.pack");
    localRequirejs("utils/packs/20-normalizers.pack");
    localRequirejs("utils/packs/30-fields.pack");
    localRequirejs("utils/packs/90-tests.pack");
  }

  // Kör direkt vid laddning
  loadAllModules();

  // Gör den åtkomlig globalt om vi vill kalla den igen senare
  window.loadAllModules = loadAllModules;
})();
