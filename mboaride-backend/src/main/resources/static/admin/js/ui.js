/* Petits utilitaires d'interface : échappement, formats, étiquettes, modale, notifications. */
const UI = (() => {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fcfa = (v) => (v === null || v === undefined) ? '—' : new Intl.NumberFormat('fr-FR').format(v) + ' FCFA';
  const nombre = (v) => new Intl.NumberFormat('fr-FR').format(v ?? 0);
  const date = (v) => v ? new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const jour = (v) => v ? new Date(v).toLocaleDateString('fr-FR') : '—';

  const COULEURS = {
    ACTIF: 'vert', VALIDE: 'vert', TERMINEE: 'vert', PAYE: 'vert', REUSSI: 'vert', EFFECTUE: 'vert', RESOLUE: 'vert', LIBRE: 'vert',
    INACTIF: 'orange', EN_ATTENTE: 'orange', RECHERCHE: 'orange', PROPOSE: 'orange', OUVERTE: 'orange', EN_TRAITEMENT: 'orange', PLANIFIEE: 'bleu',
    EN_COURS: 'bleu', ACCEPTEE: 'bleu', CHAUFFEUR_ARRIVE: 'bleu',
    SUSPENDU: 'rouge', REJETE: 'rouge', REJETEE: 'rouge', ANNULEE: 'rouge', EXPIREE: 'rouge', ECHEC: 'rouge', ECHOUE: 'rouge', ACTIVE: 'rouge', SUPPRIME: 'rouge'
  };
  const LIBELLES = {
    DEPOT: 'Dépôt', RAMASSAGE: 'Ramassage', MOTO: 'Moto', TAXI: 'Taxi', CHAUFFEUR_ARRIVE: 'Chauffeur arrivé', EN_COURS: 'En cours',
    EN_ATTENTE: 'En attente', MTN_MOMO: 'MTN MoMo', ORANGE_MONEY: 'Orange Money', ESPECES: 'Espèces', PORTEFEUILLE: 'Portefeuille',
    NON_PAYE: 'Non payé', EN_TRAITEMENT: 'En traitement', ANOMALIE_ARRET: 'Arrêt prolongé', ANOMALIE_DEVIATION: 'Déviation',
    CARTE_GRISE: 'Carte grise', PHOTO_VEHICULE: 'Photo véhicule', OBJET_PERDU: 'Objet perdu', LITIGE_PRIX: 'Litige de prix'
  };
  const libelle = (v) => LIBELLES[v] || (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ') : '—');
  const etiquette = (v) => v ? `<span class="etiquette e-${COULEURS[v] || 'gris'}">${esc(libelle(v))}</span>` : '—';

  function toast(message, type = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), type === 'erreur' ? 6000 : 3500);
  }

  const modale = document.getElementById('modale');
  function ouvrirModale(titre, html) {
    document.getElementById('modale-titre').textContent = titre;
    document.getElementById('modale-corps').innerHTML = html;
    modale.hidden = false;
    return document.getElementById('modale-corps');
  }
  function fermerModale() { modale.hidden = true; document.getElementById('modale-corps').innerHTML = ''; }
  modale.addEventListener('click', (e) => { if (e.target === modale || e.target.hasAttribute('data-fermer')) fermerModale(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modale.hidden) fermerModale(); });

  /** Tableau HTML à partir de colonnes { t: titre, v: (ligne) => html, num: bool }. */
  function table(colonnes, lignes, vide = 'Aucune donnée') {
    if (!lignes.length) return `<div class="vide">${esc(vide)}</div>`;
    return `<div class="table-wrap"><table><thead><tr>${colonnes.map((c) => `<th class="${c.num ? 'num' : ''}">${esc(c.t)}</th>`).join('')}</tr></thead>
      <tbody>${lignes.map((l, i) => `<tr data-i="${i}">${colonnes.map((c) => `<td class="${c.num ? 'num' : ''}">${c.v(l)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  /** Lie les boutons [data-action] d'un conteneur à des gestionnaires (avec gestion des erreurs). */
  function lier(conteneur, gestionnaires) {
    conteneur.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !conteneur.contains(btn)) return;
      const fn = gestionnaires[btn.dataset.action];
      if (!fn) return;
      e.preventDefault();
      btn.disabled = true;
      try { await fn(btn.dataset, btn); } catch (err) { toast(err.message, 'erreur'); } finally { btn.disabled = false; }
    });
  }

  /** Convertit un formulaire en objet (cases à cocher en booléens, champs vides en null). */
  function donnees(form) {
    const o = {};
    for (const el of form.elements) {
      if (!el.name || el.type === 'file') continue;
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else o[el.name] = el.value === '' ? null : el.value;
    }
    return o;
  }

  return { esc, fcfa, nombre, date, jour, libelle, etiquette, toast, ouvrirModale, fermerModale, table, lier, donnees };
})();
