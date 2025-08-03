var starButton = document.getElementById('star_button');
var starButtonIcon = document.getElementById('star_icon');
var isClicked = false;

starButton.addEventListener('click', function () {
  if (isClicked) {
    starButtonIcon.classList.remove('star_button_icon-check');
    starButtonIcon.classList.add('star_button_icon');
    isClicked = false;
  } else {
    starButtonIcon.classList.remove('star_button_icon');
    starButtonIcon.classList.add('star_button_icon-check');
    isClicked = true;
  }
});

var filterButtons = document.getElementsByClassName(
  'restaurant_reviewList_filterButton'
);
var reviewContainer = document.getElementById('review_content');
var reviews = Array.from(
  reviewContainer.getElementsByClassName('restaurant_reviewList_reviewItem')
);
var recommends = reviewContainer.getElementsByClassName(
  'restaurant_reviewItem_RatingText'
);
var loadMoreButton = document.getElementById('moreButton');
const visibleReviews = 5;
var currentIndex = 0;
var filteredReviews = [];

for (var i = 0; i < filterButtons.length; i++) {
  filterButtons[i].addEventListener('click', function () {
    for (var j = 0; j < filterButtons.length; j++) {
      filterButtons[j].classList.remove(
        'restaurant_reviewList_filterButton-Selected'
      );
    }

    var fillter = this.textContent;
    this.classList.add('restaurant_reviewList_filterButton-Selected');
    if (fillter.includes('전체')) {
      filterReviews('전체');
    } else if (fillter.includes('맛있다')) {
      filterReviews('맛있다');
    } else if (fillter.includes('괜찮다')) {
      filterReviews('괜찮다');
    } else if (fillter.includes('별로')) {
      filterReviews('별로');
    }
  });
}

function filterReviews(filter) {
  currentIndex = 0;
  for (var i = 0; i < reviews.length; i++) {
    reviews[i].style.display = 'none';
  }

  filteredReviews = [];

  if (filter === '전체') {
    filteredReviews = reviews;
  } else {
    var j = 0;
    for (var i = 0; i < reviews.length; i++) {
      if (filter === recommends[i].textContent) {
        filteredReviews[j++] = reviews[i];
      }
    }
  }
  showReviews();
}

function showReviews() {
  for (var i = currentIndex; i < currentIndex + visibleReviews; i++) {
    if (filteredReviews[i]) {
      filteredReviews[i].style.display = 'block';
    }
  }

  currentIndex += visibleReviews;

  if (currentIndex >= filteredReviews.length) {
    loadMoreButton.style.display = 'none';
  } else {
    loadMoreButton.style.display = 'flex';
  }
}

loadMoreButton.addEventListener('click', showReviews);

window.onload = function () {
  filterButtons[0].click();
};
