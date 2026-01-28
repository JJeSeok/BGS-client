const STORAGE_KEY = 'app.currentLocation.v1';
const SEOUL = { lat: 37.5666102, lng: 126.9783811 };

const TTL_MS = {
  geo: 12 * 60 * 60 * 1000,
  user: 7 * 24 * 60 * 60 * 1000,
};

const round = (n, p = 6) => Math.round(n * 10 ** p) / 10 ** p;

function isExpired(loc) {
  if (!loc || !loc.ts) return true;
  const ttl = TTL_MS[loc.source] ?? TTL_MS.user;
  return Date.now() - loc.ts > ttl;
}

function saveLocation({ lat, lng, source = 'user' }) {
  const data = { lat: round(lat), lng: round(lng), source, ts: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

function loadLocation({ allowStale = false } = {}) {
  try {
    const loc = JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
    if (!loc) return null;

    if (!allowStale && isExpired(loc)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return loc;
  } catch {
    return null;
  }
}

function clearLocation() {
  localStorage.removeItem(STORAGE_KEY);
}

function geolocate(
  opts = { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 },
) {
  if (!navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      opts,
    );
  });
}

async function getPreferredLocation({
  askGeo = true,
  geoOptions,
  forceRefresh = false,
} = {}) {
  if (!forceRefresh) {
    const saved = loadLocation();
    if (saved) {
      return { loc: saved, reason: 'saved' };
    }
  }
  if (askGeo) {
    const g = await geolocate(geoOptions);
    if (g) {
      return { loc: saveLocation({ ...g, source: 'geo' }), reason: 'geo' };
    }
  }
  return { loc: { ...SEOUL }, reason: 'fallback' };
}

function formatLastUpdated(ts) {
  if (!ts) return null;

  const diff = Date.now() - ts;
  if (diff < 0) return '방금 전';

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '방금 전';

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;

  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

async function syncToServer(loc) {
  try {
    await fetch('/session/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: loc.lat, lng: loc.lng }),
    });
  } catch {}
}

export const LocationStore = {
  SEOUL,
  saveLocation,
  loadLocation,
  clearLocation,
  geolocate,
  getPreferredLocation,
  syncToServer,
  formatLastUpdated,
};
