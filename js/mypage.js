// 왼쪽 버튼 조작
var listButton = document.getElementsByClassName('side_listName');
var rside_wrap = document.getElementsByClassName('rside_wrap');

for (var i = 0; i < listButton.length; i++) {
  listButton[i].addEventListener('click', function () {
    for (var j = 0; j < listButton.length; j++) {
      listButton[j].classList.remove('active');
    }

    for (var j = 0; j < rside_wrap.length; j++) {
      rside_wrap[j].style.display = 'none';
    }

    var fillter = this.textContent;
    if (fillter.includes('맛집리뷰')) {
      rside_wrap[0].style.display = 'block';
    } else if (fillter.includes('찜목록')) {
      rside_wrap[1].style.display = 'block';
    } else if (fillter.includes('방문식당')) {
      rside_wrap[2].style.display = 'block';
    } else if (fillter.includes('블라인드')) {
      rside_wrap[3].style.display = 'block';
    }

    this.classList.add('active');
  });
}

window.onload = function () {
  listButton[0].click();
};

// 위 버튼들 조작
var actionButton = document.getElementsByClassName('inside_action_button1');
var actionButton2 = document.getElementsByClassName('inside_action_button2');

for (let i = 0; i < actionButton.length; i++) {
  actionButton[i].addEventListener('click', function () {
    if (i === 0 || i === 1) {
      listButton[0].click();
    } else if (i === 2) {
      listButton[1].click();
    }
  });
}

for (let i = 0; i < actionButton2.length; i++) {
  actionButton2[i].addEventListener('click', function () {
    if (i === 0) {
      listButton[2].click();
    } else if (i === 1) {
      listButton[3].click();
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
let profileButton = document.getElementsByClassName('profile_action_button');

for (let i = 0; i < profileButton.length; i++) {
  profileButton[i].addEventListener('click', function () {
    for (let j = 0; j < listButton.length; j++) {
      listButton[j].classList.remove('active');
    }

    for (let j = 0; j < rside_wrap.length; j++) {
      rside_wrap[j].style.display = 'none';
    }

    if (i === 0) {
      rside_wrap[6].style.display = 'block';
    } else if (i === 1) {
      rside_wrap[4].style.display = 'block';
    }
  });
}

// 비밀번호 입력 X
let pwDiv = document.querySelector('.passwordInput');
let pwInput = document.querySelector('#password');

pwInput.addEventListener('input', function () {
  let inputValue = pwInput.value;

  if (inputValue === '') {
    const pwInputError = document.createElement('div');
    pwInputError.classList.add('pwInput_error');
    pwDiv.appendChild(pwInputError);

    const pwErrorText = document.createElement('p');
    pwErrorText.classList.add('pwError_text');
    pwErrorText.textContent = '비밀번호를 입력해 주세요.';
    pwInputError.appendChild(pwErrorText);
  } else {
    const pwInputError = document.querySelector('.pwInput_error');

    if (pwInputError) pwInputError.remove();
  }
});

// 회원정보수정
const pwCheck_button = document.querySelector('.pwCheck_button');

pwCheck_button.addEventListener('click', function () {
  rside_wrap[4].style.display = 'none';
  rside_wrap[5].style.display = 'block';
});

// 성별 버튼
const genderMan = document.querySelector('#gender-man');
const genderWoman = document.querySelector('#gender-woman');
const userGender_radio2 = document.querySelectorAll('.userGender_radio2');
const userGender_radio3 = document.querySelectorAll('.userGender_radio3');

genderMan.checked = true;
let gendertext = '남자';

if (gendertext === '남자') {
  userGender_radio2[0].className = 'userGender_radio2_click';
  userGender_radio3[0].className = 'userGender_radio3_click';
} else if (gendertext === '여자') {
  userGender_radio2[1].className = 'userGender_radio2_click';
  userGender_radio3[1].className = 'userGender_radio3_click';
}

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
