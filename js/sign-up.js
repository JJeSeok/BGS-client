document
  .getElementById('join_form')
  .addEventListener('submit', async function (e) {
    e.preventDefault();

    document.querySelectorAll('.error_next_box').forEach((box) => {
      box.innerText = '';
      box.style.display = 'none';
    });

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirm = document.getElementById('confirmPassword').value.trim();
    const name = document.getElementById('name').value.trim();
    const yy = document.getElementById('yy').value;
    const mm = document.getElementById('mm').value.padStart(2, '0');
    const dd = document.getElementById('dd').value.padStart(2, '0');
    const birth = `${yy}-${mm}-${dd}`;
    const gender = document.getElementById('gender').value;
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!username) {
      showError('username', '아이디를 입력하세요.');
      return;
    } else if (username.length < 4 || username.length > 20) {
      showError('username', '아이디는 4~20자여야 합니다.');
      return;
    }

    if (!password) {
      showError('password', '비밀번호를 입력하세요.');
      return;
    } else if (password.length < 8) {
      showError('password', '비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (password !== confirm) {
      showError('confirmPassword', '비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!name) {
      showError('name', '이름을 입력하세요.');
      return;
    }

    if (!yy || mm === '00' || !dd) {
      showError('birth', '생년월일을 모두 입력하세요.');
      return;
    }

    if (gender === '') {
      showError('gender', '성별을 선택하세요.');
      return;
    }

    if (!email) {
      showError('email', '이메일을 입력하세요.');
      return;
    }

    if (!phone) {
      showError('phone', '전화번호를 입력하세요.');
      return;
    }

    const payload = {
      username,
      password,
      confirmPassword,
      name,
      birth,
      gender,
      email,
      phone,
    };

    try {
      const res = await fetch('http://localhost:8080/users/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        const msg = document.getElementById('successMessage');
        msg.style.display = 'block';

        localStorage.setItem('token', data.token);
        setTimeout(() => {
          msg.style.display = 'none';
          window.location.href = '/index.html';
        }, 2000);
      } else {
        showError(data.field, data.message);
      }
    } catch (err) {
      console.error('오류 발생:', err);
      alert('서버 오류가 발생했습니다.');
    }
  });

function showError(fieldId, message) {
  const errorBox = document.getElementById(`${fieldId}_error`);
  errorBox.innerText = message;
  errorBox.style.display = 'block';
}
