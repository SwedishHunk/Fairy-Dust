(() => {
  "use strict";

  // Sätt värde på alla alias som RÅKAR finnas på track-objektet
  function setIfHas(obj, key, value) {
    if (obj && key in obj) obj[key] = value;
  }
  function setAliases(track, value, aliases) {
    if (value == null || !track) return;
    for (const k of aliases) setIfHas(track, k, value);
  }

  // Är “Skriv över” ibockad för ett visst GIW-fält?
  function metaWants(metaApply, key) {
    return !!(metaApply && metaApply[key]);
  }

  // Tolka fri år/datum-text → { Y:'YYYY', ISO:'YYYY-MM-DD' }
  function parseYearDateLoose(s) {
    const txt = String(s || "").trim();
    if (!txt) return { Y: "", ISO: "" };

    // YYYY
    const mY = txt.match(/\b(\d{4})\b/);
    const yyyy = mY ? mY[1] : "";

    // MonthName DD, YYYY
    let m = txt.match(/\b([A-Za-z]{3,})\s+(\d{1,2}),\s*(\d{4})\b/);
    if (m) {
      const MAP = {
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
      const mm = MAP[m[1].toLowerCase().slice(0, 3)] || "01";
      const dd = String(m[2]).padStart(2, "0");
      const Y = m[3];
      return { Y, ISO: `${Y}-${mm}-${dd}` };
    }

    // MonthName YYYY
    m = txt.match(/\b([A-Za-z]{3,})\s+(\d{4})\b/);
    if (m) {
      const MAP = {
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
      const mm = MAP[m[1].toLowerCase().slice(0, 3)] || "01";
      const Y = m[2];
      return { Y, ISO: `${Y}-${mm}-01` };
    }

    if (yyyy) return { Y: yyyy, ISO: `${yyyy}-01-01` };
    return { Y: "", ISO: "" };
  }

  // Hämta GIW-år (om ifyllt) annars parsed.year och tolka.
  function resolveApplyYearDate(parsed) {
    const giw = document.getElementById("dpt-in-year")?.value || "";
    const src = giw.trim() || String(parsed?.year || "").trim();
    return parseYearDateLoose(src);
  }

  // Skriv ett GIW-metafält (om ibockat) till spårobjektets alias
  function applyMetaField(metaApply, fieldKey, parsedValue, track, aliases) {
    if (!metaWants(metaApply, fieldKey)) return;
    const val = parsedValue ?? "";
    setAliases(track, val, aliases);
  }

  // Engångsskrivning av YEAR/DATE via MM UI (hela selection)
  function writeYearDateToMM(metaApply, parsed) {
    if (!metaWants(metaApply, "year")) return { Y: "", ISO: "" };
    const { Y, ISO } = resolveApplyYearDate(parsed);
    try {
      if (Y && window.DPT_MM?.uitools?.setField)
        window.DPT_MM.uitools.setField("Year", Y);
      if (ISO && window.DPT_MM?.uitools?.setField)
        window.DPT_MM.uitools.setField("Date", ISO);
    } catch {}
    return { Y, ISO };
  }

  // Skriv YEAR/DATE till spårobjektets alias
  function writeYearDateAliasesToTrack(track, Y, ISO) {
    if (Y) setAliases(track, Y, ["year", "Year", "OriginalYear"]);
    if (ISO) setAliases(track, ISO, ["date", "Date", "OriginalDate"]);
  }

  window.DPT_FIELDS = {
    setIfHas,
    setAliases,
    metaWants,
    parseYearDateLoose,
    resolveApplyYearDate,
    applyMetaField,
    writeYearDateToMM,
    writeYearDateAliasesToTrack,
  };
})();
