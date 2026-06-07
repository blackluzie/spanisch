/* === Familie Hoffknecht – Portal === */

const MEMBERS = [
  { username: 'martin', name: 'Martin', avatar: '👨', color: '#1d4ed8' },
  { username: 'jane',   name: 'Jane',   avatar: '👩', color: '#7c3aed' },
  { username: 'matti',  name: 'Matti',  avatar: '🧒', color: '#059669' },
  { username: 'jette',  name: 'Jette',  avatar: '👧', color: '#db2777' },
];

const APPS = {
  martin: [
    { name: '¡Español!', desc: 'Costa Brava 2026',    url: 'https://spanisch.hoffknecht.de', icon: '🇪🇸', color: '#c60b1e' },
    { name: 'Vokabeln',  desc: 'Sprachen lernen',      url: 'https://vokabeln.hoffknecht.de', icon: '📚', color: '#4f46e5' },
  ],
  jane: [
    { name: '¡Español!', desc: 'Costa Brava 2026',    url: 'https://spanisch.hoffknecht.de', icon: '🇪🇸', color: '#c60b1e' },
    { name: 'Vokabeln',  desc: 'Sprachen lernen',      url: 'https://vokabeln.hoffknecht.de', icon: '📚', color: '#4f46e5' },
  ],
  matti: [
    { name: '¡Español!', desc: 'Costa Brava 2026',    url: 'https://spanisch.hoffknecht.de', icon: '🇪🇸', color: '#c60b1e' },
    { name: 'Mathe',     desc: 'Aufgaben für die Schule', url: 'https://jette.hoffknecht.de', icon: '🍎', color: '#059669' },
    { name: 'Vokabeln',  desc: 'Sprachen lernen',      url: 'https://vokabeln.hoffknecht.de', icon: '📚', color: '#4f46e5' },
  ],
  jette: [
    { name: 'Mathe',     desc: 'Meine Mathe-App ✨',   url: 'https://jette.hoffknecht.de', icon: '🍎', color: '#10b981' },
    { name: '¡Español!', desc: 'Costa Brava 2026',    url: 'https://spanisch.hoffknecht.de', icon: '🇪🇸', color: '#c60b1e' },
    { name: 'Vokabeln',  desc: 'Sprachen lernen',      url: 'https://vokabeln.hoffknecht.de', icon: '📚', color: '#4f46e5' },
  ],
};

/* === State === */
const P = {
  view: 'loading',
  user: null,
  loginUser: null,
  pin: '',
  pinError: '',
};

/* === API === */
const pApi = {
  async req(method, path, body) {
    const r = await fetch(path, {
      method, credentials: 'include',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.json();
  },
  me:     ()               => pApi.req('GET',  '/api/me'),
  login:  (username, pin)  => pApi.req('POST', '/api/login', { username, pin }),
  logout: ()               => pApi.req('POST', '/api/logout'),
  pin:    (oldPin, newPin) => pApi.req('PUT',  '/api/pin',   { oldPin, newPin }),
};

/* === Render === */
function pRender() {
  const el = document.getElementById('portal');
  switch (P.view) {
    case 'login':     el.innerHTML = renderLogin(); break;
    case 'dashboard': el.innerHTML = renderDashboard(); break;
    default:          el.innerHTML = '<div class="p-loading"><div class="p-loading-icon">🏠</div></div>';
  }
}

function renderLogin() {
  const cards = MEMBERS.map(m => `
    <div class="p-member${P.loginUser === m.username ? ' selected' : ''}"
         style="--mc:${m.color}" onclick="pSelectMember('${m.username}')">
      <div class="p-member-avatar">${m.avatar}</div>
      <div class="p-member-name">${m.name}</div>
      <div class="p-member-dot"></div>
    </div>`).join('');

  const pin = P.loginUser ? `
    <div class="p-pin-area">
      <div class="p-pin-label">PIN eingeben</div>
      <div class="p-pin-dots">
        ${[0,1,2,3].map(i => `<div class="p-pin-dot${P.pin.length > i ? ' filled' : ''}"></div>`).join('')}
      </div>
      ${P.pinError ? `<div class="p-pin-err">${P.pinError}</div>` : ''}
      <div class="p-pin-pad">
        ${['1','2','3','4','5','6','7','8','9','','0','⌫'].map(k => k
          ? `<button class="p-pin-key${k==='⌫'?' del':''}" onclick="pPinKey('${k}')">${k}</button>`
          : '<div></div>').join('')}
      </div>
    </div>` : `<p style="color:#9ca3af;font-size:.875rem;text-align:center">Wähle dein Profil</p>`;

  return `
    <div class="p-login">
      <div class="p-login-header">
        <span class="p-login-logo">🏠</span>
        <div class="p-login-title">Familie Hoffknecht</div>
        <div class="p-login-sub">Wer bist du heute?</div>
      </div>
      <div class="p-members">${cards}</div>
      ${pin}
    </div>`;
}

function renderDashboard() {
  const u = P.user;
  const apps = APPS[u?.username] || [];
  const mc = MEMBERS.find(m => m.username === u?.username)?.color || '#4338ca';

  const tiles = apps.map(app => `
    <a class="p-app-tile" style="--ac:${app.color}" href="${app.url}">
      <div class="p-app-tile-body">
        <div class="p-app-icon">${app.icon}</div>
        <div class="p-app-name">${app.name}</div>
        <div class="p-app-desc">${app.desc}</div>
        <div class="p-app-arrow">Öffnen →</div>
      </div>
    </a>`).join('');

  const greetings = ['Schön, dass du da bist! 👋', 'Bereit zum Lernen? 💪', 'Hallo! Was machst du heute? 🌟', '¡Hola! Los geht\'s! 🚀'];
  const greet = greetings[Math.floor(Math.random() * greetings.length)];

  return `
    <div class="p-dash">
      <div class="p-topbar">
        <div class="p-topbar-left">
          <div class="p-topbar-avatar">${u?.avatar || '👤'}</div>
          <div>
            <div class="p-topbar-name">${u?.displayName || ''}</div>
            <div class="p-topbar-sub">familie.hoffknecht.de</div>
          </div>
        </div>
        <button class="p-topbar-logout" onclick="pLogout()">Abmelden</button>
      </div>
      <div class="p-dash-scroll">
        <div class="p-greeting-card" style="--mc:${mc}">
          <div class="p-greeting-text">${greet}</div>
          <div class="p-greeting-sub">${new Date().toLocaleDateString('de-DE', {weekday:'long', day:'numeric', month:'long'})}</div>
        </div>
        <div class="p-section-title">Deine Apps</div>
        <div class="p-apps">${tiles}</div>
        <div class="p-soon">
          <div class="p-soon-icon">🔜</div>
          <div style="margin-top:.3rem">Mehr Apps kommen bald!</div>
        </div>
      </div>
    </div>`;
}

/* === Actions === */
function pSelectMember(username) {
  P.loginUser = username; P.pin = ''; P.pinError = ''; pRender();
}

function pPinKey(key) {
  if (key === '⌫') { P.pin = P.pin.slice(0, -1); P.pinError = ''; pRender(); return; }
  if (P.pin.length >= 6) return;
  P.pin += key;
  pRender();
  if (P.pin.length >= 4) pDoLogin();
}

async function pDoLogin() {
  const res = await pApi.login(P.loginUser, P.pin);
  if (res.user) {
    P.user = res.user; P.pin = ''; P.pinError = '';
    P.view = 'dashboard'; pRender();
  } else {
    P.pinError = res.error || 'Falsche PIN'; P.pin = ''; pRender();
  }
}

async function pLogout() {
  await pApi.logout();
  P.user = null; P.loginUser = null; P.pin = '';
  P.view = 'login'; pRender();
}

/* === Init === */
(async () => {
  const res = await pApi.me();
  if (res.user) { P.user = res.user; P.view = 'dashboard'; }
  else          { P.view = 'login'; }
  pRender();
})();
