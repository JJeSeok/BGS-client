const SEOUL = new naver.maps.LatLng(37.5666102, 126.9783811);
let map, marker, info;

function initMap() {
  map = new naver.maps.Map('map', {
    center: SEOUL,
    zoom: 16,
  });

  marker = new naver.maps.Marker({
    position: SEOUL,
    map,
  });

  info = new naver.maps.InfoWindow({
    content: '<div style="padding:8px;">서울 시청</div>',
  });

  naver.maps.Event.addListener(marker, 'click', () => {
    if (info.getMap()) info.close();
    else info.open(map, marker);
  });
}

function goMyLocation() {
  if (!navigator.geolocation) {
    return alert('브라우저가 위치정보를 지원하지 않아요.');
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const here = new naver.maps.LatLng(latitude, longitude);
      map.setCenter(here);
      map.setZoom(16);
      marker.setPosition(here);
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
