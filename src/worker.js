// Diese App ist nach familie.hoffknecht.de umgezogen (vereinheitlichte Hoffi-PWA).
// Alle Anfragen werden dorthin weitergeleitet.
// Hinweis: 302 (temporaer/reversibel). Fuer dauerhaft auf 301 umstellen.
export default {
  async fetch() {
    return Response.redirect('https://familie.hoffknecht.de/', 302);
  },
};
