/*
 * Cloudflare Worker – Familie Hoffknecht
 * Bedient zwei Domains:
 *   familie.hoffknecht.de  → Familien-Portal (Login + Dashboard)
 *   spanisch.hoffknecht.de → Spanisch-Lern-App
 *
 * Cookie: hk_session  mit Domain=.hoffknecht.de  →  SSO für alle Subdomains
 * Bindings: ASSETS (static), DB (D1)
 * Secrets:  SESSION_SECRET  (gleich in allen Apps!)
 */

const SESSION_DAYS = 30;
const COOKIE_NAME  = 'hk_session';
const enc = new TextEncoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isPortal = url.hostname === 'familie.hoffknecht.de'
                  || url.hostname === 'localhost';

    if (url.pathname.startsWith('/api/')) {
      try { return await handleApi(request, env, url, isPortal); }
      catch (e) { return json({ error: e.message || 'Serverfehler' }, 500); }
    }

    // Portal-Domain: alle Pfade ohne Dateiendung → portal.html
    if (isPortal) {
      const hasExt = /\.[a-zA-Z0-9]+$/.test(url.pathname);
      if (!hasExt) {
        return env.ASSETS.fetch(
          new Request(new URL('/portal.html', url.origin).href)
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};

/* ---- API-Routing ---- */
async function handleApi(request, env, url, isPortal) {
  const path = url.pathname.replace(/\/+$/, '');
  const m    = request.method;

  if (path === '/api/setup'  && m === 'POST') return setup(env);
  if (path === '/api/login'  && m === 'POST') return login(request, env, url);
  if (path === '/api/logout' && m === 'POST') return logout(url);

  const user = await currentUser(request, env);
  if (!user) return json({ error: 'Nicht angemeldet' }, 401);

  if (path === '/api/me'          && m === 'GET')  return json({ user: publicUser(user) });
  if (path === '/api/leaderboard' && m === 'GET')  return leaderboard(env);
  if (path === '/api/scores'      && m === 'GET')  return getScores(env, user, url);
  if (path === '/api/score'       && m === 'POST') return addScore(request, env, user);
  if (path === '/api/pin'         && m === 'PUT')  return changePin(request, env, user);

  return json({ error: 'Unbekannter Endpunkt' }, 404);
}

/* ---- Setup (einmalig) ---- */
async function setup(env) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS c FROM users').first();
  if (row && row.c > 0) return json({ error: 'Familie bereits eingerichtet.' }, 409);

  const members = [
    { username: 'martin', display_name: 'Martin', color: '#1d4ed8', avatar: '👨' },
    { username: 'jane',   display_name: 'Jane',   color: '#7c3aed', avatar: '👩' },
    { username: 'matti',  display_name: 'Matti',  color: '#059669', avatar: '🧒' },
    { username: 'jette',  display_name: 'Jette',  color: '#db2777', avatar: '👧' },
  ];
  const now = Date.now();
  for (const mb of members) {
    const id = uid();
    const { hash, salt } = await hashPin('1234');
    await env.DB.prepare(
      `INSERT INTO users (id,username,username_lc,display_name,color,avatar,pin_hash,pin_salt,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(id, mb.username, mb.username, mb.display_name, mb.color, mb.avatar, hash, salt, now).run();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO streaks (user_id,last_date,current_streak,best_streak) VALUES (?,null,0,0)`
    ).bind(id).run();
  }
  return json({ ok: true, message: 'Familie angelegt. Standard-PIN: 1234' });
}

/* ---- Auth ---- */
async function login(request, env, url) {
  const b = await readJson(request);
  const username = String(b.username || '').toLowerCase().trim();
  const pin = String(b.pin || '');
  if (!username || !pin) return json({ error: 'Benutzername und PIN erforderlich.' }, 400);
  const user = await env.DB.prepare('SELECT * FROM users WHERE username_lc=?').bind(username).first();
  if (!user) return json({ error: 'Unbekannter Benutzer.' }, 401);
  if (!await verifyPin(pin, user.pin_hash, user.pin_salt)) return json({ error: 'Falsche PIN.' }, 401);
  return withSession(json({ user: publicUser(user) }), user, env, url);
}

function logout(url) {
  const res = json({ ok: true });
  res.headers.append('Set-Cookie', buildCookie(COOKIE_NAME, '', 0, url));
  return res;
}

/* ---- Data ---- */
async function leaderboard(env) {
  const { results: users }   = await env.DB.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
  const { results: streaks } = await env.DB.prepare('SELECT * FROM streaks').all();
  const streakMap = Object.fromEntries(streaks.map(s => [s.user_id, s]));

  const { results: totals } = await env.DB.prepare(
    'SELECT user_id, SUM(points) AS total FROM scores GROUP BY user_id'
  ).all();
  const totalMap = Object.fromEntries(totals.map(t => [t.user_id, t.total]));

  const weekAgo = Date.now() - 7 * 86400000;
  const { results: weekly } = await env.DB.prepare(
    'SELECT user_id, SUM(points) AS total FROM scores WHERE played_at>? GROUP BY user_id'
  ).bind(weekAgo).all();
  const weekMap = Object.fromEntries(weekly.map(t => [t.user_id, t.total]));

  const rankings = users.map(u => ({
    id: u.id,
    displayName: u.display_name,
    color: u.color,
    avatar: u.avatar,
    totalPoints: totalMap[u.id] || 0,
    weekPoints:  weekMap[u.id]  || 0,
    streak:      streakMap[u.id]?.current_streak || 0,
    bestStreak:  streakMap[u.id]?.best_streak    || 0,
  })).sort((a, b) => b.totalPoints - a.totalPoints);

  return json({ rankings });
}

async function getScores(env, user, url) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const { results } = await env.DB.prepare(
    'SELECT * FROM scores WHERE user_id=? ORDER BY played_at DESC LIMIT ?'
  ).bind(user.id, limit).all();
  return json({ scores: results });
}

async function addScore(request, env, user) {
  const b = await readJson(request);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO scores (id,user_id,category,mode,points,correct,total,played_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(uid(), user.id, b.category||'unknown', b.mode||'cards',
    b.points||0, b.correct||0, b.total||0, now).run();

  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak    = await env.DB.prepare('SELECT * FROM streaks WHERE user_id=?').bind(user.id).first();
  let cur = 1, best = 1;
  if (streak) {
    if      (streak.last_date === today)     { cur = streak.current_streak; best = streak.best_streak; }
    else if (streak.last_date === yesterday) { cur = streak.current_streak + 1; best = Math.max(streak.best_streak, cur); }
    else                                      { cur = 1; best = Math.max(streak.best_streak || 1, 1); }
  }
  await env.DB.prepare(
    `INSERT INTO streaks (user_id,last_date,current_streak,best_streak) VALUES (?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET last_date=excluded.last_date,
     current_streak=excluded.current_streak, best_streak=excluded.best_streak`
  ).bind(user.id, today, cur, best).run();
  return json({ ok: true, streak: cur });
}

async function changePin(request, env, user) {
  const b = await readJson(request);
  if (!b.newPin || !/^\d{4,6}$/.test(b.newPin))
    return json({ error: 'PIN muss 4–6 Ziffern haben.' }, 400);
  if (!await verifyPin(b.oldPin || '', user.pin_hash, user.pin_salt))
    return json({ error: 'Aktuelle PIN ist falsch.' }, 401);
  const { hash, salt } = await hashPin(b.newPin);
  await env.DB.prepare('UPDATE users SET pin_hash=?,pin_salt=? WHERE id=?').bind(hash, salt, user.id).run();
  return json({ ok: true });
}

/* ---- Session ---- */
async function currentUser(request, env) {
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return null;
  const payload = await verifyToken(token, env);
  if (!payload) return null;
  return env.DB.prepare('SELECT * FROM users WHERE id=?').bind(payload.u).first();
}

function withSession(res, user, env, url) {
  return signToken(user, env).then(token => {
    res.headers.append('Set-Cookie', buildCookie(COOKIE_NAME, token, SESSION_DAYS * 86400, url));
    return res;
  });
}

async function signToken(user, env) {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const payloadJson = JSON.stringify({
    u: user.id, n: user.username, d: user.display_name,
    a: user.avatar, c: user.color, e: exp,
  });
  const bytes = enc.encode(payloadJson);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const payload = btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return payload + '.' + await hmac(payload, env);
}

async function verifyToken(token, env) {
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig     = token.slice(dot + 1);
  if (!timingSafeEqual(sig, await hmac(payload, env))) return null;
  try {
    let b64 = payload.replace(/-/g,'+').replace(/_/g,'/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data.u || !data.e || Date.now() > data.e) return null;
    return data;
  } catch { return null; }
}

/* ---- Crypto ---- */
function sessionKey(env) {
  const secret = env.SESSION_SECRET || 'dev-secret-hoffknecht-familie';
  return crypto.subtle.importKey('raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function hmac(data, env) {
  const key = await sessionKey(env);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64url(String.fromCharCode(...new Uint8Array(sig)));
}
async function hashPin(pin, saltHex) {
  const salt = saltHex ? hexToBuf(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key  = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return { hash: bufToHex(bits), salt: bufToHex(salt.buffer || salt) };
}
async function verifyPin(pin, hash, saltHex) {
  return timingSafeEqual((await hashPin(pin, saltHex)).hash, hash);
}
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/* ---- Helpers ---- */
function publicUser(u) {
  return { id: u.id, username: u.username, displayName: u.display_name, color: u.color, avatar: u.avatar };
}
function uid() { return crypto.randomUUID(); }
async function readJson(req) { try { return await req.json(); } catch { return {}; } }
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
function buildCookie(name, value, maxAge, url) {
  const isLocal  = /^(localhost|127\.0\.0\.1)/.test(url.hostname);
  const secure   = isLocal ? '' : '; Secure';
  // Domain=.hoffknecht.de erlaubt SSO auf ALLEN Subdomains
  const domain   = (!isLocal && url.hostname.endsWith('.hoffknecht.de'))
    ? '; Domain=.hoffknecht.de' : '';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}${domain}`;
}
function getCookie(req, name) {
  const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? m[1] : null;
}
function b64url(str) { return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64url(str) {
  str = str.replace(/-/g,'+').replace(/_/g,'/');
  while (str.length % 4) str += '=';
  return atob(str);
}
function bufToHex(buf) { return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
function hexToBuf(hex) {
  const a = new Uint8Array(hex.length/2);
  for (let i=0;i<a.length;i++) a[i]=parseInt(hex.substr(i*2,2),16);
  return a;
}
