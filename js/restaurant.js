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
    const back = location.pathname + location.search;
    loginBtn.href = `login.html?next=${encodeURIComponent(back)}`;

    loginBtn.style.display = 'block';
    userMenu.style.display = 'none';
  }

  logoutBtn?.addEventListener('click', logout);
}

function updateTitle() {
  const titleName = [data?.restaurant.name, data?.restaurant.branch_info].join(
    ' '
  );
  document.title = titleName ? titleName : 'baegoba';
}

function updateImg() {
  const imgShow = document.getElementById('imgShow');
  const photos = Array.isArray(data?.photos)
    ? [
        {
          url: data.restaurant.main_image_url,
          alt: `${data.restaurant.name} 대표 사진`,
        },
        ...data.photos,
      ]
    : [];

  photos.forEach((p) => {
    const figure = document.createElement('figure');
    figure.className = 'imgwrap';

    const img = document.createElement('img');
    img.src = normalizeImgUrl(p.url);
    img.alt = p.alt ?? '';
    img.loading = 'lazy';
    img.decoding = 'async';

    figure.appendChild(img);
    imgShow.appendChild(figure);
  });
}

function updateHeader() {
  document.querySelector('.restaurant_name').textContent =
    data?.restaurant.name ?? '';
  document.querySelector('.rate_point').textContent =
    data?.restaurant.rating_avg ?? '';
  document.querySelector('.rate_point').ariaLabel = `평점 ${
    data?.restaurant.rating_avg ?? ''
  }`;
  document.querySelector('.branch').textContent =
    data?.restaurant.branch_info ?? '';
}

function updateStatus() {
  const status = document.querySelectorAll('.status .cnt > span');

  status[0].textContent = data?.restaurant.view_count ?? 0;
  status[1].textContent =
    typeof data?.restaurant.review_count === 'number'
      ? new Intl.NumberFormat().format(data?.restaurant.review_count)
      : 0;
  status[2].textContent = data?.restaurant.like_count ?? 0;
}

function updateInfo() {
  const rows = document.querySelectorAll('.info tbody tr td');

  // 주소
  randerAddress(
    rows[0],
    data?.restaurant.road_address,
    data?.restaurant.jibun_address
  );

  // 전화
  rows[1].textContent = data?.restaurant.phone ?? '';

  // 음식 종류
  rows[2].textContent = data?.restaurant.category ?? '';

  // 업데이트 일시
  const time = document.querySelector('.update time');
  if (time && data?.restaurant.updatedAt) {
    const d = new Date(data.restaurant.updatedAt);
    time.dateTime = d.toISOString();
    time.textContent = `${d.getFullYear()}. ${
      d.getMonth() + 1
    }. ${d.getDate()}`;
  }

  // 식당 소개
  document.querySelector('.restaurantOwner_comment').textContent = data
    ?.restaurant.description
    ? data.restaurant.description
    : '식당 소개를 입력해주세요.';
}

async function init() {
  try {
    const res = await fetch(`${API_BASE}/restaurants/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    console.error(e);
    alert('상세 정보를 불러오지 못했습니다.');
    location.href = 'index.html';
    throw e;
  }

  updateTitle();
  updateImg();
  updateHeader();
  updateStatus();
  wireReviewLink();
  updateInfo();
}

function normalizeImgUrl(url) {
  try {
    const u = new URL(url, API_BASE);
    if (!['http:', 'https:'].includes(u.protocol)) {
      throw new Error('bad url');
    }
    return u.href;
  } catch (error) {
    return '';
  }
}

function randerAddress(td, road, jibun) {
  if (!road && !jibun) return;

  if (road) {
    td.textContent = road;
    if (jibun) {
      const br = document.createElement('br');

      const rect = document.createElement('span');
      rect.className = 'restaurant_infoAddress_rectangle';
      rect.textContent = '지번';

      const txt = document.createElement('span');
      txt.className = 'restaurant_infoAddress_text';
      txt.textContent = jibun;

      td.append(br, rect, txt);
    }
  } else {
    td.textContent = jibun;
  }
}

function wireReviewLink() {
  const currentDetail = location.pathname + location.search;
  const reviewUrl = `review_write.html?restaurant_id=${encodeURIComponent(id)}`;
  const reviewBtn = document.getElementById('reviewWriteButton');
  if (reviewBtn) {
    reviewBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const me = await fetchMe();

      if (me && me.username) {
        location.href = reviewUrl;
      } else {
        location.href = `login.html?next=${encodeURIComponent(reviewUrl)}`;
      }
    });
  }
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
