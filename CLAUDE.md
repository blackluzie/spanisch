# Familie Hoffknecht – Projekt-Übersicht

## Familienmitglieder
| Name | Avatar | Farbe | Username |
|------|--------|-------|----------|
| Martin | 👨 | #1d4ed8 | martin |
| Jane | 👩 | #7c3aed | jane |
| Matti | 🧒 | #059669 | matti |
| Jette | 👧 | #db2777 | jette |

## Live-URLs (nach Deploy)
| App | URL | Beschreibung |
|-----|-----|--------------|
| Familienportal | https://familie.hoffknecht.de | Zentrales Login für alle Apps |
| Spanisch-Lern-App | https://spanisch.hoffknecht.de | Vokabeln + Quiz für Costa Brava |
| Jette's Mathe | https://jette.hoffknecht.de | Mathe-App für Jette & Matti |
| Vokabeln | https://vokabeln.hoffknecht.de | Allgemeiner Vokabel-Trainer |

## GitHub Repos & Branches
| Repo | Feature-Branch | PR |
|------|---------------|----|
| blackluzie/spanisch | claude/family-spanish-learning-pwa-FAOD5 | #1 |
| blackluzie/jettemathe | claude/family-spanish-learning-pwa-FAOD5 | (vorhanden) |
| blackluzie/Vokabeln | claude/family-spanish-learning-pwa-FAOD5 | #3 |

## Infrastruktur
- **Cloudflare Workers** – alle 3 Apps
- **Cloudflare D1** – SQLite-Datenbank pro Worker
  - `spanisch` – D1 für Portal + Spanisch-App (database_name: spanisch)
  - `vokabeln` – D1 für Vokabeln-App (database_name: vokabeln)
- **GitHub Actions** – Auto-Deploy bei Push auf Feature-Branch oder main

## SSO / Authentifizierung

### Konzept
- Cookie-Name: `hk_session`
- Cookie-Domain: `Domain=.hoffknecht.de` → wird automatisch an ALLE Subdomains gesendet
- Token-Format: `b64url(JSON.stringify({u,n,d,a,c,e})).HMAC-SHA256`
  - `u` = userId, `n` = username, `d` = displayName, `a` = avatar, `c` = color, `e` = expiry (ms)
- Alle 3 Workers müssen **denselben** `SESSION_SECRET` verwenden!

### SESSION_SECRET setzen (ALLE drei Worker!)
```bash
wrangler secret put SESSION_SECRET --name spanisch
wrangler secret put SESSION_SECRET --name jettemathe
wrangler secret put SESSION_SECRET --name vokabeln
# Wichtig: überall denselben Wert eingeben!
```

### SSO-Flow
1. Familie loggt sich auf `familie.hoffknecht.de` ein (PIN-basiert)
2. `hk_session`-Cookie mit `Domain=.hoffknecht.de` wird gesetzt
3. Browser navigiert zu z.B. `spanisch.hoffknecht.de` → Cookie wird mitgeschickt
4. Worker verifiziert `hk_session` mit HMAC → Auto-Login

### Welcher Worker macht was
| Worker | hk_session-Verhalten |
|--------|---------------------|
| spanisch | Setzt hk_session (ist der Portal-Worker). Eigene Cookie-Logik für beide Domains |
| jettemathe | Prüft hk_session → wenn valide, ASSETS direkt ausliefern |
| vokabeln | Prüft hk_session bei /api/me → wenn username in DB → Session auto-erstellen |

## Spanisch-App (spanisch.hoffknecht.de)

### Tech-Stack
- Cloudflare Worker (`src/worker.js`) – API + dual-domain routing
- Statische PWA in `public/` (Vanilla JS, kein Framework)
- D1-Datenbank mit schema.sql

### Dual-Domain
Derselbe Worker bedient **beide** Domains:
- `familie.hoffknecht.de` → liefert `portal.html` aus
- `spanisch.hoffknecht.de` → liefert `index.html` aus

### API-Endpunkte (Worker)
| Method | Path | Beschreibung |
|--------|------|--------------|
| POST | /api/setup | Erstellt die 4 Familienprofile (einmalig nach Deploy!) |
| POST | /api/login | Login mit username + pin |
| POST | /api/logout | Logout |
| GET | /api/me | Aktuellen User abrufen |
| GET | /api/leaderboard | Rangliste aller Familienmitglieder |
| POST | /api/score | Punktestand nach Quiz/Karten speichern |
| PUT | /api/pin | PIN ändern |

### Erster Setup nach Deploy
```bash
# 1. Familienmitglieder anlegen (einmalig!):
curl -X POST https://spanisch.hoffknecht.de/api/setup
# Legt martin, jane, matti, jette an (alle mit PIN 1234)
# Jeder sollte seine PIN beim ersten Login ändern!

# 2. SESSION_SECRET setzen:
wrangler secret put SESSION_SECRET --name spanisch
```

### D1-Schema (schema.sql)
- `users` – id, username, username_lc, display_name, color, avatar, pin_hash, pin_salt, created_at
- `scores` – id, user_id, category, mode, points, correct, total, played_at
- `streaks` – user_id, last_date, current_streak, best_streak

### Vokabeln (150+ Wörter in 9 Kategorien)
| ID | Name | Anzahl |
|----|------|---------|
| greeting | Begrüßungen | 21 |
| numbers | Zahlen & Zeit | 28 |
| food | Essen & Restaurant | 24 |
| beach | Strand & Meer | 20 |
| hotel | Hotel & Unterkunft | 15 |
| shopping | Einkaufen | 15 |
| directions | Orientierung | 16 |
| emergency | Notfall | 14 |
| catalan | Katalanisch | 18 |

## Portal (familie.hoffknecht.de)

### Dateien
| Datei | Beschreibung |
|-------|--------------|
| public/portal.html | HTML-Shell für Portal-SPA |
| public/portal.css | Indigo-Theme (#4338ca) |
| public/portal.js | Login + Dashboard Logik |
| public/portal-manifest.webmanifest | PWA-Manifest |
| public/icons/portal-icon.svg | Haus-Icon auf indigem Hintergrund |

### Portal-Views
1. **login** – 4 Profilkarten + PIN-Pad
2. **dashboard** – App-Kacheln je nach Familienmitglied

### App-Kacheln pro Mitglied
| Mitglied | Apps |
|----------|------|
| Martin | Español, Vokabeln |
| Jane | Español, Vokabeln |
| Matti | Español, Mathe, Vokabeln |
| Jette | Mathe, Español, Vokabeln |

## Vokabeln-App (vokabeln.hoffknecht.de)

### SSO-Integration
In `src/worker.js` – `handleApi()` für `GET /api/me`:
1. Eigenes `session`-Cookie prüfen → falls valide, normaler Flow
2. Sonst `hk_session` prüfen → username aus Token extrahieren
3. User in vokabeln-DB per `username_lc` suchen
4. Wenn gefunden → vokabeln-Session erstellen + Cookie setzen
5. Sonst 401 → SPA zeigt Login/Registrierungs-Screen

**Wichtig**: Vokabeln-Nutzer müssen **denselben Username** haben wie im Portal!

## Jettemathe-App (jette.hoffknecht.de)

### SSO-Integration
In `worker/index.js`:
- Prüft `hk_session` Cookie
- Falls valide Portal-Token → ASSETS direkt ausliefern (kein eigenes Login nötig)
- Fallback: eigenes `jm_auth`-Cookie oder SITE_PASSWORD
- Link auf Login-Seite: "🏠 Über Familienportal anmelden" → familie.hoffknecht.de

## GitHub Actions (spanisch/.github/workflows/deploy.yml)

### Required Secrets (in GitHub Repo Settings → Secrets → Actions)
| Secret | Wo setzen |
|--------|----------|
| CLOUDFLARE_API_TOKEN | blackluzie/spanisch → Settings → Secrets |
| CLOUDFLARE_ACCOUNT_ID | blackluzie/spanisch → Settings → Secrets |

Dieselben Secrets müssen auch in jettemathe und vokabeln gesetzt sein.

### Deploy-Flow
1. Push auf `claude/family-spanish-learning-pwa-FAOD5` oder `main`
2. GitHub Actions: npm install → D1 create/find → schema apply → wrangler deploy

## Bekannte Token-Formate

### Portal hk_session Token (`{ u, n, d, a, c, e }`)
```javascript
// Signieren:
const payload = b64url(JSON.stringify({ u: user.id, n: user.username,
  d: user.display_name, a: user.avatar, c: user.color, e: expiry }));
const token = payload + '.' + await hmac(payload, env);
```

### Vokabeln session Token (`{ u, e }`)
```javascript
const payload = b64url(JSON.stringify({ u: userId, e: expiry }));
const token = payload + '.' + await hmac(payload, env);
```

### HMAC-Funktion (identisch in allen Workers)
```javascript
async function hmac(data, env) {
  const key = await crypto.subtle.importKey('raw',
    new TextEncoder().encode(env.SESSION_SECRET || 'dev-insecure'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return b64url(String.fromCharCode(...new Uint8Array(sig)));
}
```

## Design-System
| App | Primärfarbe | Akzent |
|-----|------------|--------|
| Portal | #4338ca (Indigo) | #6366f1 |
| Spanisch | #c60b1e (Spanisch-Rot) | #ffc400 (Gelb) |
| Jettemathe | grün | – |
| Vokabeln | #4f46e5 (Indigo) | – |
