(() => {
  "use strict";

  // --- Minimal testrunner ---
  const results = [];
  window.test = function (name, fn) {
    try {
      fn();
      results.push({ name, ok: true });
      console.log("✅", name);
    } catch (e) {
      results.push({ name, ok: false, err: e });
      console.error("❌", name, e && e.message);
    }
  };
  window.assertEq = function (actual, expected, msg) {
    if (actual !== expected) {
      throw new Error(
        (msg ? msg + " – " : "") +
          "expected: " +
          JSON.stringify(expected) +
          "; got: " +
          JSON.stringify(actual)
      );
    }
  };

  // --- Sammanställning ---
  function runSummary() {
    const pass = results.filter((r) => r.ok).length;
    const fail = results.length - pass;
    return { total: results.length, passed: pass, failed: fail, results };
  }

  // --- Logg-hjälpare ---
  function _pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }
  function _stamp() {
    const d = new Date();
    return (
      d.getFullYear() +
      _pad(d.getMonth() + 1) +
      _pad(d.getDate()) +
      "_" +
      _pad(d.getHours()) +
      _pad(d.getMinutes()) +
      _pad(d.getSeconds())
    );
  }
  function _formatSummary(summary) {
    const d = new Date();
    const lines = [];
    lines.push("Discogs Paste Tagger — Tests");
    lines.push("When: " + d.toISOString());
    lines.push("UserAgent: " + navigator.userAgent);
    lines.push("Total: " + summary.total);
    lines.push("Passed: " + summary.passed);
    lines.push("");
    for (const r of summary.results) {
      lines.push(
        (r.ok ? "PASS " : "FAIL ") +
          r.name +
          (r.ok ? "" : " :: " + ((r.err && r.err.message) || r.err))
      );
    }
    return lines.join("\n");
  }
  function _saveText(filename, text) {
    try {
      if (
        window.app &&
        app.filesystem &&
        typeof app.filesystem.saveTextFile === "function"
      ) {
        app.filesystem.saveTextFile(filename, text);
        try {
          localStorage.setItem("dpt_lastlog", text);
        } catch {}
        return true;
      }
    } catch {}
    try {
      const blob = new Blob([text], { type: "text/plain" });
      const URL_ = window.URL || window.webkitURL;
      const url = URL_.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL_.revokeObjectURL(url);
        a.parentNode && a.parentNode.removeChild(a);
      }, 0);
      try {
        localStorage.setItem("dpt_lastlog", text);
      } catch {}
      return true;
    } catch {}
    try {
      localStorage.setItem("dpt_lastlog", text);
    } catch {}
    return false;
  }
  function _copyText(text) {
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
          document.execCommand("copy");
        } catch {}
        ta.parentNode && ta.parentNode.removeChild(ta);
      }
    } catch {}
  }

  // --- Panel ---
  function showPanel(summary) {
    // remove old
    var old = document.getElementById("dpt-test-panel");
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var wrap = document.createElement("div");
    wrap.id = "dpt-test-panel";
    wrap.style.cssText =
      "position:fixed;inset:auto 12px 12px auto;z-index:999999;width:min(50vw,640px);max-height:70vh;overflow:auto;background:#0f1117;color:#eee;border:1px solid #333;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.5);font:12px/1.4 system-ui;";

    var header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #222;background:#151822;position:sticky;top:0;z-index:1;";
    header.innerHTML =
      "<b>Tests</b><span>" +
      summary.passed +
      "/" +
      summary.total +
      " passed</span>";

    var body = document.createElement("div");
    body.id = "dpt-test-body";
    body.style.cssText = "padding:8px 10px;";

    // rows
    for (var i = 0; i < summary.results.length; i++) {
      var r = summary.results[i];
      var row = document.createElement("div");
      row.className = "dpt-test-row";
      row.dataset.ok = r.ok ? "1" : "0"; // <-- för filter
      row.style.cssText = "padding:4px 0;border-bottom:1px dashed #222;";
      row.innerHTML = r.ok
        ? "✅ " + r.name
        : "❌ " +
          r.name +
          '<div style="color:#ffb4b4;margin-left:18px;">' +
          r.error +
          "</div>";
      body.appendChild(row);
    }

    // tools: filter + actions
    var tools = document.createElement("div");
    tools.style.cssText =
      "display:flex;gap:6px;align-items:center;justify-content:space-between;padding:8px 10px;border-top:1px solid #222;background:#151822;position:sticky;bottom:0;z-index:1;";

    // left: filter buttons
    var filterBox = document.createElement("div");
    filterBox.style.cssText = "display:flex;gap:6px;align-items:center;";

    function mkBtn(txt) {
      var b = document.createElement("button");
      b.textContent = txt;
      b.style.cssText =
        "background:#2b2f3a;border:1px solid #3a3f4e;color:#eee;border-radius:6px;padding:4px 8px;cursor:pointer;";
      return b;
    }

    var btnAll = mkBtn("Alla");
    var btnFail = mkBtn("Endast FAIL");
    var btnPass = mkBtn("Endast PASS");

    function setFilter(mode) {
      // mode: "all" | "fail" | "pass"
      var rows = body.querySelectorAll(".dpt-test-row");
      rows.forEach(function (row) {
        var ok = row.dataset.ok === "1";
        var show =
          mode === "all" ? true : mode === "fail" ? !ok : /* pass */ ok;
        row.style.display = show ? "" : "none";
      });
      // toggla disabled för visuell state
      btnAll.disabled = mode === "all";
      btnFail.disabled = mode === "fail";
      btnPass.disabled = mode === "pass";
      btnAll.style.opacity = btnAll.disabled ? "0.6" : "1";
      btnFail.style.opacity = btnFail.disabled ? "0.6" : "1";
      btnPass.style.opacity = btnPass.disabled ? "0.6" : "1";
    }

    btnAll.onclick = function () {
      setFilter("all");
    };
    btnFail.onclick = function () {
      setFilter("fail");
    };
    btnPass.onclick = function () {
      setFilter("pass");
    };

    filterBox.appendChild(btnAll);
    filterBox.appendChild(btnFail);
    filterBox.appendChild(btnPass);

    // right: copy/save/close
    var actionBox = document.createElement("div");
    actionBox.style.cssText = "display:flex;gap:6px;align-items:center;";

    var btnCopy = mkBtn("Copy log");
    btnCopy.onclick = function () {
      _copyText(_formatSummary(summary));
    };

    var btnSave = mkBtn("Save log");
    btnSave.onclick = function () {
      _saveText("dpt_tests_" + _stamp() + ".txt", _formatSummary(summary));
    };

    var btnClose = mkBtn("Close");
    btnClose.onclick = function () {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    };

    actionBox.appendChild(btnCopy);
    actionBox.appendChild(btnSave);
    actionBox.appendChild(btnClose);

    tools.appendChild(filterBox);
    tools.appendChild(actionBox);

    wrap.appendChild(header);
    wrap.appendChild(body);
    wrap.appendChild(tools);
    document.body.appendChild(wrap);

    // default: visa alla
    setFilter("all");
  }

  // publik trigger
  window.__dptTest = function () {
    const summary = runSummary();
    showPanel(summary);
    try {
      console.log("[DPT tests]", summary);
    } catch {}
    return summary;
  };

  // Auto-run (samma semantics som tidigare)
  try {
    const flag = localStorage.getItem("dpt_tests");
    if (flag === "1" || flag === "log") {
      setTimeout(() => {
        const summary = window.__dptTest();
        if (flag === "log") {
          _saveText("dpt_tests_" + _stamp() + ".txt", _formatSummary(summary));
        }
      }, 200);
    }
  } catch {}
})();
