(() => {
  test("expandRemixParenLeft: single step", function () {
    assertEq(
      expandRemixParenLeft("Title RemixArtist (Remix)", 1),
      "Title (RemixArtist Remix)"
    );
    assertEq(expandRemixParenLeft("X Y (Remix)", 1), "X (Y Remix)");
    assertEq(expandRemixParenLeft("A vs. B (Remix)", 1), "A vs. (B Remix)");
  });

  test("expandRemixParenLeft: multi step", function () {
    assertEq(expandRemixParenLeft("X Y (Remix)", 2), "(X Y Remix)");
    assertEq(
      expandRemixParenLeft("Phanatic vs. Electro Sun (Remix)", 4),
      "(Phanatic vs. Electro Sun Remix)"
    );
  });

  test("expandRemixParenLeft: no-op if no (Remix)", function () {
    assertEq(expandRemixParenLeft("Title Remix"), "Title Remix");
  });

  test("expandRemixParenLeft: hoppar över joiners", function () {
    assertEq(
      expandRemixParenLeft("Phanatic vs. Electro Sun (Remix)", 3),
      "(Phanatic vs. Electro Sun Remix)"
    );
    assertEq(
      expandRemixParenLeft("Artist feat. Guest (Remix)", 2),
      "(Artist feat. Guest Remix)"
    );
  });

  test("expandRemixParenLeft: upprepade klick", function () {
    let v = "X Y (Remix)";
    v = expandRemixParenLeft(v, 1); // "X (Y Remix)"
    v = expandRemixParenLeft(v, 1); // "(X Y Remix)"
    assertEq(v, "(X Y Remix)");
  });
})();
