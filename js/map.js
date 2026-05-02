import { LocationStore } from './locationStore.js';

const API_BASE = 'http://localhost:8080';
const SEARCH_NOTICE_DURATION = 3500;
const EMPTY_SEARCH_NOTICE_DURATION = 5000;

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
let currentQuery = '';
let suppressSearchAreaButton = false;
let searchNoticeTimer = null;

const panel = document.getElementById('confirm-panel');
const address = document.getElementById('cp-address');
const btnConfirm = document.getElementById('cp-confirm');
const btnCancel = document.getElementById('cp-cancel');
const btnHome = document.getElementById('btnHome');
const btnMyLocation = document.getElementById('btnMyLocation');
const btnSearchArea = document.getElementById('btn-search-area');
const mapSearchForm = document.getElementById('map-search-form');
const searchInput = document.getElementById('q');
const mapSearchNotice = document.getElementById('map-search-notice');
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

function normalizeMapResponse(data) {
  if (Array.isArray(data)) {
    return { restaurants: data, meta: null };
  }

  return {
    restaurants: Array.isArray(data?.restaurants) ? data.restaurants : [],
    meta: data?.meta ?? null,
  };
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
  updateMyLocationButtonVisibility();
}

function hideRestaurantCard() {
  selectedRestaurant = null;
  clearActiveRestaurantMarker();
  restaurantCard.classList.add('hidden');
  updateMyLocationButtonVisibility();
}

function isRestaurantCardOpen() {
  return !restaurantCard.classList.contains('hidden');
}

function isPanelOpen() {
  return !panel.classList.contains('hidden');
}

function updateMyLocationButtonVisibility() {
  if (!btnMyLocation) return;

  btnMyLocation.classList.toggle(
    'hidden',
    isRestaurantCardOpen() || isPanelOpen(),
  );
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

function resetRestaurantSelection() {
  selectedRestaurant = null;
  selectedRestaurantMarker = null;
  restaurantCard.classList.add('hidden');
  updateMyLocationButtonVisibility();
}

function showSearchAreaButton() {
  btnSearchArea.classList.remove('hidden');
}

function hideSearchAreaButton() {
  btnSearchArea.classList.add('hidden');
}

function showSearchNotice(message, duration = SEARCH_NOTICE_DURATION) {
  if (!mapSearchNotice) return;
  clearTimeout(searchNoticeTimer);
  mapSearchNotice.textContent = message;
  mapSearchNotice.classList.remove('hidden');

  searchNoticeTimer = setTimeout(() => {
    hideSearchNotice();
  }, duration);
}

function hideSearchNotice() {
  if (!mapSearchNotice) return;
  clearTimeout(searchNoticeTimer);
  searchNoticeTimer = null;
  mapSearchNotice.classList.add('hidden');
  mapSearchNotice.textContent = '';
}

function handleMapChanged() {
  if (!mapReady) return;
  if (suppressSearchAreaButton) return;
  hideSearchNotice();
  showSearchAreaButton();
}

function setSearchAreaSuppressed() {
  suppressSearchAreaButton = true;
  setTimeout(() => {
    suppressSearchAreaButton = false;
  }, 200);
}

async function loadRestaurantMarkers(lat, lng, q = '') {
  const requestId = ++restaurantMarkerRequestId;

  const qs = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  const keyword = q.trim();
  if (keyword) {
    qs.set('q', keyword);
  }

  try {
    const res = await fetch(`${API_BASE}/restaurants/map?${qs.toString()}`);
    if (!res.ok) throw new Error('Restaurant marker API failed');

    const data = await res.json();
    const { restaurants, meta } = normalizeMapResponse(data);
    if (requestId !== restaurantMarkerRequestId) return null;

    resetRestaurantSelection();
    hidePanel();
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
        restaurantMarker.restaurantId = restaurant.id;

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
    return { restaurants, meta };
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function searchCurrentMapArea() {
  const center = map.getCenter();
  const { lat, lng } = fmtLatLng(center);

  resetRestaurantSelection();
  hidePanel();
  const loaded = await loadRestaurantMarkers(lat, lng, currentQuery);
  if (loaded === null) return;
  if (loaded) {
    hideSearchAreaButton();
    renderSearchResult(loaded, currentQuery);
    focusSingleSearchResult(loaded.restaurants);
  }
}

function getResultCount(restaurants, meta) {
  const count = Number(meta?.count);
  return Number.isFinite(count) ? count : restaurants.length;
}

function renderSearchResult(result, keyword) {
  const q = keyword.trim();
  if (!q) {
    hideSearchNotice();
    return;
  }

  const { restaurants, meta } = result;
  const count = getResultCount(restaurants, meta);

  if (restaurants.length === 0) {
    showSearchNotice(
      '현재 지도 주변의 등록 식당 중 검색 결과가 없습니다.',
      EMPTY_SEARCH_NOTICE_DURATION,
    );
    return;
  }

  showSearchNotice(`등록된 식당 ${count}개를 찾았습니다.`);
}

function focusSingleSearchResult(restaurants) {
  if (!currentQuery || restaurants.length !== 1) return;

  const restaurant = restaurants[0];
  if (restaurant.lat == null || restaurant.lng == null) return;

  const latlng = new naver.maps.LatLng(restaurant.lat, restaurant.lng);
  if (Number(map.getZoom()) < 16) {
    setSearchAreaSuppressed();
    map.setZoom(16);
  }
  map.setCenter(latlng);

  const restaurantMarker = restaurantMarkers.find(
    (marker) => marker.restaurantId === restaurant.id,
  );
  if (restaurantMarker) {
    setActiveRestaurantMarker(restaurantMarker);
  }
  showRestaurantCard(restaurant);
}

async function runMapSearch() {
  currentQuery = searchInput?.value.trim() ?? '';
  const center = map.getCenter();
  const { lat, lng } = fmtLatLng(center);

  resetRestaurantSelection();
  hidePanel();
  const result = await loadRestaurantMarkers(lat, lng, currentQuery);
  hideSearchAreaButton();

  if (result === null) return;
  if (!result) {
    showSearchNotice('검색 결과를 불러오지 못했어요.');
    return;
  }

  renderSearchResult(result, currentQuery);

  focusSingleSearchResult(result.restaurants);
}

function showPanel(text) {
  if (text) address.textContent = text;
  panel.classList.remove('hidden');
  updateMyLocationButtonVisibility();
}

function hidePanel() {
  panel.classList.add('hidden');
  updateMyLocationButtonVisibility();
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
  mapSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    runMapSearch();
  });
  btnHome.addEventListener('click', () => {
    location.href = '/index.html';
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

  btnMyLocation.addEventListener('click', goMyLocation);
  updateMyLocationButtonVisibility();
});
