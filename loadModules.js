(() => {
  ("use strict");

  // Ladda alla utils i rätt ordning
  localRequirejs("utils/mm");
  localRequirejs("utils/clean");
  localRequirejs("utils/constants");
  localRequirejs("utils/textTransforms");

  // Normalizers
  localRequirejs("utils/cleanArtistName");
  localRequirejs("utils/normalizeCatNo");
  localRequirejs("utils/normalizeInlinePt");
  localRequirejs("utils/normalizeFeat");
  localRequirejs("utils/normalizePartInAlbum");
  localRequirejs("utils/normalizePartInTitle");
  localRequirejs("utils/normalizeRemix");
  localRequirejs("utils/normalizeSideInAlbum");
  localRequirejs("utils/normalizeVol");
  localRequirejs("utils/normalizeVs");
  localRequirejs("utils/normalizeWith");
  localRequirejs("utils/normalizeTitleOrAlbum");
  localRequirejs("utils/smartCapitalize");
  localRequirejs("utils/stripArtistSuffix");

  // Småhjälpare
  localRequirejs("utils/dashToEmpty");
  localRequirejs("utils/escapeRegExp");
  localRequirejs("utils/sanitizeYear");
  localRequirejs("utils/stripLeadingArtistPrefix");
  localRequirejs("utils/wrapGenericRemix");
  localRequirejs("utils/expandRemixParen");

  // Fältregler
  localRequirejs("utils/fieldRules");

  // Test
  // --- TESTS ---
  localRequirejs("utils/tests/_runner"); // måste först
  localRequirejs("utils/tests/testAggregator"); // sedan laddas unit-testerna
})();
