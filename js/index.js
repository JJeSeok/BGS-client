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
