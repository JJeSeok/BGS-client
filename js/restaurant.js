const API_BASE = 'http://localhost:8080';

const id = new URLSearchParams(location.search).get('id');
if (!id) {
  alert('가게 ID가 없습니다. 메인으로 이동합니다.');
  location.href = 'index.html';
}
let data;
let allReviews = [];
let cursor = null;
let hasMore = false;
let currentCategory = null;
let isLoading = false;
let currentUser = null;
let currentModalReview = null;
let currentModalImageIndex = 0;
const reviewItemTemplate = document.getElementById('review-item-template');
const filterButtons = document.getElementsByClassName(
  'restaurant_reviewList_filterButton'
);
const reviewContainer = document.getElementById('review_content');
if (reviewContainer) {
  reviewContainer.addEventListener('click', onReviewReactionClick);
  reviewContainer.addEventListener('click', onReviewManagementClick);
  reviewContainer.addEventListener('click', onReviewBlindClick);
  reviewContainer.addEventListener('click', onReviewImageClick);
}
const moreBtn = document.getElementById('moreButton');

const RATING_CATEGORY_MAP = {
  good: { label: '맛있다', cssClass: 'Rating_Recommend' },
  ok: { label: '괜찮다', cssClass: 'Rating_Ok' },
  bad: { label: '별로', cssClass: 'Rating_Bad' },
};

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

const mapContainer = document.getElementById('restaurant_map');
const mapLink = document.getElementById('map_link');

const starButton = document.getElementById('star_button');
const starButtonIcon = document.getElementById('star_icon');
let isClicked = false;

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
  currentUser = me;

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
  document.querySelector('.branch').textContent =
    data?.restaurant.branch_info ?? '';

  if (data?.isLiked) {
    starButtonIcon.classList.remove('star_button_icon');
    starButtonIcon.classList.add('star_button_icon-check');
    isClicked = true;
  }
}

function updateStatus() {
  const status = document.querySelectorAll('.status .cnt > span');

  status[0].textContent = data?.restaurant.view_count ?? 0;
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

function initRestaurantMap() {
  if (!mapContainer) return;
  if (!window.naver || !naver.maps) {
    console.warn('네이버 지도 스크립트가 로드되지 않았습니다.');
    return;
  }

  const latFromData = data?.restaurant?.lat;
  const lngFromData = data?.restaurant?.lng;

  const lat =
    typeof latFromData === 'number'
      ? latFromData
      : Number(mapContainer.dataset.lat);
  const lng =
    typeof lngFromData === 'number'
      ? lngFromData
      : Number(mapContainer.dataset.lng);

  const name =
    data?.restaurant?.name || mapContainer.dataset.name || '식당 위치';

  if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng)) {
    console.warn('식당 위치 정보가 없습니다. (lat/lng 누락)');
    return;
  }

  mapContainer.dataset.lat = lat;
  mapContainer.dataset.lng = lng;
  mapContainer.dataset.name = name;

  const center = new naver.maps.LatLng(lat, lng);
  const map = new naver.maps.Map(mapContainer, {
    center,
    zoom: 16,
    zoomControl: false,
  });
  const marker = new naver.maps.Marker({
    position: center,
    map,
  });
  const infoHtml = `
    <div style="
      padding:6px 10px;
      border-radius:999px;
      background:#ffffff;
      border:1px solid #e5e7eb;
      box-shadow:0 3px 8px rgba(0,0,0,0.18);
      font-size:12px;
      font-weigth:600;
      color:#111827;
      white-space:nowrap;
      ">${name}</div>`;
  const infoWindow = new naver.maps.InfoWindow({
    content: infoHtml,
    borderWidth: 0,
    backgroundColor: 'transparent',
    pixelOffset: new naver.maps.Point(0, -8),
  });

  infoWindow.open(map, marker);

  if (mapLink) {
    mapLink.addEventListener('click', (e) => {
      e.preventDefault();
      const url = new URL('map.html', window.location.origin);
      url.searchParams.set('lat', lat);
      url.searchParams.set('lng', lng);
      url.searchParams.set('name', name);
      url.searchParams.set('id', id);
      window.location.href = url.toString();
    });
  }
}

function applyReviewMeta(meta) {
  if (!meta) return;

  const countEl = document.getElementById('reviewCount');
  if (countEl) countEl.textContent = meta.totalCount ?? 0;

  const avgEl = document.querySelector('.rate_point');
  if (avgEl) {
    avgEl.textContent = meta.avgRating ?? 0;
    avgEl.ariaLabel = `평점 ${meta.avgRating ?? 0}`;
  }
}

function setupReviewFilterCounts(meta) {
  const total = meta.totalCount ?? 0;
  const good = meta.ratingCounts.good ?? 0;
  const ok = meta.ratingCounts.ok ?? 0;
  const bad = meta.ratingCounts.bad ?? 0;

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

function parseReviewsResponse(body) {
  if (Array.isArray(body)) return { meta: null, page: null, data: body };
  if (body && Array.isArray(body.data))
    return {
      meta: body.meta ?? null,
      page: body.page ?? null,
      data: body.data,
    };
  return { meta: null, page: null, data: [] };
}

async function initReviews() {
  try {
    const res = await fetch(`${API_BASE}/reviews?restaurantId=${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    if (!res.ok) {
      console.warn('리뷰를 불러오지 못했습니다.', res.status);
      return;
    }

    const body = await res.json();
    const { meta, data } = parseReviewsResponse(body);

    allReviews = data;

    // 레스토랑 평점과 리뷰수 설정
    applyReviewMeta(meta);

    // 필터 버튼 숫자 설정
    setupReviewFilterCounts(meta);

    // 필터 버튼 클릭 이벤트 세팅 + 기본 렌더링
    setupReviewFilterButtons();

    if (moreBtn) {
      moreBtn.addEventListener('click', async () => {
        await fetchReviewsPage({ reset: false });
      });
    }

    currentCategory = null;
    await fetchReviewsPage({ reset: true });
  } catch (e) {
    console.error('리뷰 로딩 실패', e);
  }
}

async function init() {
  try {
    const res = await fetch(`${API_BASE}/restaurants/${id}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
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
  initRestaurantMap();
}

function normalizeImgUrl(url) {
  if (!url) return '';
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

function mapLabelToCategory(label) {
  if (label === '전체') return null;
  if (label === '맛있다') return 'good';
  if (label === '괜찮다') return 'ok';
  if (label === '별로') return 'bad';
  return null;
}

function setupReviewFilterButtons() {
  const buttons = Array.from(filterButtons);
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', async () => {
      buttons.forEach((b) =>
        b.classList.remove('restaurant_reviewList_filterButton-Selected')
      );
      btn.classList.add('restaurant_reviewList_filterButton-Selected');

      const label = btn.dataset.rating || '전체';
      currentCategory = mapLabelToCategory(label);

      await fetchReviewsPage({ reset: true });
    });
  });

  const first = buttons[0];
  if (first) {
    first.classList.add('restaurant_reviewList_filterButton-Selected');
  }
}

function clearReviewList() {
  reviewContainer.innerHTML = '';
}

function renderReviewsReplace() {
  clearReviewList();

  allReviews.forEach((review) => {
    const li = buildReviewItem(review);
    reviewContainer.appendChild(li);
  });
}

function renderReviewsAppend(newData) {
  newData.forEach((review) => {
    const li = buildReviewItem(review);
    reviewContainer.appendChild(li);
  });
}

function updateMoreButton() {
  if (!moreBtn) return;

  if (hasMore) {
    moreBtn.style.display = '';
    moreBtn.disabled = false;
  } else if (isLoading) {
    moreBtn.style.display = '';
    moreBtn.disabled = true;
  } else {
    moreBtn.style.display = 'none';
  }
}

function buildReviewsUrl() {
  const qs = new URLSearchParams();
  qs.set('restaurantId', id);

  if (cursor) qs.set('cursor', cursor);
  if (currentCategory) qs.set('category', currentCategory);

  return `${API_BASE}/reviews?${qs.toString()}`;
}

async function fetchReviewsPage({ reset = false } = {}) {
  if (isLoading) return;
  if (!reset && !hasMore) return;

  isLoading = true;
  updateMoreButton();

  if (reset) {
    cursor = null;
    hasMore = false;
    allReviews = [];
    clearReviewList();
  }

  try {
    const res = await fetch(buildReviewsUrl(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });

    if (!res.ok) {
      console.warn('리뷰를 불러오지 못했습니다.', res.status);
      return;
    }

    const body = await res.json();
    const { meta, page, data } = parseReviewsResponse(body);

    hasMore = page?.hasMore ?? false;
    cursor = page?.nextCursor ?? null;

    if (reset) {
      allReviews = data;
      renderReviewsReplace();
    } else {
      allReviews.push(...data);
      renderReviewsAppend(data);
    }
  } catch (err) {
    console.error('리뷰 로딩 실패', e);
  } finally {
    isLoading = false;
    updateMoreButton();
  }
}

// 리뷰 생성
function buildReviewItem(review) {
  if (!reviewItemTemplate) return document.createTextNode('');

  const li = reviewItemTemplate.content.firstElementChild.cloneNode(true);

  li.dataset.reviewId = review.id;
  li.dataset.userId = review.userId;

  const nicknameEl = li.querySelector('.restaurant_reviewItem_userNickname');
  const profilImgEl = li.querySelector('.restaurant_reviewItem_userPicture');
  const likeEl = li.querySelector('.userStatItem_like');
  const hateEl = li.querySelector('.userStatItem_hate');
  const textEl = li.querySelector('.restaurant_reviewItem_text');
  const dateEl = li.querySelector('.restaurant_reviewItem_Date');
  const pictureListEl = li.querySelector('.restaurant_reviewItem_PictureList');
  const ratingWrapEl = li.querySelector('.restaurant_reviewItem_Rating');
  const ratingTextEl = li.querySelector('.restaurant_reviewItem_RatingText');
  const blindBtn = li.querySelector('.restaurant_reviewItem_userBlind');
  const managementWrapEl = li.querySelector(
    '.restaurant_reviewItem_managementWrap'
  );

  // 닉네임
  if (nicknameEl) nicknameEl.textContent = review.userName;

  // 프로필 이미지
  if (profilImgEl) {
    profilImgEl.src =
      normalizeImgUrl(review.userProfileImage) || '/images/흠.png';
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
      const MAX_THUMBS = 3;
      const total = review.images.length;
      const thumbs = review.images.slice(0, MAX_THUMBS);

      thumbs.forEach((img, index) => {
        const item = document.createElement('li');
        item.className = 'restaurant_reviewItem_PictureItem';

        const btn = document.createElement('button');
        btn.className = 'restaurant_reviewItem_PictureButton';
        btn.type = 'button';
        btn.dataset.imageIndex = String(index);

        const imgEl = document.createElement('img');
        imgEl.className = 'restaurant_reviewItem_Picture';
        imgEl.src = normalizeImgUrl(img.url);

        btn.appendChild(imgEl);

        if (index === MAX_THUMBS - 1 && total > MAX_THUMBS) {
          const moreBadge = document.createElement('span');
          moreBadge.className = 'reviewPicture_moreBadge';
          moreBadge.textContent = `+${total - MAX_THUMBS}`;
          btn.appendChild(moreBadge);
        }

        item.appendChild(btn);
        pictureListEl.appendChild(item);
      });
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

  const isMine =
    currentUser && currentUser.id ? currentUser.id === review.userId : false;

  if (isMine) {
    blindBtn?.remove();
  } else {
    managementWrapEl?.remove();
    if (blindBtn) blindBtn.dataset.blockedUserId = review.userId;
  }

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

function onReviewManagementClick(event) {
  const modifyBtn = event.target.closest('.modifyButton');
  if (modifyBtn) {
    event.stopPropagation();

    const li = event.target.closest('.restaurant_reviewList_reviewItem');
    if (!li) return;

    const reviewId = li.dataset.reviewId;
    if (!reviewId) return;

    const editUrl = `review_write.html?restaurant_id=${encodeURIComponent(
      id
    )}&review_id=${encodeURIComponent(reviewId)}`;

    location.href = editUrl;
    return;
  }

  const deleteBtn = event.target.closest('.deleteButton');
  if (deleteBtn) {
    event.stopPropagation();

    const li = event.target.closest('.restaurant_reviewList_reviewItem');
    if (!li) return;

    const reviewId = li.dataset.reviewId;
    if (!reviewId) return;

    if (!confirm('이 리뷰를 삭제하시겠습니까?')) {
      return;
    }

    deleteReview(reviewId, li);
    return;
  }

  const managementBtn = event.target.closest(
    '.restaurant_reviewItem_management'
  );
  if (!managementBtn) return;

  event.stopPropagation();

  const wrap = managementBtn.closest('.restaurant_reviewItem_managementWrap');
  if (!wrap) return;

  const isOpen = wrap.classList.contains('is-open');

  document
    .querySelectorAll('.restaurant_reviewItem_managementWrap.is-open')
    .forEach((el) => {
      if (el !== wrap) {
        el.classList.remove('is-open');
      }
    });

  if (isOpen) {
    wrap.classList.remove('is-open');
  } else {
    wrap.classList.add('is-open');
  }
}

document.addEventListener('click', (event) => {
  if (event.target.closest('.restaurant_reviewItem_managementWrap')) {
    return;
  }

  document
    .querySelectorAll('.restaurant_reviewItem_managementWrap.is-open')
    .forEach((el) => el.classList.remove('is-open'));
});

async function deleteReview(reviewId, liElement) {
  try {
    const res = await fetch(`${API_BASE}/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });

    if (!res.ok) {
      alert('리뷰 삭제에 실패했습니다.');
      return;
    }

    const body = await res.json();

    const idNum = Number(reviewId);
    allReviews = allReviews.filter((r) => r.id !== idNum);

    liElement.remove();

    applyReviewMeta(body.meta);
    setupReviewFilterCounts(body.meta);

    if (allReviews.length < 5 && hasMore) {
      await fetchReviewsPage({ reset: true });
    }
  } catch (err) {
    console.error(err);
    alert('리뷰 삭제 중 오류가 발생했습니다.');
  }
}

async function blockUser(blockedUserId) {
  const res = await fetch(`${API_BASE}/users/me/blocks/${blockedUserId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });

  if (res.status === 401) return { ok: false, code: 401 };
  const body = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, code: res.status, message: body?.message };
  return { ok: true, data: body };
}

async function onReviewBlindClick(event) {
  const blindBtn = event.target.closest('.restaurant_reviewItem_userBlind');
  if (!blindBtn) return;

  event.preventDefault();
  event.stopPropagation();

  const token = localStorage.getItem('token');
  if (!token) {
    location.href = `login.html?next=${encodeURIComponent(
      location.pathname + location.search
    )}`;
    return;
  }

  const blockedUserId = blindBtn.dataset.blockedUserId;
  if (!blockedUserId) return;

  const li = blindBtn.closest('.restaurant_reviewList_reviewItem');
  if (!li) return;

  const ok = confirm('이 사용자의 리뷰를 더 이상 보지 않을까요?');
  if (!ok) return;

  const result = await blockUser(blockedUserId);
  if (!result.ok) {
    alert(result.message || '블라인드 처리에 실패했습니다.');
    return;
  }

  allReviews = allReviews.filter(
    (r) => Number(r.userId) !== Number(blockedUserId)
  );

  const items = document.querySelectorAll(
    `.restaurant_reviewList_reviewItem[data-user-id="${blockedUserId}"]`
  );
  items.forEach((el) => el.remove());

  setupReviewFilterCounts();
}

starButton.addEventListener('click', async function () {
  const token = localStorage.getItem('token');
  if (!token) {
    const back = location.pathname + location.search;
    location.href = `login.html?next=${encodeURIComponent(back)}`;
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/restaurants/${id}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });
    if (!res.ok) return;

    const result = await res.json();

    if (result.isLiked) {
      starButtonIcon.classList.remove('star_button_icon');
      starButtonIcon.classList.add('star_button_icon-check');
    } else {
      starButtonIcon.classList.remove('star_button_icon-check');
      starButtonIcon.classList.add('star_button_icon');
    }
    isClicked = result.isLiked;

    if (data && data.restaurant) {
      data.restaurant.like_count = result.likeCount;
      updateStatus();
    }
  } catch (err) {
    console.error(err);
    alert('레스토랑 반응 중 오류가 발생했습니다.');
  }
});

const reviewImageModal = document.getElementById('reviewImageModal');
const modalImg = reviewImageModal.querySelector('.reviewImageModal_img');
const modalCounter = reviewImageModal.querySelector(
  '.reviewImageModal_counter'
);
const modalPrevBtn = document.getElementById('review-image-prev');
const modalNextBtn = document.getElementById('review-image-next');
const modalCloseBtn = reviewImageModal.querySelector('.reviewImageModal_close');

function openReviewImageModal(reviewId, startIndex) {
  const review = allReviews.find((r) => r.id === reviewId);
  if (!review || !Array.isArray(review.images) || review.images.length === 0) {
    return;
  }

  currentModalReview = review;
  currentModalImageIndex = startIndex || 0;

  updateReviewImageModal();
  reviewImageModal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeReviewImageModal() {
  reviewImageModal.classList.remove('is-open');
  document.body.style.overflow = '';
  currentModalReview = null;
}

function updateReviewImageModal() {
  if (!currentModalReview) return;
  const images = currentModalReview.images;
  const len = images.length;
  if (len === 0) return;

  currentModalImageIndex = ((currentModalImageIndex % len) + len) % len;

  const img = images[currentModalImageIndex];
  modalImg.src = normalizeImgUrl(img.url);

  if (modalCounter) {
    modalCounter.textContent = `${currentModalImageIndex + 1} / ${len}`;
  }
}

modalPrevBtn.addEventListener('click', () => {
  if (!currentModalReview) return;
  currentModalImageIndex -= 1;
  updateReviewImageModal();
});

modalNextBtn.addEventListener('click', () => {
  if (!currentModalReview) return;
  currentModalImageIndex += 1;
  updateReviewImageModal();
});

modalCloseBtn.addEventListener('click', closeReviewImageModal);
reviewImageModal
  .querySelector('.reviewImageModal_backdrop')
  .addEventListener('click', closeReviewImageModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && reviewImageModal.classList.contains('is-open')) {
    closeReviewImageModal();
  }
});

function onReviewImageClick(event) {
  const pictureBtn = event.target.closest(
    '.restaurant_reviewItem_PictureButton'
  );

  if (pictureBtn) {
    const li = pictureBtn.closest('.restaurant_reviewList_reviewItem');
    if (!li) return;

    const reviewId = Number(li.dataset.reviewId);
    const imageIndex = Number(pictureBtn.dataset.imageIndex || 0);

    openReviewImageModal(reviewId, imageIndex);
    return;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  initAuthMenu();
  init();
});
