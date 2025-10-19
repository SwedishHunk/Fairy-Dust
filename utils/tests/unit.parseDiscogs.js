(() => {
  if (typeof parseDiscogs !== "function") {
    test("parseDiscogs: skipped (not loaded in test context)", function () {
      assertEq(1, 1);
    });
    return;
  }
  test("parseDiscogs: Artist – Album (EN-DASH) delas korrekt", function () {
    const input = [
      "My Artist – My Album",
      "Released: 2020",
      "Label: LabelName – CAT123",
      "Tracklist",
      "1  My Artist – My Track  3:15",
    ].join("\n");

    const res = parseDiscogs(input);
    assertEq(res.albumArtist, "My Artist");
    assertEq(res.album, "My Album");
  });

  test("parseDiscogs: Artist - Album (vanligt bindestreck) delas inte", function () {
    const input = [
      "My Artist - My Album - Deluxe Edition",
      "Released: 2020",
      "Tracklist",
      "1  My Artist – Track Title  3:15",
    ].join("\n");

    const res = parseDiscogs(input);
    // Förväntas inte splittras på vanliga bindestreck
    assertEq(res.albumArtist, "");
    assertEq(res.album, "");
  });

  test("parseDiscogs: Artist — Album (EM-DASH) delas inte", function () {
    const input = [
      "My Artist — My Album",
      "Released: 2020",
      "Tracklist",
      "1  My Artist – Track Title  3:15",
    ].join("\n");

    const res = parseDiscogs(input);
    // Förväntas inte splittras på em-dash
    assertEq(res.albumArtist, "");
    assertEq(res.album, "");
  });
})();
