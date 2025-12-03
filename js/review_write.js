const API_BASE = 'http://localhost:8080';

const restaurantId = new URLSearchParams(location.search).get('restaurant_id');
const reviewId = new URLSearchParams(location.search).get('review_id');
const isEdit = !!reviewId;
if (!restaurantId) {
  alert('어느 식당에 대한 리뷰인지 알 수 없어요.');
  location.href = 'index.html';
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
  const userMenu = document.getElementById('user-menu');
  const userNameEl = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');

  const me = await fetchMe();

  if (me && me.username) {
    userMenu.style.display = 'block';
    userNameEl.textContent = me.username;
  } else {
    const back = location.pathname + location.search;
    location.href = `login.html?next=${encodeURIComponent(back)}`;
  }

  if (isEdit) {
    const review = await fetchReviewForEdit();
    fillFormForEdit(review);
  }

  logoutBtn?.addEventListener('click', logout);
}

async function fetchReviewForEdit() {
  if (!isEdit) return null;

  try {
    const res = await fetch(`${API_BASE}/reviews/${reviewId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });

    if (!res.ok) {
      alert('리뷰 정보를 불러오지 못했습니다.');
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error(err);
    alert('리뷰 정보를 불러올 수 없습니다.');
    return null;
  }
}

function fillFormForEdit(review) {
  if (!review) return;

  if (textarea) {
    textarea.value = review.content ?? '';
  }
  setScore(review.rating / 2);
}

const textarea = document.querySelector('.ReviewEditor_write');
const charCount = document.querySelector('.ReviewEditor_TextLength');

textarea.addEventListener('input', () => {
  charCount.textContent = textarea.value.length;
  textarea.style.height = '150px';
  textarea.style.height = textarea.scrollHeight + 'px';
});

// --- 별점 라디오 & 표시용 별 ---
const starInputs = Array.from(
  document.querySelectorAll('.StarRating input[name="score"]')
);
const starView = document.getElementById('starView');
const presets = document.getElementById('ratingPresets');

// 현재 점수
let currentScore = 0;

function clampHalf(x) {
  const r = Math.round(x * 2) / 2;
  return Math.max(0.5, Math.min(5, r));
}

function setScore(value) {
  currentScore = clampHalf(parseFloat(value));

  const target = starInputs.find((i) => parseFloat(i.value) === currentScore);
  if (target) {
    target.checked = true;
  }

  starView.style.setProperty('--rating', String(currentScore));
  starView.setAttribute('aria-valuenow', String(currentScore));

  presets
    .querySelectorAll('button')
    .forEach((btn) => btn.setAttribute('aria-pressed', 'false'));
}

function pointToScore(ev) {
  const rect = starView.getBoundingClientRect();
  if (rect.width <= 0) return currentScore;

  const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
  let ratio = x / rect.width;
  ratio = Math.max(0, Math.min(1, ratio));

  const raw = ratio * 5;
  return clampHalf(raw);
}

function applyHover(score) {
  starView.classList.add('hovering');
  starView.style.setProperty('--hover', String(score));
}

function clearHover() {
  starView.classList.remove('hovering');
  starView.style.setProperty('--hover', 0);
}

starView.addEventListener('mousemove', (e) => applyHover(pointToScore(e)));
starView.addEventListener('mouseleave', (e) => clearHover());
starView.addEventListener('click', (e) => {
  setScore(pointToScore(e));
  clearHover();
});

starView.addEventListener(
  'touchmove',
  (e) => {
    applyHover(pointToScore(e));
    e.preventDefault();
  },
  { passive: false }
);
starView.addEventListener('touchend', (e) => {
  setScore(pointToScore(e));
  clearHover();
  e.preventDefault();
});

starView.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    setScore(Math.max(0.5, currentScore - 0.5));
    e.preventDefault();
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    setScore(Math.max(0.5, currentScore + 0.5));
    e.preventDefault();
  }
});

presets.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-score]');
  if (!btn) return;
  setScore(btn.dataset.score);
  btn.setAttribute('aria-pressed', 'true');
});

const MAX_PICTURES = 30;
const addBtn = document.getElementById('addImages');
const imageInput = document.getElementById('imageInput');
const pictureList = document.getElementById('pictureList');
const counterLen = document.querySelector('.ReviewPictureCounter_Length');
const filesState = [];

addBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  const available = Math.max(0, MAX_PICTURES - filesState.length);
  const picked = files.slice(0, available);
  picked.forEach((file) => addPreview(file));
  imageInput.value = '';
  updateCounter();
});

function addPreview(file) {
  const url = URL.createObjectURL(file);
  filesState.push({ file, url });

  const li = document.createElement('li');
  li.className = 'ReviewPictureContainer_pictureItem pictureItem_picture';

  const imgDiv = document.createElement('div');
  imgDiv.className = 'ReviewPictureContainer_PreviewImage';
  imgDiv.style.backgroundImage = `url(${url})`;

  const layer = document.createElement('div');
  layer.className = 'picture_Layer';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.setAttribute('aria-label', '이미지 삭제');
  const removeIcon = document.createElement('i');
  removeIcon.className = 'picture_removeIcon';
  removeIcon.setAttribute('aria-hidden', 'true');
  removeBtn.appendChild(removeIcon);

  const extendBtn = document.createElement('button');
  extendBtn.type = 'button';
  extendBtn.setAttribute('aria-label', '이미지 확대');
  const extendIcon = document.createElement('i');
  extendIcon.className = 'picture_extendIcon';
  extendIcon.setAttribute('aria-hidden', 'true');
  extendBtn.appendChild(extendIcon);

  // imgDiv -> layer -> (removeBtn, extendBtn)
  layer.appendChild(removeBtn);
  layer.appendChild(extendBtn);
  imgDiv.appendChild(layer);

  li.appendChild(imgDiv);

  pictureList.insertBefore(
    li,
    pictureList.querySelector('.pictureItem_button')
  );

  removeBtn.addEventListener('click', () => {
    const idx = filesState.findIndex((f) => f.url === url);
    if (idx >= 0) {
      URL.revokeObjectURL(filesState[idx].url);
      filesState.splice(idx, 1);
    }
    li.remove();
    updateCounter();
  });

  extendBtn.addEventListener('click', () => {
    openLightbox(url);
  });
}

function updateCounter() {
  counterLen.textContent = String(filesState.length);
  addBtn.parentElement.style.display =
    filesState.length >= MAX_PICTURES ? 'none' : 'flex';
}

const ligthboxEl = document.getElementById('lightbox');
const ligthboxImg = document.querySelector('.Lightbox_image');

function openLightbox(url) {
  ligthboxImg.src = url;
  ligthboxEl.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  ligthboxEl.hidden = true;
  ligthboxImg.src = '';
  document.body.style.overflow = '';
}

ligthboxEl.addEventListener('click', (e) => {
  if (!ligthboxImg.contains(e.target)) {
    closeLightbox();
  }
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !ligthboxEl.hidden) closeLightbox();
});
ligthboxImg.addEventListener('click', (e) => e.stopPropagation());

const submitBtn = document.getElementById('submitBtn');
submitBtn.addEventListener('click', onSubmitReview);

async function onSubmitReview(e) {
  e.preventDefault();

  const token = localStorage.getItem('token');
  if (!token) {
    alert('로그인이 필요합니다.');
    const back = location.pathname + location.search;
    location.href = `login.html?next=${encodeURIComponent(back)}`;
    return;
  }

  const content = textarea.value.trim();

  if (!currentScore || currentScore <= 0) {
    alert('별점을 선택해주세요.');
    return;
  }
  if (!content) {
    alert('리뷰 내용을 입력해주세요.');
    return;
  }

  const formData = new FormData();
  formData.append('restaurantId', restaurantId);
  formData.append('rating', String(currentScore * 2));
  formData.append('content', content);

  filesState.forEach(({ file }) => formData.append('images', file));

  try {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      console.error('review error', errBody);
      alert(errBody?.message || '리뷰 등록에 실피했습니다.');
      return;
    }

    alert('리뷰가 등록되었습니다!');
    location.href = `restaurant.html?id=${encodeURIComponent(restaurantId)}`;
  } catch (err) {
    console.error(err);
    alert('서버와 통신 중 오류가 발생했습니다.');
  }
}

async function initRestaurantName() {
  try {
    const res = await fetch(`${API_BASE}/restaurants/${restaurantId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    document.querySelector('.restaurant_name').textContent =
      data.restaurant.name;
  } catch (e) {
    console.error(e);
    alert('식당 정보를 불러오지 못했습니다.');
    location.href = 'index.html';
    throw e;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  initAuthMenu();
  initRestaurantName();
  setScore(5);
});
