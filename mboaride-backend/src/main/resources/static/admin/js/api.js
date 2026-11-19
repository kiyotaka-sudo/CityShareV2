/* Client HTTP du back-office : jeton JWT en sessionStorage, erreurs traduites par l'API. */
const Api = (() => {
  const CLE = 'mboaride.admin.token';
  let token = null;
  try { token = sessionStorage.getItem(CLE); } catch (e) { /* stockage indisponible */ }

  function setToken(t) {
    token = t;
    try { t ? sessionStorage.setItem(CLE, t) : sessionStorage.removeItem(CLE); } catch (e) { /* ignoré */ }
  }

  async function requete(methode, url, corps, options = {}) {
    const headers = { 'Accept-Language': 'fr' };
    if (token) headers.Authorization = 'Bearer ' + token;
    let body;
    if (corps instanceof FormData) body = corps;
    else if (corps !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(corps); }
    const res = await fetch('/api' + url, { method: methode, headers, body });
    if (res.status === 401 && !url.startsWith('/auth')) {
      setToken(null);
      window.dispatchEvent(new Event('mboaride:deconnexion'));
      throw new Error('Session expirée, reconnectez-vous.');
    }
    if (!res.ok) {
      let message = 'Erreur ' + res.status;
      try {
        const e = await res.json();
        message = e.message || message;
        if (e.errors && e.errors.length) message += ' — ' + e.errors.join(' ; ');
      } catch (ignore) { /* pas de JSON */ }
      throw new Error(message);
    }
    if (options.blob) return res.blob();
    if (res.status === 204) return null;
    const type = res.headers.get('Content-Type') || '';
    return type.includes('json') ? res.json() : res.text();
  }

  return {
    setToken,
    estConnecte: () => !!token,
    get: (u, o) => requete('GET', u, undefined, o),
    post: (u, c) => requete('POST', u, c),
    put: (u, c) => requete('PUT', u, c),
    del: (u) => requete('DELETE', u),
    /** Téléchargement authentifié (exports, pièces justificatives). */
    async telecharger(url, nom) {
      const blob = await requete('GET', url, undefined, { blob: true });
      const lien = document.createElement('a');
      lien.href = URL.createObjectURL(blob);
      lien.download = nom;
      lien.click();
      setTimeout(() => URL.revokeObjectURL(lien.href), 5000);
    },
    async ouvrir(url) {
      const blob = await requete('GET', url, undefined, { blob: true });
      window.open(URL.createObjectURL(blob), '_blank', 'noopener');
    }
  };
})();
