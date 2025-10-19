(() => {
  test("DPT_TextTransforms: bas-funktioner", function () {
    assertEq(typeof DPT_TextTransforms, "object");
    assertEq(DPT_TextTransforms.toUpper("abc"), "ABC");
    assertEq(DPT_TextTransforms.toLower("ABC"), "abc");
    assertEq(
      DPT_TextTransforms.commaToAmp("A, B (Remix), C"),
      "A & B (Remix) & C"
    );
  });
})();
