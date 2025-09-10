const SEOUL = new naver.maps.LatLng(37.5666102, 126.9783811);

let map, info;
let marker = null;
let candidate = null;
let currnetLocation = null;

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
        content: '<div class="my-pin"></div>',
        size: new naver.maps.Size(24, 24),
        anchor: new naver.maps.Point(12, 24),
      },
      clickable: true,
    });
  } else {
    marker.setPosition(latlng);
  }
}

function showPanel(text) {
  if (text) address.textContent = text;
  panel.classList.remove('hidden');
}

function hidePanel() {
  panel.classList.add('hidden');
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
          naver.maps.Service.OrderType.LEGAL_CODE,
          naver.maps.Service.OrderType.ADDR,
          naver.maps.Service.OrderType.ROAD_ADDR,
          naver.maps.Service.OrderType.ADM_CODE,
        ].join(','),
      },
      (status, res) => {
        if (status !== naver.maps.Service.Status.OK) {
          console.log('geocode 서버 이상!');
          return resolve(fallbackText);
        }
        const r = res.results && res.results[0];
        /** TODO
         * 도로명, 지번 주소 보내기
         * 그냥 roadAddress, jibunAddress로 보내면 안됨
         * addr과 roadaddr 값을 이용해서 문자열 조합하기
         * 주소 보내는 우선 순위는 도로명.
         */
        console.log(res);
        const text = r?.roadAddress || r?.jibunAddress || fallbackText;
        resolve(text);
      }
    );
  });
}

async function setCandidate(latlng) {
  candidate = latlng;
  placeMarker(latlng);
  map.setCenter(latlng);
  const { lat, lng } = fmtLatLng(latlng);
  const text = await reverseGeocode(
    latlng,
    `위도 ${lat.toFixed(6)}, 경도 ${lng.toFixed(6)}`
  );
  showPanel(text);
}

function initMap() {
  map = new naver.maps.Map('map', {
    center: SEOUL,
    zoom: 16,
  });

  marker = new naver.maps.Marker({
    position: SEOUL,
    map,
    icon: {
      content: '<div class="my-pin"></div>',
      size: new naver.maps.Size(24, 24),
      anchor: new naver.maps.Point(12, 24),
    },
    clickable: true,
  });

  info = new naver.maps.InfoWindow({
    content: '<div style="padding:8px;">서울 시청</div>',
  });

  naver.maps.Event.addListener(marker, 'click', () => {
    if (info.getMap()) info.close();
    else info.open(map, marker);
  });

  naver.maps.Event.addListener(map, 'click', (e) => {
    const latlng = toLatLng(e.coord || e.latlng);
    if (!latlng) return;
    setCandidate(latlng);
  });
}

function goMyLocation() {
  if (!navigator.geolocation) {
    return alert('브라우저가 위치정보를 지원하지 않아요.');
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const latlng = new naver.maps.LatLng(latitude, longitude);
      setCandidate(latlng);
      map.setZoom(16);
      info.setContent('<div style="padding:8px;">내 위치</div>');
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
