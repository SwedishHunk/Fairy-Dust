(function () {
  "use strict";

  // Ladda modulerna FÖRST – detta definierar window.DPT_MM
  localRequirejs("loadModules");

  // Nu kan vi destrukturera tryggt
  const { sleep, toArray, waitForUitools, getSelectedArray } = window.DPT_MM;

  // ====== Parser för Discogs-klipp ======
  function parseDiscogs(raw) {
    // 1) normalisera
    let text = (raw || "").replace(/\r\n/g, "\n");
    // tider på egen rad -> klistra på föregående
    text = text.replace(/\n\s*(\d{1,2}:\d{2})\s*$/gm, " $1");

    // 2) plocka “huvudet”
    // Första raden liknar: "Artist — Album"
    // Dela på SISTA "space–dash–space" så bindestreck i artistnamn inte stör.
    const firstLine = clean(text.split("\n")[0] || "");
    let albumArtist = "",
      album = firstLine;
    const parts = firstLine.split(window.DPT_CONSTANTS.RX2.artistAlbumSep);
    if (parts.length >= 2) {
      album = parts.pop();
      albumArtist = stripArtistSuffix(parts.join(" – "));
    } else {
      albumArtist = "";
    }

    // Released / Year
    const relMatch = text.match(/^\s*Released:\s*([^\n]+)$/im);
    let year = "";
    if (relMatch) {
      const y = relMatch[1].match(/(\d{4})/);
      if (y) year = y[1];
    }

    // Genre / Style → föredra Style om den ser rimlig ut, annars Genre
    const styleLine = text.match(/^\s*Style:\s*([^\n]*)$/im); // * tillåter tom style
    const genreLine = text.match(/^\s*Genre:\s*([^\n]+)$/im);

    const fromCsv = (s) =>
      (s || "")
        .split(",")
        .map((x) => clean(x))
        .filter(Boolean)
        .join("; ");

    let genre = "";
    if (styleLine) {
      const s = clean(styleLine[1]);
      // Ignorera tracklist-rubriker etc.
      const looksLikeTrackHeader =
        /^Act\s*\d+/i.test(s) || /^(Tracklist|Bonus)\b/i.test(s);
      if (s && !looksLikeTrackHeader) {
        genre = fromCsv(s);
      }
    }
    if (!genre && genreLine) {
      genre = fromCsv(genreLine[1]);
    }

    // Label + Catalog Numbers (cat#)
    const labelLine = text.match(/^\s*Label:\s*([^\n]+)$/im);
    let label = "";
    let labelNumbers = []; // alla cat#
    let labelNumber = ""; // vad som ska visas i GIW

    if (labelLine) {
      const seenLabels = new Map(); // case-insensitiv dedupe av labelnamn
      const catnos = new Set(); // unika cat# i insamlingsordning

      labelLine[1].split(",").forEach((raw) => {
        let part = (raw || "").trim();
        if (!part) return;

        // Dela "Label — CatNo" på långt streck (–/—), aldrig på "-"
        const mDash = part.match(/^(.*?)\s*[–—]\s*(.+)$/);
        let left = part,
          right = "";
        if (mDash) {
          left = mDash[1].trim();
          right = mDash[2].trim();
        }

        // Rensa parentes-suffix i labeln (t.ex. "(2)", "(US)")
        left = left.replace(/\s*\([^)]*\)\s*$/, "").trim();
        if (left) {
          const key = left.toLowerCase();
          if (!seenLabels.has(key)) seenLabels.set(key, left);
        }

        // Cat#: kan vara flera i samma segment, separerade med "/" eller ";"
        if (right) {
          right.split(/[\/;]\s*/).forEach((c) => {
            const rawCn = (c || "").trim();
            if (!rawCn) return;
            // Normalisera försiktigt, utan krav på att hjälpfunktion finns
            const cn =
              typeof normalizeCatNo === "function"
                ? normalizeCatNo(rawCn)
                : rawCn.replace(/\s+/g, " ").trim();
            if (cn) catnos.add(cn);
          });
        }
      });

      label = Array.from(seenLabels.values()).join("; ");
      labelNumbers = Array.from(catnos);

      // Välj hur GIW-fältet "Katalognummer" ska fyllas:
      // 1) Visa ALLA cat# (enkelt att radera ner till ett):
      labelNumber = labelNumbers.join("; ");

      // 2) **Om du hellre vill visa bara första**:
      // labelNumber = labelNumbers[0] || "";
    }

    // Compilation? → albumartist = Various Artists
    const formatLine = text.match(/^\s*Format:\s*([^\n]+)$/im);
    if (formatLine && /Compilation/i.test(formatLine[1])) {
      albumArtist = "Various Artists";
    } else {
      albumArtist = cleanArtistName(albumArtist);
    }

    album = cleanAlbumTitle(album);

    // 3) klipp ut själva tracklist (börjar vid rad som börjar med “1  ”)
    const startIdx = text.search(/^\s*1\s/m);
    const trackBlock = startIdx >= 0 ? text.slice(startIdx) : "";
    const lines = trackBlock
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const tracks = [];
    for (let i = 0; i < lines.length; i++) {
      const ln = clean(lines[i]);

      // 1) "nr  Artist — Title  [tid]"
      let m = ln.match(
        new RegExp(
          "^\\s*(\\d+)\\s+(.+?)\\s*" +
            (window.DPT_CONSTANTS?.DASH_CLASS || DASH_CLASS) +
            "\\s+(.+?)(?:\\s+\\d{1,2}:\\d{2})?$"
        )
      );

      if (m) {
        let artist = cleanArtistName(m[2]);
        // Normalisera endast överflödiga punkter
        artist = artist.replace(/\bvs\.{2,}\b/gi, "vs.");
        const title = cleanTrackTitle(m[3]);
        const safeTitle = stripLeadingArtistPrefix(title, artist);
        tracks.push({ artist, title: safeTitle });
        continue;
      }

      // 2) "nr  Title  [tid]"  (ingen artist på raden → använd albumArtist)
      m = ln.match(/^\s*(\d+)\s+(.+?)(?:\s+\d{1,2}:\d{2})?$/);
      if (m) {
        const title = stripLeadingArtistPrefix(
          cleanTrackTitle(m[2]),
          albumArtist
        );

        let artistFromAlbum = cleanArtistName(albumArtist);
        artistFromAlbum = artistFromAlbum.replace(/\bvs\.{2,}\b/gi, "vs.");

        tracks.push({ artist: artistFromAlbum, title });
        continue;
      }
    } // ←← STÄNGER for-loopen

    return {
      albumArtist: cleanArtistName(albumArtist),
      album: album,
      year: sanitizeYear(year),
      genre: clean(genre),
      label: clean(label),
      labelNumber: clean(labelNumber), // valt cat#
      labelNumbers: labelNumbers.map(clean), // ← NYTT: alla cat#
      tracks,
    };
  }

  window.parseDiscogs = parseDiscogs;

  // --- MM5 guard: blockera sidoknappar (Back/Forward) om actions.history saknas ---
  (function () {
    const guard = (e) => {
      // 3 = Browser Back, 4 = Browser Forward (kan variera mellan system)
      if (
        (e.button === 3 || e.button === 4) &&
        !(
          window.actions &&
          window.actions.history &&
          typeof window.actions.history.back?.execute === "function" &&
          typeof window.actions.history.forward?.execute === "function"
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    // Fånga tidigt
    document.addEventListener("mousedown", guard, true);
    document.addEventListener("auxclick", guard, true);
  })();

  // ====== UI (overlay) ======
  function ensureUI() {
    function setPWTitle(txt) {
      const t = document.getElementById("dpt-pw-title");
      if (t) t.textContent = txt || "";
    }

    // lägg högst upp i ensureUI (innan du använder den)

    if (document.getElementById("dpt-overlay")) return;

    document.addEventListener("click", (ev) => {
      const b = ev.target?.closest("#dpt-qcopy");
      if (!b) return;
      const v = document.getElementById("dpt-qinput")?.value || "";
      if (!v) return;
      navigator.clipboard?.writeText(v).then(
        () => setStatus("Kopierade söksträngen."),
        () => {}
      );
    });

    const css = `

#dpt-overlay{position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;}
#dpt-panel{width:min(1650px,95vw);height:min(90vh,900px);background:#1e1f24;color:#eee;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden;font:14px/1.4 system-ui,Segoe UI,Roboto,Arial;}
#dpt-head{display:flex;gap:12px;align-items:center;justify-content:flex-start;padding:12px 14px;border-bottom:1px solid #2c2d33;background:#25262c}
#dpt-head h2{margin:0;font-size:16px}
#dpt-head>div{margin-left:auto}
/* Head: centrerad, begränsad söksträng */
.dpt-qwrap{
  margin:0 auto;
  display:grid;
  grid-template-columns:auto 1fr auto;
  gap:8px; align-items:center;
  max-width:640px; width:100%;
}
.dpt-qlabel{ font-size:12px; opacity:.8; }
.dpt-qinput{
  width:100%; height:28px; padding:4px 8px;
  background:#121317; border:1px solid #333; border-radius:8px; color:#e7e7e7;
}

#dpt-body{display:grid;grid-template-columns:5fr 7fr;gap:12px;padding:12px;flex:1;min-height:0;}
#dpt-left{display:flex;flex-direction:column;gap:8px;min-height:0;overflow:auto}
#dpt-right{display:flex;flex-direction:column;gap:8px;min-height:0;overflow:auto}
#dpt-ta{flex:1;resize:none;background:#121317;color:#e7e7e7;border:1px solid #333;border-radius:8px;padding:10px}
#dpt-meta{background:#121317;border:1px solid #333;border-radius:8px;padding:10px}
#dpt-table{flex:1;overflow:visible;border:1px solid #333;border-radius:8px;background:#121317}
#dpt-table table{width:100%;border-collapse:collapse}
#dpt-table th,#dpt-table td{padding:4px 8px;border-bottom:1px solid #26272d;vertical-align:top}
#dpt-table th{position:sticky;top:0;background:#1b1c21;text-align:left}

/* Diff-höjdpunkter i GIW */
#dpt-meta .dpt-meta-row.dpt-diff{
  background: rgba(251,146,60,.15);
  box-shadow: inset 3px 0 0 #fb923c;
}
#dpt-meta .dpt-meta-row.dpt-diff .dpt-meta-in{
  box-shadow: inset 0 0 0 2px rgba(251,146,60,.55);
  background:#161311;
}
#dpt-meta .dpt-meta-row .dpt-meta-cell.mm{
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

#dpt-table td.dpt-diff{
  background: rgba(251,146,60,.15);
  box-shadow: inset 3px 0 0 #fb923c; /* ingen layout-shift */
}

  #dpt-table input.dpt-in.dpt-diff-in{
  box-shadow: inset 0 0 0 2px rgba(251,146,60,.55);
  background:#161311;
}

#dpt-table input.dpt-in.dpt-diff-in:focus{
  box-shadow:inset 0 0 0 2px rgba(251,146,60,.65),   /* orange inner */
    0 0 0 2px rgba(58,123,253,.25);        /* din blå yttre fokus */

}

/* Smala A- och T-kolumner utan att röra vertikal padding */
#dpt-table thead th:nth-child(3),
#dpt-table thead th:nth-child(5),
#dpt-table tbody td:nth-child(3),
#dpt-table tbody td:nth-child(5){
  width: 26px;          /* smal kolumn */
  padding-left: 2px;    /* lite luft */
  padding-right: 2px;
}

/* Mindre vänsterluft på Artist/Titel-cellerna (precis efter A/T) */
#dpt-table thead th:nth-child(4),
#dpt-table thead th:nth-child(6),
#dpt-table tbody td:nth-child(4),
#dpt-table tbody td:nth-child(6){
  padding-left: 4px;    /* tajtare mot checkboxen */
}


/* GIW – enhetlig 4-kolumners layout (Fält | Skriv över | Input | MM) */
#dpt-meta .dpt-meta-row,
#dpt-meta .dpt-meta-head{
  display:grid;
  grid-template-columns: 140px 36px 1fr minmax(200px,0.9fr);
  gap:8px; align-items:center; margin:4px 0;
}

#dpt-meta .dpt-meta-head{
  display:grid;
  grid-template-columns: 140px 36px 1fr minmax(200px,0.9fr);
  gap:8px; align-items:center; margin:4px 0;
  color:#9aa2b1; font-size:12px;
  padding-bottom:4px; border-bottom:1px solid #2a2b31; margin-bottom:6px;
}
/* “Skriv över” i head: centrera + inga radbrytningar */
#dpt-meta .dpt-meta-head span:nth-child(2){
  white-space:nowrap;
  justify-self:center;
}

/* MM-kolumnen: håll texten på en rad och ge en diskret avdelare */
#dpt-meta .dpt-meta-cell.mm{
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:.85;
  border-left:1px solid #2a2b31; padding-left:10px;
}



#dpt-toolbox{display:flex;gap:6px;align-items:center;margin-right:auto;padding:6px 8px}
#dpt-toolbox .dpt-mini{
  font-size:12px; padding:4px 8px; border:1px solid #3a3f4e; background:#2b2f3a;
  color:#eaeef7; border-radius:6px; cursor:pointer
}
#dpt-toolbox .dpt-mini:active{transform:translateY(1px)}


/* Egen tooltip för MM-värde vid diff */
#dpt-tip{
  position:fixed; display:none; pointer-events:none;
  max-width:48vw;
  background:rgba(251,146,60,.95);
  color:#1b1c21;
  border:1px solid #fb923c; border-radius:6px;
  padding:6px 8px; font-size:12px; z-index:1000000;
  box-shadow:0 6px 18px rgba(0,0,0,.35);
  white-space:nowrap; text-overflow:ellipsis; overflow:hidden;
}


#dpt-table input.dpt-in{
  width:100%;
  background:#0f1013;
  border:1px solid #333;
  border-radius:4px;
  color:#eee;
  padding:3px 6px;
  line-height:1.25;
  height:26px;
  font-size:13px;
}
#dpt-table input.dpt-in:focus{
  outline:none;
  border-color:#3a7bfd;
  box-shadow:0 0 0 2px rgba(58,123,253,.25);
}

#dpt-table table{width:100%;border-collapse:collapse;table-layout:fixed}
#dpt-table th:nth-child(1){width:28px}
#dpt-table th:nth-child(2){width:40px}


.bad{color:#ffb4b4}
.good{color:#a7f3a7}
#dpt-foot{display:flex;gap:8px;justify-content:flex-end;padding:12px 14px;border-top:1px solid #2c2d33;background:#25262c}
.dpt-btn{background:#3a7bfd;border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
.dpt-btn:disabled{opacity:.5;cursor:not-allowed}
.dpt-btn.alt{background:#3a3f4e}
.dpt-actions{display:flex;gap:8px}

/* Små etiketter ovanför varje “fönster” */
.dpt-pane{position:relative}
.dpt-pane[data-label]::before{
  content: attr(data-label);
  display:block;
  position:sticky;
  top:-1px;
  z-index:1;
  background:#1b1c21;
  color:#cfd3dc;
  font-weight:600;
  padding:6px 10px;
  border:1px solid #333;
  border-bottom:none;
  border-radius:8px 8px 0 0;
  margin-bottom:6px;
}

/* PW: använd riktig header i stället för ::before-etikett */
#dpt-table.dpt-pane[data-label]::before{ display:none; }

/* Header-rad med rubrik + verktyg i samma rad */
#dpt-table .dpt-panehead{
  display:flex; align-items:center; justify-content:space-between;
  background:#1b1c21; border-bottom:1px solid #26272d;
  padding:6px 10px; border-radius:8px 8px 0 0;
  position:sticky; top:-1px; z-index:1;  /* känns som ramen */
}

/* Verktyg */
.dpt-toolbox{ display:flex; gap:6px; align-items:center; }
.dpt-toolbox .dpt-mini{
  font-size:12px; padding:4px 8px; border:1px solid #3a3f4e;
  background:#2b2f3a; color:#eaeef7; border-radius:6px; cursor:pointer;
}
.dpt-toolbox .dpt-mini:active{ transform:translateY(1px); }
/* checkbox-chip */
.dpt-toolbox .dpt-mini.chk{ display:inline-flex; gap:6px; align-items:center; }


/* GIW – ENHETLIG 4-KOLUMNERS LAYOUT (Fält | Skriv över | Input | MM) */
#dpt-meta .dpt-meta-head{
  display:grid;
  grid-template-columns: 140px 36px 1fr minmax(200px,0.9fr); /* <-- flyttad checkboxkolumn */
  gap:8px; align-items:center; margin:4px 0;
}
#dpt-meta .dpt-meta-head{
  color:#9aa2b1; font-size:12px;
  padding-bottom:4px; border-bottom:1px solid #2a2b31; margin-bottom:6px;
}
#dpt-meta .dpt-meta-cell.chk{ display:flex; justify-content:center; }
#dpt-meta .dpt-meta-cell.mm{
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:.85;
  border-left:1px solid #2a2b31; padding-left:10px;   /* diskret avdelare till MM-kolumnen */
}




/* Kolumnerna ska kunna ta full höjd och scrolla snyggt */
#dpt-left, #dpt-right { min-height:0; overflow:auto; }

/* DIW: textarean skall kännas “full size” även tom */
#dpt-ta{ flex:1; min-height:280px; }

/* PW: behåll full höjd även när tabellen är tom, scroll på containern */
#dpt-table{ flex:1; min-height:280px; overflow:auto; }

/* Knapparna i foten: håll form & bredd oavsett radbrytning/scroll */
#dpt-foot .dpt-btn{ white-space:nowrap; flex:0 0 auto; }

`;
    const html = `
<div id="dpt-overlay" style="display:none;">
  <div id="dpt-panel">
    <div id="dpt-head">
      <h2>Discogs Paste Tagger</h2>
      <div id="dpt-qwrap" class="dpt-qwrap">
        <span class="dpt-qlabel">Söksträng</span>
        <input id="dpt-qinput" class="dpt-qinput" type="text" value="" placeholder="—">
        <button id="dpt-qcopy" class="dpt-btn alt" type="button" title="Kopiera till urklipp">Kopiera</button>
      </div>
    <div>
    <button class="dpt-btn alt" id="dpt-close">Stäng (Esc)</button>
  </div>
</div>

<div id="dpt-body">
  <div id="dpt-left" class="dpt-pane" data-label="DIW">
    <label>Klistra in Discogs-text här:</label>
    <textarea id="dpt-ta" placeholder="Klistra in allt från Discogs-sidan (Ctrl+V)"></textarea>
      <div class="dpt-actions">
        <button class="dpt-btn alt" id="dpt-clear" title="Töm inmatning (Ctrl+Backspace)">Töm</button>
        <button class="dpt-btn" id="dpt-parse">Analysera</button>

      </div>
    </div>


    <div id="dpt-right">
      <div id="dpt-meta" class="dpt-pane" data-label="GIW">—</div>

    <div id="dpt-table" class="dpt-pane" data-label="">
  <div id="dpt-pw-head" class="dpt-panehead">
    <span id="dpt-pw-title">PW — MM</span>
    <div id="dpt-toolbox" class="dpt-toolbox">
      <button type="button" class="dpt-mini" id="dpt-tc">Aa</button>
      <button type="button" class="dpt-mini" id="dpt-up">AA</button>
      <button type="button" class="dpt-mini" id="dpt-lo">aa</button>
      <button type="button" class="dpt-mini" id="dpt-dot">A.</button>
      <button type="button" class="dpt-mini" id="dpt-amp">&amp;</button>
      <button type="button" class="dpt-mini" id="dpt-rx">(Remix)</button>
      <label class="dpt-mini chk" for="dpt-onlydiffs" style="margin-left:8px;">
        <input type="checkbox" id="dpt-onlydiffs"> Visa endast skillnader
      </label>
    </div>
  </div>

  <table>
<thead>
  <tr>
    <th style="width:28px;"><input id="dpt-row-all" type="checkbox" checked></th>
    <th style="width:40px;">#</th>
    <th style="width:36px;"><input id="dpt-artist-all" type="checkbox" checked></th>
    <th>Artist</th>
    <th style="width:36px;"><input id="dpt-title-all" type="checkbox" checked></th>
    <th>Titel</th>
  </tr>
</thead>

    <tbody id="dpt-tbody"></tbody>
  </table>
</div>

      </div>
    </div>

    <div id="dpt-foot">
      <span id="dpt-status" style="margin-right:auto;opacity:.8">Redo</span>
      <button class="dpt-btn alt" id="dpt-loadSel">Läs in valda spår → jämför</button>
      <button class="dpt-btn" id="dpt-apply" disabled>Applicera på valda spår</button>
    </div>
  </div>
</div>`;

    const style = document.createElement("style");
    style.id = "dpt-style";
    style.textContent = css;
    document.documentElement.appendChild(style);

    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    // Händelser
    const el = (id) => document.getElementById(id);
    const overlay = el("dpt-overlay");
    // När overlay är öppet: stoppa MM:s egna hover-popups från att bubbla upp
    // Förr (capture=true). Byt till bubbling:
    ["mouseover", "mousemove", "mouseenter", "mouseleave"].forEach((evName) => {
      overlay.addEventListener(evName, (e) => e.stopPropagation()); // utan capture
    });

    // Tooltip-element (en gång)
    const tip = document.createElement("div");
    tip.id = "dpt-tip";
    overlay.appendChild(tip);
    const showTip = (text, x, y) => {
      tip.textContent = text || "";
      if (!text) {
        tip.style.display = "none";
        return;
      }
      tip.style.display = "block";
      tip.style.left = x + 12 + "px";
      tip.style.top = y + 12 + "px";
    };
    const hideTip = () => {
      tip.style.display = "none";
    };

    // ---- STATE för overlay/urval ----
    let parsed = null;
    let selTimer = null;
    let lastSelCount = -1;
    let lastMM = []; // senaste lästa MM-spår (för diff)
    let showOnlyDiffs = false; // toggle-läge
    let rerunDiff = () => {}; // ← NYTT: pekare så refreshSelectionStatus kan trigga diff
    let rerunGiwDiff = () => {};

    // Bygger live-preview + statusrad
    async function refreshSelectionStatus() {
      const arr = await getSelectedArray();
      const selCount = arr.length;
      lastMM = arr; // spara för diff-jämförelser

      // Visa urvals-preview när ingen Discogs-parse är aktiv
      const hasParsed = !!(parsed && parsed.tracks && parsed.tracks.length);
      if (!hasParsed) renderSelectionPreview(arr);

      // NYTT: om vi redan har en parse – uppdatera diffen mot det nya urvalet
      if (hasParsed) {
        try {
          rerunDiff();
        } catch {}
      }

      // Status
      if (selCount !== lastSelCount || !hasParsed) {
        lastSelCount = selCount;
        setStatus(`Valda spår i MM: ${selCount}`);
      }

      if (hasParsed) {
        try {
          rerunDiff();
        } catch {}
        try {
          rerunGiwDiff();
        } catch {} // ← NY
      }
    }

    // Start/stop av autoavläsning av urvalet
    function startAutoSelWatch() {
      stopAutoSelWatch();
      selTimer = setInterval(refreshSelectionStatus, 1000);
      // omedelbar första uppdatering
      refreshSelectionStatus();
    }
    function stopAutoSelWatch() {
      if (selTimer) {
        clearInterval(selTimer);
        selTimer = null;
      }
    }

    async function showOverlay() {
      overlay.style.display = "flex";

      // Töm DIW vid öppning
      const taOpen = el("dpt-ta");
      if (taOpen) taOpen.value = "";

      parsed = null;
      el("dpt-apply").disabled = true;

      lastSelCount = -1;
      startAutoSelWatch();

      await refreshSelectionStatus();
      autoLoadNow();
    }

    const close = () => {
      stopAutoSelWatch();
      const taClose = el("dpt-ta");
      if (taClose) taClose.value = "";
      parsed = null;
      rerunDiff = () => {}; // ← lägg till
      rerunGiwDiff = () => {};
      const applyBtn = el("dpt-apply");
      if (applyBtn) applyBtn.disabled = true;
      overlay.style.display = "none";
    };

    el("dpt-close").onclick = close;

    const keyHandler = async (e) => {
      const overlayVisible = overlay.style.display !== "none";
      const ta = el("dpt-ta");

      // ESC stänger
      if (overlayVisible && e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        return close();
      }

      // Blockera Space från att bubbla till spelaren när overlay är öppet
      if (overlayVisible && e.code === "Space" && !e.ctrlKey && !e.altKey) {
        const tag = (e.target && e.target.tagName) || "";
        const editable =
          tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
        if (!editable) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return; // gör inget mer med Space när fokus inte är i ett fält
        }
      }

      // GLOBAL: Ctrl+Space togglar overlay
      if (e.ctrlKey && (e.code === "Space" || e.key === " ")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return overlayVisible ? close() : await showOverlay();
      }

      // Fallback kvar: Alt+D togglar overlay
      if (e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        return overlayVisible ? close() : await showOverlay();
      }

      // När overlay är öppet:

      if (overlayVisible) {
        // Ctrl+Enter → Analysera
        if (e.ctrlKey && (e.key === "Enter" || e.code === "Enter")) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return el("dpt-parse").click();
        }

        // Ctrl+Alt(+Num) ELLER Ctrl+Shift(+Num): toolbox
        if (
          overlayVisible &&
          ((e.ctrlKey && e.altKey) || (e.ctrlKey && e.shiftKey))
        ) {
          const act = document.activeElement;
          const target =
            act?.classList?.contains("dpt-in") ||
            act?.classList?.contains("dpt-meta-in")
              ? act
              : __dptLastInput;
          if (target) {
            if (e.key === "1") {
              e.preventDefault();
              return applyTransform(toTitleCaseWords, e);
            }
            if (e.key === "2") {
              e.preventDefault();
              return applyTransform(toUpper, e);
            }
            if (e.key === "3") {
              e.preventDefault();
              return applyTransform(toLower, e);
            }
            if (e.key === "4") {
              e.preventDefault();
              return applyTransform((x) => expandRemixParenLeft(x, 1), e);
            }

            if (e.key === "5") {
              e.preventDefault();
              return applyTransform(toggleDots, e);
            } // ny (se §4)
          }
        }

        // Ctrl+Backspace i textarean → Töm
        if (
          e.ctrlKey &&
          e.key === "Backspace" &&
          document.activeElement === ta
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return el("dpt-clear").click();
        }
      }
    };

    let __dptLastInput = null;
    document.addEventListener("keydown", keyHandler, true); // <-- capture-fasen

    el("dpt-parse").onclick = async () => {
      try {
        const raw = el("dpt-ta").value;
        if (!raw) {
          setStatus("Inget att analysera.");
          return;
        }
        parsed = parseDiscogs(raw);
      } catch (e) {
        console.error("[DPT] parseDiscogs error:", e);
        alert("DPT parseDiscogs-fel: " + (e && e.message ? e.message : e));
        return;
      }

      renderPreview(parsed);
      updateQbarFromParsed(parsed);

      const arr = await getSelectedArray();
      if (parsed && parsed.tracks && parsed.tracks.length) {
        markMismatches(arr.length, parsed.tracks.length);
      } else {
        setStatus(`Valda spår i MM: ${arr.length}`);
      }
      el("dpt-apply").disabled = !parsed || !parsed.tracks.length;
      setStatus("Analys klar.");
    };

    el("dpt-clear").onclick = async () => {
      el("dpt-ta").value = "";
      parsed = null;
      rerunDiff = () => {}; // ← lägg till
      rerunGiwDiff = () => {};
      el("dpt-apply").disabled = true;

      const titleEl = document.getElementById("dpt-pw-title");
      if (titleEl) titleEl.textContent = "PW — MM";
      await refreshSelectionStatus(); // visa MM-urvalet igen
      setStatus("Inmatningen tömd.");
    };

    el("dpt-loadSel").onclick = async () => {
      const arr = await getSelectedArray();

      // Lokalt hjälpverktyg: returnera tomt om commonIfAllSame gav "—"
      const onlyIfSame = (getter) => {
        const v = commonIfAllSame(arr.map(getter));
        return v === "—" ? "" : v;
      };

      // Bygg PARSED från det aktuella urvalet i MM
      parsed = {
        albumArtist: onlyIfSame(
          (t) => t.albumartist ?? t.albumArtist ?? t.artist
        ),
        album: onlyIfSame((t) => t.album),
        year: sanitizeYear(onlyIfSame((t) => t.year)),
        genre: onlyIfSame((t) => t.genre),
        label: onlyIfSame((t) => t.publisher || ""),
        labelNumber: onlyIfSame((t) => t.custom1 || ""),
        labelNumbers: [],
        tracks: arr.map((t) => ({
          artist: t.artist || "",
          title: t.title || "",
        })),
      };

      renderPreview(parsed);
      markMismatches(arr.length, parsed.tracks.length);
      setQFrom(arr);
    };

    el("dpt-apply").onclick = async () => {
      if (!parsed || !parsed.tracks.length) return;

      const arr = await getSelectedArray();

      // Läs GIW “Skriv över”
      const metaApply = {};
      document.querySelectorAll(".dpt-meta-apply").forEach((chk) => {
        metaApply[chk.getAttribute("data-field")] = chk.checked;
      });

      if (!arr.length) {
        setStatus("Inga valda spår.");
        return;
      }
      if (arr.length !== parsed.tracks.length) {
        const ok = confirm(
          `Antal valda spår (${arr.length}) ≠ antal parse: ${parsed.tracks.length}.\nFortsätta ändå (trunkerar till minsta antal)?`
        );
        if (!ok) return;
      }

      const n = Math.min(arr.length, parsed.tracks.length);

      // Rad- och kolumn-checkboxar
      const rowApply = Array.from(
        document.querySelectorAll(".dpt-row-apply")
      ).map((b) => !!b.checked);
      const applyA = Array.from(
        document.querySelectorAll(".dpt-apply-artist")
      ).map((b) => !!b.checked);
      const applyT = Array.from(
        document.querySelectorAll(".dpt-apply-title")
      ).map((b) => !!b.checked);

      for (let i = 0; i < n; i++) {
        const t = arr[i];
        const p = parsed.tracks[i];
        if (!t) continue;

        // Artist/Titel: endast om raden är markerad OCH respektive kolumn är markerad
        if (rowApply[i] && applyA[i] && "artist" in t) t.artist = p.artist;
        if (rowApply[i] && applyT[i] && "title" in t) t.title = p.title;

        // GIW-fält: ALLTID på alla spår om valt i GIW
        if (metaApply.album && "album" in t) t.album = parsed.album;
        if (metaApply.albumartist && "albumartist" in t)
          t.albumartist = parsed.albumArtist;
        if (metaApply.year && "year" in t) t.year = parsed.year || "";
        if (metaApply.genre && "genre" in t) t.genre = parsed.genre || "";
        if (metaApply.label && "publisher" in t)
          t.publisher = parsed.label || "";
        if (metaApply.labelNumber && "custom1" in t)
          t.custom1 = parsed.labelNumber || "";

        if (typeof t.commitAsync === "function") {
          try {
            await t.commitAsync();
          } catch {}
        }
      }

      setStatus(`Klart: uppdaterade ${n} spår.`);
    };

    // Spara senast fokuserad input i PW/GIW (för Alt-kolumn & hotkeys)
    document.addEventListener("focusin", (ev) => {
      const t = ev.target;
      if (
        t &&
        (t.classList?.contains("dpt-in") ||
          t.classList?.contains("dpt-meta-in"))
      ) {
        __dptLastInput = t;
      }
    });

    // Lägg ovanför toTitleCaseWords:
    const ALWAYS_UPPER = new Set([
      "DJ",
      "MC",
      "EP",
      "LP",
      "CD",
      "DVD",
      "BD",
      "VIP",
      "ID",
      "B2B",
      "UK",
      "US",
      "USA",
      "EU",
      "NYC",
      "LA",
      "L.A.",
      "U.K.",
      "U.S.",
      "R&B",
      "A&R",
      "AC/DC",
      "BPM",
      "FM",
      "AM",
      "TV",
      "MIDI",
      "CPU",
      "GPU",
    ]);

    function toTitleCaseWords(str) {
      if (!str) return str;
      return String(str).replace(/\S+/gu, (token) => {
        const lead = (token.match(/^[^A-Za-zÀ-ÖØ-öø-ÿ0-9]*/u) || [""])[0];
        const trail = (token.match(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9]*$/u) || [""])[0];
        let core = token.slice(lead.length, token.length - trail.length);
        if (!core) return token;

        // 1) Whitelist: behåll versaler, bevara skiljetecken (., -, &, /)
        const key = core.replace(/[.\-]/g, "").toUpperCase(); // behåll & och /
        if (ALWAYS_UPPER.has(key) || ALWAYS_UPPER.has(core.toUpperCase())) {
          return (
            lead +
            core.replace(/[A-Za-zÀ-ÖØ-öø-ÿ]/gu, (m) => m.toUpperCase()) +
            trail
          );
        }

        // 2) Dottad akronym (A.B., a.b.c.) → behåll punkter men gör TitleCase inuti
        if (/^(?:[A-Za-zÀ-ÖØ-öø-ÿ]\.){2,}$/u.test(core)) {
          const letters = core.replace(/\./g, "");
          const tc = letters[0].toUpperCase() + letters.slice(1).toLowerCase();
          return lead + tc.split("").join(".") + "." + trail;
        }

        // 3) Vanliga ord: Title Case
        let s = core.toLowerCase();
        const i = s.search(/[A-Za-zÀ-ÖØ-öø-ÿ]/u);
        if (i >= 0) s = s.slice(0, i) + s[i].toUpperCase() + s.slice(i + 1);
        s = s.replace(/(['’])S\b/u, "$1s"); // 90'S → 90's

        return lead + s + trail;
      });
    }

    function toggleDots(str) {
      if (!str) return str;

      // Bokstavsintervall inkl. ÅÄÖ/åäö
      const L = "A-Za-zÀ-ÖØ-öø-ÿ";

      // Matcha antingen redan punkterade ord (vilken längd som helst)
      // t.ex. W.h.a.t. eller W.h.a.t (sista punkten valfri)
      // ELLER vanliga ord utan punkter.
      const rx = new RegExp(`((?:[${L}]\\.)+[${L}]\\.?|[${L}]+)`, "g");

      // Ord vi ev. vill låta vara ifred när de INTE är punkterade
      const SKIP = new Set(["feat", "feat.", "vs", "vs."]);

      return String(str).replace(rx, (token) => {
        const plain = token.replace(/\./g, ""); // ta bort alla punkter
        if (token.includes(".")) {
          // Var redan punkterat → avpunktera helt (tar också den sista extra punkten)
          return plain;
        }
        // Var o-punkterat → hoppa över vissa ord om du vill
        if (SKIP.has(plain.toLowerCase())) return token;

        // Punktuera varje bokstav, behåll case, lägg exakt EN punkt i slutet
        return plain.split("").join(".") + ".";
      });
    }

    function toUpper(str) {
      return (str || "").toUpperCase();
    }
    function toLower(str) {
      return (str || "").toLowerCase();
    }

    // ", " -> " & " (städar multipla spaces)
    function commaToAmp(str) {
      if (!str) return str;
      return String(str)
        .replace(/\s*,\s*/g, " & ")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    // Applicera på aktiv input, eller (med Alt) på hela kolumnen i PW
    function applyTransform(fn, ev) {
      let active = document.activeElement;
      if (
        !(
          active &&
          (active.classList?.contains("dpt-in") ||
            active.classList?.contains("dpt-meta-in"))
        )
      ) {
        active = __dptLastInput; // fallback
      }
      if (!active) return;

      const applyToInput = (inp) => {
        const hasSel =
          typeof inp.selectionStart === "number" &&
          inp.selectionEnd > inp.selectionStart;

        if (hasSel) {
          const s = inp.selectionStart,
            e = inp.selectionEnd;
          const before = inp.value.slice(0, s);
          const mid = inp.value.slice(s, e);
          const after = inp.value.slice(e);
          const next = before + fn(mid) + after;
          inp.value = next;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          const delta = fn(mid).length - mid.length;
          inp.selectionStart = s;
          inp.selectionEnd = e + delta;
        } else {
          inp.value = fn(inp.value);
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          inp.select?.();
        }
      };

      // Alt–klick: applicera på hela kolumnen (PW)
      if (ev && ev.altKey && active.classList.contains("dpt-in")) {
        const field = active.getAttribute("data-field");
        document
          .querySelectorAll(`#dpt-tbody input.dpt-in[data-field="${field}"]`)
          .forEach(applyToInput);
      } else {
        applyToInput(active);
      }
    }

    // ---- Toolbox: one-time delegated handler ----
    function wireToolboxHandlers() {
      const toolbox = document.getElementById("dpt-toolbox");
      if (!toolbox || toolbox.dataset.bound === "1") return;

      toolbox.addEventListener("click", (ev) => {
        const btn = ev.target.closest("button");
        if (!btn) return;
        ev.preventDefault();
        ev.stopPropagation();

        // flytta “(” ett ord bakåt per tryck
        const expandOne = (s) => expandRemixParenLeft(s, 1);

        const map = {
          "dpt-tc": toTitleCaseWords,
          "dpt-up": toUpper,
          "dpt-lo": toLower,
          "dpt-dot": toggleDots,
          "dpt-amp": commaToAmp,
          "dpt-rx": expandOne,
        };
        const fn = map[btn.id];
        if (fn) applyTransform(fn, ev);
      });

      toolbox.dataset.bound = "1"; // bind only once
    }

    function setStatus(s) {
      el("dpt-status").textContent = s;
    }

    function majorityArtistName(tracks) {
      const cnt = new Map();
      let top = "",
        topN = 0;
      tracks.forEach((t) => {
        const k = cleanArtistName(t.artist || "");
        if (!k) return;
        const n = (cnt.get(k) || 0) + 1;
        cnt.set(k, n);
        if (n > topN) {
          topN = n;
          top = k;
        }
      });
      return { name: top, ratio: tracks.length ? topN / tracks.length : 0 };
    }

    function buildSearchStringFromParsed(p) {
      if (!p || !p.tracks?.length) return "";

      const album = dashToEmpty(p.album || "");

      // År: endast 4 siffror, annars tomt
      const yraw = String(p?.year ?? "").trim();
      const yr = /^\d{4}$/.test(yraw) ? yraw : "";

      const aa = dashToEmpty((p.albumArtist || "").trim());

      // Compilation-heuristik
      const distinctArtists = new Set(
        (p.tracks || []).map((t) => cleanArtistName(t.artist || ""))
      ).size;
      const trackCount = p.tracks.length;
      const isVA = /^various artists$/i.test(aa);
      const looksLikeCompilation =
        isVA || (distinctArtists > trackCount * 0.5 && trackCount > 4);

      const tokens = [];

      // 1) Albumartist (ej VA) → Album + År + Albumartist
      if (aa && !isVA) {
        tokens.push(album, yr, aa);
      } else {
        // 2) >50% samma spårartist → Album + År + Artist
        const { name, ratio } = majorityArtistName(p.tracks);
        const art = dashToEmpty(name);
        if (ratio >= 0.5 && art) {
          tokens.push(album, yr, art);
        } else {
          // 3) Fallback: Album + År + Första titel
          const firstTitle = dashToEmpty(p.tracks[0]?.title || "");
          tokens.push(album, yr, firstTitle);
        }
      }

      if (looksLikeCompilation) tokens.push("Compilation");

      return tokens.filter(Boolean).join(" ").trim();
    }

    function updateQbarFromParsed(p) {
      const q = buildSearchStringFromParsed(p);
      const inp = document.getElementById("dpt-qinput");
      if (inp) inp.value = q || "";
    }

    function updateQbarFromMM(arr) {
      const inp = document.getElementById("dpt-qinput");
      if (!inp) return;
      if (!Array.isArray(arr) || arr.length === 0) {
        // Rör inte sökfältet om urvalet är tomt
        return;
      }
      inp.value = buildSearchStringFromMM(arr) || "";
    }

    function buildMMMetaFromSelection(arr) {
      const val = (fn) => commonIfAllSame(arr.map(fn));
      const yearClean = (v) =>
        /^\d{4}$/.test(String(v || "").trim()) ? String(v).trim() : "—";
      return {
        albumArtist:
          val((t) => t.albumartist ?? t.albumArtist ?? t.artist) || "—",
        album: val((t) => t.album) || "—",
        year: yearClean(val((t) => t.year)),
        genre: val((t) => t.genre) || "—",
        label: val((t) => t.publisher || "") || "—",
        labelNumber: val((t) => t.custom1 || "") || "—",
      };
    }

    function buildSearchStringFromMM(arr) {
      if (!Array.isArray(arr) || !arr.length) return "";

      const onlyIfSame = (getter) => {
        const v = commonIfAllSame(arr.map(getter));
        return v === "—" ? "" : v;
      };

      const album = dashToEmpty(onlyIfSame((t) => t.album));
      const yraw = String(onlyIfSame((t) => t.year) || "").trim();
      const year = /^\d{4}$/.test(yraw) ? yraw : "";

      const aaRaw = onlyIfSame(
        (t) => t.albumartist ?? t.albumArtist ?? t.artist
      );
      const albumArtist = dashToEmpty(aaRaw || "");

      // majoritetsartist
      const counts = new Map();
      let top = "",
        topN = 0;
      for (const t of arr) {
        const k = cleanArtistName(t.artist || "");
        if (!k) continue;
        const n = (counts.get(k) || 0) + 1;
        counts.set(k, n);
        if (n > topN) {
          topN = n;
          top = k;
        }
      }
      const ratio = arr.length ? topN / arr.length : 0;

      const tokens = [];
      const isVA = /^various artists$/i.test(albumArtist);

      if (albumArtist && !isVA) {
        tokens.push(album, year, albumArtist);
      } else if (ratio >= 0.5 && top) {
        tokens.push(album, year, top);
      } else {
        tokens.push(album, year, dashToEmpty(arr[0]?.title || ""));
      }

      return tokens.filter(Boolean).join(" ").trim();
    }

    function setQFrom(arr) {
      const qEl = document.getElementById("dpt-qinput");
      if (qEl)
        qEl.value = buildSearchStringFromMM(Array.isArray(arr) ? arr : []);
    }

    // Vänta tills MM faktiskt har ett icke-tomt urval (undvik race)
    async function waitForMMSelection(tries = 15, delay = 75) {
      for (let i = 0; i < tries; i++) {
        const arr = await getSelectedArray();
        if (Array.isArray(arr) && arr.length) return arr;
        await sleep(delay);
      }
      return [];
    }

    async function autoLoadNow() {
      const ready = await waitForUitools(240, 50); // upp till ~12 s
      if (!ready) {
        console.warn("[DPT] uitools saknas.");
        return;
      }

      const arr = await waitForMMSelection(200, 60); // upp till ~12 s
      if (arr.length) {
        setQFrom(arr);
        document.getElementById("dpt-loadSel")?.click();
        setStatus(`Auto: läste in ${arr.length} valda spår från MM.`);
      } else {
        setStatus("Auto: hittade inget urval i MM.");
      }
    }

    function renderPreview(p) {
      const meta = el("dpt-meta");
      const pwEl = el("dpt-table");
      const mmMeta = buildMMMetaFromSelection(lastMM || []);

      function updateGIWRow(id, val, mmVal) {
        const row = document
          .querySelector(`#dpt-in-${id}`)
          ?.closest(".dpt-meta-row");
        if (!row) return;
        const isDiff = clean(val) !== clean(mmVal);
        row.classList.toggle("dpt-diff", isDiff);
        const chk = row.querySelector(".dpt-meta-apply");
        if (chk && !chk.dataset.userSet) chk.checked = isDiff; // <— lägg till samma guard här
      }

      // Etikett uppdateras efter att diff räknats (görs längre ner)
      if (pwEl) setPWTitle(`PW — Discogs — Parsade: ${p?.tracks?.length || 0}`);

      if (!p || !p.tracks.length) {
        meta.innerHTML = "—";
        el("dpt-tbody").innerHTML = "";
        return;
      }

      // GIW – redigerbara inputs + cat# på samma rad

      // 2) En liten hjälpare som ritar en GIW-rad med diff + “Skriv över”
      const mkRow = (id, label, val, mmVal) => {
        const isDiff = clean(val) !== clean(mmVal);
        const checked = isDiff ? "checked" : "";
        return `
  <div class="dpt-meta-row ${isDiff ? "dpt-diff" : ""}">
    <b>${label}:</b>
    <div class="dpt-meta-cell chk">
      <input type="checkbox" class="dpt-meta-apply" data-field="${id}" ${checked} aria-label="Skriv över">
    </div>
    <div class="dpt-meta-cell">
      <input id="dpt-in-${id}" class="dpt-meta-in" type="text" value="${escapeHtml(
          val || ""
        )}">
    </div>
    <div class="dpt-meta-cell mm" title="${escapeHtml(
      mmVal || "—"
    )}">${escapeHtml(mmVal || "—")}</div>
  </div>`;
      };

      const giwHead = `
  <div class="dpt-meta-head">
    <span></span><span>Skriv över</span><span></span><span>MM:</span>
  </div>`;

      meta.innerHTML =
        giwHead +
        [
          mkRow(
            "albumartist",
            "Albumartist",
            p.albumArtist,
            mmMeta.albumArtist
          ),
          mkRow("album", "Album", p.album, mmMeta.album),
          mkRow("year", "År", p.year, mmMeta.year),
          mkRow("genre", "Genre", p.genre, mmMeta.genre),
          mkRow("label", "Label", p.label, mmMeta.label),
          mkRow(
            "labelNumber",
            "Katalognummer",
            p.labelNumber,
            mmMeta.labelNumber
          ),
        ].join("");

      // Låt manuellt val vinna över auto-diff
      document.querySelectorAll(".dpt-meta-apply").forEach((chk) => {
        chk.addEventListener("change", () => {
          chk.dataset.userSet = "1";
        });
      });

      function refreshGIWFromMM() {
        const mmNow = buildMMMetaFromSelection(lastMM || []);
        const rows = [
          ["albumartist", p.albumArtist, mmNow.albumArtist],
          ["album", p.album, mmNow.album],
          ["year", p.year, mmNow.year],
          ["genre", p.genre, mmNow.genre],
          ["label", p.label, mmNow.label],
          ["labelNumber", p.labelNumber, mmNow.labelNumber],
        ];
        for (const [id, val, mmVal] of rows) {
          const row = document
            .getElementById(`dpt-in-${id}`)
            ?.closest(".dpt-meta-row");
          if (!row) continue;
          // uppdatera MM-kolumnens text
          const mmCell = row.querySelector(".dpt-meta-cell.mm");
          if (mmCell) mmCell.textContent = mmVal || "—";
          // diff + “Skriv över”
          const isDiff = clean(val) !== clean(mmVal);
          row.classList.toggle("dpt-diff", isDiff);
          const chk = row.querySelector(".dpt-meta-apply");
          if (chk && !chk.dataset.userSet) chk.checked = isDiff;
        }
      }
      rerunGiwDiff = refreshGIWFromMM; // ← gör den körbar från pollern
      refreshGIWFromMM(); // ← kör en gång direkt

      // — GIW bindningar —
      const bindTrim = (id, setter) => {
        const elx = document.getElementById(id);
        if (!elx) return;
        const apply = () => setter((elx.value || "").trim());
        elx.addEventListener("input", apply);
        elx.addEventListener("blur", () => {
          const v = (elx.value || "").trim();
          if (elx.value !== v) elx.value = v;
          apply();
        });
      };
      bindTrim("dpt-in-albumartist", (v) => {
        p.albumArtist = cleanArtistName(v);
        updateGIWRow("albumartist", p.albumArtist, mmMeta.albumArtist);
      });
      bindTrim("dpt-in-album", (v) => {
        p.album = cleanAlbumTitle(v);
        updateGIWRow("album", p.album, mmMeta.album);
      });
      bindTrim("dpt-in-year", (v) => {
        const s = String(v || "").trim();
        p.year = /^\d{4}$/.test(s) ? s : "";
        updateGIWRow("year", p.year, mmMeta.year);
      });

      bindTrim("dpt-in-genre", (v) => {
        p.genre = clean(v);
        updateGIWRow("genre", p.genre, mmMeta.genre);
      });
      bindTrim("dpt-in-label", (v) => {
        p.label = clean(v);
        updateGIWRow("label", p.label, mmMeta.label);
      });
      bindTrim("dpt-in-labelNumber", (v) => {
        p.labelNumber = clean(v);
        updateGIWRow("labelNumber", p.labelNumber, mmMeta.labelNumber);
      });

      // Bygg tabellrader (redigerbara) – med cellklasser för diff
      const rows = p.tracks
        .map(
          (t, i) => `
  <tr data-row="${i}">
    <td class="dpt-row-apply-cell">
      <input type="checkbox" class="dpt-row-apply"   data-idx="${i}" checked aria-label="Applicera rad ${
            i + 1
          }">
    </td>
    <td class="dpt-idx">${i + 1}</td>

    <td class="dpt-apply-a">
      <input type="checkbox" class="dpt-apply-artist" data-idx="${i}" checked aria-label="Skriv över artist på rad ${
            i + 1
          }">
    </td>
    <td class="dpt-cell-artist">
      <input class="dpt-in" data-idx="${i}" data-field="artist" type="text" value="${escapeHtml(
            t.artist
          )}"/>
    </td>

    <td class="dpt-apply-t">
      <input type="checkbox" class="dpt-apply-title" data-idx="${i}" checked aria-label="Skriv över titel på rad ${
            i + 1
          }">
    </td>
    <td class="dpt-cell-title">
      <input class="dpt-in" data-idx="${i}" data-field="title" type="text" value="${escapeHtml(
            t.title
          )}"/>
    </td>
  </tr>
`
        )
        .join("");

      el("dpt-tbody").innerHTML = rows;

      // Markera/avmarkera alla rader
      document
        .getElementById("dpt-row-all")
        ?.addEventListener("change", (e) => {
          document.querySelectorAll(".dpt-row-apply").forEach((cb) => {
            cb.checked = e.target.checked;
          });
        });

      // Markera/avmarkera hela Artist-kolumnen
      document
        .getElementById("dpt-artist-all")
        ?.addEventListener("change", (e) => {
          document.querySelectorAll(".dpt-apply-artist").forEach((cb) => {
            cb.checked = e.target.checked;
          });
        });

      // Markera/avmarkera hela Titel-kolumnen
      document
        .getElementById("dpt-title-all")
        ?.addEventListener("change", (e) => {
          document.querySelectorAll(".dpt-apply-title").forEach((cb) => {
            cb.checked = e.target.checked;
          });
        });

      const tbody = el("dpt-tbody");
      const inputs = tbody.querySelectorAll("input.dpt-in");

      // Delegated hover → visa MM-värde för diffad cell
      tbody.onmousemove = (e) => {
        const td = e.target.closest(".dpt-cell-artist, .dpt-cell-title");
        if (!td) return hideTip();
        if (!td.classList.contains("dpt-diff")) return hideTip();

        const tr = td.closest("tr");
        const idx = +tr.dataset.row;
        const mm = lastMM[idx] || {};
        const text = td.classList.contains("dpt-cell-artist")
          ? mm.artist
            ? `MM: ${mm.artist}`
            : ""
          : mm.title
          ? `MM: ${mm.title}`
          : "";
        showTip(text, e.clientX, e.clientY);
      };
      tbody.onmouseleave = hideTip;

      tbody.addEventListener("mouseover", (e) => {
        const td = e.target.closest(".dpt-cell-artist, .dpt-cell-title");
        if (!td || !td.classList.contains("dpt-diff")) return;
        const tr = td.closest("tr");
        const idx = +tr.dataset.row;
        const mm = lastMM[idx] || {};
        const text = td.classList.contains("dpt-cell-artist")
          ? mm.artist
            ? `MM: ${mm.artist}`
            : ""
          : mm.title
          ? `MM: ${mm.title}`
          : "";
        if (text) showTip(text, e.clientX, e.clientY);
      });
      tbody.addEventListener("mouseout", hideTip);

      // --- Diff: jämför Discogs vs senaste MM-urval (lastMM) ---
      // Case-sensitiv jämförelse: rengör men behåll skiftläge
      const canon = (s) => clean(String(s || ""));
      const canonArtist = (s) => clean(String(s || ""));

      const markRow = (rowIdx) => {
        const row = tbody.querySelector(`tr[data-row="${rowIdx}"]`);
        if (!row) return { artist: false, title: false };

        const mm = lastMM[rowIdx] || {};
        const disc = p.tracks[rowIdx] || {};

        const tdA = row.querySelector(".dpt-cell-artist");
        const tdT = row.querySelector(".dpt-cell-title");

        const aDiff = !(canonArtist(mm.artist) === canonArtist(disc.artist));
        const tDiff = !(canon(mm.title) === canon(disc.title));

        tdA.classList.toggle("dpt-diff", aDiff);
        tdT.classList.toggle("dpt-diff", tDiff);

        row
          .querySelector(".dpt-cell-artist .dpt-in")
          ?.classList.toggle("dpt-diff-in", aDiff);
        row
          .querySelector(".dpt-cell-title .dpt-in")
          ?.classList.toggle("dpt-diff-in", tDiff);

        // Tooltip med MM-värde // Vita Rutor //
        // tdA.title = aDiff ? `MM: ${mm.artist || "—"}` : "";
        // tdT.title = tDiff ? `MM: ${mm.title || "—"}` : "";

        // Respektera "visa endast skillnader"
        const hasAny = aDiff || tDiff;
        row.style.display = showOnlyDiffs && !hasAny ? "none" : "";

        return { artist: aDiff, title: tDiff };
      };

      const runDiff = () => {
        let cells = 0;
        for (let i = 0; i < p.tracks.length; i++) {
          const r = markRow(i);
          if (r.artist) cells++;
          if (r.title) cells++;
        }
        const pwEl = el("dpt-table");
        if (pwEl) {
          setPWTitle(
            `PW — Discogs — Parsade: ${p.tracks.length} — Skillnader: ${cells}`
          );
        }
      };

      // Wire header-kontroller (en gång)
      const only = document.getElementById("dpt-onlydiffs");
      if (only && !only.dataset.boundOnlyDiffs) {
        only.checked = showOnlyDiffs;
        only.addEventListener("change", () => {
          showOnlyDiffs = !!only.checked;
          runDiff();
          updateQbarFromParsed(p); // behåll Discogs-strängen när man togglar
        });
        only.dataset.boundOnlyDiffs = "1";
      }

      // Toolbox-knappar (Aa/AA/aa/A./&/(Remix))
      wireToolboxHandlers();

      // --- Bindningar: uppdatera parsed + re-markera diff ---
      inputs.forEach((inp) => {
        inp.addEventListener("input", () => {
          const idx = parseInt(inp.getAttribute("data-idx"), 10);
          const field = inp.getAttribute("data-field");
          if (!Number.isNaN(idx) && p.tracks[idx] && field) {
            p.tracks[idx][field] = inp.value;
            markRow(idx);
            runDiff();
          }
        });
        inp.addEventListener("blur", () => {
          const idx = parseInt(inp.getAttribute("data-idx"), 10);
          const field = inp.getAttribute("data-field");
          const trimmed = (inp.value || "").trim();
          if (inp.value !== trimmed) inp.value = trimmed;
          if (!Number.isNaN(idx) && p.tracks[idx] && field) {
            p.tracks[idx][field] = trimmed;
            markRow(idx);
            runDiff();
          }
        });
      });

      // Enter/Shift+Enter: hoppa till nästa/föregående rad i samma kolumn
      const focusJump = (inp, dir) => {
        const field = inp.getAttribute("data-field");
        const list = Array.from(
          tbody.querySelectorAll(`input.dpt-in[data-field="${field}"]`)
        );
        const pos = list.indexOf(inp);
        const next = list[pos + dir];
        if (next) {
          next.focus();
          next.select?.();
        }
      };
      inputs.forEach((inp) => {
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            focusJump(inp, e.shiftKey ? -1 : 1);
          }
        });
      });

      // Första markeringen
      rerunDiff = runDiff; // ← NYTT: låt refreshSelectionStatus trigga diff när lastMM ändras
      runDiff();
    }

    function commonIfAllSame(list) {
      const vals = list.map((x) => clean(String(x ?? "")));
      if (!vals.length) return "—";
      return vals.every((v) => v === vals[0]) ? vals[0] || "—" : "—";
    }

    function renderSelectionPreview(arr) {
      const meta = el("dpt-meta");
      const tbody = el("dpt-tbody");
      const pwEl = el("dpt-table");
      if (pwEl) setPWTitle(`PW — MM — Valda: ${arr.length}`);

      if (!Array.isArray(arr) || arr.length === 0) {
        meta.innerHTML = "—";
        tbody.innerHTML = "";
        updateQbarFromMM(arr);
        return;
      }

      const mm = buildMMMetaFromSelection(arr);
      meta.innerHTML = `
    <div><b>Albumartist (ur val):</b> ${escapeHtml(mm.albumArtist)}</div>
    <div><b>Album (ur val):</b> ${escapeHtml(mm.album)}</div>
    <div><b>År (ur val):</b> ${escapeHtml(mm.year)}</div>
    <div><b>Genre (ur val):</b> ${escapeHtml(mm.genre)}</div>
    <div><b>Publisher (ur val):</b> ${escapeHtml(mm.label)}</div>
    <div><b>Katalognummer (ur val):</b> ${escapeHtml(mm.labelNumber)}</div>
    <div style="opacity:.8;margin-top:6px">Valda spår: ${arr.length}</div>
  `;

      const rows = arr
        .map(
          (t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td></td>
      <td></td>
      <td class="dpt-text">${escapeHtml(t.artist || "")}</td>
      <td class="dpt-text">${escapeHtml(t.title || "")}</td>
    </tr>
  `
        )
        .join("");

      tbody.innerHTML = rows;
      updateQbarFromMM(arr);
    }

    function markMismatches(selCount, parsedCount) {
      let msg = `Valda: ${selCount}, Parserade: ${parsedCount}`;
      if (selCount === parsedCount) {
        setStatus(msg + " — ser bra ut ✔");
      } else {
        setStatus(msg + " — olika antal ⚠");
      }
    }

    function escapeHtml(x) {
      return (x || "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          }[c])
      );
    }

    // --- Gör show/hide/refresh åtkomliga utanför ensureUI ---
    window.__dpt = {
      show: showOverlay,
      hide: close,
      refresh: refreshSelectionStatus,
    };
  }

  // ====== Init: injicera UI och visa tips ======
  try {
    ensureUI();
    console.log(
      "Discogs Paste Tagger laddad. Öppna med Ctrl+Space (Alt+D som fallback)."
    );
    const shown = localStorage.getItem("dpt_shown") === "1";
    if (!shown && window.__dpt) {
      window.__dpt.show();
      localStorage.setItem("dpt_shown", "1");
    }
  } catch (e) {
    console.error("Discogs Paste Tagger init-fel:", e);
  }
})();
