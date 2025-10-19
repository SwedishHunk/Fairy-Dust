(() => {
  "use strict";

  function expandRemixParenLeft(value, steps = 1) {
    const JOINERS = window.DPT_CONSTANTS?.JOINERS || [];
    let x = String(value || "");
    if (!/\b(Remix|Mix)\b/i.test(x)) return x;

    const stepTarget = Math.max(1, steps | 0);

    // Case A: finns "(Remix|Mix)"-token → flytta in ord innan den
    if (/\(\s*(?:Remix|Mix)\s*\)/i.test(x)) {
      const words = x.split(/\s+/);
      const remixIdx = words.findIndex((w) =>
        /\(\s*(?:Remix|Mix)\s*\)/i.test(w)
      );
      if (remixIdx === -1) return x;

      const before = words.slice(0, remixIdx);
      const after = words.slice(remixIdx); // börjar med "(Remix)"

      let moved = 0,
        i = before.length - 1;
      while (i >= 0 && moved < stepTarget) {
        const plain = before[i].replace(/[()]/g, "").toLowerCase();
        if (JOINERS.includes(plain)) {
          i--;
          continue;
        }
        moved++;
        i--;
      }
      const cut = Math.max(0, i + 1);
      const left = before.slice(0, cut).join(" ");
      const grab = before.slice(cut).join(" ");
      const right = after.join(" ").replace(/^\(\s*(Remix|Mix)\s*\)/i, "$1");

      return `${left}${left ? " " : ""}(${grab} ${right})`
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    // Case B: finns redan "( ... Remix|Mix )" → utöka parentesen bakåt
    const m = x.match(/\(([^)]*?)\s*(Remix|Mix)\s*\)\s*$/i);
    if (m) {
      const leftPart = x.slice(0, m.index).trimEnd();
      const innerBase = m[1];
      const tailWord = m[2]; // Remix|Mix

      const leftWords = leftPart.split(/\s+/);
      let moved = 0,
        i = leftWords.length - 1;
      while (i >= 0 && moved < stepTarget) {
        const plain = leftWords[i].replace(/[()]/g, "").toLowerCase();
        if (JOINERS.includes(plain)) {
          i--;
          continue;
        }
        moved++;
        i--;
      }
      const cut = Math.max(0, i + 1);
      const newLeft = leftWords.slice(0, cut).join(" ");
      const toMove = leftWords.slice(cut).join(" ");
      const newInner =
        (toMove ? toMove + " " : "") +
        (innerBase ? innerBase + " " : "") +
        tailWord;

      return `${newLeft}${newLeft ? " " : ""}(${newInner})`
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    return x;
  }

  window.expandRemixParenLeft = expandRemixParenLeft;
})();
