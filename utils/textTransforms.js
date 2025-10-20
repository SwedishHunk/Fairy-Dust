(() => {
  "use strict";
  // Aggregator för korta, UI-nära textverktyg och existerande helpers.
  // Målet är att ge ett samlat API utan att bryta befintliga globala funktioner.
  // Innehållet ska vara sid-effektsfritt.

  // ------------------------------------
  // Basala helpers (rena, utan beroenden)
  // ------------------------------------
  function toUpper(s) {
    return String(s ?? "").toUpperCase();
  }
  function toLower(s) {
    return String(s ?? "").toLowerCase();
  }

  // Titlar: luta på befintlig smartCapitalize om den finns, annars enkel fallback
  function toTitleCaseWords(s) {
    if (typeof window.smartCapitalize === "function")
      return window.smartCapitalize(s);
    s = String(s ?? "");
    return s.replace(
      /\w\S*/g,
      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
  }

  // "A, B" -> "A & B" (endast enkel komma som separator, lämna komma inuti parenteser)
  function commaToAmp(s) {
    s = String(s ?? "");
    // Grovt: byt ", " mot " & " när det inte är inne i parenteser
    let depth = 0;
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "(") depth++;
      if (c === ")") depth = Math.max(0, depth - 1);
      if (depth === 0 && c === "," && s[i + 1] === " ") {
        out += " & ";
        i++; // hoppa över mellanslag
      } else {
        out += c;
      }
    }
    return out;
  }

  // Växla "..." ↔ "· · ·" (idempotent i par, mest som verktyg i UI)
  function toggleDots(s) {
    s = String(s ?? "");
    if (/\u00B7/.test(s) || /·/.test(s)) {
      // Punkt-list → trepunkter
      return s.replace(/\s*·\s*·\s*·/g, "...");
    }
    // Trepunkter → punkt-list
    return s.replace(/\.\.\./g, " · · ·");
  }

  // ------------------------------------
  // NYTT: central ellips-normalisering
  // ------------------------------------
  // 1) "…" → "..."
  // 2) ". . ." (med godtyckliga mellanrum) → "..."
  // 3) ta bort mellanslag precis före "..." → "bla ... bla" → "bla... bla"
  function normalizeEllipsisSpacing(s) {
    if (s == null) return s;
    let x = String(s);
    x = x.replace(/\u2026/g, "..."); // unicode ellipsis → trepunkter
    x = x.replace(/\s*\.\s*\.\s*\./g, "..."); // spaced dots → trepunkter
    x = x.replace(/\s+(?=\.{3})/g, ""); // ta bort blanksteg före ...
    return x;
  }

  // ------------------------------------
  // NYTT: Titel-cleaner som används av init.js
  // ------------------------------------
  function cleanTrackTitle(s) {
    if (s == null) return s;
    let x = String(s);

    // Ellips-normalisering först
    x = normalizeEllipsisSpacing(x);

    // (Här kan fler småfix läggas in vid behov – lämnas tomt för att inte ändra beteende)
    return x;
  }

  // Gör tillgänglig globalt för init.js (utan att skriva över om den redan finns)
  if (typeof window.cleanTrackTitle !== "function") {
    window.cleanTrackTitle = cleanTrackTitle;
  }

  // ------------------------------------
  // Publikt API + re-export av globala helpers
  // ------------------------------------
  const api = {
    toUpper,
    toLower,
    toTitleCaseWords,
    commaToAmp,
    toggleDots,
    normalizeEllipsisSpacing,
    cleanTrackTitle,

    // Re-exportera vanliga helpers (om de redan finns globalt)
    clean: typeof window.clean === "function" ? window.clean : undefined,
    smartCapitalize:
      typeof window.smartCapitalize === "function"
        ? window.smartCapitalize
        : undefined,
    wrapGenericRemix:
      typeof window.wrapGenericRemix === "function"
        ? window.wrapGenericRemix
        : undefined,
    dashToEmpty:
      typeof window.dashToEmpty === "function" ? window.dashToEmpty : undefined,
    escapeRegExp:
      typeof window.escapeRegExp === "function"
        ? window.escapeRegExp
        : undefined,
  };

  window.DPT_TextTransforms = api;
})();
