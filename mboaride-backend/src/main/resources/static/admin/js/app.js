/* Routeur, menu selon le rôle, connexion et surveillance des alertes SOS. */
const App = (() => {
  let utilisateur = null;
  let minuterie = null;
  let surveillance = null;
  let derniereAlerte = 0;

  const role = () => utilisateur && utilisateur.role;

  function construireMenu() {
    const groupes = {};
    Object.entries(Pages).forEach(([cle, p]) => {
      if (p.cache || !p.roles.includes(role())) return;
      (groupes[p.groupe] = groupes[p.groupe] || []).push([cle, p]);
    });
    document.getElementById('nav').innerHTML = Object.entries(groupes).map(([g, pages]) =>
      `<div class="groupe">${UI.esc(g)}</div>` + pages.map(([cle, p]) => `<a href="#/${cle}" data-page="${cle}">${UI.esc(p.titre)}<span class="badge" data-badge="${cle}" hidden></span></a>`).join('')).join('');
    document.getElementById('utilisateur-courant').textContent = `${utilisateur.prenom} ${utilisateur.nom} — ${UI.libelle(utilisateur.role)}`;
  }

  async function afficher() {
    clearTimeout(minuterie);
    const cle = location.hash.replace('#/', '') || 'tableau';
    const page = Pages[cle] && Pages[cle].roles.includes(role()) ? Pages[cle] : Pages.tableau;
    document.getElementById('titre-page').textContent = page.titre;
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('actif', a.dataset.page === cle));
    document.getElementById('menu').classList.remove('ouvert');
    const el = document.getElementById('page');
    const premier = !el.dataset.page || el.dataset.page !== cle;
    if (premier) el.innerHTML = '<div class="vide">Chargement…</div>';
    el.dataset.page = cle;
    try {
      const fraicheur = await page.rendu(el);
      if (fraicheur) minuterie = setTimeout(() => { if (!document.querySelector('#modale:not([hidden])')) afficher(); else minuterie = setTimeout(afficher, fraicheur); }, fraicheur);
    } catch (err) {
      el.innerHTML = `<div class="panneau erreur">${UI.esc(err.message)}</div>`;
    }
  }

  /** Surveille les nouvelles alertes SOS toutes les 10 s (son + pastille). */
  async function surveillerAlertes() {
    try {
      const d = await Api.get('/admin/tableau-de-bord');
      const pastille = document.getElementById('pastille-sos');
      pastille.hidden = !d.alertesActives;
      pastille.textContent = `${d.alertesActives} alerte(s) SOS`;
      const badges = { alertes: d.alertesActives, reclamations: d.reclamationsOuvertes, chauffeurs: d.chauffeursEnAttente, finances: d.retraitsEnAttente, reperes: d.reperesProposes };
      Object.entries(badges).forEach(([k, v]) => {
        const b = document.querySelector(`[data-badge="${k}"]`);
        if (b) { b.hidden = !v; b.textContent = v; }
      });
      if (d.alertesActives > derniereAlerte) {
        UI.toast('🚨 Nouvelle alerte SOS', 'erreur');
        try { new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=').play(); } catch (e) { /* son bloqué */ }
      }
      derniereAlerte = d.alertesActives;
    } catch (e) { /* réseau */ }
  }

  async function demarrer() {
    try {
      utilisateur = await Api.get('/admin/moi');
    } catch (e) {
      return afficherConnexion();
    }
    document.getElementById('ecran-connexion').hidden = true;
    document.getElementById('app').hidden = false;
    construireMenu();
    afficher();
    surveillerAlertes();
    clearInterval(surveillance);
    surveillance = setInterval(surveillerAlertes, 10000);
  }

  function afficherConnexion() {
    clearInterval(surveillance);
    clearTimeout(minuterie);
    document.getElementById('app').hidden = true;
    document.getElementById('ecran-connexion').hidden = false;
  }

  document.getElementById('form-connexion').onsubmit = async (e) => {
    e.preventDefault();
    const err = document.getElementById('erreur-connexion');
    err.hidden = true;
    try {
      const r = await Api.post('/auth/admin/login', UI.donnees(e.target));
      Api.setToken(r.token);
      e.target.reset();
      demarrer();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  };
  document.getElementById('deconnexion').onclick = (e) => { e.preventDefault(); Api.setToken(null); afficherConnexion(); };
  document.getElementById('btn-menu').onclick = () => document.getElementById('menu').classList.toggle('ouvert');
  document.getElementById('pastille-sos').onclick = () => { location.hash = '#/alertes'; };
  window.addEventListener('hashchange', afficher);
  window.addEventListener('mboaride:deconnexion', afficherConnexion);

  Api.estConnecte() ? demarrer() : afficherConnexion();
  return { role, recharger: afficher };
})();
