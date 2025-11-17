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

// 초기 표시값 (나중에 위치 옮기기)
setScore(5);

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
}

function updateCounter() {
  counterLen.textContent = String(filesState.length);
  addBtn.parentElement.style.display =
    filesState.length >= MAX_PICTURES ? 'none' : 'flex';
}
