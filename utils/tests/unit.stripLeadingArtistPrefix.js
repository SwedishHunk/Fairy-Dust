(() => {
  test("stripLeadingArtistPrefix: basic", function () {
    assertEq(stripLeadingArtistPrefix("Artist – Title", "Artist"), "Title");
    assertEq(stripLeadingArtistPrefix("Artist — Title", "Artist"), "Title");
    assertEq(stripLeadingArtistPrefix("Artist - Title", "Artist"), "Title");
  });

  test("stripLeadingArtistPrefix: case/spacing", function () {
    assertEq(
      stripLeadingArtistPrefix("  ARTIST  –  Title  ", "artist"),
      "Title"
    );
  });

  test("stripLeadingArtistPrefix: no-op if different artist", function () {
    assertEq(
      stripLeadingArtistPrefix("Other – Title", "Artist"),
      "Other – Title"
    );
  });
})();
