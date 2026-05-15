(function () {
  const DEFAULT_IMAGE_PATH = '/images/default-image.png';
  const API_BASE = window.APP_CONFIG?.API_BASE || 'http://localhost:8080';

  function getApiOrigin() {
    try {
      return new URL(API_BASE).origin;
    } catch {
      return '';
    }
  }

  function resolveImageUrl(url, fallback = DEFAULT_IMAGE_PATH) {
    if (!url) return fallback;

    try {
      const rawUrl = String(url).trim();
      if (!rawUrl) return fallback;

      if (rawUrl.startsWith('/uploads/')) {
        return new URL(rawUrl, API_BASE).href;
      }

      const parsed = new URL(rawUrl, window.location.origin);
      if (!['http:', 'https:'].includes(parsed.protocol)) return fallback;

      const apiOrigin = getApiOrigin();
      if (!apiOrigin || parsed.origin !== apiOrigin) return fallback;

      return parsed.href;
    } catch {
      return fallback;
    }
  }

  function applyImageFallback(img, fallback = DEFAULT_IMAGE_PATH) {
    if (!img) return;
    function onError() {
      img.removeEventListener('error', onError);
      img.src = fallback;
    }
    img.addEventListener('error', onError);
  }

  window.AppImage = {
    DEFAULT_IMAGE_PATH,
    resolveImageUrl,
    applyImageFallback,
  };
})();
