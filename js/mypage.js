const API_BASE = 'http://localhost:8080';

let currentUser = null;
let myReviews = [];
const reviewContainer = document.getElementById('review_content');
const reviewItemTemplate = document.getElementById('review-item-template');

const RATING_CATEGORY_MAP = {
  good: { label: '맛있다', cssClass: 'Rating_Recommend' },
  ok: { label: '괜찮다', cssClass: 'Rating_Ok' },
  bad: { label: '별로', cssClass: 'Rating_Bad' },
};

if (reviewContainer) {
  reviewContainer.addEventListener('click', onReviewReactionClick);
  reviewContainer.addEventListener('click', onReviewManagementClick);
}

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

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchMyProfile() {
  try {
    const res = await fetch(`${API_BASE}/users/me/profile`, {
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
  currentUser = null;
  location.reload();
}

async function initAuthMenu() {
  const userMenu = document.getElementById('user-menu');
  const userNameEl = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');

  const profile = await fetchMyProfile();

  if (!profile) {
    const back = location.pathname + location.search;
    location.href = `login.html?next=${encodeURIComponent(back)}`;
    return null;
  }

  userMenu.style.display = 'block';
  userNameEl.textContent = profile.username;
  logoutBtn?.addEventListener('click', logout);

  currentUser = profile;
  fillProfile(profile);
  fillUserForm(profile);
  initProfileImageUploader();
}

function fillProfile(me) {
  const profileNameEl = document.querySelector('.user_nameStyle');
  const profileImageEl = document.querySelector('.user_photoStyle');

  if (profileNameEl) {
    profileNameEl.textContent = me.name || me.username || '';
  }

  if (profileImageEl) {
    profileImageEl.src =
      normalizeImgUrl(me.profile_image_url) || '/images/흠.png';
  }
}

function fillUserForm(me) {
  const userIdInput = document.getElementById('userId');
  const userId1Input = document.getElementById('userId1');
  if (userIdInput) userIdInput.value = me.username || '';
  if (userId1Input) userId1Input.value = me.username || '';

  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const mobileInput = document.getElementById('mobileNumber');
  if (nameInput) nameInput.value = me.name || '';
  if (emailInput) emailInput.value = me.email || '';
  if (mobileInput) mobileInput.value = me.phone || '';

  if (me.gender && genderMan && genderWoman) {
    if (me.gender === 'male') {
      genderMan.click();
    } else if (me.gender === 'female') {
      genderWoman.click();
    }
  }

  if (me.birth) {
    const birthStr = String(me.birth);
    const [year, month, day] = birthStr.slice(0, 10).split('-');

    const birthYearInput = document.querySelector('input[name="birthYear"]');
    const birthMonthInput = document.querySelector('input[name="birthMonth"]');
    const birthDayInput = document.querySelector('input[name="birthDay"]');

    if (birthYearInput) birthYearInput.value = year || '';
    if (birthMonthInput) birthMonthInput.value = month || '';
    if (birthDayInput) birthDayInput.value = day || '';
  }
}

const sections = document.querySelectorAll('.rside_wrap');
const sideButtons = document.querySelectorAll('.side_listName');

function showSection(sectionId) {
  sections.forEach((sec) => {
    if (sec.id === sectionId) sec.style.display = 'block';
    else sec.style.display = 'none';
  });
}

function setActiveSide(sectionIdOrNull) {
  sideButtons.forEach((btn) => {
    const target = btn.dataset.section;
    if (sectionIdOrNull && target === sectionIdOrNull) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

sideButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetSection = btn.dataset.section;
    if (!targetSection) return;

    showSection(targetSection);
    setActiveSide(targetSection);
  });
});

// 위 버튼들 조작
const actionButton = document.getElementsByClassName('inside_action_button1');
const actionButton2 = document.getElementsByClassName('inside_action_button2');

for (let i = 0; i < actionButton.length; i++) {
  actionButton[i].addEventListener('click', function () {
    if (i === 0) {
      showSection('section-reviews');
      setActiveSide('section-reviews');
    } else if (i === 1) {
      showSection('section-visits');
      setActiveSide('section-visits');
    } else if (i === 2) {
      showSection('section-likes');
      setActiveSide('section-likes');
    }
  });
}

for (let i = 0; i < actionButton2.length; i++) {
  actionButton2[i].addEventListener('click', function () {
    if (i === 0) {
      showSection('section-reviews');
      setActiveSide('section-reviews');
    } else if (i === 1) {
      showSection('section-blind');
      setActiveSide('section-blind');
    }
  });
}

const managementButton = document.querySelectorAll(
  '.restaurant_reviewItem_management'
);
const managementDiv = document.querySelectorAll('.managementWrap');

for (let i = 0; i < managementButton.length; i++) {
  managementButton[i].addEventListener('click', () => {
    if (managementDiv[i].style.display === 'none')
      managementDiv[i].style.display = 'block';
    else managementDiv[i].style.display = 'none';
  });

  document.addEventListener('click', (event) => {
    const isClickInsideDiv = managementDiv[i].contains(event.target);
    const isClickOnButton = managementButton[i].contains(event.target);

    if (isClickInsideDiv || isClickOnButton) {
      return;
    }

    if (managementDiv[i].style.display === 'block') {
      managementDiv[i].style.display = 'none';
    }
  });
}

// 프로필 버튼
const profileButtons = document.getElementsByClassName('profile_action_button');

for (let i = 0; i < profileButtons.length; i++) {
  const btn = profileButtons[i];
  const targetSection = btn.dataset.section;

  btn.addEventListener('click', function () {
    if (!targetSection) return;
    showSection(targetSection);
    setActiveSide(null);
  });
}

// 개인 정보 수정
const pwDiv = document.querySelector('.passwordInput');
const pwInput = document.querySelector('#password');
const pwCheckBtn = document.querySelector('.pwCheck_button');

function showError(fieldId, message) {
  const errorBox = document.getElementById(`${fieldId}_error`);
  errorBox.innerText = message;
  errorBox.style.display = 'block';
}

function clearPwError() {
  const errorBox = document.getElementById('pwCheck_error');
  errorBox.innerText = '';
  errorBox.style.display = 'none';
}

function clearError() {
  const errorBox = document.querySelectorAll('.error_box');
  errorBox.forEach((box) => {
    box.innerText = '';
    box.style.display = 'none';
  });
}

pwInput.addEventListener('input', function () {
  if (pwInput.value.trim() !== '') {
    clearPwError();
  }
});

pwCheckBtn.addEventListener('click', async function () {
  const password = pwInput.value.trim();
  if (!password) {
    showError('pwCheck', '비밀번호를 입력해 주세요.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/users/me/check-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      showError('pwCheck', '비밀번호가 일치하지 않습니다.');
      return;
    }

    clearPwError();
    pwInput.value = '';

    showSection('section-info-form');
    setActiveSide(null);
  } catch (err) {
    showError('pwCheck', '잠시 후 다시 시도해 주세요.');
  }
});

// 성별 버튼
const genderMan = document.querySelector('#gender-man');
const genderWoman = document.querySelector('#gender-woman');
const userGender_radio2 = document.querySelectorAll('.userGender_radio2');
const userGender_radio3 = document.querySelectorAll('.userGender_radio3');

genderMan.addEventListener('click', function () {
  genderMan.checked = true;

  userGender_radio2[0].className = 'userGender_radio2_click';
  userGender_radio3[0].className = 'userGender_radio3_click';
  userGender_radio2[1].className = 'userGender_radio2';
  userGender_radio3[1].className = 'userGender_radio3';
});

genderWoman.addEventListener('click', function () {
  genderWoman.checked = true;

  userGender_radio2[1].className = 'userGender_radio2_click';
  userGender_radio3[1].className = 'userGender_radio3_click';
  userGender_radio2[0].className = 'userGender_radio2';
  userGender_radio3[0].className = 'userGender_radio3';
});

const infoForm = document.querySelector('#section-info-form form');
if (infoForm) {
  infoForm.addEventListener('submit', onSubmitProfileForm);
}

async function onSubmitProfileForm(event) {
  event.preventDefault();
  clearError();

  const currentPwInput = document.getElementById('originalPassword');
  const newPwInput = document.getElementById('newPassword');
  const newPwConfirmInput = document.getElementById('newPasswordConfirm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const mobileInput = document.getElementById('mobileNumber');
  const genderMan = document.getElementById('gender-man');
  const genderWoman = document.getElementById('gender-woman');
  const birthYearInput = document.querySelector('input[name="birthYear"]');
  const birthMonthInput = document.querySelector('input[name="birthMonth"]');
  const birthDayInput = document.querySelector('input[name="birthDay"]');

  const currentPassword = currentPwInput.value.trim();
  const newPassword = newPwInput.value.trim();
  const newPasswordConfirm = newPwConfirmInput.value.trim();

  if (!currentPassword) {
    showError('currentPw', '현재 비밀번호를 입력해 주세요.');
    currentPwInput.focus();
    return;
  } else if (currentPassword.length < 8) {
    showError('currentPw', '비밀번호는 최소 8자 이상이어야 합니다.');
    return;
  }

  if (newPassword || newPasswordConfirm) {
    if (newPassword.length < 8) {
      showError('newPw', '비밀번호는 최소 8자 이상이어야 합니다.');
      newPwInput.focus();
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      showError(
        'newPwConfirm',
        '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.'
      );
      newPwConfirmInput.focus();
      return;
    }
  }

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = mobileInput.value.trim();

  if (!name) {
    showError('name', '이름을 입력하세요.');
    nameInput.focus();
    return;
  }
  if (!email) {
    showError('email', '이메일을 입력하세요.');
    emailInput.focus();
    return;
  }

  if (!phone) {
    showError('phone', '전화번호를 입력하세요.');
    mobileInput.focus();
    return;
  }

  let gender = undefined;
  if (genderMan.checked) gender = 'male';
  else if (genderWoman.checked) gender = 'female';

  let birth = undefined;
  const y = birthYearInput.value.trim();
  const m = birthMonthInput.value.trim();
  const d = birthDayInput.value.trim();

  if (y && m && d) {
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    birth = `${y}-${mm}-${dd}`;
  } else {
    showError('birth', '생년월일을 모두 입력하세요.');
    return;
  }

  const payload = {
    currentPassword,
    newPassword: newPassword || undefined,
    name,
    email,
    phone,
    gender,
    birth,
  };

  try {
    const res = await fetch(`${API_BASE}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      showError('currentPw', '현재 비밀번호가 일치하지 않습니다.');
      currentPwInput.focus();
      return;
    }

    if (!res.ok) {
      alert(
        '회원정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      );
      return;
    }

    const msg = document.getElementById('successMessage');
    msg.style.display = 'block';
    setTimeout(() => {
      msg.style.display = 'none';
      location.reload();
    }, 2000);
  } catch (err) {
    console.error(err);
    alert('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
}

async function fetchMyReviews() {
  if (!currentUser) {
    const profile = await fetchMyProfile();
    if (!profile) return null;
    currentUser = profile;
  }

  const userId = currentUser.id;

  try {
    const res = await fetch(
      `${API_BASE}/reviews?userId=${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      }
    );

    if (!res.ok) {
      console.error('failed to fetch my reviews', res.status);
      return null;
    }

    const reviews = await res.json();
    return reviews;
  } catch (err) {
    console.error('failed to fetch my reviews', err);
    return null;
  }
}

async function loadMyReviews() {
  const reviews = await fetchMyReviews();
  if (!reviews) return;

  myReviews = reviews;

  const reviewCountEl = document.getElementById('stat-review-count');
  if (reviewCountEl) {
    reviewCountEl.textContent = myReviews.length;
  }

  const totalLikes = myReviews.reduce((sum, r) => sum + (r.likeCount || 0), 0);
  const totalDisLikes = myReviews.reduce(
    (sum, r) => sum + (r.dislikeCount || 0),
    0
  );

  const likeStatEl = document.getElementById('stat-reaction-like');
  const dislikeStatEl = document.getElementById('stat-reaction-dislike');

  if (likeStatEl) likeStatEl.textContent = totalLikes;
  if (dislikeStatEl) dislikeStatEl.textContent = totalDisLikes;

  if (!reviewContainer) return;
  reviewContainer.innerHTML = '';

  if (myReviews.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'restaurant_reviewList_reviewItem';
    emptyLi.style.padding = '40px 0';
    emptyLi.style.textAlign = 'center';
    emptyLi.textContent = '작성한 리뷰가 없습니다.';
    reviewContainer.appendChild(emptyLi);
    return;
  }

  myReviews.forEach((review) => {
    const li = buildReviewItem(review);
    reviewContainer.appendChild(li);
  });
}

// 리뷰 생성
function buildReviewItem(review) {
  if (!reviewItemTemplate) return document.createTextNode('');

  const li = reviewItemTemplate.content.firstElementChild.cloneNode(true);

  li.dataset.reviewId = review.id;
  li.dataset.restaurantId = review.restaurantId;

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
  if (nicknameEl) nicknameEl.textContent = review.userName || '';

  // 프로필 이미지
  if (profilImgEl) {
    profilImgEl.src =
      normalizeImgUrl(review.userProfileImage) || '/images/흠.png';
    profilImgEl.alt = 'user profile picture';
  }

  // 좋아요/싫어요
  if (likeEl) likeEl.textContent = review.likeCount ?? 0;
  if (hateEl) hateEl.textContent = review.dislikeCount ?? 0;

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

  return li;
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

    const idx = myReviews.findIndex((r) => r.id === data.reviewId);
    if (idx !== -1) {
      myReviews[idx].likeCount = data.likeCount;
      myReviews[idx].dislikeCount = data.dislikeCount;
      myReviews[idx].userReaction = data.userReaction;
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
    const restaurantId = li.dataset.restaurantId;
    if (!reviewId || !restaurantId) return;

    const editUrl = `review_write.html?restaurant_id=${encodeURIComponent(
      restaurantId
    )}&review_id=${encodeURIComponent(reviewId)}&next=${encodeURIComponent(
      '/mypage.html'
    )}`;

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

    if (res.status === 204) {
      const idNum = Number(reviewId);
      myReviews = myReviews.filter((r) => r.id !== idNum);

      liElement.remove();

      const reviewCountEl = document.getElementById('stat-review-count');
      if (reviewCountEl) {
        reviewCountEl.textContent = myReviews.length;
      }

      const totalLikes = myReviews.reduce(
        (sum, r) => sum + (r.likeCount || 0),
        0
      );
      const totalDisLikes = myReviews.reduce(
        (sum, r) => sum + (r.dislikeCount || 0),
        0
      );

      const likeStatEl = document.getElementById('stat-reaction-like');
      const dislikeStatEl = document.getElementById('stat-reaction-dislike');

      if (likeStatEl) likeStatEl.textContent = totalLikes;
      if (dislikeStatEl) dislikeStatEl.textContent = totalDisLikes;

      await loadVisitedRestaurants();
      return;
    }
  } catch (err) {
    console.error(err);
    alert('리뷰 삭제 중 오류가 발생했습니다.');
  }
}

async function fetchVisitedRestaurants() {
  try {
    const res = await fetch(`${API_BASE}/users/me/visited-restaurants`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });

    if (res.status === 401) return null;
    if (!res.ok) return null;

    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

function renderVisitedRestaurants(restaurants) {
  const statEl = document.getElementById('stat-visited-count');
  if (statEl) statEl.textContent = restaurants.length;

  const countEl = document.getElementById('visitListCount');
  if (countEl) countEl.textContent = `총 ${restaurants.length}개`;

  const container = document.querySelector('.visitList_content');
  if (!container) return;

  container.querySelectorAll('.visitList_wrap').forEach((el) => el.remove());

  if (restaurants.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'visitList_wrap';
    empty.style.justifyContent = 'center';
    empty.style.color = '#999';
    empty.textContent = '방문(리뷰 작성)한 식당이 없습니다.';
    container.appendChild(empty);
    return;
  }

  restaurants.forEach((r) => {
    const rid = r.id;
    const name = r.name;
    const address =
      r.address.road ||
      r.address.jibun ||
      `${r.address.sido} ${r.address.sigugun} ${r.address.dongmyun}` ||
      '';
    const imageUrl = r.mainImageUrl;

    const item = buildVisitRestaurantItem({
      id: rid,
      name,
      address,
      imageUrl,
    });

    container.appendChild(item);
  });
}

function buildVisitRestaurantItem({ id, name, address, imageUrl }) {
  const wrap = document.createElement('div');
  wrap.className = 'visitList_wrap';

  const href = `restaurant.html?id=${encodeURIComponent(id)}`;

  const aImg = document.createElement('a');
  aImg.href = href;

  const img = document.createElement('img');
  img.className = 'restaurant_img';
  img.src = normalizeImgUrl(imageUrl);
  img.alt = String(name);

  aImg.appendChild(img);

  const p = document.createElement('p');
  p.className = 'visitList_restaurant';

  const aName = document.createElement('a');
  aName.href = href;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'restaurant_name';
  nameSpan.textContent = name;

  aName.appendChild(nameSpan);

  const addrSpan = document.createElement('span');
  addrSpan.textContent = address;

  p.appendChild(aName);
  p.appendChild(addrSpan);

  wrap.appendChild(aImg);
  wrap.appendChild(p);

  return wrap;
}

async function loadVisitedRestaurants() {
  const data = await fetchVisitedRestaurants();
  if (!data) return;
  renderVisitedRestaurants(data);
}

async function fetchLikedRestaurants() {
  try {
    const res = await fetch(`${API_BASE}/users/me/liked-restaurants`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });

    if (res.status === 401) return null;
    if (!res.ok) return null;

    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

function renderLikedRestaurants(restaurants) {
  const statEl = document.getElementById('stat-bookmark-count');
  if (statEl) statEl.textContent = restaurants.length;

  const countEl = document.getElementById('likeListCount');
  if (countEl) countEl.textContent = `총 ${restaurants.length}개`;

  const container = document.querySelector('.likeList_content');
  if (!container) return;

  container.querySelectorAll('.likeList_wrap').forEach((el) => el.remove());

  if (restaurants.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'likeList_wrap';
    empty.style.justifyContent = 'center';
    empty.style.color = '#999';
    empty.textContent = '찜한 식당이 없습니다.';
    container.appendChild(empty);
    return;
  }

  restaurants.forEach((r) => {
    const rid = r.id;
    const name = r.name;
    const address =
      r.address.road ||
      r.address.jibun ||
      `${r.address.sido} ${r.address.sigugun} ${r.address.dongmyun}` ||
      '';
    const imageUrl = r.mainImageUrl;

    const item = buildLikedRestaurantItem({
      id: rid,
      name,
      address,
      imageUrl,
    });

    container.appendChild(item);
  });
}

function buildLikedRestaurantItem({ id, name, address, imageUrl }) {
  const wrap = document.createElement('div');
  wrap.className = 'likeList_wrap';
  wrap.dataset.restaurantId = id;

  const href = `restaurant.html?id=${encodeURIComponent(id)}`;

  const aImg = document.createElement('a');
  aImg.href = href;

  const img = document.createElement('img');
  img.className = 'restaurant_img';
  img.src = normalizeImgUrl(imageUrl);
  img.alt = String(name);

  aImg.appendChild(img);

  const p = document.createElement('p');
  p.className = 'likeList_restaurant';

  const aName = document.createElement('a');
  aName.href = href;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'restaurant_name';
  nameSpan.textContent = name;

  aName.appendChild(nameSpan);

  const addrSpan = document.createElement('span');
  addrSpan.textContent = address;

  p.appendChild(aName);
  p.appendChild(addrSpan);

  const starBtn = document.createElement('button');
  starBtn.type = 'button';
  starBtn.className = 'star_button';
  starBtn.setAttribute('aria-label', '찜 해제');

  const icon = document.createElement('i');
  icon.className = 'star_button_icon';
  starBtn.appendChild(icon);

  wrap.appendChild(aImg);
  wrap.appendChild(p);
  wrap.appendChild(starBtn);

  return wrap;
}

async function loadLikedRestaurants() {
  initLikedRestaurantEvents();
  const data = await fetchLikedRestaurants();
  if (!data) return;
  renderLikedRestaurants(data);
}

async function unlikeRestaurant(restaurantId) {
  try {
    const res = await fetch(
      `${API_BASE}/restaurants/${encodeURIComponent(restaurantId)}/likes`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      }
    );

    if (res.status === 401) return { ok: false, code: 401 };
    if (!res.ok) return { ok: false, code: res.status };

    return { ok: true };
  } catch (err) {
    console.error(err);
    return null;
  }
}

function initLikedRestaurantEvents() {
  const container = document.querySelector('.likeList_content');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const starBtn = e.target.closest('.star_button');
    if (!starBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const wrap = starBtn.closest('.likeList_wrap');
    if (!wrap) return;

    const restaurantId = wrap.dataset.restaurantId;
    if (!restaurantId) return;

    if (starBtn.disabled) return;
    starBtn.disabled = true;

    try {
      const result = await unlikeRestaurant(restaurantId);

      if (!result.ok) {
        if (result.code === 401) {
          const back = location.pathname + location.search;
          location.href = `login.html?next=${encodeURIComponent(back)}`;
          return;
        }
        alert(result.message || '찜 해제에 실패했습니다.');
        return;
      }

      await refreshlikedRestaurants();
    } finally {
      starBtn.disabled = false;
    }
  });
}

async function refreshlikedRestaurants() {
  const restaurants = await fetchLikedRestaurants();
  renderLikedRestaurants(restaurants || []);
}

async function uploadMyProfileImage(file) {
  const fd = new FormData();
  fd.append('image', file);

  const res = await fetch(`${API_BASE}/users/me/profile-image`, {
    method: 'PUT',
    headers: { ...authHeaders() },
    body: fd,
  });

  if (res.status === 401) return { ok: false, code: 401 };

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, code: res.status, message: body?.message };
  }

  return { ok: true, data: body };
}

async function deleteMyProfileImage() {
  const res = await fetch(`${API_BASE}/users/me/profile-image`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });

  if (res.status === 401) return { ok: false, code: 401 };

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, code: res.status, message: body?.message };
  }

  return { ok: true, data: body };
}

function initProfileImageUploader() {
  const wrap = document.getElementById('avatar-wrap');
  const input = document.getElementById('avatar-file');
  const img = document.getElementById('avatar-img');
  const removeBtn = document.getElementById('avatar-remove-btn');
  if (!wrap || !input || !img) return;

  let previewUrl = null;
  let prevSrc = img.src;
  let uploading = false;

  const setRemoveVisible = (visible) => {
    if (!removeBtn) return;
    removeBtn.style.display = visible ? 'inline-flex' : 'none';
  };

  const setUploading = (on) => {
    uploading = on;
    wrap.style.pointerEvents = on ? 'none' : '';
    if (removeBtn) removeBtn.disabled = on;
  };

  setRemoveVisible(img.src && !img.src.includes('/images'));

  const openPicker = () => {
    if (!uploading) input.click();
  };

  wrap.addEventListener('click', openPicker);
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  });

  removeBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;

    const ok = confirm('프로필 이미지를 기본 이미지로 변경할까요?');
    if (!ok) return;

    setUploading(true);
    try {
      const result = await deleteMyProfileImage();

      if (!result.ok) {
        if (result.code === 401) {
          const back = location.pathname + location.search;
          location.href = `login.html?next=${encodeURIComponent(back)}`;
          return;
        }
        alert(result.message || '프로필 이미지 삭제에 실패했습니다.');
        return;
      }

      img.src = '/images/흠.png';
      prevSrc = img.src;
      setRemoveVisible(false);
    } catch (err) {
      console.error(err);
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  });

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 선택할 수 있어요.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지는 5MB 이하로 업로드해 주세요.');
      input.value = '';
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }

    previewUrl = URL.createObjectURL(file);
    img.src = previewUrl;

    setUploading(true);
    try {
      const result = await uploadMyProfileImage(file);

      if (!result.ok) {
        if (result.code === 401) {
          const back = location.pathname + location.search;
          location.href = `login.html?next=${encodeURIComponent(back)}`;
          return;
        }
        img.src = prevSrc || '/images/흠.png';
        alert(result.message || '프로필 이미지 업로드에 실패했습니다.');
        return;
      }

      const url = result.data?.profileImageUrl;
      if (!url) {
        img.src = prevSrc || '/images/흠.png';
        alert('업로드 응답이 올바르지 않습니다.');
        return;
      }

      img.src = normalizeImgUrl(url) || '/images/흠.png';
      prevSrc = img.src;
      setRemoveVisible(true);
    } catch (err) {
      console.error(err);
      img.src = prevSrc || '/images/흠.png';
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
      }

      setUploading(false);
      input.value = '';
    }
  });
}

async function fetchMyBlocks() {
  try {
    const res = await fetch(`${API_BASE}/users/me/blocks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    });

    if (res.status === 401) return { ok: false, code: 401 };
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, code: res.status, message: body?.message };

    return { ok: true, data: body };
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      code: 0,
      message: '블라인드 목록을 불러올 수 없습니다.',
    };
  }
}

async function unblockUser(blockedUserId) {
  const res = await fetch(
    `${API_BASE}/users/me/blocks/${encodeURIComponent(blockedUserId)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    }
  );

  if (res.status === 401) return { ok: false, code: 401 };
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, code: res.status, message: body?.message };
  }

  return { ok: true, data: body };
}

function setBlindCount(container, count) {
  const countEl = document.getElementById('blindListCount');
  if (countEl) countEl.textContent = `총 ${count}개`;

  let emptyEl = container.querySelector('.blindList_empty');
  if (count === 0) {
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.className = 'blindList_wrap blindList_empty';
      emptyEl.style.justifyContent = 'center';
      emptyEl.style.color = '#999';
      emptyEl.textContent = '블라인드한 사용자가 없습니다.';
      container.appendChild(emptyEl);
    }
  } else {
    if (emptyEl) emptyEl.remove();
  }
}

function buildBlindUserItem(user) {
  const wrap = document.createElement('div');
  wrap.className = 'blindList_wrap';
  wrap.dataset.blockedUserId = user.id;

  const aImg = document.createElement('a');
  const img = document.createElement('img');
  img.className = 'blind_userPicture';
  img.alt = user.name ?? '';
  img.src = normalizeImgUrl(user.profileImageUrl) || '/images/흠.png';

  aImg.appendChild(img);

  const p = document.createElement('p');
  p.className = 'blindList_user';

  const aName = document.createElement('a');
  const nameSpan = document.createElement('span');
  nameSpan.className = 'blind_userName';
  nameSpan.textContent = user.name ?? '';

  aName.appendChild(nameSpan);
  p.appendChild(aName);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'blind_button';
  btn.textContent = '블라인드 해제';

  wrap.appendChild(aImg);
  wrap.appendChild(p);
  wrap.appendChild(btn);

  return wrap;
}

function renderBlindList(users) {
  const container = document.querySelector('.blindList_content');
  if (!container) return;

  container.querySelectorAll('.blindList_wrap').forEach((el) => el.remove());

  if (!Array.isArray(users) || users.length === 0) {
    setBlindCount(container, 0);
    return;
  }

  users.forEach((u) => {
    const item = buildBlindUserItem(u);
    container.appendChild(item);
  });

  setBlindCount(container, users.length);
}

function initBlindListEvents() {
  const container = document.querySelector('.blindList_content');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('.blind_button');
    if (!btn) return;

    const row = btn.closest('.blindList_wrap');
    const blockedUserId = row?.dataset.blockedUserId;
    if (!blockedUserId) return;

    e.preventDefault();
    e.stopPropagation();

    const ok = confirm('이 유저의 블라인드를 해제할까요?');
    if (!ok) return;

    if (btn.disabled) return;
    btn.disabled = true;

    try {
      const result = await unblockUser(blockedUserId);

      if (!result.ok) {
        if (result.code === 401) {
          const back = location.pathname + location.search;
          location.href = `login.html?next=${encodeURIComponent(back)}`;
          return;
        }
        alert(result.message || '블라인드 해제에 실패했습니다.');
        return;
      }

      row.remove();

      const remainCount = container.querySelectorAll('.blindList_wrap').length;
      setBlindCount(container, remainCount);
    } catch (err) {
      console.error(err);
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      btn.disabled = false;
    }
  });
}

async function loadBlindList() {
  initBlindListEvents();

  const result = await fetchMyBlocks();
  if (!result.ok) {
    if (result.code === 401) {
      const back = location.pathname + location.search;
      location.href = `login.html?next=${encodeURIComponent(back)}`;
      return;
    }
    renderBlindList([]);
    return;
  }

  renderBlindList(result.data);
}

document.addEventListener('DOMContentLoaded', async function () {
  await initAuthMenu();
  await loadMyReviews();
  await loadVisitedRestaurants();
  await loadLikedRestaurants();
  await loadBlindList();

  // 초기 진입: 맛집 리뷰 탭 열기
  showSection('section-reviews');
  setActiveSide('section-reviews');
});
