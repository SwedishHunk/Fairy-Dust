(() => {
  test("normalizeFeat: feat-varianter", function () {
    assertEq(normalizeFeat("A ft B"), "A feat. B");
    assertEq(normalizeFeat("A FEATURING  B"), "A feat. B");
  });

  test("normalizeVs: vs-varianter", function () {
    assertEq(normalizeVs("A versus B"), "A vs. B");
    assertEq(normalizeVs("A VS  B"), "A vs. B");
  });

  test("normalizeWith: with-normalisering", function () {
    assertEq(normalizeWith("A WITH  B"), "A with B");
  });
})();

test("normalizeVs: idempotent med redan punkt", function () {
  assertEq(normalizeVs("A vs. B"), "A vs. B");
});
test("normalizeFeat: idempotent med redan punkt", function () {
  assertEq(normalizeFeat("A feat. B"), "A feat. B");
});
