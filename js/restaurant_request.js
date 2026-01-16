const API_BASE = 'http://localhost:8080';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchMe() {
  try {
    const res = await fetch(`${API_BASE}/users/me`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    if (res.status === 401) {
      localStorage.removeItem('token');
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function logout() {
  try {
    await fetch(`${API_BASE}/users/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
  } catch {}
  localStorage.removeItem('token');
  location.reload();
}

async function initAuthMenu() {
  const loginBtn = document.getElementById('login-link');
  const userMenu = document.getElementById('user-menu');
  const userNameEl = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');

  const me = await fetchMe();

  if (me && me.username) {
    loginBtn.style.display = 'none';
    userMenu.style.display = 'block';
    userNameEl.textContent = me.username;
  } else {
    const back = '/restaurant_request.html';
    location.href = `login.html?next=${encodeURIComponent(back)}`;
  }

  logoutBtn?.addEventListener('click', logout);
  return me;
}

function setToast(type, text) {
  const zone = document.getElementById('toastZone');
  zone.textContent = ''; // 안전하게 초기화

  const p = document.createElement('p');
  p.className = `toast-text ${type}`;
  p.textContent = text;
  zone.appendChild(p);

  zone.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function readValue(id) {
  const el = document.getElementById(id);
  return el ? String(el.value ?? '').trim() : '';
}

function writeValue(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? '';
}

function updateLatLngUI(lat, lng) {
  const latText = document.getElementById('latText');
  const lngText = document.getElementById('lngText');
  if (latText) latText.textContent = lat ? String(lat) : '-';
  if (lngText) lngText.textContent = lng ? String(lng) : '-';

  writeValue('lat', lat ? String(lat) : '');
  writeValue('lng', lng ? String(lng) : '');
}

function joinAddress(base, detail) {
  const b = String(base ?? '').trim();
  const d = String(detail ?? '').trim();
  if (!b) return null;
  if (!d) return b;

  return `${b} ${d}`;
}

function buildFormData() {
  const name = readValue('name');
  const category = readValue('category');
  const sido = readValue('sido');
  const sigugun = readValue('sigugun');
  const dongmyun = readValue('dongmyun');

  if (!name || !category || !sido || !sigugun || !dongmyun) {
    return { error: '필수 항목(식당이름/카테고리/지역)을 모두 입력해주세요.' };
  }

  const detail = readValue('detail_address');
  const roadBase = readValue('road_address');
  const jibunBase = readValue('jibun_address');

  if (detail && !roadBase && !jibunBase) {
    return { error: '상세 주소를 입력하려면 먼저 주소 검색을 해주세요.' };
  }

  const fd = new FormData();

  fd.append('name', name);
  fd.append('category', category);
  fd.append('sido', sido);
  fd.append('sigugun', sigugun);
  fd.append('dongmyun', dongmyun);

  const branch = readValue('branch_info');
  if (branch) fd.append('branch_info', branch);

  const phone = readValue('phone');
  if (phone) fd.append('phone', phone);

  const description = readValue('description');
  if (description) fd.append('description', description);

  const roadFull = joinAddress(roadBase, detail);
  const jibunFull = joinAddress(jibunBase, detail);
  if (roadFull) fd.append('road_address', roadFull);
  if (jibunFull) fd.append('jibun_address', jibunFull);

  const lat = readValue('lat');
  const lng = readValue('lng');
  if (lat) fd.append('lat', lat);
  if (lng) fd.append('lng', lng);

  const fileInput = document.getElementById('mainImage');
  const file = fileInput?.files?.[0];
  if (file) fd.append('mainImage', file);

  return { formData: fd };
}

async function submitRequest() {
  const { formData, error } = buildFormData();
  if (error) {
    setToast('err', error);
    return;
  }

  const res = await fetch(`${API_BASE}/restaurant-requests`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });

  if (res.status === 401) {
    const back = '/restaurant_request.html';
    location.href = `login.html?next=${encodeURIComponent(back)}`;
    return;
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    setToast('err', body?.message || '요청 처리에 실패했습니다.');
    return;
  }

  setToast('ok', '등록 요청이 접수되었습니다. 관리자 승인 후 반영됩니다.');
  setTimeout(() => {
    window.location.href = '/mypage.html';
  }, 3000);
  // 성공 후 폼 비우기(원하면 유지해도 됨)
}

function initFormEvents() {
  const form = document.getElementById('requestForm');
  const resetBtn = document.getElementById('resetBtn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setToast('', '');
    try {
      await submitRequest();
    } catch (err) {
      console.error(err);
      setToast('err', '요청 중 오류가 발생했습니다.');
    }
  });

  resetBtn?.addEventListener('click', () => {
    form?.reset();
    updateLatLngUI('', '');

    const fileInput = document.getElementById('mainImage');
    const wrap = document.getElementById('mainImagePreviewWrap');
    const img = document.getElementById('mainImagePreview');
    if (fileInput) fileInput.value = '';
    if (wrap) wrap.style.display = 'none';
    if (img) img.removeAttribute('src');

    setToast('', '');
  });
}

// 네이버 지도 초기화
let map = null;
let marker = null;

function initNaverMap() {
  const mapEl = document.getElementById('naverMap');
  if (!mapEl || !window.naver?.maps) return;

  const center = new naver.maps.LatLng(37.5665, 126.978);

  map = new naver.maps.Map(mapEl, { center, zoom: 13 });

  naver.maps.Event.addListener(map, 'click', function (e) {
    const lat = e.coord.y.toFixed(7);
    const lng = e.coord.x.toFixed(7);
    updateLatLngUI(lat, lng);

    if (!marker) marker = new naver.maps.Marker({ position: e.coord, map });
    else marker.setPosition(e.coord);
  });
}

function geocodeToLatLng(query) {
  return new Promise((resolve) => {
    if (!window.naver?.maps?.Service?.geocode) return resolve(null);

    naver.maps.Service.geocode({ query }, (status, response) => {
      if (status !== naver.maps.Service.Status.OK) return resolve(null);

      const item = response?.v2?.addresses?.[0];
      if (!item) return resolve(null);

      resolve({ lat: Number(item.y), lng: Number(item.x) });
    });
  });
}

function fillAddressFromDaum(data) {
  // 도로명/지번
  writeValue('zonecode', data.zonecode || '');
  writeValue('road_address', data.roadAddress || '');
  writeValue('jibun_address', data.jibunAddress || '');

  // 시/도, 시/군/구, 동/면 (가능한 범위 내 자동 채움)
  if (data.sido) writeValue('sido', data.sido);
  if (data.sigungu) writeValue('sigugun', data.sigungu);

  // bname: 법정동/법정리명 (예: 역삼동). 읍/면도 들어올 수 있음
  if (data.bname) writeValue('dongmyun', data.bname);

  // 지도 좌표 자동 세팅: 도로명 우선, 없으면 지번
  const addrForGeo = data.roadAddress || data.jibunAddress || '';
  if (addrForGeo) {
    geocodeToLatLng(addrForGeo).then((pos) => {
      if (!pos) return;

      updateLatLngUI(pos.lat.toFixed(7), pos.lng.toFixed(7));

      if (map) {
        const latlng = new naver.maps.LatLng(pos.lat, pos.lng);
        map.setCenter(latlng);
        map.setZoom(16);

        if (!marker) marker = new naver.maps.Marker({ position: latlng, map });
        else marker.setPosition(latlng);
      }
    });
  }
}

function openDaumPostcode() {
  if (!window.daum?.Postcode) {
    setToast('err', '주소 검색 스크립트가 로드되지 않았습니다.');
    return;
  }

  new daum.Postcode({
    oncomplete: function (data) {
      fillAddressFromDaum(data);
      setToast(
        'ok',
        '주소가 입력되었습니다. 필요하면 지도에서 위치를 클릭해 미세 조정하세요.'
      );
      // 상세주소로 포커스 이동
      document.getElementById('detail_address')?.focus();
    },
  }).open();
}

function initMainImagePreview() {
  const input = document.getElementById('mainImage');
  const wrap = document.getElementById('mainImagePreviewWrap');
  const img = document.getElementById('mainImagePreview');

  if (!input || !wrap || !img) return;

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) {
      wrap.style.display = 'none';
      img.removeAttribute('src');
      return;
    }

    if (!file.type?.startsWith('image/')) {
      setToast('err', '이미지 파일만 업로드할 수 있습니다.');
      input.value = '';
      wrap.style.display = 'none';
      img.removeAttribute('src');
      return;
    }

    const max = 5 * 1024 * 1024;
    if (file.size > max) {
      setToast('err', '이미지는 최대 5MB까지 업로드할 수 있습니다.');
      input.value = '';
      wrap.style.display = 'none';
      img.removeAttribute('src');
      return;
    }

    const url = URL.createObjectURL(file);
    img.src = url;
    wrap.style.display = 'block';

    img.onload = () => URL.revokeObjectURL(url);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initAuthMenu();
  initFormEvents();
  initNaverMap();
  initMainImagePreview();
  document
    .getElementById('addrSearchBtn')
    ?.addEventListener('click', openDaumPostcode);
});
