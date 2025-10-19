(() => {
  test("wrapGenericRemix: rör inte Remix inne i parentes med annat innehåll", function () {
    assertEq(
      wrapGenericRemix("Fresh (Cosmic Tone Remix - 2007 Edit)"),
      "Fresh (Cosmic Tone Remix - 2007 Edit)"
    );
  });
})();
