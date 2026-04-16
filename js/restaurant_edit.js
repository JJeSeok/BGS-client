const API_BASE = 'http://localhost:8080';

const DAYS = [
  { value: 0, label: '일요일' },
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' },
];

const MAX_SUB_IMAGE_COUNT = 5;

const editState = {
  restaurantId: null,
  initialData: null,

  existingMainImageUrl: '',
  newMainImageFile: null,

  existingSubImages: [], // [{ id, imageUrl, sortOrder, isDeleted }]
  newSubImageFiles: [], // [{ file, previewUrl }]

  businessHours: [], // [{ dayOfWeek, isClosed, is24Hours, openTime, closeTime, breakStart, breakEnd, lastOrder }]
  menus: [], // [{ id, name, price, isNew, isDeleted }]

  isSubmitting: false,
};

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
    if (loginBtn) loginBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'block';
    if (userNameEl) userNameEl.textContent = me.username;
  } else {
    const back = window.location.pathname + window.location.search;
    location.href = `login.html?next=${encodeURIComponent(back)}`;
  }

  logoutBtn?.addEventListener('click', logout);
  return me;
}

function setToast(type, text) {
  const zone = document.getElementById('toastZone');
  if (!zone) return;

  zone.textContent = '';

  if (!text) return;

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

function readChecked(id) {
  const el = document.getElementById(id);
  return Boolean(el.checked);
}

function writeValue(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? '';
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
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

function getRestaurantIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? Number(id) : null;
}

function getBackToMyPageUrl() {
  return '/mypage.html';
}

function setSubmitting(isSubmitting) {
  editState.isSubmitting = isSubmitting;

  const submitButtons = [
    document.getElementById('submitBtn'),
    document.getElementById('topSubmitBtn'),
  ];

  submitButtons.forEach((btn) => {
    if (!btn) return;
    btn.disabled = isSubmitting;
    btn.textContent = isSubmitting ? '저장 중...' : '저장하기';
  });
}

function ensureDefaultBusinessHours(hours) {
  const byDay = new Map();

  if (Array.isArray(hours)) {
    hours.forEach((item) => {
      byDay.set(Number(item.dayOfWeek), {
        dayOfWeek: Number(item.dayOfWeek),
        isClosed: Boolean(item.isClosed),
        is24Hours: Boolean(item.is24Hours),
        openTime: item.openTime || '',
        closeTime: item.closeTime || '',
        breakStart: item.breakStart || '',
        breakEnd: item.breakEnd || '',
        lastOrder: item.lastOrder || '',
      });
    });
  }

  return DAYS.map((day) => {
    return (
      byDay.get(day.value) || {
        dayOfWeek: day.value,
        isClosed: false,
        is24Hours: false,
        openTime: '',
        closeTime: '',
        breakStart: '',
        breakEnd: '',
        lastOrder: '',
      }
    );
  });
}

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
}

/* ---------------------------
   네이버 지도
--------------------------- */
let map = null;
let marker = null;

function initNaverMap() {
  const mapEl = document.getElementById('naverMap');
  if (!mapEl || !window.naver?.maps) return;

  const center = new naver.maps.LatLng(37.5665, 126.978);

  map = new naver.maps.Map(mapEl, {
    center,
    zoom: 13,
  });

  naver.maps.Event.addListener(map, 'click', function (e) {
    const lat = e.coord.y.toFixed(7);
    const lng = e.coord.x.toFixed(7);

    updateLatLngUI(lat, lng);

    if (!marker) {
      marker = new naver.maps.Marker({ position: e.coord, map });
    } else {
      marker.setPosition(e.coord);
    }
  });
}

function setMapPosition(lat, lng) {
  if (!map || !window.naver?.maps || !lat || !lng) return;

  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return;

  const latlng = new naver.maps.LatLng(latNum, lngNum);
  map.setCenter(latlng);
  map.setZoom(16);

  if (!marker) {
    marker = new naver.maps.Marker({ position: latlng, map });
  } else {
    marker.setPosition(latlng);
  }
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
  writeValue('zonecode', data.zonecode || '');
  writeValue('road_address', data.roadAddress || '');
  writeValue('jibun_address', data.jibunAddress || '');

  if (data.sido) writeValue('sido', data.sido);
  if (data.sigungu) writeValue('sigugun', data.sigungu);
  if (data.bname) writeValue('dongmyun', data.bname);

  const addrForGeo = data.roadAddress || data.jibunAddress || '';
  if (addrForGeo) {
    geocodeToLatLng(addrForGeo).then((pos) => {
      if (!pos) return;
      updateLatLngUI(pos.lat.toFixed(7), pos.lng.toFixed(7));
      setMapPosition(pos.lat, pos.lng);
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
        '주소가 입력되었습니다. 필요하면 상세 주소를 입력하고 지도에서 위치를 미세 조정하세요.',
      );
      document.getElementById('detail_address')?.focus();
    },
  }).open();
}

/* ---------------------------
   수정용 데이터 조회
--------------------------- */
async function fetchRestaurantForEdit(restaurantId) {
  const res = await fetch(
    `${API_BASE}/restaurants/owner/${restaurantId}/edit`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
    },
  );

  if (res.status === 401) {
    const back = window.location.pathname + window.location.search;
    location.href = `login.html?next=${encodeURIComponent(back)}`;
    return null;
  }

  if (res.status === 403) {
    const error = new Error('수정 권한이 없습니다.');
    error.status = 403;
    throw error;
  }

  if (res.status === 404) {
    const error = new Error('식당 정보를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body?.message || '식당 정보를 불러오지 못했습니다.');
  }

  return body;
}

function fillBasicFields(data) {
  writeValue('name', data.name);
  writeValue('category', data.category);
  writeValue('branch_info', data.branch_info);
  writeValue('phone', data.phone);
  writeValue('description', data.description);

  writeValue('sido', data.sido);
  writeValue('sigugun', data.sigugun);
  writeValue('dongmyun', data.dongmyun);
  writeValue('zonecode', data.zonecode || '');

  writeValue('road_address', data.road_address);
  writeValue('jibun_address', data.jibun_address);

  writeValue('detail_address', '');

  writeValue('parking_info', data.parking_info || '');

  const takeoutEl = document.getElementById('takeout');
  const deliveryEl = document.getElementById('delivery');
  const reservationEl = document.getElementById('reservation');

  if (takeoutEl) takeoutEl.checked = Boolean(data.takeout);
  if (deliveryEl) deliveryEl.checked = Boolean(data.delivery);
  if (reservationEl) reservationEl.checked = Boolean(data.reservation);

  updateLatLngUI(data.lat, data.lng);
  setMapPosition(data.lat, data.lng);
}

function setCurrentMainImage(url) {
  editState.existingMainImageUrl = url || '';

  const img = document.getElementById('currentMainImage');
  const empty = document.getElementById('currentMainImageEmpty');

  if (!img || !empty) return;

  if (url) {
    img.src = getImageUrl(url);
    img.style.display = 'block';
    empty.style.display = 'none';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
    empty.style.display = 'block';
  }
}

function fillEditState(data) {
  editState.initialData = data;

  editState.existingSubImages = Array.isArray(data.subImages)
    ? data.subImages.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        sortOrder: img.sortOrder ?? 0,
        isDeleted: false,
      }))
    : [];

  editState.newSubImageFiles = [];

  editState.businessHours = ensureDefaultBusinessHours(data.businessHours);

  editState.menus = Array.isArray(data.menus)
    ? data.menus.map((menu, index) => ({
        id: menu.id,
        name: menu.name || '',
        price: menu.price ?? '',
        sortOrder: menu.sortOrder ?? menu.sort_order ?? index + 1,
        isNew: false,
        isDeleted: false,
      }))
    : [];

  setCurrentMainImage(data.mainImageUrl || '');
}

function fillEditForm(data) {
  fillBasicFields(data);
  fillEditState(data);
  renderExistingSubImages();
  renderNewSubImagePreviews();
  renderBusinessHours();
  renderMenus();
}

/* ---------------------------
   대표 이미지
--------------------------- */
function initMainImagePreview() {
  const input = document.getElementById('mainImage');
  const wrap = document.getElementById('mainImagePreviewWrap');
  const img = document.getElementById('mainImagePreview');

  if (!input || !wrap || !img) return;

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    editState.newMainImageFile = file || null;

    if (!file) {
      wrap.style.display = 'none';
      img.removeAttribute('src');
      return;
    }

    if (!file.type?.startsWith('image/')) {
      setToast('err', '이미지 파일만 업로드할 수 있습니다.');
      input.value = '';
      editState.newMainImageFile = null;
      wrap.style.display = 'none';
      img.removeAttribute('src');
      return;
    }

    const max = 5 * 1024 * 1024;
    if (file.size > max) {
      setToast('err', '이미지는 최대 5MB까지 업로드할 수 있습니다.');
      input.value = '';
      editState.newMainImageFile = null;
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

/* ---------------------------
   추가 이미지
--------------------------- */
function createSubImageCard({
  imageUrl,
  statusText,
  statusClass,
  onActionClick,
  actionText,
  isDeleted,
}) {
  const card = document.createElement('div');
  card.className = `sub-image-card${isDeleted ? ' is-marked-delete' : ''}`;

  const img = document.createElement('img');
  img.className = 'sub-image-thumb';
  img.alt = '추가 이미지';
  img.src = imageUrl;

  const body = document.createElement('div');
  body.className = 'sub-image-body';

  const meta = document.createElement('div');
  meta.className = 'sub-image-meta';

  const status = document.createElement('span');
  status.className = `sub-image-status ${statusClass || ''}`.trim();
  status.textContent = statusText;

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'sub-image-action';
  action.textContent = actionText;
  action.addEventListener('click', onActionClick);

  meta.appendChild(status);
  meta.appendChild(action);
  body.appendChild(meta);

  card.appendChild(img);
  card.appendChild(body);

  return card;
}

function renderExistingSubImages() {
  const wrap = document.getElementById('existingSubImages');
  if (!wrap) return;

  wrap.textContent = '';

  if (!editState.existingSubImages.length) {
    const empty = document.createElement('div');
    empty.className = 'help';
    empty.textContent = '등록된 추가 이미지가 없습니다.';
    wrap.appendChild(empty);
    return;
  }

  editState.existingSubImages.forEach((image) => {
    const card = createSubImageCard({
      imageUrl: getImageUrl(image.imageUrl),
      statusText: image.isDeleted ? '삭제 예정' : '기존 이미지',
      statusClass: image.isDeleted ? 'is-delete' : '',
      actionText: image.isDeleted ? '복원' : '삭제',
      isDeleted: image.isDeleted,
      onActionClick: () => {
        image.isDeleted = !image.isDeleted;

        const existingCount = getExistingSubImageCount();
        const canSlots = MAX_SUB_IMAGE_COUNT - existingCount;

        if (editState.newSubImageFiles.length > canSlots) {
          const removedFiles = editState.newSubImageFiles.splice(canSlots);
          removedFiles.forEach((item) => {
            URL.revokeObjectURL(item.previewUrl);
          });

          setToast(
            'err',
            `기존 이미지 상태가 변경되어 새 이미지 일부가 제거되었습니다. 최대 ${MAX_SUB_IMAGE_COUNT}장까지만 유지할 수 있습니다.`,
          );
        }

        renderExistingSubImages();
        renderNewSubImagePreviews();
      },
    });

    wrap.appendChild(card);
  });
}

function getExistingSubImageCount() {
  return editState.existingSubImages.filter((img) => !img.isDeleted).length;
}

function getNewSubImageCount() {
  return editState.newSubImageFiles.length;
}

function getTotalSubImageCount() {
  return getExistingSubImageCount() + getNewSubImageCount();
}

function initSubImagesInput() {
  const input = document.getElementById('subImages');
  if (!input) return;

  input.addEventListener('change', () => {
    const files = Array.from(input.files || []);

    if (!files.length) {
      editState.newSubImageFiles = [];
      renderNewSubImagePreviews();
      return;
    }

    const validFiles = [];
    const max = 5 * 1024 * 1024;
    const existingCount = getExistingSubImageCount();
    const canSlots = MAX_SUB_IMAGE_COUNT - existingCount;

    if (canSlots <= 0) {
      setToast(
        'err',
        `추가 이미지는 최대 ${MAX_SUB_IMAGE_COUNT}장까지 등록할 수 있습니다. 기존 이미지를 삭제한 뒤 다시 선택해주세요.`,
      );
      input.value = '';
      return;
    }

    for (const file of files) {
      if (!file.type?.startsWith('image/')) {
        setToast('err', '추가 이미지는 이미지 파일만 업로드할 수 있습니다.');
        continue;
      }

      if (file.size > max) {
        setToast('err', `파일 "${file.name}" 은(는) 5MB를 초과합니다.`);
        continue;
      }

      validFiles.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    editState.newSubImageFiles.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
    });

    editState.newSubImageFiles = validFiles;
    input.value = '';
    renderNewSubImagePreviews();
  });
}

function renderNewSubImagePreviews() {
  const wrap = document.getElementById('newSubImagesPreview');
  if (!wrap) return;

  wrap.textContent = '';

  const info = document.createElement('div');
  info.className = 'help';
  info.textContent = `추가 이미지 ${getTotalSubImageCount()} / ${MAX_SUB_IMAGE_COUNT}장`;
  wrap.appendChild(info);

  if (!editState.newSubImageFiles.length) {
    const empty = document.createElement('div');
    empty.className = 'help';
    empty.textContent = '새로 선택한 추가 이미지가 없습니다.';
    wrap.appendChild(empty);
    return;
  }

  editState.newSubImageFiles.forEach((item, index) => {
    const card = createSubImageCard({
      imageUrl: item.previewUrl,
      statusText: '새 이미지',
      statusClass: 'is-new',
      actionText: '제거',
      isDeleted: false,
      onActionClick: () => {
        URL.revokeObjectURL(item.previewUrl);
        editState.newSubImageFiles.splice(index, 1);
        renderNewSubImagePreviews();
      },
    });

    wrap.appendChild(card);
  });
}

/* ---------------------------
   영업시간
--------------------------- */
function createHoursField(labelText, inputEl) {
  const wrapper = document.createElement('div');

  const label = document.createElement('label');
  label.className = 'hours-field-label';
  label.textContent = labelText;

  wrapper.appendChild(label);
  wrapper.appendChild(inputEl);

  return wrapper;
}

function createTimeInput(value, disabled, onChange) {
  const input = document.createElement('input');
  input.type = 'time';
  input.className = 'form-control';
  input.value = value || '';
  input.disabled = disabled;
  input.addEventListener('change', onChange);
  return input;
}

function applyBusinessHourState(item, inputs, row) {
  const {
    closedCheckbox,
    allDayCheckbox,
    openInput,
    closeInput,
    breakStartInput,
    breakEndInput,
    lastOrderInput,
  } = inputs;

  closedCheckbox.checked = Boolean(item.isClosed);
  allDayCheckbox.checked = Boolean(item.is24Hours);

  closedCheckbox.disabled = Boolean(item.is24Hours);
  allDayCheckbox.disabled = Boolean(item.isClosed);

  const disableTimeInputs = Boolean(item.isClosed || item.is24Hours);

  openInput.disabled = disableTimeInputs;
  closeInput.disabled = disableTimeInputs;
  breakStartInput.disabled = disableTimeInputs;
  breakEndInput.disabled = disableTimeInputs;
  lastOrderInput.disabled = disableTimeInputs;

  row.className = `hour-row${item.isClosed ? ' is-closed' : ''}${item.is24Hours ? ' is-24hours' : ''}`;

  if (item.isClosed) {
    openInput.value = '';
    closeInput.value = '';
    breakStartInput.value = '';
    breakEndInput.value = '';
    lastOrderInput.value = '';
    return;
  }

  if (item.is24Hours) {
    openInput.value = '00:00';
    closeInput.value = '00:00';
    breakStartInput.value = '';
    breakEndInput.value = '';
    lastOrderInput.value = '';
    return;
  }

  openInput.value = item.openTime || '';
  closeInput.value = item.closeTime || '';
  breakStartInput.value = item.breakStart || '';
  breakEndInput.value = item.breakEnd || '';
  lastOrderInput.value = item.lastOrder || '';
}

function businessHourEvents(item, index, inputs, row) {
  const {
    closedCheckbox,
    allDayCheckbox,
    openInput,
    closeInput,
    breakStartInput,
    breakEndInput,
    lastOrderInput,
  } = inputs;

  closedCheckbox.addEventListener('change', () => {
    editState.businessHours[index].isClosed = closedCheckbox.checked;

    if (closedCheckbox.checked) {
      editState.businessHours[index].is24Hours = false;
      editState.businessHours[index].openTime = '';
      editState.businessHours[index].closeTime = '';
      editState.businessHours[index].breakStart = '';
      editState.businessHours[index].breakEnd = '';
      editState.businessHours[index].lastOrder = '';
    }

    applyBusinessHourState(editState.businessHours[index], inputs, row);
  });

  allDayCheckbox.addEventListener('change', () => {
    editState.businessHours[index].is24Hours = allDayCheckbox.checked;

    if (allDayCheckbox.checked) {
      editState.businessHours[index].isClosed = false;
      editState.businessHours[index].openTime = '00:00';
      editState.businessHours[index].closeTime = '00:00';
      editState.businessHours[index].breakStart = '';
      editState.businessHours[index].breakEnd = '';
      editState.businessHours[index].lastOrder = '';
    } else {
      editState.businessHours[index].openTime = '';
      editState.businessHours[index].closeTime = '';
    }

    applyBusinessHourState(editState.businessHours[index], inputs, row);
  });

  openInput.addEventListener('change', (e) => {
    if (
      editState.businessHours[index].isClosed ||
      editState.businessHours[index].is24Hours
    ) {
      return;
    }
    editState.businessHours[index].openTime = e.target.value;
  });

  closeInput.addEventListener('change', (e) => {
    if (
      editState.businessHours[index].isClosed ||
      editState.businessHours[index].is24Hours
    ) {
      return;
    }
    editState.businessHours[index].closeTime = e.target.value;
  });

  breakStartInput.addEventListener('change', (e) => {
    if (
      editState.businessHours[index].isClosed ||
      editState.businessHours[index].is24Hours
    ) {
      return;
    }
    editState.businessHours[index].breakStart = e.target.value;
  });

  breakEndInput.addEventListener('change', (e) => {
    if (
      editState.businessHours[index].isClosed ||
      editState.businessHours[index].is24Hours
    ) {
      return;
    }
    editState.businessHours[index].breakEnd = e.target.value;
  });

  lastOrderInput.addEventListener('change', (e) => {
    if (
      editState.businessHours[index].isClosed ||
      editState.businessHours[index].is24Hours
    ) {
      return;
    }
    editState.businessHours[index].lastOrder = e.target.value;
  });
}

function renderBusinessHours() {
  const list = document.getElementById('businessHoursList');
  if (!list) return;

  list.textContent = '';

  editState.businessHours.forEach((item, index) => {
    const dayInfo = DAYS.find((d) => d.value === item.dayOfWeek);

    const row = document.createElement('div');
    row.className = `hours-row`;

    const top = document.createElement('div');
    top.className = 'hours-row-top';

    const day = document.createElement('div');
    day.className = 'hours-day';
    day.textContent = dayInfo?.label || `요일 ${item.dayOfWeek}`;

    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'hours-toggle-group';

    const closedLabel = document.createElement('label');
    closedLabel.className = 'hours-check';

    const closedCheckbox = document.createElement('input');
    closedCheckbox.type = 'checkbox';

    const closedText = document.createElement('span');
    closedText.textContent = '휴무';

    closedLabel.appendChild(closedCheckbox);
    closedLabel.appendChild(closedText);

    const allDayLabel = document.createElement('label');
    allDayLabel.className = 'hours-check';

    const allDayCheckbox = document.createElement('input');
    allDayCheckbox.type = 'checkbox';

    const allDayText = document.createElement('span');
    allDayText.textContent = '24시간';

    allDayLabel.appendChild(allDayCheckbox);
    allDayLabel.appendChild(allDayText);

    toggleGroup.appendChild(closedLabel);
    toggleGroup.appendChild(allDayLabel);

    top.appendChild(day);
    top.appendChild(toggleGroup);

    const fields = document.createElement('div');
    fields.className = 'hours-fields';

    const openInput = createTimeInput(item.openTime, false, () => {});
    const closeInput = createTimeInput(item.closeTime, false, () => {});
    const breakStartInput = createTimeInput(item.breakStart, false, () => {});
    const breakEndInput = createTimeInput(item.breakEnd, false, () => {});
    const lastOrderInput = createTimeInput(item.lastOrder, false, () => {});

    fields.appendChild(createHoursField('오픈', openInput));
    fields.appendChild(createHoursField('마감', closeInput));
    fields.appendChild(createHoursField('브레이크 시작', breakStartInput));
    fields.appendChild(createHoursField('브레이크 종료', breakEndInput));
    fields.appendChild(createHoursField('라스트오더', lastOrderInput));

    row.appendChild(top);
    row.appendChild(fields);
    list.appendChild(row);

    const inputs = {
      closedCheckbox,
      allDayCheckbox,
      openInput,
      closeInput,
      breakStartInput,
      breakEndInput,
      lastOrderInput,
    };

    businessHourEvents(item, index, inputs, row);
    applyBusinessHourState(item, inputs, row);
  });
}

/* ---------------------------
   메뉴
--------------------------- */
function createMenuBadge(text, className = '') {
  const badge = document.createElement('span');
  badge.className = `menu-badge ${className}`.trim();
  badge.textContent = text;
  return badge;
}

function createMenuInput({ value, placeholder, type = 'text', onChange }) {
  const input = document.createElement('input');
  input.className = 'form-control';
  input.type = type;
  input.value = value ?? '';
  input.placeholder = placeholder || '';
  input.addEventListener('input', onChange);
  return input;
}

function renderMenus() {
  const list = document.getElementById('menuList');
  if (!list) return;

  list.textContent = '';

  if (!editState.menus.length) {
    const empty = document.createElement('div');
    empty.className = 'help';
    empty.textContent =
      '등록된 메뉴가 없습니다. 메뉴 추가 버튼으로 새 메뉴를 넣어보세요.';
    list.appendChild(empty);
    return;
  }

  editState.menus.forEach((menu, index) => {
    const card = document.createElement('div');
    card.className = `menu-card${menu.isDeleted ? ' is-marked-delete' : ''}`;

    const top = document.createElement('div');
    top.className = 'menu-card-top';

    const badgeWrap = document.createElement('div');
    if (menu.isDeleted) {
      badgeWrap.appendChild(createMenuBadge('삭제 예정', 'is-delete'));
    } else if (menu.isNew) {
      badgeWrap.appendChild(createMenuBadge('새 메뉴', 'is-new'));
    } else {
      badgeWrap.appendChild(createMenuBadge('기존 메뉴'));
    }

    const actions = document.createElement('div');
    actions.className = 'menu-card-actions';

    const toggleDeleteBtn = document.createElement('button');
    toggleDeleteBtn.type = 'button';
    toggleDeleteBtn.className = 'menu-action-btn';
    toggleDeleteBtn.textContent = menu.isDeleted ? '복원' : '삭제';
    toggleDeleteBtn.addEventListener('click', () => {
      if (menu.isNew && !menu.id) {
        editState.menus.splice(index, 1);
      } else {
        editState.menus[index].isDeleted = !editState.menus[index].isDeleted;
      }
      renderMenus();
    });

    actions.appendChild(toggleDeleteBtn);

    top.appendChild(badgeWrap);
    top.appendChild(actions);

    const fields = document.createElement('div');
    fields.className = 'menu-fields';

    const nameInput = createMenuInput({
      value: menu.name,
      placeholder: '메뉴명',
      onChange: (e) => {
        editState.menus[index].name = e.target.value;
      },
    });

    const priceInput = createMenuInput({
      value: menu.price,
      placeholder: '가격',
      type: 'number',
      onChange: (e) => {
        editState.menus[index].price = e.target.value;
      },
    });

    if (menu.isDeleted) {
      nameInput.disabled = true;
      priceInput.disabled = true;
    }

    fields.appendChild(nameInput);
    fields.appendChild(priceInput);

    card.appendChild(top);
    card.appendChild(fields);

    list.appendChild(card);
  });
}

function initAddMenuButton() {
  const btn = document.getElementById('addMenuBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    editState.menus.push({
      id: null,
      name: '',
      price: '',
      sortOrder: null,
      isNew: true,
      isDeleted: false,
    });
    renderMenus();
  });
}

function syncMenuSortOrder() {
  let order = 1;

  editState.menus.forEach((menu) => {
    if (menu.isDeleted) {
      menu.sortOrder = null;
      return;
    }
    menu.sortOrder = order;
    order += 1;
  });
}

/* ---------------------------
   유효성 검사 / FormData
--------------------------- */
function validateEditForm() {
  const name = readValue('name');
  const category = readValue('category');
  const sido = readValue('sido');
  const sigugun = readValue('sigugun');
  const dongmyun = readValue('dongmyun');

  if (!name || !category || !sido || !sigugun || !dongmyun) {
    return { error: '필수 항목(식당 이름/카테고리/지역)을 모두 입력해주세요.' };
  }

  const detail = readValue('detail_address');
  const roadBase = readValue('road_address');
  const jibunBase = readValue('jibun_address');

  if (detail && !roadBase && !jibunBase) {
    return { error: '상세 주소를 입력하려면 먼저 주소 검색을 해주세요.' };
  }

  const activeMenus = editState.menus.filter((menu) => !menu.isDeleted);
  for (const menu of activeMenus) {
    const nameTrim = String(menu.name || '').trim();
    if (!nameTrim) {
      return { error: '메뉴명은 비워둘 수 없습니다.' };
    }

    if (menu.price !== '' && Number(menu.price) < 0) {
      return { error: '메뉴 가격은 0 이상이어야 합니다.' };
    }
  }

  for (const item of editState.businessHours) {
    if (item.isClosed || item.is24Hours) continue;

    if (
      (item.openTime && !item.closeTime) ||
      (!item.openTime && item.closeTime)
    ) {
      return { error: '영업시간은 오픈/마감 시간을 함께 입력해주세요.' };
    }

    if (
      (item.breakStart && !item.breakEnd) ||
      (!item.breakStart && item.breakEnd)
    ) {
      return { error: '브레이크타임은 시작/종료 시간을 함께 입력해주세요.' };
    }
  }

  const totalSubImageCount = getTotalSubImageCount();
  if (totalSubImageCount > MAX_SUB_IMAGE_COUNT) {
    return {
      error: `추가 이미지는 최대 ${MAX_SUB_IMAGE_COUNT}장까지 등록할 수 있습니다.`,
    };
  }

  return { ok: true };
}

function buildEditFormData() {
  const validation = validateEditForm();
  if (validation.error) return { error: validation.error };

  const fd = new FormData();

  fd.append('name', readValue('name'));
  fd.append('category', readValue('category'));
  fd.append('sido', readValue('sido'));
  fd.append('sigugun', readValue('sigugun'));
  fd.append('dongmyun', readValue('dongmyun'));

  const branchInfo = readValue('branch_info');
  if (branchInfo) fd.append('branch_info', branchInfo);

  const phone = readValue('phone');
  if (phone) fd.append('phone', phone);

  const description = readValue('description');
  if (description) fd.append('description', description);

  const parkingInfo = readValue('parking_info');
  if (parkingInfo) fd.append('parking_info', parkingInfo);

  fd.append('takeout', String(readChecked('takeout')));
  fd.append('delivery', String(readChecked('delivery')));
  fd.append('reservation', String(readChecked('reservation')));

  const detail = readValue('detail_address');
  const roadBase = readValue('road_address');
  const jibunBase = readValue('jibun_address');

  const roadFull = joinAddress(roadBase, detail);
  const jibunFull = joinAddress(jibunBase, detail);

  if (roadFull) fd.append('road_address', roadFull);
  if (jibunFull) fd.append('jibun_address', jibunFull);

  const lat = readValue('lat');
  const lng = readValue('lng');
  if (lat) fd.append('lat', lat);
  if (lng) fd.append('lng', lng);

  if (editState.newMainImageFile) {
    fd.append('mainImage', editState.newMainImageFile);
  }

  const deleteSubImageIds = editState.existingSubImages
    .filter((img) => img.isDeleted)
    .map((img) => img.id);

  fd.append('deleteSubImageIds', JSON.stringify(deleteSubImageIds));

  editState.newSubImageFiles.forEach((item) => {
    fd.append('subImages', item.file);
  });

  const businessHoursPayload = editState.businessHours.map((item) => ({
    dayOfWeek: item.dayOfWeek,
    isClosed: Boolean(item.isClosed),
    is24Hours: Boolean(item.is24Hours),
    openTime: item.is24Hours ? '00:00' : item.openTime || null,
    closeTime: item.is24Hours ? '00:00' : item.closeTime || null,
    breakStart:
      item.isClosed || item.is24Hours ? null : item.breakStart || null,
    breakEnd: item.isClosed || item.is24Hours ? null : item.breakEnd || null,
    lastOrder: item.isClosed || item.is24Hours ? null : item.lastOrder || null,
  }));
  fd.append('businessHours', JSON.stringify(businessHoursPayload));

  syncMenuSortOrder();

  const menusPayload = editState.menus.map((menu) => ({
    id: menu.id || null,
    name: String(menu.name || '').trim(),
    price: normalizeNumber(menu.price),
    sortOrder: Number(menu.sortOrder) || null,
    isDeleted: Boolean(menu.isDeleted),
    isNew: Boolean(menu.isNew),
  }));
  fd.append('menus', JSON.stringify(menusPayload));

  return { formData: fd };
}

/* ---------------------------
   저장
--------------------------- */
async function submitEdit() {
  const { formData, error } = buildEditFormData();
  if (error) {
    setToast('err', error);
    return;
  }

  setSubmitting(true);

  try {
    const res = await fetch(
      `${API_BASE}/restaurants/owner/${editState.restaurantId}`,
      {
        method: 'PATCH',
        headers: {
          ...authHeaders(),
        },
        body: formData,
      },
    );

    if (res.status === 401) {
      const back = window.location.pathname + window.location.search;
      location.href = `login.html?next=${encodeURIComponent(back)}`;
      return;
    }

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setToast('err', body?.message || '식당 수정에 실패했습니다.');
      return;
    }

    setToast('ok', '레스토랑 정보가 수정되었습니다.');
    setTimeout(() => {
      window.location.href = getBackToMyPageUrl();
    }, 1500);
  } catch (err) {
    console.error(err);
    setToast('err', '수정 중 오류가 발생했습니다.');
  } finally {
    setSubmitting(false);
  }
}

/* ---------------------------
   이벤트
--------------------------- */
function initFormEvents() {
  const form = document.getElementById('editForm');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setToast('', '');
    await submitEdit();
  });

  document
    .getElementById('addrSearchBtn')
    ?.addEventListener('click', openDaumPostcode);
}

/* ---------------------------
   초기 진입
--------------------------- */
async function initEditPage() {
  editState.restaurantId = getRestaurantIdFromUrl();

  if (!editState.restaurantId) {
    setToast('err', '잘못된 접근입니다. 식당 ID가 없습니다.');
    return;
  }

  try {
    const data = await fetchRestaurantForEdit(editState.restaurantId);
    if (!data) return;

    const restaurant = data.data ?? data;

    fillEditForm(restaurant);
  } catch (err) {
    console.error(err);
    setToast('err', err.message || '식당 정보를 불러오지 못했습니다.');

    if (err.status === 403) {
      location.href = `/restaurant.html?id=${editState.restaurantId}`;
      return;
    }

    if (err.status === 404) {
      location.href = '/index.html';
      return;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initAuthMenu();

  initNaverMap();
  initMainImagePreview();
  initSubImagesInput();
  initAddMenuButton();
  initFormEvents();

  await initEditPage();
});
