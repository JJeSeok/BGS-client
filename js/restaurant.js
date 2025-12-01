const API_BASE = 'http://localhost:8080';

const id = new URLSearchParams(location.search).get('id');
if (!id) {
  alert('가게 ID가 없습니다. 메인으로 이동합니다.');
  location.href = 'index.html';
}
let data;
let allReviews = [];
const reviewItemTemplate = document.getElementById('review-item-template');
const filterButtons = document.getElementsByClassName(
  'restaurant_reviewList_filterButton'
);
const reviewContainer = document.getElementById('review_content');
if (reviewContainer) {
  reviewContainer.addEventListener('click', onReviewReactionClick);
}
const loadMoreButton = document.getElementById('moreButton');
// 페이지네이션 적용할 때 이 코드 삭제
if (loadMoreButton) {
  loadMoreButton.style.display = 'none';
}

const RATING_CATEGORY_MAP = {
  good: { label: '맛있다', cssClass: 'Rating_Recommend' },
  ok: { label: '괜찮다', cssClass: 'Rating_Ok' },
  bad: { label: '별로', cssClass: 'Rating_Bad' },
};

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

function AvgFromReviews() {
  if (!Array.isArray(allReviews) || allReviews.length === 0) {
    return;
  }

  const sum = allReviews.reduce((acc, r) => {
    const v = typeof r.rating === 'number' ? r.rating : 0;
    return acc + v;
  }, 0);

  const avg = sum / allReviews.length;
  if (data) data.restaurant.rating_avg = Math.round(avg * 10) / 20;
}

function setupReviewFilterCounst() {
  const total = allReviews.length;
  const good = allReviews.filter((r) => r.ratingCategory === 'good').length;
  const ok = allReviews.filter((r) => r.ratingCategory === 'ok').length;
  const bad = allReviews.filter((r) => r.ratingCategory === 'bad').length;

  const span = document.getElementById('review_total_count');
  span.textContent = total;

  Array.from(filterButtons).forEach((btn) => {
    const span = btn.querySelector('.restaurant_reviewList_count');
    if (!span) return;

    const rating = btn.dataset.rating;
    if (rating === '전체') span.textContent = total;
    else if (rating === '맛있다') span.textContent = good;
    else if (rating === '괜찮다') span.textContent = ok;
    else if (rating === '별로') span.textContent = bad;
  });
}

async function initReviews() {
  try {
    const res = await fetch(`${API_BASE}/reviews?restaurantId=${id}`);
    if (!res.ok) {
      console.warn('리뷰를 불러오지 못했습니다.', res.status);
      return;
    }

    allReviews = await res.json();

    // 레스토랑 평점과 리뷰수 설정
    if (data) data.restaurant.review_count = allReviews.length;
    AvgFromReviews();

    // 필터 버튼 숫자 설정
    setupReviewFilterCounst();

    // 필터 버튼 클릭 이벤트 세팅 + 기본 렌더링
    setupReviewFilterButtons();
  } catch (e) {
    console.error('리뷰 로딩 실패', e);
  }
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

  await initReviews();

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

function setupReviewFilterButtons() {
  const buttons = Array.from(filterButtons);
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) =>
        b.classList.remove('restaurant_reviewList_filterButton-Selected')
      );
      btn.classList.add('restaurant_reviewList_filterButton-Selected');

      const rating = btn.dataset.rating || '전체';
      renderReviews(rating);
    });
  });

  const first = buttons[0];
  if (first) {
    first.classList.add('restaurant_reviewList_filterButton-Selected');
    renderReviews(first.dataset.rating || '전체');
  }
}

// 리뷰 목록 렌더링
function renderReviews(filter) {
  reviewContainer.innerHTML = '';

  const filtered = allReviews.filter((review) => {
    if (filter === '전체') return true;
    const meta = RATING_CATEGORY_MAP[review.ratingCategory];
    return meta && meta.label === filter;
  });

  filtered.forEach((review) => {
    const li = buildReviewItem(review);
    reviewContainer.appendChild(li);
  });
}

// 리뷰 생성
function buildReviewItem(review) {
  if (!reviewItemTemplate) return document.createTextNode('');

  const li = reviewItemTemplate.content.firstElementChild.cloneNode(true);

  li.dataset.reviewId = review.id;

  const nicknameEl = li.querySelector('.restaurant_reviewItem_userNickname');
  const profilImgEl = li.querySelector('.restaurant_reviewItem_userPicture');
  const likeEl = li.querySelector('.userStatItem_like');
  const hateEl = li.querySelector('.userStatItem_hate');
  const textEl = li.querySelector('.restaurant_reviewItem_text');
  const dateEl = li.querySelector('.restaurant_reviewItem_Date');
  const pictureListEl = li.querySelector('.restaurant_reviewItem_PictureList');
  const ratingWrapEl = li.querySelector('.restaurant_reviewItem_Rating');
  const ratingTextEl = li.querySelector('.restaurant_reviewItem_RatingText');

  // 닉네임
  if (nicknameEl) nicknameEl.textContent = review.userName;

  // 프로필 이미지
  if (profilImgEl) {
    profilImgEl.src = profilImgEl.src || '/images/흠.png';
    profilImgEl.alt = 'user profile picture';
  }

  // 좋아요/싫어요
  if (likeEl) likeEl.textContent = review.likeCount ?? '';
  if (hateEl) hateEl.textContent = review.dislikeCount ?? '';

  if (likeEl && review.userReaction === 'like') {
    likeEl.classList.add('is-active');
  }
  if (hateEl && review.userReaction === 'dislike') {
    hateEl.classList.add('is-active');
  }

  // 리뷰 내용
  if (textEl) textEl.textContent = review.content ?? '';

  // 날짜
  if (dateEl) {
    const dStr = review.updateAt || review.createdAt;
    if (dStr) {
      const d = new Date(dStr);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateEl.textContent = `${yyyy}-${mm}-${dd}`;
    } else {
      dateEl.textContent = '';
    }
  }

  // 이미지 목록
  if (pictureListEl) {
    if (Array.isArray(review.images) && review.images.length > 0) {
      const img = review.images[0];

      const item = document.createElement('li');
      item.className = 'restaurant_reviewItem_PictureItem';

      const btn = document.createElement('button');
      btn.className = 'restaurant_reviewItem_PictureButton';
      btn.type = 'button';

      const imgEl = document.createElement('img');
      imgEl.className = 'restaurant_reviewItem_Picture';
      imgEl.src = normalizeImgUrl(img.url);

      btn.appendChild(imgEl);
      item.appendChild(btn);
      pictureListEl.appendChild(item);
    }
  }

  if (ratingWrapEl && ratingTextEl) {
    const meta = RATING_CATEGORY_MAP[review.ratingCategory] ?? {
      label: '평가 없음',
      cssClass: '',
    };

    if (meta.cssClass) {
      ratingWrapEl.classList.add(meta.cssClass);
    }

    ratingTextEl.textContent = meta.label;
  }

  // TODO: 내 리뷰에 대한 수정/삭제는 나중에 내 리뷰에만 보이게 코드 추가하기

  return li;
}

async function onReviewReactionClick(event) {
  const likeEl = event.target.closest('.userStatItem_like');
  const hateEl = event.target.closest('.userStatItem_hate');

  if (!likeEl && !hateEl) return;

  const li = event.target.closest('.restaurant_reviewList_reviewItem');
  if (!li) return;

  const reviewId = li.dataset.reviewId;
  if (!reviewId) return;

  const type = likeEl ? 'like' : 'dislike';

  const token = localStorage.getItem('token');
  if (!token) {
    location.href = `login.html?next=${encodeURIComponent(
      location.pathname + location.search
    )}`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/reviews/${reviewId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ type }),
    });

    if (!res.ok) {
      console.error('리뷰 반응 실패', res.status);
      return;
    }

    const data = await res.json();

    const likeNode = li.querySelector('.userStatItem_like');
    const hateNode = li.querySelector('.userStatItem_hate');

    if (likeNode) {
      likeNode.textContent = data.likeCount ?? 0;
      likeNode.classList.toggle('is-active', data.userReaction === 'like');
    }
    if (hateNode) {
      hateNode.textContent = data.dislikeCount ?? 0;
      hateNode.classList.toggle('is-active', data.userReaction === 'dislike');
    }

    const idx = allReviews.findIndex((r) => r.id === data.reviewId);
    if (idx !== -1) {
      allReviews[idx].likeCount = data.likeCount;
      allReviews[idx].dislikeCount = data.dislikeCount;
      allReviews[idx].userReaction = data.userReaction;
    }
  } catch (err) {
    console.error('리뷰 반응 요청 에러', err);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  initAuthMenu();
  init();
});
