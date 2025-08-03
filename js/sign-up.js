document
  .getElementById('join_form')
  .addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (password.length < 8) {
      alert('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    const name = document.getElementById('name').value;
    const yy = document.getElementById('yy').value;
    const mm = document.getElementById('mm').value.padStart(2, '0');
    const dd = document.getElementById('dd').value.padStart(2, '0');
    const birth = `${yy}-${mm}-${dd}`;
    const gender = document.getElementById('gender').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;

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
        alert('회원가입 성공!');
        localStorage.setItem('token', data.token);
        window.location.href = '/index.html';
      } else {
        alert(data.message || '회원가입 실패');
      }
    } catch (err) {
      console.error('오류 발생:', err);
      alert('서버 오류가 발생했습니다.');
    }
  });
