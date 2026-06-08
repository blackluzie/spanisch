# Deployment – spanisch.hoffknecht.de

## Voraussetzungen
- Cloudflare-Account mit Zone `hoffknecht.de`
- GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## Erster Deploy
1. Push auf Branch `claude/family-spanish-learning-pwa-FAOD5` → GitHub Actions deployed automatisch
2. Session-Secret setzen: `npx wrangler secret put SESSION_SECRET`
3. Familie anlegen (einmalig nach erstem Deploy):
   ```
   curl -X POST https://spanisch.hoffknecht.de/api/setup
   ```
   → Erstellt Martin, Jane, Matti, Jette mit Standard-PIN **1234**
4. Jeder ändert seine PIN beim ersten Login unter Einstellungen

## Familie
| Name   | Login    | Farbe  | Standard-PIN |
|--------|----------|--------|--------------|
| Martin | martin   | Blau   | 1234         |
| Jane   | jane     | Lila   | 1234         |
| Matti  | matti    | Grün   | 1234         |
| Jette  | jette    | Pink   | 1234         |
