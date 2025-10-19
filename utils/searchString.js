(() => {
  // === Deklarativ strategi för söksträng ===
  // Vi bygger tokens i prioriterad ordning baserat på kända fält.
  // - Album + Year + (AlbumArtist || Majority Track Artist || First Track Title)
  // - Lägg till "Compilation" om VA / ser ut som samling
  // - Rensa tomma, join med blank
  //
  // Not: vi låter inte normalizers för titlar “försköna” tokens, utan
  //       kör sparsmakat: clean + year-säkring + artist/album pipelines.

  function tokenClean(s) {
    return typeof clean === "function" ? clean(s) : String(s || "").trim();
  }

  function tokAlbum(v) {
    // använd album-pipen för konsekvent case/vol etc. men utan side/part?
    // vill du undvika vissa regler i söksträngen, byt till applyRulesFor("albumTitle", v)
    return typeof cleanAlbumTitle === "function"
      ? cleanAlbumTitle(v)
      : tokenClean(v);
  }
  function tokArtist(v) {
    return typeof cleanAlbumArtist === "function"
      ? cleanAlbumArtist(v)
      : tokenClean(v);
  }
  function tokYear(v) {
    return typeof cleanYear === "function" ? cleanYear(v) : tokenClean(v);
  }
  function tokTitle(v) {
    return typeof cleanTrackTitle === "function"
      ? cleanTrackTitle(v)
      : tokenClean(v);
  }

  // Hjälp: majority artist (återanvänder din logik i modulform)
  function majorityArtistName(tracks) {
    const cnt = Object.create(null);
    let top = "",
      topN = 0;
    for (let i = 0; i < (tracks || []).length; i++) {
      const k = tokArtist(tracks[i]?.artist || "");
      if (!k) continue;
      const n = (cnt[k] || 0) + 1;
      cnt[k] = n;
      if (n > topN) {
        topN = n;
        top = k;
      }
    }
    const ratio = tracks && tracks.length ? topN / tracks.length : 0;
    return { name: top, ratio };
  }

  function dashToEmpty(v) {
    return v === "—" ? "" : v || "";
  }

  // === Deklarativ uppsättning regler ===
  const SEARCH_RULES = {
    compilation: (obj) => {
      const aa = String(obj.albumArtist || "").trim();
      const isVA = /^various artists$/i.test(aa);
      const distinctArtists = new Set(
        (obj.tracks || []).map((t) => tokArtist(t.artist || ""))
      ).size;
      const trackCount = (obj.tracks || []).length;
      const looksLikeCompilation =
        isVA || (trackCount > 4 && distinctArtists > trackCount * 0.5);
      return { isVA, looksLikeCompilation };
    },

    // Prioritering för “tredje token”
    chooseThirdToken: (obj) => {
      const aa = dashToEmpty(String(obj.albumArtist || "").trim());
      const isVA = /^various artists$/i.test(aa);
      if (aa && !isVA) return tokArtist(aa);

      const { name, ratio } = majorityArtistName(obj.tracks || []);
      if (ratio >= 0.5 && name) return name;

      const firstTitle = dashToEmpty(obj.tracks?.[0]?.title || "");
      return firstTitle ? tokTitle(firstTitle) : "";
    },
  };

  // === Byggare: PARSED → söksträng ===
  function buildSearchStringFromParsed(parsed) {
    if (!parsed || !Array.isArray(parsed.tracks) || parsed.tracks.length === 0)
      return "";

    const album = tokAlbum(dashToEmpty(parsed.album || ""));
    const year = tokYear(dashToEmpty(parsed.year || ""));
    const third = SEARCH_RULES.chooseThirdToken(parsed);

    const toks = [album, year, third].filter(Boolean);

    const meta = SEARCH_RULES.compilation(parsed);
    if (meta.looksLikeCompilation) toks.push("Compilation");

    return toks
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  // === Byggare: MM-urval → söksträng ===
  function buildSearchStringFromMM(arr) {
    const list = Array.isArray(arr) ? arr : [];
    if (list.length === 0) return "";

    const onlyIfSame = (getter) => {
      const vals = list.map(getter).map(tokenClean);
      if (!vals.length) return "";
      const first = vals[0] || "";
      const same = vals.every((v) => v === first);
      return same ? first : "";
    };

    const album = tokAlbum(dashToEmpty(onlyIfSame((t) => t.album)));
    const yrRaw = dashToEmpty(onlyIfSame((t) => t.year));
    const year = tokYear(yrRaw);

    const albumArtistRaw = dashToEmpty(
      onlyIfSame((t) => t.albumartist ?? t.albumArtist ?? t.artist)
    );
    const albumArtist = tokArtist(albumArtistRaw);

    // majority artist i urvalet
    const majority = majorityArtistName(
      list.map((t) => ({ artist: t.artist || "" }))
    );
    const isVA = /^various artists$/i.test(albumArtist);

    let third = "";
    if (albumArtist && !isVA) {
      third = albumArtist;
    } else if (majority.ratio >= 0.5 && majority.name) {
      third = majority.name;
    } else {
      third = tokTitle(dashToEmpty(list[0]?.title || ""));
    }

    const toks = [album, year, third].filter(Boolean);
    // Heuristisk VA-koll för urval (optional):
    const distinctArtists = new Set(list.map((t) => tokArtist(t.artist || "")))
      .size;
    if (isVA || (list.length > 4 && distinctArtists > list.length * 0.5)) {
      toks.push("Compilation");
    }

    return toks
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  // Export
  window.buildSearchStringFromParsed = buildSearchStringFromParsed;
  window.buildSearchStringFromMM = buildSearchStringFromMM;
})();
