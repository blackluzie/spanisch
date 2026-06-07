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
  showPin: false,
  pinForm: { old: '', n1: '', n2: '', err: '', ok: false, busy: false },
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
    case 'dashboard': el.innerHTML = renderDashboard() + (P.showPin ? renderPinModal() : ''); break;
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
        <div class="p-topbar-actions">
          <button class="p-topbar-gear" title="PIN ändern" onclick="pOpenPin()">⚙️</button>
          <button class="p-topbar-logout" onclick="pLogout()">Abmelden</button>
        </div>
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

function renderPinModal() {
  const f = P.pinForm;
  const inputStyle = 'width:100%;box-sizing:border-box;font-size:1.5rem;letter-spacing:.4em;text-align:center;padding:.7rem;margin-top:.4rem;border:2px solid #e5e7eb;border-radius:.7rem;outline:none;';
  if (f.ok) {
    return `
    <div class="p-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:1.2rem;z-index:50" onclick="pClosePin(event)">
      <div style="background:#fff;border-radius:1.2rem;padding:1.6rem;max-width:340px;width:100%;text-align:center" onclick="event.stopPropagation()">
        <div style="font-size:2.6rem">✅</div>
        <div style="font-size:1.15rem;font-weight:700;margin:.5rem 0 1rem">PIN geändert!</div>
        <button onclick="pClosePin()" style="background:#4338ca;color:#fff;border:none;border-radius:.7rem;padding:.7rem 1.4rem;font-size:1rem;font-weight:600;width:100%">Fertig</button>
      </div>
    </div>`;
  }
  return `
    <div class="p-modal-bg" style="position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:1.2rem;z-index:50" onclick="pClosePin(event)">
      <div style="background:#fff;border-radius:1.2rem;padding:1.5rem;max-width:340px;width:100%" onclick="event.stopPropagation()">
        <div style="font-size:1.2rem;font-weight:700;text-align:center;margin-bottom:.3rem">🔑 PIN ändern</div>
        <div style="font-size:.8rem;color:#9ca3af;text-align:center;margin-bottom:1rem">4 bis 6 Ziffern</div>
        ${f.err ? `<div style="background:#fee2e2;color:#b91c1c;font-size:.85rem;padding:.5rem .7rem;border-radius:.6rem;margin-bottom:.8rem;text-align:center">${f.err}</div>` : ''}
        <label style="font-size:.85rem;color:#6b7280;font-weight:600">Aktuelle PIN
          <input id="pin-old" type="tel" inputmode="numeric" maxlength="6" value="${f.old}" oninput="pPinInput('old',this.value)" style="${inputStyle}">
        </label>
        <label style="font-size:.85rem;color:#6b7280;font-weight:600;display:block;margin-top:.9rem">Neue PIN
          <input id="pin-n1" type="tel" inputmode="numeric" maxlength="6" value="${f.n1}" oninput="pPinInput('n1',this.value)" style="${inputStyle}">
        </label>
        <label style="font-size:.85rem;color:#6b7280;font-weight:600;display:block;margin-top:.9rem">Neue PIN wiederholen
          <input id="pin-n2" type="tel" inputmode="numeric" maxlength="6" value="${f.n2}" oninput="pPinInput('n2',this.value)" style="${inputStyle}">
        </label>
        <div style="display:flex;gap:.6rem;margin-top:1.3rem">
          <button onclick="pClosePin()" style="flex:1;background:#f3f4f6;color:#374151;border:none;border-radius:.7rem;padding:.75rem;font-size:1rem;font-weight:600">Abbrechen</button>
          <button onclick="pSubmitPin()" ${f.busy?'disabled':''} style="flex:1;background:#4338ca;color:#fff;border:none;border-radius:.7rem;padding:.75rem;font-size:1rem;font-weight:600;opacity:${f.busy?'.6':'1'}">${f.busy?'…':'Speichern'}</button>
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

/* === PIN-Änderung === */
function pOpenPin() {
  P.showPin = true;
  P.pinForm = { old: '', n1: '', n2: '', err: '', ok: false, busy: false };
  pRender();
}
function pClosePin(event) {
  if (event && event.type === 'click' && event.target !== event.currentTarget) return;
  P.showPin = false;
  pRender();
}
function pPinInput(field, value) {
  P.pinForm[field] = value.replace(/\D/g, '').slice(0, 6);
  // keine Komplett-Neurender beim Tippen – Wert bleibt im Input erhalten
}
async function pSubmitPin() {
  const f = P.pinForm;
  // Werte direkt aus den Feldern lesen (falls oninput-State knapp)
  const oldP = (document.getElementById('pin-old')?.value || f.old).replace(/\D/g,'');
  const n1   = (document.getElementById('pin-n1')?.value  || f.n1 ).replace(/\D/g,'');
  const n2   = (document.getElementById('pin-n2')?.value  || f.n2 ).replace(/\D/g,'');
  f.old = oldP; f.n1 = n1; f.n2 = n2;
  if (!/^\d{4,6}$/.test(oldP)) { f.err = 'Bitte aktuelle PIN eingeben.'; pRender(); return; }
  if (!/^\d{4,6}$/.test(n1))   { f.err = 'Neue PIN muss 4–6 Ziffern haben.'; pRender(); return; }
  if (n1 !== n2)              { f.err = 'Die neuen PINs stimmen nicht überein.'; pRender(); return; }
  f.err = ''; f.busy = true; pRender();
  const res = await pApi.pin(oldP, n1);
  f.busy = false;
  if (res.ok) { f.ok = true; pRender(); }
  else        { f.err = res.error || 'Fehler beim Ändern.'; pRender(); }
}

/* === Init === */
(async () => {
  const res = await pApi.me();
  if (res.user) { P.user = res.user; P.view = 'dashboard'; }
  else          { P.view = 'login'; }
  pRender();
})();
