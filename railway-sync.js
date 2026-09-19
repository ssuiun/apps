/* Railway shared storage bridge.
 * Hydrates selected localStorage keys from PostgreSQL and mirrors changes back.
 * The page continues to work if the database is temporarily unavailable.
 */
(function () {
  const cfg = window.RAILWAY_STORAGE_CONFIG || { keys: [], prefixes: [] };
  const originalGet = Storage.prototype.getItem;
  const originalSet = Storage.prototype.setItem;
  const originalRemove = Storage.prototype.removeItem;
  const originalClear = Storage.prototype.clear;

  function hydrate() {
    const params = new URLSearchParams();
    if (cfg.keys && cfg.keys.length) params.set('keys', cfg.keys.join(','));
    if (cfg.prefixes && cfg.prefixes.length) params.set('prefixes', cfg.prefixes.join(','));
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/storage?' + params.toString(), false);
      xhr.send();
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText || '{}');
        Object.entries(data).forEach(([key, value]) => {
          if (value === null || value === undefined) originalRemove.call(localStorage, key);
          else originalSet.call(localStorage, key, String(value));
        });
      }
    } catch (_) {
      // Keep local browser data if the API/DB is unavailable.
    }
  }

  hydrate();

  function sync(method, key, value) {
    try {
      fetch('/api/storage', {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(value === undefined ? { key } : { key, value })
      }).catch(() => {});
    } catch (_) {}
  }

  Storage.prototype.setItem = function (key, value) {
    originalSet.call(this, key, value);
    if (this === localStorage) sync('POST', String(key), String(value));
  };

  Storage.prototype.removeItem = function (key) {
    originalRemove.call(this, key);
    if (this === localStorage) sync('DELETE', String(key));
  };

  Storage.prototype.clear = function () {
    originalClear.call(this);
    if (this === localStorage) {
      fetch('/api/storage', {method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({all: true})}).catch(() => {});
    }
  };
})();
