(function () {
  function normalizeInternalPath(rawPath, defaultPath) {
    try {
      const url = new URL(rawPath || defaultPath, window.location.origin);
      if (url.origin !== window.location.origin) return defaultPath;
      if (url.pathname === '/login.html' || url.pathname.endsWith('/login.html')) {
        return defaultPath;
      }
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return defaultPath;
    }
  }

  function getSafeRedirect(rawNext, fallbackPath) {
    const fallback = normalizeInternalPath(fallbackPath, '/index.html');
    return normalizeInternalPath(rawNext, fallback);
  }

  window.AppRedirect = {
    getSafeRedirect,
  };
})();
