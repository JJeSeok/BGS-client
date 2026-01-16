const API_BASE = 'http://localhost:8080';
const RECENT_KEY = 'recent_searches';
const MAX_RECENT = 5;

let layer_wrap = document.querySelector('.layer_wrap');
let Modal = document.querySelector('.Modal');
let closeButton = document.querySelector('.btn_layer_close');
const mypageLink = document.querySelector('a[href="/mypage.html"]');
if (mypageLink) {
  mypageLink.addEventListener('click', (e) => {
    const token = localStorage.getItem('token');

    if (!token) {
      e.preventDefault();

      const back = '/mypage.html';
      location.href = `login.html?next=${encodeURIComponent(back)}`;
    }
  });
}

let selectedQ = '';
let selectedArea = null;
let selectedSort = null;

const SORT_LABEL = {
  추천순: 'default',
  평점순: 'rating',
  조회순: 'views',
  인기순: 'likes',
  리뷰순: 'reviews',
  // 거리순: distance
};

const SORT_CODE = {
  default: '추천순',
  rating: '평점순',
  views: '조회순',
  likes: '인기순',
  reviews: '리뷰순',
  // 거리순: distance
};

function getText(el) {
  return (el?.textContent ?? '').trim();
}

function clearEl(el) {
  el.innerHTML = '';
}

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
    loginBtn.style.display = 'block';
    userMenu.style.display = 'none';
  }

  logoutBtn?.addEventListener('click', logout);
}

async function init() {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');

  try {
    clearEl(grid);

    const items = await fetchList({
      sido: selectedArea,
      sort: selectedSort,
      q: selectedQ,
    });
    if (!items || items.length === 0) {
      empty.style.display = 'block';
      return;
    }
    renderCards(grid, items);
  } catch (e) {
    console.error(e);
    clearEl(grid);

    const div = document.createElement('div');
    div.className = 'text-center text-danger my-4';
    div.textContent = '목록을 불러오지 못했어요';
    grid.appendChild(div);
  }
}

async function fetchList({ sido, sort, q } = {}) {
  const qs = new URLSearchParams();
  if (sido) qs.set('sido', sido);
  if (sort) qs.set('sort', sort);
  if (q) qs.set('q', q);

  const url = qs.toString()
    ? `${API_BASE}/restaurants?${qs.toString()}`
    : `${API_BASE}/restaurants`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('목록 API 실패');
  return res.json();
}

function renderCards(grid, items) {
  const frag = document.createDocumentFragment();
  for (const it of items) {
    const avg = num(it.rating.avg, 0);
    const cnt = num(it.rating.count, 0);
    const addr = [
      it.address.sido,
      it.address.sigugun.split(' ')[0],
      it.address.dongmyun,
    ].join(' ');
    const category = it.category;
    const name = it.name;

    // col
    const col = div('col mb-5');

    // card
    const card = div('card card-rest h-100');
    card.dataset.id = it.id;

    //img
    const img = document.createElement('img');
    img.className = 'card-img-top';
    img.src = normalizeImgUrl(it?.mainImageUrl);
    img.alt = name;
    img.addEventListener('error', () => {
      img.src = '/images/흠.png';
    });

    //body
    const body = div('card-body p-3 text-center');

    // name
    const h5 = document.createElement('h5');
    h5.className = 'name';
    h5.textContent = name;

    // meta
    const meta = div('meta');
    meta.append(
      chip(category),
      dot(),
      textSpan('stars', `★ ${avg.toFixed(1)}`),
      dot(),
      textSpan('count', `리뷰 ${new Intl.NumberFormat().format(cnt)}`)
    );

    // address
    const addrEl = div('address', addr);

    // stretched Link
    const a = document.createElement('a');
    a.className = 'stretched-link';
    a.href = `restaurant.html?id=${encodeURIComponent(it.id)}`;
    a.setAttribute('aria-label', `${name} 상세로 이동`);

    body.append(h5, meta, addrEl);
    card.append(img, body, a);
    col.append(card);
    frag.append(col);
  }
  grid.append(frag);

  function div(cls, text) {
    const d = document.createElement('div');
    d.className = cls;
    if (text !== null) {
      d.textContent = text;
    }
    return d;
  }

  function span(cls, text) {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function chip(text) {
    return span('chip', text);
  }

  function dot() {
    return span('dot', '•');
  }

  function textSpan(cls, text) {
    return span(cls, text);
  }
}

function normalizeImgUrl(url) {
  if (!url) return '/images/흠.png';

  try {
    const u = new URL(url, API_BASE);
    if (!['http:', 'https:'].includes(u.protocol)) {
      throw new Error('bad url');
    }
    return u.href;
  } catch (error) {
    return '/images/흠.png';
  }
}

function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

document.querySelector('.btn_fillter').addEventListener('click', function () {
  layer_wrap.style.display = 'block';
  Modal.style.display = 'block';
});

document
  .querySelector('.btn_layer_close')
  .addEventListener('click', function () {
    layer_wrap.style.display = 'none';
    Modal.style.display = 'none';
  });

document.addEventListener('click', (event) => {
  if (event.target == Modal) {
    layer_wrap.style.display = 'none';
    Modal.style.display = 'none';
  }
});

let area_list = document.querySelectorAll('.area_list1');
let filter_list = document.querySelectorAll('.filter_list1');

for (let i = 0; i < area_list.length; i++) {
  area_list[i].addEventListener('click', async function (e) {
    e.preventDefault();

    area_list.forEach((li) => li.classList.remove('on'));
    this.classList.add('on');

    if (i === 0) filter_list[5].style.display = 'block';
    else filter_list[5].style.display = 'none';

    await applyFilters();
  });
}

for (let i = 0; i < filter_list.length; i++) {
  filter_list[i].addEventListener('click', async function (e) {
    e.preventDefault();

    filter_list.forEach((li) => li.classList.remove('on'));
    this.classList.add('on');

    const label = getText(this.querySelector('span')) || getText(this);
    if (label === '거리순') {
      alert('거리순은 아직입니다.');
      return;
    }

    await applyFilters();
  });
}

function readSelectedAreaFromUI() {
  const on = document.querySelector('.area_list1.on');
  const label = getText(on?.querySelector('span')) || getText(on);
  if (!label || label === '내위치') return;
  return label;
}

function readSelectedSortFromUI() {
  const on = document.querySelector('.filter_list1.on');
  const label = getText(on?.querySelector('span')) || getText(on);
  return SORT_LABEL[label] ?? null;
}

function syncUrlQuery() {
  const qs = new URLSearchParams();
  qs.set('area', selectedArea ?? '내위치');
  qs.set('sort', selectedSort ?? 'default');
  if (selectedQ) qs.set('q', selectedQ);

  history.replaceState(null, '', `${location.pathname}?${qs.toString()}`);
}

async function applyFilters() {
  selectedArea = readSelectedAreaFromUI();
  selectedSort = readSelectedSortFromUI();

  syncUrlQuery();
  await init();
}

function applyAreaUI(areaLabel) {
  area_list.forEach((li) => li.classList.remove('on'));

  let idx = 0;
  const spans = document.querySelectorAll('.area_list1 span');
  spans.forEach((sp, i) => {
    if (getText(sp) === areaLabel) idx = i;
  });

  area_list[idx]?.classList.add('on');

  if (idx === 0) filter_list[5].style.display = 'block';
  else filter_list[5].style.display = 'none';
}

function applySortUI(sortLabel) {
  filter_list.forEach((li) => li.classList.remove('on'));

  if (sortLabel === '거리순') sortLabel = '추천순';

  let idx = 0;
  const spans = document.querySelectorAll('.filter_list1 span');
  spans.forEach((sp, i) => {
    if (getText(sp) === sortLabel) idx = i;
  });

  filter_list[idx]?.classList.add('on');
}

document.addEventListener('DOMContentLoaded', async function () {
  initAuthMenu();

  const params = new URLSearchParams(window.location.search);
  const areaLabel = params.get('area') || '내위치';
  const sortLabel = SORT_CODE[params.get('sort')] || '추천순';
  const q = params.get('q') || '';

  applyAreaUI(areaLabel);

  selectedArea = areaLabel === '내위치' ? null : areaLabel;
  selectedQ = q;

  if (selectedQ) {
    selectedSort = 'rating';
    applySortUI('평점순');
  } else {
    selectedSort = SORT_LABEL[sortLabel] ?? null;
    applySortUI(sortLabel);
  }

  if (searchInput) searchInput.value = selectedQ;

  renderActiveMeta();
  syncUrlQuery();

  await init();
});

function renderActiveMeta() {
  const el = document.getElementById('search-active-meta');
  if (!el) return;

  const areaLabel = selectedArea ?? '내위치';
  const sortLabel = SORT_CODE[selectedSort] ?? '추천순';

  if (!selectedQ) {
    el.textContent = `지역: ${areaLabel} · 정렬: ${sortLabel}`;
  } else {
    el.textContent = `지역: ${areaLabel} · 정렬: ${sortLabel} · 검색: ${selectedQ}`;
  }
}

function loadRecent() {
  try {
    const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRecent(arr) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, MAX_RECENT)));
}

function addRecent(term) {
  const t = term.trim();
  if (!t) return;

  const arr = loadRecent().filter((x) => x !== t);
  arr.unshift(t);
  saveRecent(arr);
}

function removeRecent(term) {
  const arr = loadRecent().filter((x) => x !== term);
  saveRecent(arr);
}

function renderRecentUI() {
  const listEl = document.querySelector('.search-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const items = loadRecent();
  items.forEach((term) => {
    const li = document.createElement('li');

    const a = document.createElement('a');
    a.href = '#';
    a.className = 'recently-list';

    const span = document.createElement('span');
    span.textContent = term;
    a.appendChild(span);

    a.addEventListener('click', (e) => {
      e.preventDefault();
      runSearch(term);
    });

    const delWrap = document.createElement('span');
    delWrap.className = 'search-delete';

    const delBtn = document.createElement('a');
    delBtn.href = '#';
    delBtn.className = 'btn_search_delete';
    delBtn.addEventListener('click', (e) => {
      e.preventDefault();
      removeRecent(term);
      renderRecentUI();
    });

    delWrap.appendChild(delBtn);
    li.appendChild(a);
    li.appendChild(delWrap);

    listEl.appendChild(li);
  });
}

const searchForm = document.getElementById('search-form');
const searchInput = document.querySelector('.HomeSearchInput');
const searchRecently = document.querySelector('.search-recently');

async function runSearch(term) {
  selectedQ = (term ?? '').trim();
  if (searchInput) searchInput.value = selectedQ;

  if (selectedQ) {
    selectedSort = 'rating';
    applySortUI('평점순');

    addRecent(selectedQ);
    renderRecentUI();
  } else {
    selectedSort = 'default';
    applySortUI('추천순');
  }

  syncUrlQuery();
  renderActiveMeta();
  await init();
}

searchForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  runSearch(searchInput?.value ?? '');
});

searchInput.addEventListener('focus', function () {
  searchRecently.style.display = 'block';
  renderRecentUI();
});

document.addEventListener('click', (event) => {
  if (event.target === searchInput) return;
  if (searchRecently?.contains(event.target)) return;
  if (searchRecently && searchRecently.style.display === 'block') {
    searchRecently.style.display = 'none';
  }
});
