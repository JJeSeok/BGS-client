import { LocationStore } from './locationStore.js';

const API_BASE = 'http://localhost:8080';

let map;
let userMarker = null;
let restaurantMarkers = [];
let candidate = null;
let candidateSource = 'manual';
let selectedRestaurant = null;
let selectedRestaurantMarker = null;
let ignoreNextMapClick = false;
let mapReady = false;
let restaurantMarkerRequestId = 0;

const panel = document.getElementById('confirm-panel');
const address = document.getElementById('cp-address');
const btnConfirm = document.getElementById('cp-confirm');
const btnCancel = document.getElementById('cp-cancel');
const btnSearchArea = document.getElementById('btn-search-area');
const restaurantCard = document.getElementById('restaurant-card');
const restaurantCardCategory = document.getElementById(
  'restaurant-card-category',
);
const restaurantCardName = document.getElementById('restaurant-card-name');
const restaurantCardMeta = document.getElementById('restaurant-card-meta');
const restaurantCardAddress = document.getElementById(
  'restaurant-card-address',
);
const restaurantCardDetail = document.getElementById('restaurant-card-detail');
const restaurantCardClose = document.getElementById('restaurant-card-close');

function toLatLng(p) {
  if (!p) return null;
  if (p instanceof naver.maps.LatLng) return p;
  if ('x' in p && 'y' in p) return new naver.maps.LatLng(p.y, p.x);
  return null;
}

function fmtLatLng(latlng) {
  const lat = latlng.lat ? latlng.lat() : latlng.y;
  const lng = latlng.lng ? latlng.lng() : latlng.x;
  return { lat, lng };
}

function placeMarker(latlng) {
  if (!userMarker) {
    userMarker = new naver.maps.Marker({
      position: latlng,
      map,
      icon: {
        content: '<div class="icon-dot"></div>',
        anchor: new naver.maps.Point(10, 20),
      },
    });
  } else {
    userMarker.setPosition(latlng);
  }
}

function iconPinNeo() {
  const content = '<div class="icon-pin-neo"></div>';
  const anchor = new naver.maps.Point(12, 24);
  return { content, anchor };
}

function iconDotPulse() {
  const content = '<div class="icon-dot"></div>';
  const anchor = new naver.maps.Point(10, 20);
  return { content, anchor };
}

function iconRestaurantMarker() {
  const content = '<div class="icon-restaurant-marker"></div>';
  const anchor = new naver.maps.Point(14, 32);
  return { content, anchor };
}

function iconRestaurantMarkerActive() {
  const content = '<div class="icon-restaurant-marker is-active"></div>';
  const anchor = new naver.maps.Point(16, 36);
  return { content, anchor };
}

function clearRestaurantMarkers() {
  restaurantMarkers.forEach((restaurantMarker) =>
    restaurantMarker.setMap(null),
  );
  restaurantMarkers = [];
}

function formatDistance(distance) {
  const n = Number(distance);
  if (!Number.isFinite(n)) return '거리 정보 없음';
  if (n < 1) return `${Math.round(n * 1000)}m`;
  return `${n.toFixed(1)}km`;
}

function showRestaurantCard(restaurant) {
  selectedRestaurant = restaurant;

  restaurantCardCategory.textContent = restaurant.category || '기타';
  restaurantCardName.textContent = restaurant.name || '이름 없는 식당';

  const ratingAvg = Number(restaurant.rating_avg || 0);
  const rating = ratingAvg === 0 ? '0' : ratingAvg.toFixed(1);
  const reviewCount = Number(restaurant.review_count || 0);
  const distance = formatDistance(restaurant.distance);

  restaurantCardMeta.textContent = `평점 ${rating} · 리뷰 ${reviewCount}개 · ${distance}`;
  restaurantCardAddress.textContent = restaurant.address || '주소 정보 없음';

  hidePanel();
  restaurantCard.classList.remove('hidden');
}

function hideRestaurantCard() {
  selectedRestaurant = null;
  clearActiveRestaurantMarker();
  restaurantCard.classList.add('hidden');
}

function isRestaurantCardOpen() {
  return !restaurantCard.classList.contains('hidden');
}

function setActiveRestaurantMarker(restaurantMarker) {
  if (selectedRestaurantMarker && selectedRestaurantMarker !== restaurantMarker) {
    selectedRestaurantMarker.setIcon(iconRestaurantMarker());
  }

  selectedRestaurantMarker = restaurantMarker;
  selectedRestaurantMarker.setIcon(iconRestaurantMarkerActive());
}

function clearActiveRestaurantMarker() {
  if (!selectedRestaurantMarker) return;

  selectedRestaurantMarker.setIcon(iconRestaurantMarker());
  selectedRestaurantMarker = null;
}

function showSearchAreaButton() {
  btnSearchArea.classList.remove('hidden');
}

function hideSearchAreaButton() {
  btnSearchArea.classList.add('hidden');
}

function handleMapChanged() {
  if (!mapReady) return;
  showSearchAreaButton();
}

async function loadRestaurantMarkers(lat, lng) {
  const requestId = ++restaurantMarkerRequestId;

  const qs = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });

  try {
    const res = await fetch(`${API_BASE}/restaurants/map?${qs.toString()}`);
    if (!res.ok) throw new Error('Restaurant marker API failed');

    const restaurants = await res.json();
    if (!Array.isArray(restaurants)) return;
    if (requestId !== restaurantMarkerRequestId) return;

    selectedRestaurant = null;
    restaurantCard.classList.add('hidden');
    selectedRestaurantMarker = null;
    clearRestaurantMarkers();
    restaurantMarkers = restaurants
      .filter((restaurant) => restaurant.lat != null && restaurant.lng != null)
      .map((restaurant) => {
        const restaurantMarker = new naver.maps.Marker({
          position: new naver.maps.LatLng(restaurant.lat, restaurant.lng),
          map,
          title: restaurant.name,
          icon: iconRestaurantMarker(),
        });

        naver.maps.Event.addListener(restaurantMarker, 'click', () => {
          ignoreNextMapClick = true;
          setActiveRestaurantMarker(restaurantMarker);
          showRestaurantCard(restaurant);
          setTimeout(() => {
            ignoreNextMapClick = false;
          }, 0);
        });

        return restaurantMarker;
      });
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function searchCurrentMapArea() {
  const center = map.getCenter();
  const { lat, lng } = fmtLatLng(center);

  const loaded = await loadRestaurantMarkers(lat, lng);
  if (loaded) {
    hideSearchAreaButton();
  }
}

function showPanel(text) {
  if (text) address.textContent = text;
  panel.classList.remove('hidden');
}

function hidePanel() {
  panel.classList.add('hidden');
}

function makeAddress(addr) {
  if (!addr) {
    return;
  }

  const { name, region, land } = addr;
  const isRoadAddress = name === 'roadaddr';
  let sido = '';
  let sigugun = '';
  let dongmyun = '';
  let ri = '';
  let rest = '';

  if (hasArea(region.area1)) {
    sido = region.area1.name;
  }

  if (hasArea(region.area2)) {
    sigugun = region.area2.name;
  }

  if (hasArea(region.area3)) {
    dongmyun = region.area3.name;
  }

  if (hasArea(region.area4)) {
    ri = region.area4.name;
  }

  if (land) {
    if (hasData(land.number1)) {
      if (hasData(land.type) && land.type === '2') {
        rest += '산';
      }

      rest += land.number1;

      if (hasData(land.number2)) {
        rest += '-' + land.number2;
      }
    }

    if (isRoadAddress === true) {
      if (!dongmyun.endsWith('동')) {
        ri = land.name;
      } else {
        dongmyun = land.name;
        ri = '';
      }
    }
  }

  if (ri === '') {
    return [sido, sigugun, dongmyun, rest].join(' ');
  } else {
    return [sido, sigugun, dongmyun, ri, rest].join(' ');
  }
}

function hasArea(area) {
  return !!(area && area.name && area.name !== '');
}

function hasData(data) {
  return !!(data && data !== '');
}

function reverseGeocode(latlng, fallbackText = '좌표 선택됨') {
  if (!naver.maps.Service || !naver.maps.Service.reverseGeocode) {
    return Promise.resolve(fallbackText);
  }
  return new Promise((resolve) => {
    naver.maps.Service.reverseGeocode(
      {
        coords: latlng,
        orders: [
          naver.maps.Service.OrderType.ADDR,
          naver.maps.Service.OrderType.ROAD_ADDR,
        ].join(','),
      },
      (status, res) => {
        if (status !== naver.maps.Service.Status.OK) {
          return resolve(fallbackText);
        }
        const r = new Object();

        res.v2.results.forEach((v) => {
          const address = makeAddress(v);
          v.name === 'roadaddr' ? (r.roadaddr = address) : (r.addr = address);
        });

        const text = r?.roadaddr || r?.addr || fallbackText;
        resolve(text);
      },
    );
  });
}

async function setCandidate(latlng, source = 'manual') {
  candidate = latlng;
  candidateSource = source;
  hideRestaurantCard();
  placeMarker(latlng);
  map.setCenter(latlng);

  const { lat, lng } = fmtLatLng(latlng);
  const text = await reverseGeocode(
    latlng,
    `위도 ${lat.toFixed(6)}, 경도 ${lng.toFixed(6)}`,
  );
  showPanel(text);
}

function getBackUrl() {
  const params = new URLSearchParams(location.search);
  const back = params.get('back');
  if (!back) return '/index.html';

  if (back.startsWith('/')) return back;
  return '/index.html';
}

function confirmCurrentLocation() {
  if (!candidate) return;

  const { lat, lng } = fmtLatLng(candidate);
  const source = candidateSource === 'geo' ? 'geo' : 'user';
  LocationStore.saveLocation({ lat, lng, source });

  hidePanel();
  window.location.href = getBackUrl();
}

async function initMap() {
  const { loc, reason } = await LocationStore.getPreferredLocation({
    saveGeo: false,
  });
  const center = new naver.maps.LatLng(loc.lat, loc.lng);
  map = new naver.maps.Map('map', {
    center,
    zoom: reason === 'fallback' ? 14 : 17,
  });

  placeMarker(center);
  loadRestaurantMarkers(loc.lat, loc.lng);

  if (loc.source !== 'geo') {
    userMarker.setIcon(iconPinNeo());
  }

  naver.maps.Event.addListener(map, 'click', (e) => {
    if (ignoreNextMapClick) {
      ignoreNextMapClick = false;
      return;
    }

    if (isRestaurantCardOpen()) {
      hideRestaurantCard();
      return;
    }

    const latlng = toLatLng(e.coord || e.latlng);
    if (!latlng) return;
    setCandidate(latlng);
    userMarker.setIcon(iconPinNeo());
  });
  naver.maps.Event.addListener(map, 'dragend', handleMapChanged);
  naver.maps.Event.addListener(map, 'zoom_changed', handleMapChanged);

  btnConfirm.addEventListener('click', confirmCurrentLocation);
  btnCancel.addEventListener('click', hidePanel);
  btnSearchArea.addEventListener('click', searchCurrentMapArea);
  restaurantCardClose.addEventListener('click', hideRestaurantCard);
  restaurantCardDetail.addEventListener('click', () => {
    if (!selectedRestaurant) return;
    location.href = `/restaurant.html?id=${selectedRestaurant.id}`;
  });

  setTimeout(() => {
    mapReady = true;
  }, 0);
}

function goMyLocation() {
  if (!navigator.geolocation) {
    return alert('브라우저가 위치정보를 지원하지 않아요.');
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const latlng = new naver.maps.LatLng(latitude, longitude);
      setCandidate(latlng, 'geo');
      userMarker.setIcon(iconDotPulse());
      map.setZoom(17);
    },
    () => alert('위치 접근이 거부되었어요.'),
  );
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.naver || !naver.maps) {
    console.error(
      'Naver Maps JS가 로드되지 않았습니다. clientId 또는 도메인 허용을 확인하세요.',
    );
    return;
  }
  initMap();

  document.getElementById('btnHere').addEventListener('click', goMyLocation);
});
