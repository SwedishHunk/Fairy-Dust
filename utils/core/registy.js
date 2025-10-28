(() => {
  "use strict";
  const root = (window.DPT = window.DPT || {});
  root.ns = function ns(path) {
    return path.split(".").reduce((o, k) => (o[k] = o[k] || {}), root);
  };
  root.register = function register(nsPath, key, value) {
    const ns = root.ns(nsPath);
    ns[key] = value;
    return value;
  };
})();
