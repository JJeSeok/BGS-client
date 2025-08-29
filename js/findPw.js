const API_BASE = 'http://localhost:8080';
const ENDPOINTS = {
  request: '/users/forgotPassword/request',
  verify: '/users/forgotPassword/verify',
  reset: '/users/forgotPassword/reset',
};
const context = {
  username: '',
  email: '',
  token: '',
};
const reqForm = document.getElementById('pwfind_form');
const codeForm = document.getElementById('code_form');
const resendBtn = document.getElementById('btnResend');
const resultBox = document.getElementById('pwfind_result');

function showAlert(msg, type = 'success') {
  if (!resultBox) return alert(msg);
  resultBox.innerHTML = `<div class="custom-alert alert ${
    type === 'error' ? 'alert-danger' : 'alert-success'
  }" role="alert"> ${type === 'error' ? msg : '아이디: ' + msg}</div>`;
}

async function postJSON(url, body) {
  try {
    const res = await fetch(API_BASE + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.message || data?.error || `요청 실패 (${res.status})`;
      showAlert(msg, 'error');
    } else {
      return data;
    }
  } catch (err) {
    console.error('오류 발생:', err);
    alert('서버 오류가 발생했습니다.');
  }
}

reqForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!username) {
    showAlert('아이디를 입력하세요.', 'error');
    return;
  } else if (username.length < 4 || username.length > 20) {
    showAlert('아이디는 4~20자여야 합니다.', 'error');
    return;
  }

  if (!email) {
    showAlert('이메일을 입력하세요.', 'error');
    return;
  }

  const btn = reqForm.querySelector('#btnFindEmail');
  btn.disabled = true;

  const data = await postJSON(ENDPOINTS.request, {
    username,
    email,
  });
  if (!data) {
    btn.disabled = false;
    return;
  }

  showAlert(data.message);
  context.username = username;
  context.email = email;
  reqForm.style.display = 'none';
  codeForm.style.display = 'block';
});

codeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const code = document.getElementById('code').value.trim();

  if (!code) {
    showAlert('인증코드를 입력하세요.', 'error');
    return;
  } else if (code.length !== 6) {
    showAlert('인증코드가 올바르지 않습니다.', 'error');
    return;
  }

  const verifyBtn = codeForm.querySelector('#btnVerify');
  verifyBtn.disabled = true;
  resendBtn.disabled = true;

  const data = await postJSON(ENDPOINTS.verify, {
    email: context.email,
    code,
  });
  if (!data) {
    verifyBtn.disabled = false;
    resendBtn.disabled = false;
    return;
  }

  context.token = data.resetToken;
  showAlert('인증 완료! 새 비밀번호를 설정해 주세요.');
  /** TODO
   * 비밀번호 재설정 form 보여주기
   */
});
/** TODO
 * 재전송 버튼 누르면 코드 재전송
 */
