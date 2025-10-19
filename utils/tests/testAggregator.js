(() => {
  "use strict";
  // Kör alltid tester (du sa att du vill köra dem hela tiden)
  // Om du vill kunna stänga av: lägg en flagga här och tidigt return.

  // Lista alla unit-tester här:
  localRequirejs("utils/tests/unit.normalizeRemix");
  localRequirejs("utils/tests/unit.wrapGenericRemix");
  localRequirejs("utils/tests/unit.expandRemixParen");
  localRequirejs("utils/tests/unit.textTransforms");
  localRequirejs("utils/tests/unit.constants");
  localRequirejs("utils/tests/unit.normalizeJoiners");
  localRequirejs("utils/tests/unit.stripLeadingArtistPrefix");
  localRequirejs("utils/tests/unit.parseDiscogs");
  localRequirejs("utils/tests/unit.wrapGenericRemix.parens");
})();
