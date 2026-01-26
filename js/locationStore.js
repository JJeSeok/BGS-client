const STORAGE_KEY = 'app.currentLocation.v1';
const SEOUL = { lat: 37.5666102, lng: 126.9783811 };

const round = (n, p = 6) => Math.round(n * 10 ** p) / 10 ** p;

function saveLocation({ lat, lng, source = 'user' }) {
  const data = { lat: round(lat), lng: round(lng), source, ts: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

function loadLocation() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
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
};
