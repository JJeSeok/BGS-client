import { LocationStore } from './locationStore.js';

let map;
let marker = null;
let candidate = null;
let candidateSource = 'manual';

const panel = document.getElementById('confirm-panel');
const address = document.getElementById('cp-address');
const btnConfirm = document.getElementById('cp-confirm');
const btnCancel = document.getElementById('cp-cancel');

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
  if (!marker) {
    marker = new naver.maps.Marker({
      position: latlng,
      map,
      icon: {
        content: '<div class="icon-dot"></div>',
        anchor: new naver.maps.Point(10, 20),
      },
    });
  } else {
    marker.setPosition(latlng);
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
    console.log('reverseGeocode 함수 실행 안됨!');
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
          console.log('geocode 서버 이상!');
          return resolve(fallbackText);
        }
        const r = new Object();

        res.v2.results.forEach((v) => {
          const address = makeAddress(v);
          v.name === 'roadaddr' ? (r.roadaddr = address) : (r.addr = address);
        });

        const text = r?.roadaddr || r?.addr || fallbackText;
        resolve(text);
      }
    );
  });
}

async function setCandidate(latlng, source = 'manual') {
  candidate = latlng;
  candidateSource = source;
  placeMarker(latlng);
  map.setCenter(latlng);

  const { lat, lng } = fmtLatLng(latlng);
  const text = await reverseGeocode(
    latlng,
    `위도 ${lat.toFixed(6)}, 경도 ${lng.toFixed(6)}`
  );
  showPanel(text);
}

function confirmCurrentLocation() {
  if (!candidate) return;

  const { lat, lng } = fmtLatLng(candidate);
  const source = candidateSource === 'geo' ? 'geo' : 'user';
  LocationStore.saveLocation({ lat, lng, source });

  hidePanel();
  window.location.href = '/index.html';
}

async function initMap() {
  const { loc, reason } = await LocationStore.getPreferredLocation();
  const center = new naver.maps.LatLng(loc.lat, loc.lng);
  map = new naver.maps.Map('map', {
    center,
    zoom: reason === 'fallback' ? 14 : 17,
  });

  placeMarker(center);

  if (loc.source !== 'geo') {
    marker.setIcon(iconPinNeo());
  }

  naver.maps.Event.addListener(map, 'click', (e) => {
    const latlng = toLatLng(e.coord || e.latlng);
    if (!latlng) return;
    setCandidate(latlng);
    marker.setIcon(iconPinNeo());
  });

  btnConfirm.addEventListener('click', confirmCurrentLocation);
  btnCancel.addEventListener('click', hidePanel);
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
      marker.setIcon(iconDotPulse());
      map.setZoom(17);
    },
    () => alert('위치 접근이 거부되었어요.')
  );
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.naver || !naver.maps) {
    console.error(
      'Naver Maps JS가 로드되지 않았습니다. clientId 또는 도메인 허용을 확인하세요.'
    );
    return;
  }
  initMap();

  document.getElementById('btnHere').addEventListener('click', goMyLocation);
});
