// file: utils/core/registry.js
(function () {
  "use strict";

  // Global “fält-registrar” (stub idag – kan växa senare)
  const _fields = Object.create(null);
  const _normalizers = Object.create(null);

  function registerField(name, config) {
    if (!name) return;
    _fields[name] = config || {};
  }
  function getFieldConfig(name) {
    return _fields[name] || {};
  }

  function registerNormalizers(dict) {
    if (!dict) return;
    Object.assign(_normalizers, dict);
  }
  function getNormalizers() {
    return _normalizers;
  }

  // Gemensam writer för Year/Date (no-op om den inte används än)
  function writeYearDateToMM(metaApply, parsed) {
    // Returnera ett neutralt resultat för nu – vi kopplar på riktig logik senare
    return { Y: "", ISO: "" };
  }

  // Exponera globalt
  window.DPT_FIELDS = window.DPT_FIELDS || {
    registerField,
    getFieldConfig,
    registerNormalizers,
    getNormalizers,
    writeYearDateToMM,
  };
})();
