(() => {
  "use strict";

  // --- Robust Year/Date-tolkning (Dec 14, 2023 | Dec 2009 | 2013) ---
  function parseYearDate(text) {
    const s = String(text || "").trim();
    if (!s) return { year: "", iso: "" };

    // YYYY
    let m = s.match(/\b(\d{4})\b/);
    let yyyy = m ? m[1] : "";

    // MonthName DD, YYYY
    m = s.match(/\b([A-Za-z]{3,})\s+(\d{1,2}),\s*(\d{4})\b/);
    if (m) {
      const MMM = m[1].toLowerCase();
      const DD = m[2].padStart(2, "0");
      const Y = m[3];
      const MMAP = {
        jan: "01",
        feb: "02",
        mar: "03",
        apr: "04",
        may: "05",
        jun: "06",
        jul: "07",
        aug: "08",
        sep: "09",
        oct: "10",
        nov: "11",
        dec: "12",
      };
      const mm = MMAP[MMM.slice(0, 3)] || "01";
      return { year: Y, iso: `${Y}-${mm}-${DD}` };
    }

    // MonthName YYYY
    m = s.match(/\b([A-Za-z]{3,})\s+(\d{4})\b/);
    if (m) {
      const MMM = m[1].toLowerCase();
      const Y = m[2];
      const MMAP = {
        jan: "01",
        feb: "02",
        mar: "03",
        apr: "04",
        may: "05",
        jun: "06",
        jul: "07",
        aug: "08",
        sep: "09",
        oct: "10",
        nov: "11",
        dec: "12",
      };
      const mm = MMAP[MMM.slice(0, 3)] || "01";
      return { year: Y, iso: `${Y}-${mm}-01` };
    }

    if (yyyy) return { year: yyyy, iso: `${yyyy}-01-01` };

    return { year: "", iso: "" };
  }

  // --- Skriv till MM via uitools om möjligt, returnera {Y, ISO} för fallback ---
  function writeYearDateToMM(metaApply, parsed) {
    // Läs GIW-rutan om den finns, annars parsed.year
    const el = document.getElementById("dpt-in-year");
    const raw = el && el.value ? el.value : parsed?.year ?? "";
    const { year, iso } = parseYearDate(raw);

    if (metaApply?.year) {
      try {
        if (year && window.DPT_MM?.uitools?.setField) {
          window.DPT_MM.uitools.setField("Year", year);
        }
        if (iso && window.DPT_MM?.uitools?.setField) {
          window.DPT_MM.uitools.setField("Date", iso);
        }
      } catch {
        /* ignore */
      }
    }
    return { Y: year, ISO: iso };
  }

  // --- Skriv alias per spår-objekt (fallback när uitools inte sätter allt) ---
  function writeYearDateAliasesToTrack(trackObj, Y, ISO) {
    if (!trackObj || (!Y && !ISO)) return;
    if (Y) {
      if ("year" in trackObj) trackObj.year = Y;
      if ("Year" in trackObj) trackObj.Year = Y;
      if ("OriginalYear" in trackObj) trackObj.OriginalYear = Y;
    }
    if (ISO) {
      if ("date" in trackObj) trackObj.date = ISO;
      if ("Date" in trackObj) trackObj.Date = ISO;
      if ("OriginalDate" in trackObj) trackObj.OriginalDate = ISO;
    }
  }

  // --- Fältbeskrivningar (enkelt att utöka) ---
  // id ↔ GIW input-id (dpt-in-<id>), parsedKey ↔ nyckel i parsed-objektet
  const FIELD_DESCS = [
    {
      id: "album",
      parsedKey: "album",
      writers: [
        (t, v) => {
          if ("album" in t) t.album = v;
        },
      ],
    },

    {
      id: "albumartist",
      parsedKey: "albumArtist",
      writers: [
        (t, v) => {
          if ("albumartist" in t) t.albumartist = v;
          if ("albumArtist" in t) t.albumArtist = v;
        },
      ],
    },

    {
      id: "genre",
      parsedKey: "genre",
      writers: [
        (t, v) => {
          if ("genre" in t) t.genre = v;
        },
      ],
    },

    {
      id: "label",
      parsedKey: "label",
      writers: [
        (t, v) => {
          if ("publisher" in t) t.publisher = v;
          if ("label" in t) t.label = v;
        },
      ],
    },

    {
      id: "labelNumber",
      parsedKey: "labelNumber",
      writers: [
        (t, v) => {
          if ("custom1" in t) t.custom1 = v;
          if ("catalogNo" in t) t.catalogNo = v;
        },
      ],
    },
  ];

  // Hämta “Skriv över”-kartan från GIW
  function getApplyMapFromGIW() {
    const map = {};
    document.querySelectorAll(".dpt-meta-apply").forEach((chk) => {
      map[chk.getAttribute("data-field")] = !!chk.checked;
    });
    return map;
  }

  // Läs GIW-inputar → meta-värden (fall back till parsed)
  function readMetaValuesFromGIW(parsed) {
    const out = {};
    for (const f of FIELD_DESCS) {
      const el = document.getElementById(`dpt-in-${f.id}`);
      const v =
        el && el.value != null
          ? String(el.value).trim()
          : parsed?.[f.parsedKey] ?? "";
      out[f.id] = v;
    }
    // Year hanteras separat av writeYearDateToMM
    return out;
  }

  // Applicera GIW-fält på alla spår
  function applyMetaToSelection(metaApply, metaValues, parsed, arrTracks) {
    // 1) Year/Date (gemensam, robust)
    const { Y: APPLY_YEAR, ISO: APPLY_DATE } = writeYearDateToMM(
      metaApply,
      parsed
    );

    // 2) Övriga fält via tabellen
    const n = arrTracks.length;
    for (let i = 0; i < n; i++) {
      const t = arrTracks[i];

      // Year/Date fallback per spår
      if (metaApply.year)
        writeYearDateAliasesToTrack(t, APPLY_YEAR, APPLY_DATE);

      for (const f of FIELD_DESCS) {
        if (!metaApply[f.id]) continue;
        const val = metaValues[f.id] ?? parsed?.[f.parsedKey] ?? "";
        for (const w of f.writers) w(t, val);
      }
    }
  }

  window.DPT_FIELDS = {
    parseYearDate,
    writeYearDateToMM,
    writeYearDateAliasesToTrack,
    getApplyMapFromGIW,
    readMetaValuesFromGIW,
    applyMetaToSelection,
  };
})();
