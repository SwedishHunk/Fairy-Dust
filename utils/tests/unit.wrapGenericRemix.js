(() => {
  test("wrapGenericRemix: auto-parentes för generisk Remix/Mix", function () {
    assertEq(wrapGenericRemix("Title Remix"), "Title (Remix)");
    assertEq(wrapGenericRemix("Title Mix"), "Title (Mix)");
  });
  test("wrapGenericRemix: idempotent och respekterar redan korrekt parens", function () {
    assertEq(wrapGenericRemix("Title (Remix)"), "Title (Remix)");
    assertEq(wrapGenericRemix("Title ( Mix )"), "Title (Mix)");
  });
  test("wrapGenericRemix: lämna namn rmx inne i parens", function () {
    assertEq(
      wrapGenericRemix("Title (RemixArtist rmx)"),
      "Title (RemixArtist rmx)"
    );
  });
})();
