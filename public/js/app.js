/* === State === */
const S = {
  view: 'login',
  user: null,
  streak: 0,
  leaderboard: null,
  loginUser: null,
  pin: '',
  pinError: '',
  category: null,
  prevView: 'home',
  cards: [], cardIdx: 0, cardFlipped: false, cardResults: [],
  quizQ: [], quizIdx: 0, quizSel: null, quizScore: 0,
  quizCorrectCount: 0, quizTimer: null, quizTime: 10,
  phraseCategory: 'greeting',
  boardTab: 'week',
};

/* === API === */
const api = {
  async _req(method, path, body) {
    const r = await fetch(path, {
      method, credentials: 'include',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.json();
  },
  login:     (username, pin) => api._req('POST', '/api/login', { username, pin }),
  logout:    () => api._req('POST', '/api/logout'),
  me:        () => api._req('GET', '/api/me'),
  leaderboard: () => api._req('GET', '/api/leaderboard'),
  addScore:  (category, mode, points, correct, total) =>
    api._req('POST', '/api/score', { category, mode, points, correct, total }),
  changePin: (oldPin, newPin) => api._req('PUT', '/api/pin', { oldPin, newPin }),
};

/* === Render === */
function render() {
  const app = document.getElementById('app');
  let html;
  switch (S.view) {
    case 'login':              html = renderLogin(); break;
    case 'home':               html = withNav(renderHome()); break;
    case 'categories-learn':   html = withTopbar('📚 Vokabeln lernen', renderCategories('learn')); break;
    case 'categories-quiz':    html = withTopbar('❓ Quiz starten',     renderCategories('quiz'));  break;
    case 'flashcards':         html = withTopbar(catName() + ' – Karten', renderFlashcards()); break;
    case 'flashcards-result':  html = renderResult('cards'); break;
    case 'quiz':               html = withTopbar(catName() + ' – Quiz', renderQuiz()); break;
    case 'quiz-result':        html = renderResult('quiz'); break;
    case 'phrasebook':         html = withNav(renderPhrasebook()); break;
    case 'leaderboard':        html = withNav(renderLeaderboard()); break;
    case 'settings':           html = withNav(renderSettings()); break;
    case 'pin-change':         html = withTopbar('🔒 PIN ändern', renderPinChange()); break;
    default:                   html = renderLogin();
  }
  app.innerHTML = html;
}

function withNav(content) {
  const tabs = [
    { id: 'home',            icon: '🏠', label: 'Start' },
    { id: 'categories-learn',icon: '📚', label: 'Lernen' },
    { id: 'categories-quiz', icon: '❓',    label: 'Quiz' },
    { id: 'leaderboard',     icon: '🏆', label: 'Rangliste' },
    { id: 'settings',        icon: '⚙️',   label: 'Ich' },
  ];
  const nav = tabs.map(t =>
    `<button class="nav-btn${S.view === t.id ? ' active' : ''}" onclick="go('${t.id}')">
      <span class="nav-icon">${t.icon}</span>${t.label}
    </button>`).join('');
  return `<div class="flag-bar"></div>${content}<nav class="bottomnav">${nav}</nav>`;
}

function withTopbar(title, content) {
  return `
    <div class="topbar">
      <button class="topbar-back" onclick="go('${S.prevView}')">&#8592;</button>
      <h1>${title}</h1>
      ${S.streak > 0 ? `<div class="topbar-streak">🔥 ${S.streak}</div>` : ''}
    </div>
    <div class="main-scroll">${content}</div>`;
}

function catName() {
  if (S.category === 'all') return 'Alles gemischt';
  return CATEGORIES.find(c => c.id === S.category)?.name || '';
}

/* === Login === */
function renderLogin() {
  const members = [
    { username: 'martin', name: 'Martin', avatar: '👨', color: '#1d4ed8' },
    { username: 'jane',   name: 'Jane',   avatar: '👩', color: '#7c3aed' },
    { username: 'matti',  name: 'Matti',  avatar: '🧒', color: '#059669' },
    { username: 'jette',  name: 'Jette',  avatar: '👧', color: '#db2777' },
  ];
  const cards = members.map(m =>
    `<div class="member-card${S.loginUser === m.username ? ' selected' : ''}"
         style="--color:${m.color}" onclick="selectMember('${m.username}')">
      <div class="member-avatar">${m.avatar}</div>
      <div class="member-name">${m.name}</div>
      <div class="member-dot"></div>
    </div>`).join('');

  const pinArea = S.loginUser ? `
    <div class="pin-area">
      <div class="pin-label">PIN eingeben</div>
      <div class="pin-display">
        ${[0,1,2,3].map(i =>
          `<div class="pin-dot${S.pin.length > i ? ' filled' : ''}"></div>`).join('')}
      </div>
      ${S.pinError ? `<div class="pin-error">${esc(S.pinError)}</div>` : ''}
      <div class="pin-numpad">
        ${['1','2','3','4','5','6','7','8','9','','0','⌫'].map(k => k
          ? `<button class="pin-key${k==='⌫'?' del':''}" onclick="pinKey('${k}')">${k}</button>`
          : '<div></div>').join('')}
      </div>
    </div>`
    : `<p style="color:#9ca3af;font-size:.875rem;text-align:center">Wähle dein Profil</p>`;

  return `
    <div class="login-page">
      <div class="login-logo">🇪🇸</div>
      <div class="login-title">
        <h1>¡Hola! Spanisch lernen</h1>
        <p>Costa Brava 2026 – Familie Hoffknecht</p>
      </div>
      <div class="member-grid">${cards}</div>
      ${pinArea}
      <a href="https://familie.hoffknecht.de" style="color:#9ca3af;font-size:.8rem;margin-top:.5rem">← Zurück zum Portal</a>
    </div>`;
}

function selectMember(username) {
  S.loginUser = username; S.pin = ''; S.pinError = '';
  render();
}

function pinKey(key) {
  if (key === '⌫') { S.pin = S.pin.slice(0,-1); S.pinError = ''; render(); return; }
  if (S.pin.length >= 6) return;
  S.pin += key;
  render();
  if (S.pin.length >= 4) doLogin();
}

async function doLogin() {
  const res = await api.login(S.loginUser, S.pin);
  if (res.user) {
    S.user = res.user; S.pin = ''; S.pinError = '';
    await loadLeaderboard();
    go('home');
  } else {
    S.pinError = res.error || 'Falsche PIN';
    S.pin = '';
    render();
  }
}

/* === Home === */
function renderHome() {
  const u = P_user();
  const me = S.leaderboard?.rankings.find(r => r.id === u?.id);
  const pts = me?.totalPoints || 0;
  const streak = me?.streak || 0;

  const top = (S.leaderboard?.rankings || []).slice(0, 4).map((r, i) => {
    const medals = ['🥇','🥈','🥉','👍'];
    return `<div class="rank-row">
      <div class="rank-medal">${medals[i]}</div>
      <div class="rank-avatar">${r.avatar}</div>
      <div class="rank-name" style="color:${r.color}">${esc(r.displayName)}</div>
      ${r.streak > 0 ? `<div class="rank-streak">🔥${r.streak}</div>` : ''}
      <div class="rank-pts">${r.totalPoints} Pkt</div>
    </div>`;
  }).join('');

  return `
    <div class="main-scroll">
      <div class="home-hero">
        <div class="home-greeting">¡Hola, ${esc(u?.displayName || '')}! ${u?.avatar || ''}</div>
        <div class="home-sub">Bereit für die Costa Brava? 🏖️</div>
        <div class="home-stats">
          ${streak > 0 ? `<div class="stat-chip">🔥 ${streak} Tage</div>` : ''}
          <div class="stat-chip">⭐ ${pts} Punkte</div>
        </div>
      </div>
      <div class="home-section"><h2>🚀 Schnellstart</h2></div>
      <div class="quick-grid">
        <button class="quick-btn" onclick="go('categories-learn')">
          <span class="qb-icon">🎠</span><span class="qb-label">Vokabeln</span>
        </button>
        <button class="quick-btn" onclick="go('categories-quiz')">
          <span class="qb-icon">❓</span><span class="qb-label">Quiz</span>
        </button>
        <button class="quick-btn" onclick="go('phrasebook')">
          <span class="qb-icon">📖</span><span class="qb-label">Phrasen</span>
        </button>
      </div>
      <div class="home-section"><h2>🏆 Familienrangliste</h2></div>
      <div class="mini-board">${top || '<p style="color:#9ca3af;padding:.5rem">Noch keine Punkte</p>'}</div>
    </div>`;
}

function P_user() { return S.user; }

/* === Categories === */
function renderCategories(mode) {
  const cards = CATEGORIES.map(cat =>
    `<div class="cat-card" style="--cat-color:${cat.color}" onclick="startMode('${mode}','${cat.id}')">
      <div class="cat-emoji">${cat.emoji}</div>
      <div class="cat-name">${esc(cat.name)}</div>
      <div class="cat-count">${(VOCAB[cat.id]||[]).length} Wörter</div>
      <div class="cat-progress-bar"><div class="cat-progress-fill" style="width:0%"></div></div>
    </div>`).join('');

  const allCount = Object.values(VOCAB).flat().length;
  return `
    <div class="main-scroll">
      <div class="cat-grid">${cards}</div>
      <div style="padding:.25rem 1.25rem 1rem">
        <div class="cat-card" style="--cat-color:#6366f1" onclick="startMode('${mode}','all')">
          <div class="cat-emoji">🎲</div>
          <div class="cat-name">Alle gemischt</div>
          <div class="cat-count">${allCount} Wörter</div>
        </div>
      </div>
    </div>`;
}

function startMode(mode, catId) {
  S.prevView = mode === 'learn' ? 'categories-learn' : 'categories-quiz';
  S.category = catId;
  const all = catId === 'all' ? Object.values(VOCAB).flat() : (VOCAB[catId] || []);
  const words = [...all].sort(() => Math.random() - 0.5);
  if (mode === 'learn') {
    S.cards = words; S.cardIdx = 0; S.cardFlipped = false; S.cardResults = [];
    go('flashcards');
  } else {
    S.quizQ = words.slice(0, 15); S.quizIdx = 0; S.quizSel = null;
    S.quizScore = 0; S.quizCorrectCount = 0; S.quizTime = 10;
    clearInterval(S.quizTimer);
    go('quiz');
  }
}

/* === Flashcards === */
function renderFlashcards() {
  if (!S.cards.length) return '<div style="padding:2rem;text-align:center">Keine Karten</div>';
  if (S.cardIdx >= S.cards.length) return '';
  const card = S.cards[S.cardIdx];
  const pct = Math.round((S.cardIdx / S.cards.length) * 100);
  return `
    <div class="flashcard-wrap">
      <div class="fc-progress-text">${S.cardIdx + 1} / ${S.cards.length}</div>
      <div class="fc-progress-bar"><div class="fc-progress-fill" style="width:${pct}%"></div></div>
      <div class="fc-card-scene" onclick="flipCard()">
        <div class="fc-card${S.cardFlipped ? ' flipped' : ''}">
          <div class="fc-front">
            <div class="fc-lang">${S.category === 'catalan' ? 'Katalanisch' : 'Spanisch'}</div>
            <div class="fc-word">${esc(card.es)}</div>
            <div class="fc-tap-hint">Tippe zum Aufdecken 👆</div>
          </div>
          <div class="fc-back">
            <div class="fc-lang">Deutsch</div>
            <div class="fc-word">${esc(card.de)}</div>
            ${card.cat && S.category !== 'catalan' ? `<div class="fc-cat">🏴 Kat.: <em>${esc(card.cat)}</em></div>` : ''}
            ${card.tip ? `<div class="fc-tip">💡 ${esc(card.tip)}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="fc-actions">
        <button class="fc-btn wrong" onclick="answerCard(false)" ${!S.cardFlipped?'disabled':''}>&#10060; Nochmal</button>
        <button class="fc-btn right"  onclick="answerCard(true)"  ${!S.cardFlipped?'disabled':''}>&#10003; Gewusst!</button>
      </div>
    </div>`;
}

function flipCard() { S.cardFlipped = !S.cardFlipped; render(); }

function answerCard(correct) {
  S.cardResults.push(correct);
  S.cardIdx++;
  S.cardFlipped = false;
  if (S.cardIdx >= S.cards.length) {
    const corr = S.cardResults.filter(Boolean).length;
    api.addScore(S.category, 'cards', corr * 5, corr, S.cards.length)
      .then(res => { if (res.streak) S.streak = res.streak; });
    go('flashcards-result');
  } else render();
}

/* === Quiz === */
const _qOptCache = {};
function getOpts(idx) {
  if (!_qOptCache[idx]) _qOptCache[idx] = getQuizOptions(S.quizQ[idx], S.category);
  return _qOptCache[idx];
}

function renderQuiz() {
  if (!S.quizQ.length || S.quizIdx >= S.quizQ.length)
    return '<div style="padding:2rem;text-align:center">Kein Quiz</div>';
  const q = S.quizQ[S.quizIdx];
  const opts = getOpts(S.quizIdx);
  const timerPct = Math.round((S.quizTime / 10) * 100);
  const optHtml = opts.map((opt, i) => {
    let cls = '';
    if (S.quizSel !== null) {
      if (opt.es === q.es) cls = 'correct';
      else if (i === S.quizSel && opt.es !== q.es) cls = 'wrong';
    }
    return `<button class="quiz-opt ${cls}" onclick="selectQuiz(${i})" ${S.quizSel!==null?'disabled':''}>${esc(opt.es)}</button>`;
  }).join('');
  return `
    <div class="quiz-wrap">
      <div class="quiz-timer-bar"><div class="quiz-timer-fill" id="qtimer" style="width:${timerPct}%"></div></div>
      ${S.quizScore > 0 ? `<div class="quiz-score-chip">⭐ ${S.quizScore} Punkte</div>` : ''}
      <div class="quiz-question">🇩🇪 ${esc(q.de)}</div>
      <div class="quiz-options">${optHtml}</div>
      <div style="text-align:center;color:#9ca3af;font-size:.8rem;padding-bottom:.5rem">
        Frage ${S.quizIdx + 1} / ${S.quizQ.length}
      </div>
    </div>`;
}

function selectQuiz(idx) {
  if (S.quizSel !== null) return;
  clearInterval(S.quizTimer);
  S.quizSel = idx;
  const q = S.quizQ[S.quizIdx];
  if (getOpts(S.quizIdx)[idx]?.es === q.es) {
    S.quizScore += 10 + Math.floor(S.quizTime / 10 * 5);
    S.quizCorrectCount++;
  }
  render();
  setTimeout(advanceQuiz, 1200);
}

function advanceQuiz() {
  S.quizIdx++; S.quizSel = null; S.quizTime = 10;
  if (S.quizIdx >= S.quizQ.length) {
    api.addScore(S.category, 'quiz', S.quizScore, S.quizCorrectCount, S.quizQ.length)
      .then(res => { if (res.streak) S.streak = res.streak; });
    go('quiz-result');
  } else { render(); startQuizTimer(); }
}

function startQuizTimer() {
  clearInterval(S.quizTimer);
  S.quizTimer = setInterval(() => {
    if (S.quizSel !== null) { clearInterval(S.quizTimer); return; }
    S.quizTime = Math.max(0, S.quizTime - 1);
    const el = document.getElementById('qtimer');
    if (el) el.style.width = Math.round((S.quizTime / 10) * 100) + '%';
    if (S.quizTime <= 0) {
      clearInterval(S.quizTimer);
      S.quizSel = -1; render();
      setTimeout(advanceQuiz, 1000);
    }
  }, 1000);
}

/* === Result === */
function renderResult(mode) {
  const isQuiz = mode === 'quiz';
  const correct = isQuiz ? S.quizCorrectCount : S.cardResults.filter(Boolean).length;
  const total   = isQuiz ? S.quizQ.length : S.cards.length;
  const pts     = isQuiz ? S.quizScore : correct * 5;
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0;
  let trophy = '🏅', msg = 'Gut gemacht!';
  if (pct >= 90) { trophy = '🏆'; msg = '¡Excelente! Perfecto!'; }
  else if (pct >= 70) { trophy = '🥇'; msg = '¡Muy bien! Super!'; }
  else if (pct >= 50) { trophy = '🥈'; msg = '¡Bien! Weiter so!'; }
  else { trophy = '💪'; msg = '¡Vamos! Noch mal!'; }
  return `
    <div class="result-page">
      <div class="result-trophy">${trophy}</div>
      <div class="result-title">${msg}</div>
      <div class="result-sub">${esc(catName())} – ${isQuiz ? 'Quiz' : 'Vokabelkarten'}</div>
      <div class="result-stats">
        <div class="result-stat"><div class="result-stat-val">${pts}</div><div class="result-stat-lbl">Punkte</div></div>
        <div class="result-stat"><div class="result-stat-val">${correct}/${total}</div><div class="result-stat-lbl">Richtig</div></div>
        <div class="result-stat"><div class="result-stat-val">${pct}%</div><div class="result-stat-lbl">Quote</div></div>
      </div>
      <button class="result-btn" onclick="startMode('${mode}','${S.category}')">&#x1F504; Nochmal</button>
      <button class="result-btn secondary" onclick="go('home')">Zur Startseite</button>
    </div>`;
}

/* === Phrasebook === */
function renderPhrasebook() {
  const catBtns = CATEGORIES.map(c =>
    `<button class="phrase-cat-btn${S.phraseCategory===c.id?' active':''}" onclick="setPhraseCategory('${c.id}')">
      ${c.emoji} ${esc(c.name)}
    </button>`).join('');
  const items = (VOCAB[S.phraseCategory] || []).map(v =>
    `<div class="phrase-item">
      <div class="phrase-es">${esc(v.es)}</div>
      <div class="phrase-de">🇩🇪 ${esc(v.de)}</div>
      ${v.cat ? `<div class="phrase-cat">🏴 Kat.: ${esc(v.cat)}</div>` : ''}
      ${v.tip ? `<span class="phrase-tip">💡 ${esc(v.tip)}</span>` : ''}
    </div>`).join('');
  return `
    <div class="main-scroll">
      <div class="phrase-cats">${catBtns}</div>
      <div class="phrase-list">${items}</div>
    </div>`;
}
function setPhraseCategory(id) { S.phraseCategory = id; render(); }

/* === Leaderboard === */
function renderLeaderboard() {
  if (!S.leaderboard) return '<div style="padding:2rem;text-align:center;color:#9ca3af">Lade…</div>';
  const tab = S.boardTab;
  const medals = ['🥇','🥈','🥉','👍','👍'];
  const rows = (S.leaderboard.rankings || []).map((r, i) => {
    const pts = tab === 'week' ? r.weekPoints : r.totalPoints;
    return `
      <div class="board-row${r.id === S.user?.id ? ' me' : ''}">
        <div class="board-rank">${medals[i] || i+1}</div>
        <div class="board-avatar">${r.avatar}</div>
        <div class="board-info">
          <div class="board-name" style="color:${r.color}">${esc(r.displayName)}</div>
          <div class="board-meta">🔥 ${r.streak} Tage · Beststreak: ${r.bestStreak}</div>
        </div>
        <div class="board-pts" style="color:${r.color}">${pts}<span> Pkt</span></div>
      </div>`;
  }).join('');
  return `
    <div class="main-scroll">
      <div style="padding:1.25rem 1.25rem .5rem"><h2 style="font-size:1.2rem;font-weight:800">🏆 Familie Hoffknecht</h2></div>
      <div class="board-tabs">
        <button class="board-tab${tab==='week'?' active':''}" onclick="setBoardTab('week')">Diese Woche</button>
        <button class="board-tab${tab==='all'?' active':''}"  onclick="setBoardTab('all')">Gesamt</button>
      </div>
      <div class="board-list">${rows}</div>
    </div>`;
}
function setBoardTab(t) { S.boardTab = t; render(); }

/* === Settings === */
function renderSettings() {
  const u = S.user;
  return `
    <div class="main-scroll">
      <div class="settings-page">
        <div style="text-align:center;padding:1.5rem 0 1rem">
          <div style="font-size:3.5rem">${u?.avatar||'😊'}</div>
          <div style="font-size:1.2rem;font-weight:800;margin-top:.5rem">${esc(u?.displayName||'')}</div>
        </div>
        <div class="settings-card">
          <div class="settings-row">
            <div class="settings-row-icon">👤</div>
            <div class="settings-row-label">Benutzername</div>
            <div class="settings-row-val">${esc(u?.username||'')}</div>
          </div>
          <div class="settings-row" style="cursor:pointer" onclick="go('pin-change')">
            <div class="settings-row-icon">🔒</div>
            <div class="settings-row-label">PIN ändern</div>
            <div style="color:#c60b1e;font-weight:700">→</div>
          </div>
        </div>
        <a href="https://familie.hoffknecht.de" class="settings-btn" style="display:block;text-align:center;text-decoration:none;background:#eef2ff;color:#4338ca;margin-bottom:.5rem">🏠 Zum Portal</a>
        <button class="settings-btn danger" onclick="doLogout()">🚪 Abmelden</button>
      </div>
    </div>`;
}

/* === PIN Change === */
function renderPinChange() {
  return `
    <div class="main-scroll">
      <div class="pin-change-form">
        <div class="pin-input-row"><label>Aktuelle PIN</label>
          <input type="password" inputmode="numeric" maxlength="6" id="pin-old" placeholder="••••"></div>
        <div class="pin-input-row"><label>Neue PIN (4–6 Ziffern)</label>
          <input type="password" inputmode="numeric" maxlength="6" id="pin-new" placeholder="••••"></div>
        <div class="pin-input-row"><label>Neue PIN bestätigen</label>
          <input type="password" inputmode="numeric" maxlength="6" id="pin-new2" placeholder="••••"></div>
        <button class="settings-btn primary" onclick="submitPinChange()">🔒 PIN ändern</button>
        <div id="pin-msg" style="text-align:center;font-size:.875rem;color:#c60b1e;margin-top:.5rem"></div>
      </div>
    </div>`;
}

async function submitPinChange() {
  const old  = document.getElementById('pin-old')?.value;
  const nw   = document.getElementById('pin-new')?.value;
  const nw2  = document.getElementById('pin-new2')?.value;
  const msg  = document.getElementById('pin-msg');
  if (!old||!nw||!nw2)     { msg.textContent='Alle Felder ausfüllen.'; return; }
  if (nw !== nw2)           { msg.textContent='Neue PIN stimmt nicht überein.'; return; }
  if (!/^\d{4,6}$/.test(nw)){ msg.textContent='PIN: nur 4–6 Ziffern.'; return; }
  const res = await api.changePin(old, nw);
  if (res.ok) { toast('✅ PIN geändert!'); go('settings'); }
  else { msg.textContent = res.error || 'Fehler'; }
}

/* === Helpers === */
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function loadLeaderboard() {
  const res = await api.leaderboard();
  if (res.rankings) {
    S.leaderboard = res;
    const me = res.rankings.find(r => r.id === S.user?.id);
    if (me) S.streak = me.streak;
  }
}

async function doLogout() {
  await api.logout();
  S.user = null; S.streak = 0; S.leaderboard = null; S.loginUser = null; S.pin = '';
  go('login');
}

function go(view) {
  const stay = ['login','flashcards','quiz','flashcards-result','quiz-result','pin-change'];
  if (!stay.includes(S.view)) S.prevView = S.view;
  clearInterval(S.quizTimer);
  if (view === 'quiz') Object.keys(_qOptCache).forEach(k => delete _qOptCache[k]);
  S.view = view;
  render();
  if (view === 'home' || view === 'leaderboard') loadLeaderboard().then(render);
  if (view === 'quiz') setTimeout(startQuizTimer, 300);
}

let _toastTimer;
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

async function init() {
  const res = await api.me();
  if (res.user) { S.user = res.user; await loadLeaderboard(); go('home'); }
  else { go('login'); }
}

init();
