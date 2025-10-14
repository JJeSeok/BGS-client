const API_BASE = 'http://localhost:8080';

let layer_wrap = document.querySelector('.layer_wrap');
let Modal = document.querySelector('.Modal');
let closeButton = document.querySelector('.btn_layer_close');

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
    const items = await fetchList();
    if (!items || items.length === 0) {
      empty.style.display = 'block';
      return;
    }
    renderCards(grid, items);
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div class="text-center text-danger my-4">목록을 불러오지 못했어요</div>`;
  }
}

async function fetchList() {
  const res = await fetch(`${API_BASE}/restaurants`);
  if (!res.ok) throw new Error('목록 API 실패');
  return res.json();
}

function renderCards(grid, items) {
  const frag = document.createDocumentFragment();
  for (const it of items) {
    const avg = num(it.rating.avg, 0);
    const cnt = num(it.rating.count, 0);
    const addr = [
      it.address.sido.endsWith('도') ? it.address.sigugun : it.address.sido,
      it.address.dongmyun,
    ].join(' ');
    const img = it?.mainImageUrl || '/images/흠.png';
    const category = it.category;
    const name = it.name;

    const col = document.createElement('div');
    col.className = 'col mb-5';
    col.innerHTML = `
      <div class="card card-rest h-100" data-id"${it.id}">
        <img class="card-img-top" src="${img}" alt="${name}"/>
        <div class="card-body p-3 text-center">
          <h5 class="name">${name}</h5>
          <div class="meta">
            <span class="chip">${category}</span>
            <span class="dot">•</span>
            <span class="stars">★ ${avg}</span>
            <span class="dot">•</span>
            <span class="count">리뷰 ${cnt}</span>
          </div>
          <div class="address">${addr}</div>
        </div>
        <a class="stretched-link" href="./천원국수.html" aria-label="천원국수 상세로 이동"></a>
      </div>
    `;

    frag.appendChild(col);
  }
  grid.appendChild(frag);
}

/** TODO
 * XSS 공격 취약점 해결
 * 이미지 경로 서버로 옮기기 (express static)
 * 리뷰수 1000 넘으면 k로 표시할 건지
 */

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
  area_list[i].addEventListener('click', function () {
    for (let j = 0; j < area_list.length; j++) {
      area_list[j].classList.remove('on');
    }
    this.classList.add('on');

    if (i === 0) {
      filter_list[5].style.display = 'block';
    } else {
      filter_list[5].style.display = 'none';
    }
  });
}

for (let i = 0; i < filter_list.length; i++) {
  filter_list[i].addEventListener('click', function () {
    for (let j = 0; j < filter_list.length; j++) {
      filter_list[j].classList.remove('on');
    }
    this.classList.add('on');
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initAuthMenu();
  init();

  // URL에서 쿼리 스트링을 파싱하는 함수
  function getQueryStringParams(query = window.location.search) {
    return new URLSearchParams(query);
  }

  const params = getQueryStringParams();
  const selectedArea = params.get('area');
  const selectedSort = params.get('sort');

  let spanText_area = document.querySelectorAll('.area_list1 span').textContent;
  let spanText_filter =
    document.querySelectorAll('.filter_list1 span').textContent;

  // 선택된 필터에 'on' 클래스 적용
  if (selectedArea) {
    for (let i = 0; i < spanText_area.length; i++) {
      if (spanText_area[i] === selectedArea) {
        area_list[i].click();
      }
    }
  } else {
    area_list[0].click();
  }

  if (selectedSort) {
    for (let i = 0; i < spanText_filter.length; i++) {
      if (spanText_filter[i] === selectedSort) {
        filter_list[i].click();
      }
    }
  } else {
    filter_list[0].click();
  }
});

const searchInput = document.querySelector('.HomeSearchInput');
const searchRecently = document.querySelector('.search-recently');

searchInput.addEventListener('click', function () {
  searchRecently.style.display = 'block';
});

document.addEventListener('click', (event) => {
  if (event.target === searchInput || event.target === searchRecently) {
    return;
  }

  if (searchRecently.style.display === 'block') {
    searchRecently.style.display = 'none';
  }
});
