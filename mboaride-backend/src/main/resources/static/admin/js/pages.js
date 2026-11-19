/* Pages de supervision accessibles aux administrateurs et aux agents du support. */
const Pages = {};
const { esc, fcfa, nombre, date, etiquette, libelle, table, lier, toast } = UI;

/** Carte Leaflet (OpenStreetMap) centrée sur Yaoundé. */
function carte(el, centre = [3.8667, 11.5167], zoom = 12) {
  const map = L.map(el).setView(centre, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  setTimeout(() => map.invalidateSize(), 100);
  return map;
}
function point(map, lat, lng, couleur, texte, rayon = 8) {
  return L.circleMarker([lat, lng], { radius: rayon, color: '#fff', weight: 2, fillColor: couleur, fillOpacity: .95 })
    .addTo(map).bindPopup(texte);
}

// --------------------------------------------------------------------------- tableau de bord (BF-58)
Pages.tableau = {
  titre: 'Tableau de bord', groupe: 'Supervision', roles: ['ADMIN', 'SUPPORT'],
  async rendu(el) {
    const d = await Api.get('/admin/tableau-de-bord');
    const kpi = (lib, val, cls = '') => `<div class="kpi ${cls}"><div class="libelle">${lib}</div><div class="valeur">${val}</div></div>`;
    el.innerHTML = `
      <div class="cartes">
        ${kpi('Courses en cours', nombre(d.coursesEnCours))}
        ${kpi('Demandes en recherche', nombre(d.coursesEnRecherche), d.coursesEnRecherche ? 'attention' : '')}
        ${kpi('Chauffeurs connectés', nombre(d.chauffeursConnectes))}
        ${kpi('Chauffeurs en course', nombre(d.chauffeursEnCourse))}
        ${kpi("Chiffre d'affaires du jour", fcfa(d.chiffreAffairesJour))}
        ${kpi('Commissions du jour', fcfa(d.commissionsJour))}
        ${kpi("Chiffre d'affaires du mois", fcfa(d.chiffreAffairesMois))}
        ${kpi("Taux d'annulation (7 j)", d.tauxAnnulation7j + ' %', d.tauxAnnulation7j > 20 ? 'attention' : '')}
        ${kpi('Alertes SOS actives', nombre(d.alertesActives), d.alertesActives ? 'alerte' : '')}
        ${kpi('Réclamations ouvertes', nombre(d.reclamationsOuvertes), d.reclamationsOuvertes ? 'attention' : '')}
        ${kpi('Chauffeurs à valider', nombre(d.chauffeursEnAttente), d.chauffeursEnAttente ? 'attention' : '')}
        ${kpi('Retraits à traiter', nombre(d.retraitsEnAttente), d.retraitsEnAttente ? 'attention' : '')}
      </div>
      <div class="grille-3">
        <div class="panneau"><h3>Activité des 14 derniers jours</h3><canvas id="graph" height="120"></canvas></div>
        <div class="panneau"><h3>Courses terminées (30 j)</h3><canvas id="repartition" height="200"></canvas>
          <p class="muted" style="margin-top:12px">Clients : <b>${nombre(d.clientsTotal)}</b> (+${nombre(d.nouveauxClients7j)} en 7 j)<br>
          Chauffeurs : <b>${nombre(d.chauffeursTotal)}</b><br>
          Paiement : <b>${esc(d.paiement.effectif)}</b>${d.paiement.actif !== d.paiement.effectif ? ` <span class="etiquette e-orange">${esc(d.paiement.actif)} non configuré</span>` : ''}<br>
          SMS : <b>${esc(d.modeSms)}</b></p></div>
      </div>
      <div class="panneau"><h3>Carte en direct <span class="muted" style="font-weight:400;font-size:12px">● libre ● ramassage ● en course ● demande</span></h3><div id="carte" class="carte-map"></div></div>`;
    const css = getComputedStyle(document.documentElement);
    new Chart(el.querySelector('#graph'), {
      data: {
        labels: d.serie14j.map((s) => new Date(s.jour).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })),
        datasets: [
          { type: 'bar', label: 'Terminées', data: d.serie14j.map((s) => s.terminees), backgroundColor: '#032e5d', yAxisID: 'y' },
          { type: 'bar', label: 'Annulées', data: d.serie14j.map((s) => s.annulees), backgroundColor: '#d64545', yAxisID: 'y' },
          { type: 'line', label: "Chiffre d'affaires (FCFA)", data: d.serie14j.map((s) => s.chiffreAffaires), borderColor: '#f78b03', backgroundColor: '#f78b03', yAxisID: 'y1', tension: .3 }
        ]
      },
      options: { responsive: true, interaction: { mode: 'index', intersect: false },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } } } }
    });
    new Chart(el.querySelector('#repartition'), {
      type: 'doughnut',
      data: { labels: Object.keys(d.repartitionServices30j).map(libelle), datasets: [{ data: Object.values(d.repartitionServices30j), backgroundColor: ['#032e5d', '#f78b03', '#047030'] }] },
      options: { plugins: { legend: { position: 'bottom' } } }
    });
    const map = carte(el.querySelector('#carte'));
    const couleurs = { LIBRE: '#047030', RAMASSAGE: '#f78b03', EN_COURSE: '#032e5d' };
    const pts = [];
    d.carte.forEach((p) => {
      if (p.type === 'DEMANDE') pts.push(point(map, p.lat, p.lng, '#d64545', `Demande ${esc(p.libelle)} (${esc(libelle(p.etat))})`, 6));
      else pts.push(point(map, p.lat, p.lng, couleurs[p.etat] || '#555', `${esc(p.libelle)} — ${esc(libelle(p.type))} — ${esc(libelle(p.etat))}`));
    });
    if (pts.length) map.fitBounds(L.featureGroup(pts).getBounds().pad(.3), { maxZoom: 14 });
    return 30000; // rafraîchissement automatique
  }
};

// --------------------------------------------------------------------------- alertes SOS (BF-43, BF-46, BF-61)
Pages.alertes = {
  titre: 'Alertes SOS', groupe: 'Supervision', roles: ['ADMIN', 'SUPPORT'],
  async rendu(el) {
    const alertes = await Api.get('/admin/alertes');
    const actives = alertes.filter((a) => a.statut !== 'RESOLUE');
    el.innerHTML = `
      <div class="grille-3">
        <div class="panneau"><h3>Alertes en cours (${actives.length})</h3>${table([
          { t: 'Reçue', v: (a) => date(a.createdAt) },
          { t: 'Type', v: (a) => etiquette(a.type === 'SOS' ? 'ACTIVE' : 'EN_ATTENTE').replace(/>[^<]+</, `>${esc(libelle(a.type))}<`) },
          { t: 'Personne', v: (a) => `${esc(a.declencheurNom || '—')}<br><a href="tel:${esc(a.declencheurTelephone)}">${esc(a.declencheurTelephone || '')}</a>` },
          { t: 'Course', v: (a) => a.courseReference ? `${esc(a.courseReference)}<br><span class="muted">${esc(a.chauffeurNom || '')} ${esc(a.immatriculation || '')}</span>` : '—' },
          { t: 'Contacts prévenus', v: (a) => a.contactsNotifies, num: true },
          { t: 'Statut', v: (a) => etiquette(a.statut) },
          { t: '', v: (a) => `<div class="actions">
              ${a.lienSuivi ? `<a class="btn btn-petit" target="_blank" rel="noopener" href="${esc(a.lienSuivi)}">Suivi</a>` : ''}
              <button class="btn btn-petit" data-action="traiter" data-id="${a.id}">Traiter</button></div>` }
        ], actives, 'Aucune alerte en cours')}</div>
        <div class="panneau"><h3>Positions</h3><div id="carte" class="carte-map"></div></div>
      </div>
      <div class="panneau"><h3>Historique</h3>${table([
        { t: 'Date', v: (a) => date(a.createdAt) }, { t: 'Type', v: (a) => esc(libelle(a.type)) },
        { t: 'Personne', v: (a) => esc(a.declencheurNom || '—') }, { t: 'Course', v: (a) => esc(a.courseReference || '—') },
        { t: 'Notes', v: (a) => `<span style="white-space:pre-line">${esc(a.notes || '')}</span>` },
        { t: 'Résolue', v: (a) => date(a.resolueAt) }
      ], alertes.filter((a) => a.statut === 'RESOLUE'))}</div>`;
    const map = carte(el.querySelector('#carte'));
    const pts = actives.filter((a) => a.lat).map((a) => point(map, a.lat, a.lng, '#d64545', `${esc(a.declencheurNom)} — ${date(a.createdAt)}`, 10));
    if (pts.length) map.fitBounds(L.featureGroup(pts).getBounds().pad(.5), { maxZoom: 15 });
    lier(el, {
      traiter: async ({ id }) => {
        const a = alertes.find((x) => x.id == id);
        const corps = UI.ouvrirModale('Alerte #' + id, `
          <dl class="dl"><dt>Type</dt><dd>${esc(libelle(a.type))}</dd><dt>Personne</dt><dd>${esc(a.declencheurNom)} — ${esc(a.declencheurTelephone)}</dd>
          <dt>Chauffeur</dt><dd>${esc(a.chauffeurNom || '—')} ${esc(a.chauffeurTelephone || '')}</dd><dt>Véhicule</dt><dd>${esc(a.immatriculation || '—')}</dd>
          <dt>Position</dt><dd>${a.lat ? `<a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=17/${a.lat}/${a.lng}">${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}</a>` : '—'}</dd>
          <dt>Notes</dt><dd style="white-space:pre-line">${esc(a.notes || '—')}</dd></dl>
          <form class="form"><label>Nouveau statut<select name="statut"><option value="EN_TRAITEMENT">En traitement</option><option value="RESOLUE">Résolue</option></select></label>
          <label>Commentaire (appel, intervention…)<textarea name="commentaire" rows="3"></textarea></label>
          <button class="btn btn-primaire">Enregistrer</button></form>`);
        corps.querySelector('form').onsubmit = async (e) => {
          e.preventDefault();
          try { await Api.put('/admin/alertes/' + id, UI.donnees(e.target)); UI.fermerModale(); toast('Alerte mise à jour', 'succes'); App.recharger(); }
          catch (err) { toast(err.message, 'erreur'); }
        };
      }
    });
    return 10000;
  }
};

// --------------------------------------------------------------------------- réclamations (BF-51, BF-52, BF-61)
Pages.reclamations = {
  titre: 'Réclamations', groupe: 'Supervision', roles: ['ADMIN', 'SUPPORT'],
  async rendu(el) {
    const liste = await Api.get('/admin/reclamations');
    let filtre = 'ouvertes';
    const afficher = () => {
      const lignes = liste.filter((r) => filtre === 'toutes' || ['OUVERTE', 'EN_COURS'].includes(r.statut));
      el.querySelector('#liste').innerHTML = table([
        { t: 'N° de suivi', v: (r) => `<b>${esc(r.numero)}</b>` }, { t: 'Date', v: (r) => date(r.createdAt) },
        { t: 'Type', v: (r) => esc(libelle(r.type)) }, { t: 'Auteur', v: (r) => `${esc(r.auteurNom)}<br><span class="muted">${esc(r.auteurTelephone)}</span>` },
        { t: 'Course', v: (r) => r.courseId ? `<a href="#" data-action="course" data-id="${r.courseId}">${esc(r.courseReference)}</a>` : '—' },
        { t: 'Description', v: (r) => esc(r.description.length > 90 ? r.description.slice(0, 90) + '…' : r.description) },
        { t: 'Statut', v: (r) => etiquette(r.statut) },
        { t: '', v: (r) => `<button class="btn btn-petit" data-action="traiter" data-id="${r.id}">Traiter</button>` }
      ], lignes, 'Aucune réclamation');
    };
    el.innerHTML = `<div class="panneau"><h3><span>Réclamations</span><span class="onglets"><button class="actif" data-f="ouvertes">À traiter</button><button data-f="toutes">Toutes</button></span></h3><div id="liste"></div></div>`;
    el.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => {
      filtre = b.dataset.f; el.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('actif', x === b)); afficher();
    });
    afficher();
    lier(el, {
      course: ({ id }) => afficherCourse(id),
      traiter: async ({ id }) => {
        const r = liste.find((x) => x.id == id);
        const corps = UI.ouvrirModale('Réclamation ' + r.numero, `
          <dl class="dl"><dt>Type</dt><dd>${esc(libelle(r.type))}</dd><dt>Auteur</dt><dd>${esc(r.auteurNom)} — ${esc(r.auteurTelephone)}</dd>
          <dt>Description</dt><dd style="white-space:pre-line">${esc(r.description)}</dd><dt>Réponse actuelle</dt><dd>${esc(r.reponse || '—')}</dd></dl>
          <form class="form"><label>Statut<select name="statut">${['OUVERTE', 'EN_COURS', 'RESOLUE', 'REJETEE'].map((s) => `<option ${s === r.statut ? 'selected' : ''} value="${s}">${libelle(s)}</option>`).join('')}</select></label>
          <label>Réponse au client (notifiée)<textarea name="commentaire" rows="4">${esc(r.reponse || '')}</textarea></label>
          <button class="btn btn-primaire">Enregistrer</button></form>`);
        corps.querySelector('form').onsubmit = async (e) => {
          e.preventDefault();
          try { await Api.put('/admin/reclamations/' + id, UI.donnees(e.target)); UI.fermerModale(); toast('Réclamation mise à jour', 'succes'); App.recharger(); }
          catch (err) { toast(err.message, 'erreur'); }
        };
      }
    });
  }
};

// --------------------------------------------------------------------------- courses
async function afficherCourse(id) {
  const c = await Api.get('/admin/courses/' + id);
  UI.ouvrirModale('Course ' + c.reference, `
    <dl class="dl">
      <dt>Statut</dt><dd>${etiquette(c.statut)} ${etiquette(c.statutPaiement)}</dd>
      <dt>Service</dt><dd>${esc(libelle(c.typeService))} — ${c.nbPlaces} place(s) ${c.mboaLady ? '<span class="etiquette e-bleu">Mboa Lady</span>' : ''}</dd>
      <dt>Départ</dt><dd>${esc(c.depart.adresse)} ${c.depart.repere ? `<span class="muted">(${esc(c.depart.repere)})</span>` : ''}</dd>
      <dt>Arrivée</dt><dd>${esc(c.arrivee.adresse)}</dd>
      <dt>Distance / durée</dt><dd>${c.distanceKm} km — ${c.dureeMin} min</dd>
      <dt>Prix</dt><dd>Réf. ${fcfa(c.prixReference)} (fourchette ${fcfa(c.prixMin)} – ${fcfa(c.prixMax)})<br>Proposé ${fcfa(c.prixPropose)} — Final <b>${fcfa(c.prixFinal)}</b>
        ${c.reduction ? `<br>Réduction ${fcfa(c.reduction)}` : ''}<br>Payé ${fcfa(c.montantAPayer)} — Commission ${fcfa(c.commission)}</dd>
      <dt>Majorations</dt><dd>${esc(c.majorations || '—')}</dd>
      <dt>Paiement</dt><dd>${esc(libelle(c.modePaiement))}</dd>
      <dt>Client</dt><dd>${esc(c.client.prenom)} ${esc(c.client.nom)} — ${esc(c.client.telephone || '')}</dd>
      <dt>Chauffeur</dt><dd>${c.chauffeur ? `${esc(c.chauffeur.prenom)} ${esc(c.chauffeur.nom)} — ${esc(c.chauffeur.telephone || '')}<br>${c.chauffeur.vehicule ? esc(c.chauffeur.vehicule.marque + ' ' + (c.chauffeur.vehicule.modele || '') + ' — ' + c.chauffeur.vehicule.immatriculation) : ''}` : '—'}</dd>
      <dt>Chronologie</dt><dd>Demande ${date(c.createdAt)}<br>Acceptée ${date(c.accepteeAt)}<br>Arrivée ${date(c.arriveAt)}<br>Début ${date(c.debutAt)}<br>Fin ${date(c.finAt)}
        ${c.annuleeAt ? `<br>Annulée ${date(c.annuleeAt)} par ${esc(c.annuleePar)} ${c.motifAnnulation ? '— ' + esc(c.motifAnnulation) : ''} ${c.fraisAnnulation ? '(frais ' + fcfa(c.fraisAnnulation) + ')' : ''}` : ''}</dd>
    </dl>`);
}

Pages.courses = {
  titre: 'Courses', groupe: 'Supervision', roles: ['ADMIN', 'SUPPORT'],
  async rendu(el) {
    el.innerHTML = `<div class="panneau">
      <form class="outils" id="filtres">
        <label>Recherche<input name="q" placeholder="Référence, adresse…"></label>
        <label>Statut<select name="statut"><option value="">Tous</option>${['PLANIFIEE', 'RECHERCHE', 'ACCEPTEE', 'CHAUFFEUR_ARRIVE', 'EN_COURS', 'TERMINEE', 'ANNULEE', 'EXPIREE'].map((s) => `<option value="${s}">${libelle(s)}</option>`).join('')}</select></label>
        <label>Service<select name="type"><option value="">Tous</option><option value="DEPOT">Dépôt</option><option value="RAMASSAGE">Ramassage</option><option value="MOTO">Moto</option></select></label>
        <label>Du<input type="date" name="du"></label><label>Au<input type="date" name="au"></label>
        <button class="btn btn-primaire">Filtrer</button>
        ${App.role() === 'ADMIN' ? '<button type="button" class="btn" data-action="export" data-format="xlsx">Excel</button><button type="button" class="btn" data-action="export" data-format="pdf">PDF</button>' : ''}
      </form><div id="liste" style="margin-top:14px"></div></div>`;
    const form = el.querySelector('#filtres');
    const params = () => new URLSearchParams(Object.entries(UI.donnees(form)).filter(([, v]) => v)).toString();
    const charger = async () => {
      const courses = await Api.get('/admin/courses?' + params());
      el.querySelector('#liste').innerHTML = `<p class="muted">${courses.length} course(s)</p>` + table([
        { t: 'Référence', v: (c) => `<a href="#" data-action="voir" data-id="${c.id}"><b>${esc(c.reference)}</b></a>` },
        { t: 'Date', v: (c) => date(c.createdAt) }, { t: 'Service', v: (c) => esc(libelle(c.typeService)) },
        { t: 'Statut', v: (c) => etiquette(c.statut) }, { t: 'Client', v: (c) => esc(c.client) },
        { t: 'Chauffeur', v: (c) => esc(c.chauffeur || '—') }, { t: 'Trajet', v: (c) => `${esc(c.depart)} → ${esc(c.arrivee)}` },
        { t: 'Prix final', v: (c) => fcfa(c.prixFinal), num: true }, { t: 'Commission', v: (c) => fcfa(c.commission), num: true },
        { t: 'Paiement', v: (c) => `${esc(libelle(c.modePaiement))}<br>${etiquette(c.statutPaiement)}` }
      ], courses, 'Aucune course');
    };
    form.onsubmit = (e) => { e.preventDefault(); charger().catch((err) => toast(err.message, 'erreur')); };
    lier(el, {
      voir: ({ id }) => afficherCourse(id),
      export: ({ format }) => Api.telecharger(`/admin/exports/courses?format=${format}&${params()}`, `courses.${format}`)
    });
    await charger();
  }
};
