(() => {
  function smartCapitalize(s) {
    if (!s) return s;
    const EXC = new Set(["feat", "feat.", "vs", "vs."]);
    return s.replace(
      /\b([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ']*)(\.)?\b/g,
      (full, word, dot) => {
        const wLower = word.toLowerCase();
        const withDot = dot ? wLower + "." : wLower;
        if (EXC.has(withDot)) return withDot;
        if (word === word.toUpperCase()) return full; // ABC
        if (/\b(?:[A-Za-z]\.){2,}/.test(full)) return full; // A.B.C.
        if (word[0] === word[0].toLowerCase()) {
          return word[0].toUpperCase() + word.slice(1) + (dot || "");
        }
        return full;
      }
    );
  }
  window.smartCapitalize = smartCapitalize;
})();
