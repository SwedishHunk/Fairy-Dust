(() => {
  function normalizePartInTitle(s) {
    if (!s) return s;
    let x = clean(s);

    // Finns redan (Part X) → låt vara
    if (/\(Part\s+(?:\d+|[A-Z])\)/i.test(x)) return x;

    // Slutet av strängen: ", pt 2" eller "pt 2" → " (Part 2)"
    x = x.replace(
      /(?:\s*,)?\s*(?:part|pt\.?)\s*(\d+|[a-d])\s*$/i,
      (_, g) => ` (Part ${/^\d+$/.test(g) ? g : g.toUpperCase()})`
    );

    // Före parentes: "pt 2 (Muse Mix)" → "(Part 2) (Muse Mix)"
    x = x.replace(
      /(?:\s*,)?\s*(?:part|pt\.?)\s*(\d+|[a-d])\s*(?=\()/i,
      (_, g) => ` (Part ${/^\d+$/.test(g) ? g : g.toUpperCase()}) `
    );

    // Nytt: " ... pt 2 Vol. 3" (inte i slutet) → gör om pt till (Part)
    x = x.replace(
      /\b(?:part|pt\.?)\s*(\d+|[a-d])\b(?![^()]*\))/i,
      (_, g) => ` (Part ${/^\d+$/.test(g) ? g : g.toUpperCase()})`
    );

    return x.trim();
  }
  window.normalizePartInTitle = normalizePartInTitle;
})();
