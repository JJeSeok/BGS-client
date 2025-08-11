const phoneForm = document.getElementById('idfind_form_phone');
const emailForm = document.getElementById('idfind_form_email');
const resultBox = document.getElementById('idfind_result');

function showAlert(msg, type = 'success') {
  if (!resultBox) return alert(msg);
  resultBox.innerHTML = `<div class="custom-alert alert ${
    type === 'error' ? 'alert-danger' : 'alert-success'
  }" role="alert"> ${type === 'error' ? msg : '아이디: ' + msg}</div>`;
}

async function postJson(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok) {
      showAlert(data.username);
    } else {
      showAlert('가입 시 입력하신 회원 정보가 맞는지 확인해 주세요.', 'error');
    }
  } catch (err) {
    console.error('오류 발생:', err);
    alert('서버 오류가 발생했습니다.');
  }
}

phoneForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name_phone').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!name) {
    showAlert('이름을 입력하세요.', 'error');
    return;
  }

  if (!phone) {
    showAlert('전화번호를 입력하세요.', 'error');
    return;
  }

  const btn = phoneForm.querySelector('button[type="submit"]');
  btn?.setAttribute('disabled', 'disabled');

  await postJson('http://localhost:8080/users/forgotId-phone', { name, phone });

  btn?.removeAttribute('disabled');
});

emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name_email').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!name) {
    showAlert('이름을 입력하세요.', 'error');
    return;
  }

  if (!email) {
    showAlert('이메일을 입력하세요.', 'error');
    return;
  }

  const btn = phoneForm.querySelector('button[type="submit"]');
  btn?.setAttribute('disabled', 'disabled');

  await postJson('http://localhost:8080/users/forgotId-email', { name, email });

  btn?.removeAttribute('disabled');
});
