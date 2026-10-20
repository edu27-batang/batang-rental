/* 바탕 대여함 공통 스크립트 — 서버 호출, 화면 도우미, 로고·아이콘 */

/*
 * 서버 호출
 *  - config.js의 BATANG_API(Apps Script 웹앱 /exec 주소)로 POST를 보낸다.
 *  - Content-Type을 text/plain으로 보내야 브라우저의 사전 확인(preflight)이 생기지 않아 Apps Script와 통신된다.
 *  - 쿠키를 보내지 않으므로(credentials: 'omit') 휴대폰의 구글 로그인 상태와 무관하게 동작한다.
 *  - window.LocalApi가 있으면(미리보기·테스트) 그것을 대신 쓴다.
 */
var CALL_TIMEOUT_MS = 30000;
function call(name, payload) {
  payload = payload || {};
  var done = function (r) {
    if (r && r.ok) return r.data;
    throw new Error((r && r.error) || '잠시 문제가 생겼어요.');
  };
  if (window.LocalApi) {
    return new Promise(function (res) { setTimeout(res, 280); }).then(function () { return done(window.LocalApi(name, payload)); });
  }
  var url = window.BATANG_API || '';
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url) && !window.BATANG_API_DEV) {
    return Promise.reject(new Error('서버 주소가 설정되지 않았어요. 학생회에 알려 주세요.'));
  }
  var ctrl = window.AbortController ? new AbortController() : null;
  var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, CALL_TIMEOUT_MS) : null;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ name: name, payload: payload }),
    credentials: 'omit',
    redirect: 'follow',
    cache: 'no-store',
    signal: ctrl ? ctrl.signal : undefined
  }).then(function (res) {
    return res.text().then(function (text) {
      var r;
      try { r = JSON.parse(text); } catch (e) {
        // JSON이 아니면 대개 Apps Script 배포 설정(액세스: 모든 사용자) 문제다.
        throw new Error('서버 응답을 읽을 수 없어요. 잠시 뒤 다시 시도해 주세요.');
      }
      return r;
    });
  }, function (err) {
    if (err && err.name === 'AbortError') throw new Error('응답이 늦어요. 다시 시도해 주세요.');
    throw new Error('연결이 불안정해요. 다시 시도해 주세요.');
  }).then(function (r) {
    if (timer) clearTimeout(timer);
    return done(r);
  }, function (e) {
    if (timer) clearTimeout(timer);
    throw e;
  });
}

function $(s, el) { return (el || document).querySelector(s); }
function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

var toastTimer;
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

function busy(btn, on) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = ''; btn.classList.add('loading'); btn.disabled = true; }
  else { btn.innerHTML = btn.dataset.label || btn.innerHTML; btn.classList.remove('loading'); btn.disabled = false; }
}

/* 화면 안 확인 창 (confirm 대신) */
function ask(title, desc, okLabel) {
  return new Promise(function (resolve) {
    var m = document.createElement('div'); m.className = 'overlay';
    m.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><b style="font-size:19px;display:block">' + esc(title) + '</b>' +
      (desc ? '<p class="lead" style="margin:8px 0 0">' + esc(desc) + '</p>' : '') +
      '<div class="row" style="margin-top:20px"><button class="btn soft" data-v="0">취소</button><button class="btn primary" data-v="1">' + esc(okLabel || '확인') + '</button></div></div>';
    m.onclick = function (e) {
      var b = e.target.closest('[data-v]');
      if (b || e.target === m) { m.remove(); resolve(!!(b && b.dataset.v === '1')); }
    };
    document.body.appendChild(m);
  });
}

var store = {
  get: function (k) { try { return JSON.parse(localStorage.getItem('batang_' + k) || 'null'); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem('batang_' + k, JSON.stringify(v)); } catch (e) { } }
};

/* 세 겹의 층 로고. gap = 층 사이 여백 색(놓이는 바탕색) */
function logo(size, gap) {
  gap = gap || 'var(--bg)';
  return '<svg viewBox="0 0 120 120" width="' + size + '" height="' + size + '" aria-hidden="true"><g stroke-linejoin="round">' +
    '<path d="M60 60 L102 82 L60 104 L18 82 Z" fill="var(--ink)" stroke="var(--ink)" stroke-width="10"/>' +
    '<path d="M60 38 L102 60 L60 82 L18 60 Z" fill="' + gap + '" stroke="' + gap + '" stroke-width="22"/>' +
    '<path d="M60 38 L102 60 L60 82 L18 60 Z" fill="var(--mid)" stroke="var(--mid)" stroke-width="10"/>' +
    '<path d="M60 16 L102 38 L60 60 L18 38 Z" fill="' + gap + '" stroke="' + gap + '" stroke-width="22"/>' +
    '<path d="M60 16 L102 38 L60 60 L18 38 Z" fill="var(--point)" stroke="var(--point)" stroke-width="10"/></g></svg>';
}

var I = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7"/></svg>',
  ret: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 18v3h-1"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};
