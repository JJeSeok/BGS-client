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

let state = {
  status: 'pending',
  cursor: null,
  hasMore: false,
  loading: false,
};

async function apiGetAdminRequests(status, cursor) {
  const url = new URL(`${API_BASE}/admin/restaurant-requests`);
  if (status) url.searchParams.set('status', status);
  if (cursor) url.searchParams.set('cursor', cursor);

  const res = await fetch(url.href, {
    method: 'GET',
    headers: { ...authHeaders() },
  });

  if (res.status === 401) {
    const back = `${location.pathname}${location.search}`;
    location.href = `login.html?next=${encodeURIComponent(back)}`;
    return null;
  }

  if (res.status === 403) {
    setToast('err', '관리자 권한이 필요합니다.');
    return null;
  }

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
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || '승인 실패');
  return body?.data; // { requestId, restaurantId }
}

async function apiReject(id, reason) {
  const res = await fetch(
    `${API_BASE}/admin/restaurant-requests/${id}/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ reason }),
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || '반려 실패');
  return body?.data; // { requestId }
}

function clearTbody() {
  const tbody = document.getElementById('tbody');
  if (tbody) tbody.textContent = '';
}

function ensureLoadMoreUI() {
  let wrap = document.getElementById('loadMoreWrap');
  if (wrap) return wrap;

  const cardBody = document.querySelector('.card .card-body');
  if (!cardBody) return null;

  wrap = document.createElement('div');
  wrap.id = 'loadMoreWrap';
  wrap.className = 'd-flex justify-content-center mt-3';

  const btn = document.createElement('button');
  btn.id = 'loadMoreBtn';
  btn.type = 'button';
  btn.className = 'btn btn-outline-secondary btn-sm';
  btn.textContent = '더보기';

  btn.addEventListener('click', async () => {
    await loadMore();
  });

  wrap.appendChild(btn);
  cardBody.appendChild(wrap);
  return wrap;
}

function updateLoadMoreUI() {
  const wrap = ensureLoadMoreUI();
  if (!wrap) return;

  const btn = document.getElementById('loadMoreBtn');
  if (!btn) return;

  btn.disabled = state.loading;
  wrap.style.display = state.hasMore ? 'flex' : 'none';
}

function renderRowsAppend(rows) {
  const tbody = document.getElementById('tbody');
  const empty = document.getElementById('empty');
  if (!tbody || !empty) return;

  if (!rows || rows.length === 0) {
    if (tbody.children.length === 0) empty.style.display = 'block';
    updateLoadMoreUI();
    return;
  }
  empty.style.display = 'none';

  const frag = document.createDocumentFragment();

  rows.forEach((r) => {
    const tr = document.createElement('tr');

    // ID
    const tdId = document.createElement('td');
    tdId.className = 'td-tight';
    tdId.textContent = r.id ?? '';
    tr.appendChild(tdId);

    // 식당 (썸네일 + 이름/카테고리)
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
    title.style.fontWeight = '700';
    title.textContent = `${r.name || '(이름 없음)'}${
      r.branch_info ? ` (${r.branch_info})` : ''
    }`;

    const sub = document.createElement('div');
    sub.className = 'muted';
    sub.style.fontSize = '13px';
    sub.textContent = r.category || '';

    // 반려 사유(있으면)
    if (r.status === 'rejected' && r.reject_reason) {
      const reason = document.createElement('div');
      reason.style.fontSize = '12px';
      reason.style.color = '#b02a37';
      reason.textContent = `반려: ${r.reject_reason}`;
      info.append(title, sub, reason);
    } else {
      info.append(title, sub);
    }

    wrap.append(img, info);
    tdRest.appendChild(wrap);
    tr.appendChild(tdRest);

    // 지역
    const tdAddr = document.createElement('td');
    tdAddr.textContent = `${r.sido || ''} ${r.sigugun || ''} ${
      r.dongmyun || ''
    }`.trim();
    tr.appendChild(tdAddr);

    // 요청자
    const tdReq = document.createElement('td');
    tdReq.className = 'td-tight';
    tdReq.textContent =
      r.requester?.username ||
      r.requester?.name ||
      String(r.requested_by ?? '');
    tr.appendChild(tdReq);

    // 요청일
    const tdDate = document.createElement('td');
    tdDate.className = 'td-tight';
    tdDate.textContent = formatDate(r.createdAt);
    tr.appendChild(tdDate);

    // 상태
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
        r.approved_restaurant_id
      )}`;
      a.className = 'btn btn-sm btn-outline-success ms-2';
      a.textContent = '보기';
      tdStatus.appendChild(a);
    }

    tr.appendChild(tdStatus);

    // 처리
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
            `승인되었습니다. (requestId=${data?.requestId}, restaurantId=${data?.restaurantId})`
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
  updateLoadMoreUI();
}

async function loadFirstPage() {
  if (state.loading) return;
  state.loading = true;
  updateLoadMoreUI();

  clearTbody();

  const statusSelect = document.getElementById('statusSelect');
  state.status = statusSelect?.value || 'pending';
  state.cursor = null;
  state.hasMore = false;

  qsSet('status', state.status);

  try {
    const result = await apiGetAdminRequests(state.status, null);
    if (!result) return;

    state.hasMore = Boolean(result.meta?.hasMore);
    state.cursor = result.meta?.nextCursor || null;

    renderRowsAppend(result.data);
  } finally {
    state.loading = false;
    updateLoadMoreUI();
  }
}

async function loadMore() {
  if (state.loading) return;
  if (!state.hasMore) return;

  state.loading = true;
  updateLoadMoreUI();

  try {
    const result = await apiGetAdminRequests(state.status, state.cursor);
    if (!result) return;

    state.hasMore = Boolean(result.meta?.hasMore);
    state.cursor = result.meta?.nextCursor || null;

    renderRowsAppend(result.data);
  } finally {
    state.loading = false;
    updateLoadMoreUI();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const statusSelect = document.getElementById('statusSelect');
  const reloadBtn = document.getElementById('reloadBtn');

  const urlStatus = qsGet('status') || 'pending';
  if (statusSelect) statusSelect.value = urlStatus;

  statusSelect?.addEventListener('change', loadFirstPage);
  reloadBtn?.addEventListener('click', loadFirstPage);

  await loadFirstPage();
});
