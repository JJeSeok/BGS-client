const form = document.getElementById('loginForm');
const errorBox = document.getElementById('login_error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username) {
    errorBox.innerText = '아이디를 입력하세요.';
    errorBox.style.display = 'block';
    return;
  } else if (username.length < 4 || username.length > 20) {
    errorBox.innerText = '아이디는 4~20자여야 합니다.';
    errorBox.style.display = 'block';
    return;
  }

  if (!password) {
    errorBox.innerText = '비밀번호를 입력하세요.';
    errorBox.style.display = 'block';
    return;
  } else if (password.length < 8) {
    errorBox.innerText = '비밀번호는 최소 8자 이상이어야 합니다.';
    errorBox.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('http://localhost:8080/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorBox.innerText = data.message;
      errorBox.style.display = 'block';
      return;
    }

    localStorage.setItem('token', data.token);
    window.location.href = '/index.html';
  } catch (err) {
    errorBox.innerText = '서버 오류가 발생했습니다.';
    errorBox.style.display = 'block';
    console.error('오류 발생:', err);
  }
});
