const API_BASE = 'http://localhost:8080';

const id = new URLSearchParams(location.search).get('id');
if (!id) {
  alert('가게 ID가 없습니다. 메인으로 이동합니다.');
  location.href = 'index.html';
}
let data;

var starButton = document.getElementById('star_button');
var starButtonIcon = document.getElementById('star_icon');
var isClicked = false;

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

function updateTitle() {
  const titleName = [data?.name, data?.branch_info].join(' ');
  document.title = titleName ? titleName : 'baegoba';
}

async function init() {
  try {
    const res = await fetch(`${API_BASE}/restaurants/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    console.error(e);
    alert('상세 정보를 불러오지 못했습니다.');
    throw e;
  }

  updateTitle();
}

starButton.addEventListener('click', function () {
  if (isClicked) {
    starButtonIcon.classList.remove('star_button_icon-check');
    starButtonIcon.classList.add('star_button_icon');
    isClicked = false;
  } else {
    starButtonIcon.classList.remove('star_button_icon');
    starButtonIcon.classList.add('star_button_icon-check');
    isClicked = true;
  }
});

var filterButtons = document.getElementsByClassName(
  'restaurant_reviewList_filterButton'
);
var reviewContainer = document.getElementById('review_content');
var reviews = Array.from(
  reviewContainer.getElementsByClassName('restaurant_reviewList_reviewItem')
);
var recommends = reviewContainer.getElementsByClassName(
  'restaurant_reviewItem_RatingText'
);
var loadMoreButton = document.getElementById('moreButton');
const visibleReviews = 5;
var currentIndex = 0;
var filteredReviews = [];

for (var i = 0; i < filterButtons.length; i++) {
  filterButtons[i].addEventListener('click', function () {
    for (var j = 0; j < filterButtons.length; j++) {
      filterButtons[j].classList.remove(
        'restaurant_reviewList_filterButton-Selected'
      );
    }

    var fillter = this.textContent;
    this.classList.add('restaurant_reviewList_filterButton-Selected');
    if (fillter.includes('전체')) {
      filterReviews('전체');
    } else if (fillter.includes('맛있다')) {
      filterReviews('맛있다');
    } else if (fillter.includes('괜찮다')) {
      filterReviews('괜찮다');
    } else if (fillter.includes('별로')) {
      filterReviews('별로');
    }
  });
}

function filterReviews(filter) {
  currentIndex = 0;
  for (var i = 0; i < reviews.length; i++) {
    reviews[i].style.display = 'none';
  }

  filteredReviews = [];

  if (filter === '전체') {
    filteredReviews = reviews;
  } else {
    var j = 0;
    for (var i = 0; i < reviews.length; i++) {
      if (filter === recommends[i].textContent) {
        filteredReviews[j++] = reviews[i];
      }
    }
  }
  showReviews();
}

function showReviews() {
  for (var i = currentIndex; i < currentIndex + visibleReviews; i++) {
    if (filteredReviews[i]) {
      filteredReviews[i].style.display = 'block';
    }
  }

  currentIndex += visibleReviews;

  if (currentIndex >= filteredReviews.length) {
    loadMoreButton.style.display = 'none';
  } else {
    loadMoreButton.style.display = 'flex';
  }
}

loadMoreButton.addEventListener('click', showReviews);

window.onload = function () {
  filterButtons[0].click();
};

document.addEventListener('DOMContentLoaded', function () {
  initAuthMenu();
  init();
});
