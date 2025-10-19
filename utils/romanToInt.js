(() => {
  function romanToInt(str) {
    if (!str) return null;
    var s = String(str).trim().toUpperCase();
    if (!/^[IVXLCDM]+$/.test(s)) return null;
    var map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    var total = 0,
      prev = 0;
    for (var i = s.length - 1; i >= 0; i--) {
      var v = map[s[i]];
      if (!v) return null;
      if (v < prev) total -= v;
      else total += v;
      prev = v;
    }
    return total;
  }
  window.romanToInt = romanToInt;
})();
