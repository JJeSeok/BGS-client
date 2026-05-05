const API_BASE = 'http://localhost:8080';

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function setToast(type, text) {
  const zone = document.getElementById('toastZone');
  if (!zone) return;
  zone.textContent = '';

  const p = document.createElement('p');
  p.className = `toast-text ${type}`;
  p.textContent = text;
  zone.appendChild(p);

  zone.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function normalizeImgUrl(url) {
  if (!url) return '/images/흠.png';
  try {
    const u = new URL(url, API_BASE);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('bad');
    return u.href;
  } catch {
    return '/images/흠.png';
  }
}

function formatDate(dStr) {
  if (!dStr) return '';
  const d = new Date(dStr);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function statusBadge(status) {
  if (status === 'pending')
    return { cls: 'badge bg-secondary', label: 'pending' };
  if (status === 'approved')
    return { cls: 'badge bg-success', label: 'approved' };
  if (status === 'rejected')
    return { cls: 'badge bg-danger', label: 'rejected' };
  return { cls: 'badge bg-dark', label: status || 'unknown' };
}

function handleAuthError(res) {
  if (res.status === 401) {
    const back = `${location.pathname}${location.search}`;
    location.href = `login.html?next=${encodeURIComponent(back)}`;
    return true;
  }

  if (res.status === 403) {
    setToast('err', '관리자 권한이 필요합니다.');
    return true;
  }

  return false;
}

function qsGet(name) {
  const sp = new URLSearchParams(location.search);
  return sp.get(name);
}

function qsSet(name, value) {
  const sp = new URLSearchParams(location.search);
  if (value === null || value === undefined || value === '') sp.delete(name);
  else sp.set(name, value);
  history.replaceState(null, '', `${location.pathname}?${sp.toString()}`);
}

const requestState = {
  status: 'pending',
  cursor: null,
  hasMore: false,
  loading: false,
};

const reviewState = {
  q: '',
  cursor: null,
  hasMore: false,
  loading: false,
  loadedOnce: false,
};

async function apiGetAdminRequests(status, cursor) {
  const url = new URL(`${API_BASE}/admin/restaurant-requests`);
  if (status) url.searchParams.set('status', status);
  if (cursor) url.searchParams.set('cursor', cursor);

  const res = await fetch(url.href, {
    method: 'GET',
    headers: { ...authHeaders() },
  });

  if (handleAuthError(res)) return null;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    setToast('err', body?.message || '목록 조회에 실패했습니다.');
    return null;
  }

  const data = Array.isArray(body?.data) ? body.data : [];
  const meta = body?.meta || {};
  return { data, meta };
}

async function apiApprove(id) {
  const res = await fetch(
    `${API_BASE}/admin/restaurant-requests/${id}/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    },
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || '승인 실패');
  return body?.data;
}

async function apiReject(id, reason) {
  const res = await fetch(
    `${API_BASE}/admin/restaurant-requests/${id}/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ reason }),
    },
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || '반려 실패');
  return body?.data;
}

async function apiGetAdminReviews(q, cursor) {
  const url = new URL(`${API_BASE}/admin/reviews`);
  if (q) url.searchParams.set('q', q);
  if (cursor) url.searchParams.set('cursor', cursor);

  const res = await fetch(url.href, {
    method: 'GET',
    headers: { ...authHeaders() },
  });

  if (handleAuthError(res)) return null;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    setToast('err', body?.message || '리뷰 목록 조회에 실패했습니다.');
    return null;
  }

  const data = Array.isArray(body?.data) ? body.data : [];
  const meta = body?.meta || {};
  return { data, meta };
}

async function apiDeleteReview(reviewId) {
  const res = await fetch(`${API_BASE}/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });

  if (handleAuthError(res)) return false;

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || '리뷰 삭제에 실패했습니다.');
  }

  return true;
}

function clearRequestTbody() {
  const tbody = document.getElementById('requestTbody');
  if (tbody) tbody.textContent = '';
}

function updateRequestLoadMoreUI() {
  const wrap = document.getElementById('requestLoadMoreWrap');
  const btn = document.getElementById('requestLoadMoreBtn');
  if (!wrap || !btn) return;

  btn.disabled = requestState.loading;
  wrap.style.display = requestState.hasMore ? 'flex' : 'none';
}

function renderRequestRowsAppend(rows) {
  const tbody = document.getElementById('requestTbody');
  const empty = document.getElementById('requestEmpty');
  if (!tbody || !empty) return;

  if (!rows || rows.length === 0) {
    if (tbody.children.length === 0) empty.style.display = 'block';
    updateRequestLoadMoreUI();
    return;
  }
  empty.style.display = 'none';

  const frag = document.createDocumentFragment();

  rows.forEach((r) => {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.className = 'td-tight';
    tdId.textContent = r.id ?? '';
    tr.appendChild(tdId);

    const tdRest = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'd-flex gap-2 align-items-center';

    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = normalizeImgUrl(r.main_image_url);
    img.alt = 'thumb';
    img.addEventListener('error', () => (img.src = '/images/흠.png'));

    const info = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'admin-name';
    title.textContent = `${r.name || '(이름 없음)'}${
      r.branch_info ? ` (${r.branch_info})` : ''
    }`;

    const sub = document.createElement('div');
    sub.className = 'admin-meta';
    sub.textContent = r.category || '';

    if (r.status === 'rejected' && r.reject_reason) {
      const reason = document.createElement('div');
      reason.className = 'admin-meta text-danger';
      reason.textContent = `반려: ${r.reject_reason}`;
      info.append(title, sub, reason);
    } else {
      info.append(title, sub);
    }

    wrap.append(img, info);
    tdRest.appendChild(wrap);
    tr.appendChild(tdRest);

    const tdAddr = document.createElement('td');
    tdAddr.textContent = `${r.sido || ''} ${r.sigugun || ''} ${
      r.dongmyun || ''
    }`.trim();
    tr.appendChild(tdAddr);

    const tdReq = document.createElement('td');
    tdReq.className = 'td-tight';
    tdReq.textContent =
      r.requester?.username ||
      r.requester?.name ||
      String(r.requested_by ?? '');
    tr.appendChild(tdReq);

    const tdDate = document.createElement('td');
    tdDate.className = 'td-tight';
    tdDate.textContent = formatDate(r.createdAt);
    tr.appendChild(tdDate);

    const tdStatus = document.createElement('td');
    tdStatus.className = 'td-tight';

    const st = statusBadge(r.status);
    const badge = document.createElement('span');
    badge.className = st.cls;
    badge.textContent = st.label;
    tdStatus.appendChild(badge);

    if (r.status === 'approved' && r.approved_restaurant_id) {
      const a = document.createElement('a');
      a.href = `/restaurant.html?id=${encodeURIComponent(
        r.approved_restaurant_id,
      )}`;
      a.className = 'btn btn-sm btn-outline-success ms-2';
      a.textContent = '보기';
      tdStatus.appendChild(a);
    }

    tr.appendChild(tdStatus);

    const tdAct = document.createElement('td');
    tdAct.className = 'td-tight';

    if (r.status === 'pending') {
      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn btn-sm btn-success me-1';
      approveBtn.type = 'button';
      approveBtn.textContent = '승인';

      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn btn-sm btn-outline-danger';
      rejectBtn.type = 'button';
      rejectBtn.textContent = '반려';

      approveBtn.addEventListener('click', async () => {
        approveBtn.disabled = true;
        rejectBtn.disabled = true;

        try {
          const data = await apiApprove(r.id);
          setToast(
            'ok',
            `승인되었습니다. (requestId=${data?.requestId}, restaurantId=${data?.restaurantId})`,
          );
          tr.remove();
        } catch (e) {
          console.error(e);
          setToast('err', e.message || '승인 중 오류');
          approveBtn.disabled = false;
          rejectBtn.disabled = false;
        }
      });

      rejectBtn.addEventListener('click', async () => {
        const raw = prompt('반려 사유를 입력하세요 (취소하면 작업 안 함):');
        if (raw === null) return;
        const reason = String(raw).trim();

        rejectBtn.disabled = true;
        approveBtn.disabled = true;

        try {
          const data = await apiReject(r.id, reason);
          setToast('ok', `반려되었습니다. (requestId=${data?.requestId})`);
          tr.remove();
        } catch (e) {
          console.error(e);
          setToast('err', e.message || '반려 중 오류');
          rejectBtn.disabled = false;
          approveBtn.disabled = false;
        }
      });

      tdAct.append(approveBtn, rejectBtn);
    } else {
      tdAct.textContent = '-';
    }

    tr.appendChild(tdAct);
    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
  updateRequestLoadMoreUI();
}

async function loadRequestFirstPage() {
  if (requestState.loading) return;
  requestState.loading = true;
  updateRequestLoadMoreUI();

  clearRequestTbody();

  const statusSelect = document.getElementById('requestStatusSelect');
  requestState.status = statusSelect?.value || 'pending';
  requestState.cursor = null;
  requestState.hasMore = false;

  qsSet('status', requestState.status);

  try {
    const result = await apiGetAdminRequests(requestState.status, null);
    if (!result) return;

    requestState.hasMore = Boolean(result.meta?.hasMore);
    requestState.cursor = result.meta?.nextCursor || null;

    renderRequestRowsAppend(result.data);
  } finally {
    requestState.loading = false;
    updateRequestLoadMoreUI();
  }
}

async function loadRequestMore() {
  if (requestState.loading) return;
  if (!requestState.hasMore) return;

  requestState.loading = true;
  updateRequestLoadMoreUI();

  try {
    const result = await apiGetAdminRequests(
      requestState.status,
      requestState.cursor,
    );
    if (!result) return;

    requestState.hasMore = Boolean(result.meta?.hasMore);
    requestState.cursor = result.meta?.nextCursor || null;

    renderRequestRowsAppend(result.data);
  } finally {
    requestState.loading = false;
    updateRequestLoadMoreUI();
  }
}

function clearReviewTbody() {
  const tbody = document.getElementById('reviewTbody');
  if (tbody) tbody.textContent = '';
}

function updateReviewLoadMoreUI() {
  const wrap = document.getElementById('reviewLoadMoreWrap');
  const btn = document.getElementById('reviewLoadMoreBtn');
  if (!wrap || !btn) return;

  btn.disabled = reviewState.loading;
  wrap.style.display = reviewState.hasMore ? 'flex' : 'none';
}

function renderReviewRowsAppend(rows) {
  const tbody = document.getElementById('reviewTbody');
  const empty = document.getElementById('reviewEmpty');
  if (!tbody || !empty) return;

  if (!rows || rows.length === 0) {
    if (tbody.children.length === 0) empty.style.display = 'block';
    updateReviewLoadMoreUI();
    return;
  }
  empty.style.display = 'none';

  const frag = document.createDocumentFragment();

  rows.forEach((review) => {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.className = 'td-tight';
    tdId.textContent = review.id ?? '';
    tr.appendChild(tdId);

    const tdRestaurant = document.createElement('td');
    tdRestaurant.className = 'admin-review-restaurant';

    const restaurantName = document.createElement('div');
    restaurantName.className = 'admin-name';
    restaurantName.textContent = review.restaurant?.name || '(식당 없음)';

    const restaurantAddress = document.createElement('div');
    restaurantAddress.className = 'admin-meta';
    restaurantAddress.textContent = review.restaurant?.address || '';

    tdRestaurant.append(restaurantName, restaurantAddress);
    tr.appendChild(tdRestaurant);

    const tdUser = document.createElement('td');
    tdUser.className = 'td-tight';
    tdUser.textContent = review.user?.name || String(review.user?.id ?? '');
    tr.appendChild(tdUser);

    const tdRating = document.createElement('td');
    tdRating.className = 'td-tight';
    tdRating.textContent = review.rating ?? '';
    tr.appendChild(tdRating);

    const tdContent = document.createElement('td');
    const content = document.createElement('div');
    content.className = 'admin-review-content';
    content.textContent = review.content || '';
    content.title = review.content || '';
    tdContent.appendChild(content);
    tr.appendChild(tdContent);

    const tdImages = document.createElement('td');
    tdImages.className = 'td-tight';

    const images = Array.isArray(review.images)
      ? [...review.images]
          .filter((image) => image?.url)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .slice(0, 3)
      : [];
    const imageCount = Number(review.imageCount ?? images.length);

    if (images.length > 0) {
      const imageWrap = document.createElement('div');
      imageWrap.className = 'admin-review-images';

      images.forEach((image) => {
        const imageUrl = normalizeImgUrl(image.url);

        const link = document.createElement('a');
        link.className = 'admin-review-thumb-link';
        link.href = imageUrl;
        link.target = '_blank';
        link.rel = 'noopener';

        const img = document.createElement('img');
        img.className = 'admin-review-thumb';
        img.src = imageUrl;
        img.alt = '리뷰 이미지';
        img.addEventListener('error', () => {
          img.src = '/images/흠.png';
          link.href = '/images/흠.png';
        });

        link.appendChild(img);
        imageWrap.appendChild(link);
      });

      if (imageCount > images.length) {
        const more = document.createElement('span');
        more.className = 'admin-review-image-more';
        more.textContent = `+${imageCount - images.length}`;
        imageWrap.appendChild(more);
      }

      tdImages.appendChild(imageWrap);
    } else {
      tdImages.textContent = imageCount || 0;
    }

    tr.appendChild(tdImages);

    const tdReactions = document.createElement('td');
    tdReactions.className = 'td-tight';
    tdReactions.textContent = `좋아요 ${review.likeCount ?? 0} / 싫어요 ${
      review.dislikeCount ?? 0
    }`;
    tr.appendChild(tdReactions);

    const tdDate = document.createElement('td');
    tdDate.className = 'td-tight';
    tdDate.textContent = formatDate(review.createdAt);
    tr.appendChild(tdDate);

    const tdAction = document.createElement('td');
    tdAction.className = 'td-tight';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-outline-danger';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '삭제';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('이 리뷰를 삭제하시겠습니까?')) return;

      deleteBtn.disabled = true;

      try {
        const deleted = await apiDeleteReview(review.id);
        if (!deleted) return;
        setToast('ok', '리뷰가 삭제되었습니다.');
        await loadReviewFirstPage();
      } catch (e) {
        console.error(e);
        setToast('err', e.message || '리뷰 삭제에 실패했습니다.');
        deleteBtn.disabled = false;
      }
    });

    tdAction.appendChild(deleteBtn);
    tr.appendChild(tdAction);

    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
  updateReviewLoadMoreUI();
}

async function loadReviewFirstPage() {
  if (reviewState.loading) return;
  reviewState.loading = true;
  reviewState.loadedOnce = true;
  updateReviewLoadMoreUI();

  clearReviewTbody();

  const input = document.getElementById('reviewSearchInput');
  reviewState.q = String(input?.value || '').trim();
  reviewState.cursor = null;
  reviewState.hasMore = false;

  try {
    const result = await apiGetAdminReviews(reviewState.q, null);
    if (!result) return;

    reviewState.hasMore = Boolean(result.meta?.hasMore);
    reviewState.cursor = result.meta?.nextCursor || null;

    renderReviewRowsAppend(result.data);
  } finally {
    reviewState.loading = false;
    updateReviewLoadMoreUI();
  }
}

async function loadReviewMore() {
  if (reviewState.loading) return;
  if (!reviewState.hasMore) return;

  reviewState.loading = true;
  updateReviewLoadMoreUI();

  try {
    const result = await apiGetAdminReviews(reviewState.q, reviewState.cursor);
    if (!result) return;

    reviewState.hasMore = Boolean(result.meta?.hasMore);
    reviewState.cursor = result.meta?.nextCursor || null;

    renderReviewRowsAppend(result.data);
  } finally {
    reviewState.loading = false;
    updateReviewLoadMoreUI();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const requestStatusSelect = document.getElementById('requestStatusSelect');
  const requestReloadBtn = document.getElementById('requestReloadBtn');
  const requestLoadMoreBtn = document.getElementById('requestLoadMoreBtn');

  const reviewSearchForm = document.getElementById('reviewSearchForm');
  const reviewReloadBtn = document.getElementById('reviewReloadBtn');
  const reviewLoadMoreBtn = document.getElementById('reviewLoadMoreBtn');
  const reviewsTab = document.getElementById('reviews-tab');

  const urlStatus = qsGet('status') || 'pending';
  if (requestStatusSelect) requestStatusSelect.value = urlStatus;

  requestStatusSelect?.addEventListener('change', loadRequestFirstPage);
  requestReloadBtn?.addEventListener('click', loadRequestFirstPage);
  requestLoadMoreBtn?.addEventListener('click', loadRequestMore);

  reviewSearchForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await loadReviewFirstPage();
  });
  reviewReloadBtn?.addEventListener('click', loadReviewFirstPage);
  reviewLoadMoreBtn?.addEventListener('click', loadReviewMore);
  reviewsTab?.addEventListener('shown.bs.tab', async () => {
    if (!reviewState.loadedOnce) await loadReviewFirstPage();
  });

  await loadRequestFirstPage();
});
