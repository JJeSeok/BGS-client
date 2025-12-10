const API_BASE = 'http://localhost:8080';

let currentUser = null;

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
}

function fillProfile(me) {
  const profileNameEl = document.querySelector('.user_nameStyle');
  const profileImageEl = document.querySelector('.user_photoStyle');

  if (profileNameEl) {
    profileNameEl.textContent = me.name || me.username || '';
  }

  if (profileImageEl) {
    profileImageEl.src = me.profileImageUrl || '/images/흠.png';
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
    if (i === 0 || i === 1) {
      showSection('section-reviews');
      setActiveSide('section-reviews');
    } else if (i === 2) {
      showSection('section-likes');
      setActiveSide('section-likes');
    }
  });
}

for (let i = 0; i < actionButton2.length; i++) {
  actionButton2[i].addEventListener('click', function () {
    if (i === 0) {
      showSection('section-visits');
      setActiveSide('section-visits');
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

document.addEventListener('DOMContentLoaded', function () {
  initAuthMenu();

  // 초기 진입: 맛집 리뷰 탭 열기
  showSection('section-reviews');
  setActiveSide('section-reviews');
});
