/* Pages réservées aux administrateurs. */

// --------------------------------------------------------------------------- chauffeurs (BF-03, BF-04, BF-59)
const TYPES_DOC = ['CNI', 'PERMIS', 'CARTE_GRISE', 'ASSURANCE', 'PHOTO_VEHICULE', 'SELFIE'];

async function ficheChauffeur(id) {
  const c = await Api.get('/admin/chauffeurs/' + id);
  const vehicules = await Api.get('/admin/vehicules');
  const corps = UI.ouvrirModale(`${c.prenom} ${c.nom}`, `
    <dl class="dl">
      <dt>Statut</dt><dd>${etiquette(c.statut)} ${c.documentsAJour ? '<span class="etiquette e-vert">Documents à jour</span>' : '<span class="etiquette e-orange">Documents à vérifier</span>'}</dd>
      <dt>Téléphone</dt><dd>${esc(c.telephone)} ${c.email ? ' — ' + esc(c.email) : ''}</dd>
      <dt>Service</dt><dd>${esc(libelle(c.typeService))} — ${c.genre === 'F' ? 'Conductrice (Mboa Lady)' : 'Conducteur'}</dd>
      <dt>Note</dt><dd>${(c.noteMoyenne || 0).toFixed(1)} / 5 (${c.nbNotes} avis)</dd>
      <dt>Portefeuille</dt><dd>${fcfa(c.solde)}</dd>
      <dt>Véhicule</dt><dd><select id="vehicule"><option value="">— Aucun —</option>${vehicules.filter((v) => v.typeVehicule === c.typeService)
        .map((v) => `<option value="${v.id}" ${c.vehicule && c.vehicule.id === v.id ? 'selected' : ''}>${esc(v.marque)} ${esc(v.modele || '')} — ${esc(v.immatriculation)} (${esc(v.proprietaireNom)})</option>`).join('')}</select></dd>
    </dl>
    <div class="actions">
      <button class="btn" data-action="vehicule">Affecter le véhicule</button>
      ${c.statut !== 'ACTIF' ? `<button class="btn btn-primaire" data-action="statut" data-statut="ACTIF">${c.valideAt ? 'Réactiver' : 'Valider et activer le compte'}</button>` : ''}
      ${c.statut === 'ACTIF' ? '<button class="btn btn-danger" data-action="statut" data-statut="SUSPENDU">Suspendre</button>' : ''}
    </div>
    <h3>Pièces justificatives</h3>
    ${table([
      { t: 'Pièce', v: (d) => `<b>${esc(libelle(d.type))}</b><br><span class="muted">${esc(d.nomOriginal || '')}</span>` },
      { t: 'Expiration', v: (d) => d.dateExpiration ? `${UI.jour(d.dateExpiration)} ${d.expire ? '<span class="etiquette e-rouge">Expiré</span>' : d.expireBientot ? '<span class="etiquette e-orange">Bientôt</span>' : ''}` : '—' },
      { t: 'Statut', v: (d) => etiquette(d.statut) + (d.motifRejet ? `<br><span class="muted">${esc(d.motifRejet)}</span>` : '') },
      { t: '', v: (d) => `<div class="actions"><button class="btn btn-petit" data-action="voir" data-id="${d.id}">Voir</button>
          <button class="btn btn-petit" data-action="valider" data-id="${d.id}">Valider</button>
          <button class="btn btn-petit" data-action="rejeter" data-id="${d.id}">Rejeter</button></div>` }
    ], c.documents, 'Aucun document')}
    <form class="form" id="ajout-doc"><fieldset><legend>Ajouter / renouveler une pièce</legend><div class="form-grille">
      <label>Type<select name="type">${TYPES_DOC.map((t) => `<option value="${t}">${libelle(t)}</option>`).join('')}</select></label>
      <label>Expiration<input type="date" name="dateExpiration"></label>
      <label>Fichier<input type="file" name="fichier" accept="image/*,application/pdf" required></label></div>
      <button class="btn">Téléverser</button></fieldset></form>`);
  const recharger = () => ficheChauffeur(id);
  UI.lier(corps, {
    voir: ({ id: doc }) => Api.ouvrir(`/admin/documents/${doc}/fichier`),
    valider: async ({ id: doc }) => {
      const d = c.documents.find((x) => x.id == doc);
      let exp = d.dateExpiration;
      if (['PERMIS', 'ASSURANCE', 'CNI', 'CARTE_GRISE'].includes(d.type)) {
        const saisie = prompt("Date d'expiration (AAAA-MM-JJ), vide si aucune :", exp || '');
        if (saisie === null) return;
        exp = saisie || null;
      }
      await Api.put('/admin/documents/' + doc, { statut: 'VALIDE', dateExpiration: exp });
      toast('Document validé', 'succes'); recharger();
    },
    rejeter: async ({ id: doc }) => {
      const motif = prompt('Motif du refus (communiqué au chauffeur) :');
      if (!motif) return;
      await Api.put('/admin/documents/' + doc, { statut: 'REJETE', motif });
      toast('Document rejeté'); recharger();
    },
    statut: async ({ statut }) => {
      const motif = statut === 'SUSPENDU' ? prompt('Motif de la suspension :') : null;
      if (statut === 'SUSPENDU' && !motif) return;
      await Api.put(`/admin/chauffeurs/${id}/statut`, { statut, motif });
      toast(statut === 'ACTIF' ? 'Compte activé : SMS envoyé au chauffeur' : 'Chauffeur suspendu', 'succes');
      recharger(); App.recharger();
    },
    vehicule: async () => {
      const v = corps.querySelector('#vehicule').value;
      await Api.put(`/admin/chauffeurs/${id}/vehicule`, { vehiculeId: v ? Number(v) : null });
      toast('Véhicule affecté', 'succes'); recharger();
    }
  });
  corps.querySelector('#ajout-doc').onsubmit = async (e) => {
    e.preventDefault();
    try { await Api.post(`/admin/chauffeurs/${id}/documents`, new FormData(e.target)); toast('Pièce ajoutée', 'succes'); recharger(); }
    catch (err) { toast(err.message, 'erreur'); }
  };
}

function formulaireChauffeur() {
  const champFichier = (nom, lib, exp) => `<label>${lib} *<input type="file" name="${nom}" accept="image/*,application/pdf" required></label>
    ${exp ? `<label>Expiration ${lib.toLowerCase()}<input type="date" name="${nom}Expiration"></label>` : ''}`;
  const corps = UI.ouvrirModale('Inscrire un chauffeur', `
    <form class="form" id="form-chauffeur">
      <fieldset><legend>Identité</legend><div class="form-grille">
        <label>Nom *<input name="nom" required></label><label>Prénom *<input name="prenom" required></label>
        <label>Téléphone *<input name="telephone" placeholder="6 90 00 00 00" required></label><label>E-mail<input name="email" type="email"></label>
        <label>Genre<select name="genre"><option value="H">Homme</option><option value="F">Femme (éligible Mboa Lady)</option></select></label>
        <label>Photo de profil<input type="file" name="photo" accept="image/*"></label>
      </div></fieldset>
      <fieldset><legend>Service et véhicule</legend><div class="form-grille">
        <label>Service *<select name="typeService"><option value="TAXI">Taxi</option><option value="MOTO">Moto-taxi</option></select></label>
        <label>Marque *<input name="marque" required></label><label>Modèle<input name="modele"></label>
        <label>Couleur<input name="couleur"></label><label>Immatriculation *<input name="immatriculation" required></label>
        <label>Places passagers<input name="nbPlaces" type="number" min="1" max="8" value="4"></label>
        <label>Tél. du propriétaire (si différent)<input name="proprietaireTelephone"></label>
        <label class="case"><input type="checkbox" name="casqueDisponible" value="true"> Casque passager (moto)</label>
      </div></fieldset>
      <fieldset><legend>Pièces justificatives</legend><div class="form-grille">
        ${champFichier('cni', 'CNI', true)}${champFichier('permis', 'Permis', true)}
        ${champFichier('carteGrise', 'Carte grise', true)}${champFichier('assurance', 'Assurance', true)}
        ${champFichier('photoVehicule', 'Photo du véhicule')}${champFichier('selfie', 'Selfie de vérification')}
      </div></fieldset>
      <p class="muted">Le compte reste inactif tant que les pièces ne sont pas validées (BF-04). Le chauffeur reçoit un SMS à l'activation.</p>
      <button class="btn btn-primaire">Créer le chauffeur</button>
    </form>`);
  corps.querySelector('#form-chauffeur').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (!fd.has('casqueDisponible')) fd.append('casqueDisponible', 'false');
    for (const [k, v] of [...fd.entries()]) if (v === '' || (v instanceof File && !v.size)) fd.delete(k);
    const btn = e.target.querySelector('button.btn-primaire');
    btn.disabled = true;
    try { const c = await Api.post('/admin/chauffeurs', fd); toast('Chauffeur créé', 'succes'); App.recharger(); ficheChauffeur(c.id); }
    catch (err) { toast(err.message, 'erreur'); } finally { btn.disabled = false; }
  };
}

Pages.chauffeurs = {
  titre: 'Chauffeurs', groupe: 'Gestion', roles: ['ADMIN'],
  async rendu(el) {
    const liste = await Api.get('/admin/chauffeurs');
    let filtre = 'tous';
    const afficher = () => {
      const lignes = liste.filter((c) => filtre === 'tous' || (filtre === 'attente' ? c.statut === 'INACTIF' || c.documentsEnAttente > 0 : c.statut === filtre));
      el.querySelector('#liste').innerHTML = table([
        { t: 'Chauffeur', v: (c) => `<a href="#" data-action="fiche" data-id="${c.id}"><b>${esc(c.prenom)} ${esc(c.nom)}</b></a><br><span class="muted">${esc(c.telephone)}</span>` },
        { t: 'Service', v: (c) => esc(libelle(c.typeService)) + (c.genre === 'F' ? ' <span class="etiquette e-bleu">Lady</span>' : '') },
        { t: 'Véhicule', v: (c) => c.vehicule ? `${esc(c.vehicule.marque)} ${esc(c.vehicule.modele || '')}<br><span class="muted">${esc(c.vehicule.immatriculation)}</span>` : '—' },
        { t: 'Statut', v: (c) => etiquette(c.statut) + (c.disponible ? ' <span class="etiquette e-vert">En ligne</span>' : '') },
        { t: 'Documents', v: (c) => c.documentsAJour ? '<span class="etiquette e-vert">À jour</span>' : `<span class="etiquette e-orange">${c.documentsEnAttente} en attente</span>` },
        { t: 'Note', v: (c) => (c.noteMoyenne || 0).toFixed(1) + ` (${c.nbNotes})`, num: true },
        { t: 'Solde', v: (c) => fcfa(c.solde), num: true }
      ], lignes, 'Aucun chauffeur');
    };
    el.innerHTML = `<div class="panneau"><h3><span class="onglets">
        <button class="actif" data-f="tous">Tous (${liste.length})</button>
        <button data-f="attente">À vérifier (${liste.filter((c) => c.statut === 'INACTIF' || c.documentsEnAttente > 0).length})</button>
        <button data-f="ACTIF">Actifs</button><button data-f="SUSPENDU">Suspendus</button></span>
        <span class="actions"><button class="btn" data-action="export" data-format="xlsx">Excel</button><button class="btn" data-action="export" data-format="pdf">PDF</button>
        <button class="btn btn-primaire" data-action="nouveau">+ Inscrire un chauffeur</button></span></h3><div id="liste"></div></div>`;
    el.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => {
      filtre = b.dataset.f; el.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('actif', x === b)); afficher();
    });
    afficher();
    lier(el, {
      fiche: ({ id }) => ficheChauffeur(id),
      nouveau: () => formulaireChauffeur(),
      export: ({ format }) => Api.telecharger(`/admin/exports/chauffeurs?format=${format}`, `chauffeurs.${format}`)
    });
  }
};

// --------------------------------------------------------------------------- véhicules et propriétaires (BF-57)
Pages.vehicules = {
  titre: 'Véhicules et propriétaires', groupe: 'Gestion', roles: ['ADMIN'],
  async rendu(el) {
    const vehicules = await Api.get('/admin/vehicules');
    el.innerHTML = `<div class="panneau"><h3>Véhicules (${vehicules.length})<span class="actions">
      <button class="btn" data-action="proprietaire">+ Propriétaire</button><button class="btn btn-primaire" data-action="vehicule">+ Véhicule</button></span></h3>
      ${table([
        { t: 'Immatriculation', v: (v) => `<b>${esc(v.immatriculation)}</b>` }, { t: 'Type', v: (v) => esc(libelle(v.typeVehicule)) },
        { t: 'Véhicule', v: (v) => `${esc(v.marque)} ${esc(v.modele || '')} ${v.couleur ? '— ' + esc(v.couleur) : ''}` },
        { t: 'Places', v: (v) => v.nbPlaces, num: true }, { t: 'Propriétaire', v: (v) => esc(v.proprietaireNom) },
        { t: 'État', v: (v) => etiquette(v.actif ? 'ACTIF' : 'SUSPENDU') },
        { t: '', v: (v) => `<button class="btn btn-petit" data-action="basculer" data-id="${v.id}" data-actif="${!v.actif}">${v.actif ? 'Désactiver' : 'Activer'}</button>` }
      ], vehicules)}</div>`;
    const formulaire = (titre, html, url, apres) => {
      const corps = UI.ouvrirModale(titre, `<form class="form"><div class="form-grille">${html}</div><button class="btn btn-primaire">Enregistrer</button></form>`);
      corps.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();
        try { await Api.post(url, UI.donnees(e.target)); UI.fermerModale(); toast(apres, 'succes'); App.recharger(); }
        catch (err) { toast(err.message, 'erreur'); }
      };
    };
    lier(el, {
      basculer: async ({ id, actif }) => { await Api.put(`/admin/vehicules/${id}/actif?actif=${actif}`); App.recharger(); },
      proprietaire: () => formulaire('Nouveau propriétaire', `<label>Nom *<input name="nom" required></label><label>Prénom *<input name="prenom" required></label>
        <label>Téléphone *<input name="telephone" required></label><label>E-mail<input name="email" type="email"></label>`, '/admin/proprietaires',
        'Propriétaire créé : il se connecte à l’application avec son numéro'),
      vehicule: () => formulaire('Nouveau véhicule', `<label>Type *<select name="typeVehicule"><option value="TAXI">Taxi</option><option value="MOTO">Moto</option></select></label>
        <label>Marque *<input name="marque" required></label><label>Modèle<input name="modele"></label><label>Couleur<input name="couleur"></label>
        <label>Immatriculation *<input name="immatriculation" required></label><label>Places<input name="nbPlaces" type="number" min="1" max="8" value="4"></label>
        <label>Téléphone du propriétaire *<input name="proprietaireTelephone" required></label>`, '/admin/vehicules', 'Véhicule enregistré')
    });
  }
};

// --------------------------------------------------------------------------- utilisateurs et droits (BF-62)
Pages.utilisateurs = {
  titre: 'Utilisateurs et droits', groupe: 'Gestion', roles: ['ADMIN'],
  async rendu(el) {
    el.innerHTML = `<div class="panneau"><form class="outils" id="filtres">
        <label>Recherche<input name="q" placeholder="Nom, téléphone, e-mail"></label>
        <label>Rôle<select name="role"><option value="">Tous</option>${['CLIENT', 'CHAUFFEUR', 'PROPRIETAIRE', 'SUPPORT', 'ADMIN'].map((r) => `<option value="${r}">${libelle(r)}</option>`).join('')}</select></label>
        <label>Statut<select name="statut"><option value="">Tous</option>${['ACTIF', 'INACTIF', 'SUSPENDU', 'SUPPRIME'].map((r) => `<option value="${r}">${libelle(r)}</option>`).join('')}</select></label>
        <button class="btn btn-primaire">Filtrer</button><button type="button" class="btn" data-action="personnel">+ Compte du personnel</button>
      </form><div id="liste" style="margin-top:14px"></div></div>`;
    const form = el.querySelector('#filtres');
    const charger = async () => {
      const q = new URLSearchParams(Object.entries(UI.donnees(form)).filter(([, v]) => v)).toString();
      const liste = await Api.get('/admin/utilisateurs?' + q);
      el.querySelector('#liste').innerHTML = table([
        { t: 'Nom', v: (u) => `<b>${esc(u.prenom)} ${esc(u.nom)}</b><br><span class="muted">${esc(u.email || '')}</span>` },
        { t: 'Téléphone', v: (u) => esc(u.telephone) }, { t: 'Rôle', v: (u) => esc(libelle(u.role)) }, { t: 'Statut', v: (u) => etiquette(u.statut) },
        { t: 'Courses', v: (u) => u.nbCourses, num: true }, { t: 'Note', v: (u) => (u.noteMoyenne || 0).toFixed(1), num: true },
        { t: 'Solde', v: (u) => fcfa(u.solde), num: true }, { t: 'Inscription', v: (u) => UI.jour(u.dateInscription) },
        { t: 'Dernière connexion', v: (u) => date(u.derniereConnexion) },
        { t: '', v: (u) => u.statut === 'SUPPRIME' ? '' : `<div class="actions">
            ${u.statut === 'ACTIF' ? `<button class="btn btn-petit" data-action="statut" data-id="${u.id}" data-statut="SUSPENDU">Suspendre</button>`
              : `<button class="btn btn-petit" data-action="statut" data-id="${u.id}" data-statut="ACTIF">Réactiver</button>`}
            <button class="btn btn-petit" data-action="statut" data-id="${u.id}" data-statut="SUPPRIME">Anonymiser</button></div>` }
      ], liste);
    };
    form.onsubmit = (e) => { e.preventDefault(); charger().catch((err) => toast(err.message, 'erreur')); };
    lier(el, {
      statut: async ({ id, statut }) => {
        if (statut === 'SUPPRIME' && !confirm('Anonymiser définitivement ce compte (droit à l’effacement) ? Cette action est irréversible.')) return;
        const motif = statut === 'SUSPENDU' ? prompt('Motif :') : null;
        if (statut === 'SUSPENDU' && !motif) return;
        await Api.put(`/admin/utilisateurs/${id}/statut`, { statut, motif });
        toast('Compte mis à jour', 'succes'); charger();
      },
      personnel: () => {
        const corps = UI.ouvrirModale('Nouveau compte du personnel', `<form class="form"><div class="form-grille">
          <label>Nom *<input name="nom" required></label><label>Prénom *<input name="prenom" required></label>
          <label>Téléphone *<input name="telephone" required></label><label>E-mail *<input name="email" type="email" required></label>
          <label>Rôle *<select name="role"><option value="SUPPORT">Agent du support (SOS, réclamations, courses)</option><option value="ADMIN">Administrateur (tous les droits)</option></select></label>
          <label>Mot de passe initial *<input name="motDePasse" type="password" minlength="8" required></label></div>
          <button class="btn btn-primaire">Créer</button></form>`);
        corps.querySelector('form').onsubmit = async (e) => {
          e.preventDefault();
          try { await Api.post('/admin/personnel', UI.donnees(e.target)); UI.fermerModale(); toast('Compte créé', 'succes'); charger(); }
          catch (err) { toast(err.message, 'erreur'); }
        };
      }
    });
    await charger();
  }
};

// --------------------------------------------------------------------------- tarification (BF-25, BF-60)
const GROUPES_PARAMETRES = [
  ['Négociation encadrée', 'negociation.'], ['Commissions', 'commission.'], ['Majorations', 'majoration.'], ['Météo', 'meteo.'],
  ['Demande / offre', 'surge.'], ['Annulation', 'annulation.'], ['Sécurité et qualité', 'notation.', 'anomalie.'],
  ['Mise en relation', 'recherche.', 'ramassage.', 'moto.', 'course.'], ['Chauffeurs', 'chauffeur.', 'documents.'],
  ['Parrainage', 'parrainage.'], ['Données personnelles', 'donnees.']
];

Pages.tarification = {
  titre: 'Tarifs et paramètres', groupe: 'Configuration', roles: ['ADMIN'],
  async rendu(el) {
    const [tarifs, params, fournisseurs] = await Promise.all([Api.get('/admin/tarifs'), Api.get('/admin/parametres'), Api.get('/admin/paiement/fournisseurs')]);
    const champ = (t, nom, lib) => `<label>${lib}<input type="number" min="0" step="${nom === 'distanceIncluseKm' ? '0.5' : '1'}" name="${nom}" value="${t[nom]}"></label>`;
    el.innerHTML = `
      <div class="panneau"><h3>Agrégateur Mobile Money</h3>
        <form class="outils" id="fournisseur">
          <label>Fournisseur actif<select name="valeur">${['SIMULATION', 'MONETBIL', 'CAMPAY'].map((f) => `<option ${f === fournisseurs.actif ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
          <button class="btn btn-primaire">Basculer</button>
          <span class="muted">Monetbil : ${fournisseurs.monetbilConfigure ? '<b>configuré</b>' : 'clés absentes'} — CamPay : ${fournisseurs.campayConfigure ? '<b>configuré</b>' : 'clés absentes'}
          — Utilisé actuellement : <b>${esc(fournisseurs.effectif)}</b></span>
        </form></div>
      <div class="panneau"><h3>Grilles tarifaires (FCFA)</h3>
        <p class="muted">P_ref = prise en charge + distance × prix/km + durée × prix/min, puis majorations, arrondi à 50 FCFA. En ramassage : prix officiel de la place + supplément au-delà de la distance incluse.</p>
        <div class="grille-2">${tarifs.map((t) => `<form class="form" data-tarif="${t.id}"><fieldset><legend>${libelle(t.typeService)}</legend><div class="form-grille">
          ${t.typeService === 'RAMASSAGE'
            ? champ(t, 'prixPlace', 'Prix de la place') + champ(t, 'distanceIncluseKm', 'Distance incluse (km)') + champ(t, 'supplementKm', 'Supplément par km')
              + `<input type="hidden" name="priseEnCharge" value="${t.priseEnCharge}"><input type="hidden" name="prixKm" value="${t.prixKm}"><input type="hidden" name="prixMinute" value="${t.prixMinute}"><input type="hidden" name="prixMinimum" value="${t.prixMinimum}">`
            : champ(t, 'priseEnCharge', 'Prise en charge') + champ(t, 'prixKm', 'Prix par km') + champ(t, 'prixMinute', 'Prix par minute') + champ(t, 'prixMinimum', 'Minimum')
              + `<input type="hidden" name="prixPlace" value="${t.prixPlace}"><input type="hidden" name="distanceIncluseKm" value="${t.distanceIncluseKm}"><input type="hidden" name="supplementKm" value="${t.supplementKm}">`}
          </div><button class="btn btn-primaire">Enregistrer</button><span class="muted">Modifié ${date(t.updatedAt)}</span></fieldset></form>`).join('')}</div></div>
      ${GROUPES_PARAMETRES.map(([titre, ...prefixes]) => {
        const liste = params.filter((p) => prefixes.some((pr) => p.cle.startsWith(pr)));
        return liste.length ? `<div class="panneau"><h3>${titre}</h3>${UI.table([
          { t: 'Paramètre', v: (p) => `${esc(p.description || p.cle)}<br><code class="muted">${esc(p.cle)}</code>` },
          { t: 'Valeur', v: (p) => (p.valeur === 'true' || p.valeur === 'false')
              ? `<select data-cle="${esc(p.cle)}"><option ${p.valeur === 'true' ? 'selected' : ''}>true</option><option ${p.valeur === 'false' ? 'selected' : ''}>false</option></select>`
              : `<input data-cle="${esc(p.cle)}" value="${esc(p.valeur)}" style="max-width:220px">` },
          { t: '', v: (p) => `<button class="btn btn-petit" data-action="param" data-cle="${esc(p.cle)}">Enregistrer</button>` }
        ], liste)}</div>` : '';
      }).join('')}`;
    el.querySelector('#fournisseur').onsubmit = async (e) => {
      e.preventDefault();
      try { await Api.put('/admin/parametres/paiement.fournisseur', UI.donnees(e.target)); toast('Fournisseur de paiement mis à jour', 'succes'); App.recharger(); }
      catch (err) { toast(err.message, 'erreur'); }
    };
    el.querySelectorAll('[data-tarif]').forEach((f) => f.onsubmit = async (e) => {
      e.preventDefault();
      const d = UI.donnees(f);
      Object.keys(d).forEach((k) => d[k] = Number(d[k]));
      try { await Api.put('/admin/tarifs/' + f.dataset.tarif, d); toast('Tarif enregistré', 'succes'); }
      catch (err) { toast(err.message, 'erreur'); }
    });
    lier(el, {
      param: async ({ cle }) => {
        const champ = el.querySelector(`[data-cle="${CSS.escape(cle)}"]`);
        await Api.put('/admin/parametres/' + encodeURIComponent(cle), { valeur: champ.value });
        toast('Paramètre enregistré', 'succes');
      }
    });
  }
};

// --------------------------------------------------------------------------- zones (BF-31, BF-60)
Pages.zones = {
  titre: 'Zones de service', groupe: 'Configuration', roles: ['ADMIN'],
  async rendu(el) {
    const zones = await Api.get('/admin/zones');
    el.innerHTML = `<div class="grille-2"><div class="panneau"><h3>Zones <button class="btn btn-primaire" data-action="editer">+ Zone</button></h3>${table([
      { t: 'Zone', v: (z) => `<b>${esc(z.nom)}</b><br><span class="muted">${esc(z.ville)} — ${z.rayonKm} km</span>` },
      { t: 'Majoration', v: (z) => z.majorationPct + ' %', num: true },
      { t: 'Moto', v: (z) => !z.motoActive ? '<span class="etiquette e-rouge">Interdite</span>' : z.motoInterditDebut ? `Interdite ${z.motoInterditDebut.slice(0, 5)}–${z.motoInterditFin.slice(0, 5)}` : '<span class="etiquette e-vert">Autorisée</span>' },
      { t: 'État', v: (z) => etiquette(z.active ? 'ACTIF' : 'SUSPENDU') },
      { t: '', v: (z) => `<button class="btn btn-petit" data-action="editer" data-id="${z.id}">Modifier</button>` }
    ], zones)}</div><div class="panneau"><h3>Carte</h3><div id="carte" class="carte-map"></div></div></div>`;
    const map = carte(el.querySelector('#carte'), [3.95, 10.8], 7);
    const cercles = zones.filter((z) => z.active).map((z) => L.circle([z.centreLat, z.centreLng], { radius: z.rayonKm * 1000, color: z.motoActive ? '#032e5d' : '#d64545', weight: 1, fillOpacity: .08 })
      .addTo(map).bindPopup(`${esc(z.nom)} (+${z.majorationPct} %)`));
    if (cercles.length) map.fitBounds(L.featureGroup(cercles).getBounds());
    lier(el, {
      editer: ({ id }) => {
        const z = zones.find((x) => x.id == id) || { nom: '', ville: 'Yaoundé', centreLat: 3.8667, centreLng: 11.5167, rayonKm: 3, majorationPct: 0, motoActive: true, active: true };
        const corps = UI.ouvrirModale(id ? 'Modifier la zone' : 'Nouvelle zone', `<form class="form"><div class="form-grille">
          <label>Nom *<input name="nom" value="${esc(z.nom)}" required></label><label>Ville *<input name="ville" value="${esc(z.ville)}" required></label>
          <label>Latitude du centre<input name="centreLat" type="number" step="any" value="${z.centreLat}" required></label>
          <label>Longitude du centre<input name="centreLng" type="number" step="any" value="${z.centreLng}" required></label>
          <label>Rayon (km)<input name="rayonKm" type="number" step="0.1" min="0.1" value="${z.rayonKm}" required></label>
          <label>Majoration (%)<input name="majorationPct" type="number" step="1" min="0" value="${z.majorationPct}" required></label>
          <label>Moto interdite de<input name="motoInterditDebut" type="time" value="${(z.motoInterditDebut || '').slice(0, 5)}"></label>
          <label>à<input name="motoInterditFin" type="time" value="${(z.motoInterditFin || '').slice(0, 5)}"></label>
          <label class="case"><input type="checkbox" name="motoActive" ${z.motoActive ? 'checked' : ''}> Service moto autorisé</label>
          <label class="case"><input type="checkbox" name="active" ${z.active ? 'checked' : ''}> Zone active</label></div>
          <p class="muted">Astuce : cliquez sur la carte de la page pour lire des coordonnées.</p>
          <button class="btn btn-primaire">Enregistrer</button></form>`);
        corps.querySelector('form').onsubmit = async (e) => {
          e.preventDefault();
          const d = UI.donnees(e.target);
          ['centreLat', 'centreLng', 'rayonKm', 'majorationPct'].forEach((k) => d[k] = Number(d[k]));
          try { id ? await Api.put('/admin/zones/' + id, d) : await Api.post('/admin/zones', d); UI.fermerModale(); toast('Zone enregistrée', 'succes'); App.recharger(); }
          catch (err) { toast(err.message, 'erreur'); }
        };
      }
    });
    map.on('click', (e) => toast(`Coordonnées : ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`));
  }
};

// --------------------------------------------------------------------------- repères (BF-34)
Pages.reperes = {
  titre: 'Repères locaux', groupe: 'Configuration', roles: ['ADMIN'],
  async rendu(el) {
    const reperes = await Api.get('/admin/reperes');
    const proposes = reperes.filter((r) => r.statut === 'PROPOSE');
    const colonnes = [
      { t: 'Repère', v: (r) => `<b>${esc(r.nom)}</b><br><span class="muted">${esc(r.description || '')}</span>` },
      { t: 'Catégorie', v: (r) => esc(libelle(r.categorie)) }, { t: 'Ville', v: (r) => esc(r.ville) },
      { t: 'Position', v: (r) => `<a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=18/${r.lat}/${r.lng}">${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}</a>` },
      { t: 'Proposé par', v: (r) => esc(r.proposePar || 'MboaRide') }, { t: 'Statut', v: (r) => etiquette(r.statut) },
      { t: '', v: (r) => `<div class="actions">${r.statut !== 'VALIDE' ? `<button class="btn btn-petit" data-action="statut" data-id="${r.id}" data-statut="VALIDE">Valider</button>` : ''}
        ${r.statut !== 'REJETE' ? `<button class="btn btn-petit" data-action="statut" data-id="${r.id}" data-statut="REJETE">Rejeter</button>` : ''}
        <button class="btn btn-petit" data-action="supprimer" data-id="${r.id}">Supprimer</button></div>` }
    ];
    el.innerHTML = `<div class="panneau"><h3>Propositions des utilisateurs (${proposes.length})</h3>${table(colonnes, proposes, 'Aucune proposition en attente')}</div>
      <div class="panneau"><h3>Tous les repères (${reperes.length}) <button class="btn btn-primaire" data-action="nouveau">+ Repère</button></h3>${table(colonnes, reperes.filter((r) => r.statut !== 'PROPOSE'))}</div>`;
    lier(el, {
      statut: async ({ id, statut }) => { await Api.put(`/admin/reperes/${id}/statut?statut=${statut}`); toast('Repère mis à jour', 'succes'); App.recharger(); },
      supprimer: async ({ id }) => { if (!confirm('Supprimer ce repère ?')) return; await Api.del('/admin/reperes/' + id); App.recharger(); },
      nouveau: () => {
        const corps = UI.ouvrirModale('Nouveau repère', `<form class="form"><div class="form-grille">
          <label>Nom *<input name="nom" required></label><label>Description<input name="description"></label>
          <label>Catégorie<select name="categorie">${['CARREFOUR', 'MARCHE', 'ECOLE', 'EGLISE', 'HOPITAL', 'PHARMACIE', 'GARE', 'AUTRE'].map((c) => `<option value="${c}">${libelle(c)}</option>`).join('')}</select></label>
          <label>Ville<select name="ville"><option>Yaoundé</option><option>Douala</option></select></label>
          <label>Latitude *<input name="lat" type="number" step="any" required></label><label>Longitude *<input name="lng" type="number" step="any" required></label></div>
          <button class="btn btn-primaire">Enregistrer</button></form>`);
        corps.querySelector('form').onsubmit = async (e) => {
          e.preventDefault();
          const d = UI.donnees(e.target); d.lat = Number(d.lat); d.lng = Number(d.lng);
          try { await Api.post('/admin/reperes', d); UI.fermerModale(); toast('Repère ajouté', 'succes'); App.recharger(); }
          catch (err) { toast(err.message, 'erreur'); }
        };
      }
    });
  }
};

// --------------------------------------------------------------------------- finances
Pages.finances = {
  titre: 'Paiements et retraits', groupe: 'Finances', roles: ['ADMIN'],
  async rendu(el) {
    const [paiements, retraits] = await Promise.all([Api.get('/admin/paiements'), Api.get('/admin/retraits')]);
    const attente = retraits.filter((r) => r.statut === 'EN_ATTENTE');
    el.innerHTML = `
      <div class="panneau"><h3>Retraits des chauffeurs à traiter (${attente.length})
        <span class="actions"><button class="btn" data-action="export" data-r="retraits" data-format="xlsx">Excel</button></span></h3>
        <p class="muted">Avec CamPay ou la simulation, les retraits sont automatiques. Avec Monetbil, effectuez le transfert puis confirmez ici.</p>
        ${table([
          { t: 'Référence', v: (r) => esc(r.reference) }, { t: 'Date', v: (r) => date(r.createdAt) }, { t: 'Chauffeur', v: (r) => esc(r.chauffeurNom) },
          { t: 'Montant', v: (r) => fcfa(r.montant), num: true }, { t: 'Vers', v: (r) => `${esc(libelle(r.operateur))} ${esc(r.telephone)}` },
          { t: '', v: (r) => `<div class="actions"><button class="btn btn-petit btn-primaire" data-action="retrait" data-id="${r.id}" data-ok="true">Transfert effectué</button>
            <button class="btn btn-petit" data-action="retrait" data-id="${r.id}" data-ok="false">Rejeter (rembourser)</button></div>` }
        ], attente, 'Aucun retrait en attente')}</div>
      <div class="panneau"><h3>Historique des retraits</h3>${table([
        { t: 'Référence', v: (r) => esc(r.reference) }, { t: 'Date', v: (r) => date(r.createdAt) }, { t: 'Chauffeur', v: (r) => esc(r.chauffeurNom) },
        { t: 'Montant', v: (r) => fcfa(r.montant), num: true }, { t: 'Fournisseur', v: (r) => esc(r.fournisseur || '—') }, { t: 'Statut', v: (r) => etiquette(r.statut) }
      ], retraits.filter((r) => r.statut !== 'EN_ATTENTE'))}</div>
      <div class="panneau"><h3>Paiements Mobile Money <span class="actions"><button class="btn" data-action="export" data-r="paiements" data-format="xlsx">Excel</button>
        <button class="btn" data-action="export" data-r="paiements" data-format="pdf">PDF</button></span></h3>${table([
        { t: 'Référence', v: (p) => esc(p.reference) }, { t: 'Date', v: (p) => date(p.createdAt) }, { t: 'Objet', v: (p) => esc(libelle(p.type)) },
        { t: 'Montant', v: (p) => fcfa(p.montant), num: true }, { t: 'Mode', v: (p) => esc(libelle(p.mode)) },
        { t: 'Fournisseur', v: (p) => esc(p.fournisseur) }, { t: 'Statut', v: (p) => etiquette(p.statut) }, { t: 'Message', v: (p) => esc(p.message || '') }
      ], paiements)}</div>`;
    lier(el, {
      retrait: async ({ id, ok }) => {
        const message = prompt(ok === 'true' ? 'Référence du transfert (facultatif) :' : 'Motif du rejet :') ?? null;
        if (message === null) return;
        await Api.put('/admin/retraits/' + id, { effectue: ok === 'true', message });
        toast('Retrait traité', 'succes'); App.recharger();
      },
      export: ({ r, format }) => Api.telecharger(`/admin/exports/${r}?format=${format}`, `${r}.${format}`)
    });
  }
};

// --------------------------------------------------------------------------- promotions et campagnes (BF-63)
Pages.promos = {
  titre: 'Promotions et campagnes', groupe: 'Finances', roles: ['ADMIN'],
  async rendu(el) {
    const [promos, campagnes] = await Promise.all([Api.get('/admin/promos'), Api.get('/admin/campagnes')]);
    el.innerHTML = `<div class="panneau"><h3>Codes promotionnels <button class="btn btn-primaire" data-action="promo">+ Code</button></h3>${table([
        { t: 'Code', v: (p) => `<b>${esc(p.code)}</b><br><span class="muted">${esc(p.description || '')}</span>` },
        { t: 'Réduction', v: (p) => p.typeReduction === 'POURCENTAGE' ? `${p.valeur} %${p.reductionMax ? ' (max ' + fcfa(p.reductionMax) + ')' : ''}` : fcfa(p.valeur) },
        { t: 'Validité', v: (p) => `${UI.jour(p.dateDebut)} → ${UI.jour(p.dateFin)}` },
        { t: 'Utilisations', v: (p) => `${p.utilisations}${p.utilisationsMax ? ' / ' + p.utilisationsMax : ''}`, num: true },
        { t: 'État', v: (p) => etiquette(p.actif ? 'ACTIF' : 'SUSPENDU') },
        { t: '', v: (p) => `<button class="btn btn-petit" data-action="promo" data-id="${p.id}">Modifier</button>` }
      ], promos, 'Aucun code')}</div>
      <div class="grille-2">
        <div class="panneau"><h3>Nouvelle campagne de notification</h3><form class="form" id="campagne">
          <label>Destinataires<select name="cible"><option value="TOUS">Tous les utilisateurs</option><option value="CLIENTS">Clients</option><option value="CHAUFFEURS">Chauffeurs et propriétaires</option></select></label>
          <label>Titre *<input name="titre" maxlength="150" required></label><label>Message *<textarea name="message" rows="4" maxlength="500" required></textarea></label>
          <label class="case"><input type="checkbox" name="avecSms"> Envoyer un SMS si la notification push échoue (payant)</label>
          <button class="btn btn-primaire">Envoyer</button></form></div>
        <div class="panneau"><h3>Campagnes envoyées</h3>${table([
          { t: 'Date', v: (c) => date(c.createdAt) }, { t: 'Titre', v: (c) => `<b>${esc(c.titre)}</b><br><span class="muted">${esc(c.message)}</span>` },
          { t: 'Cible', v: (c) => esc(libelle(c.cible)) }, { t: 'Destinataires', v: (c) => c.nbDestinataires, num: true }
        ], campagnes, 'Aucune campagne')}</div></div>`;
    el.querySelector('#campagne').onsubmit = async (e) => {
      e.preventDefault();
      if (!confirm('Envoyer cette notification à tous les destinataires sélectionnés ?')) return;
      try { const c = await Api.post('/admin/campagnes', UI.donnees(e.target)); toast(`Campagne envoyée à ${c.nbDestinataires} utilisateur(s)`, 'succes'); App.recharger(); }
      catch (err) { toast(err.message, 'erreur'); }
    };
    lier(el, {
      promo: ({ id }) => {
        const p = promos.find((x) => x.id == id) || { code: '', typeReduction: 'POURCENTAGE', valeur: 10, uneFoisParUtilisateur: true, actif: true };
        const dt = (v) => v ? v.slice(0, 16) : '';
        const corps = UI.ouvrirModale(id ? 'Modifier le code' : 'Nouveau code promo', `<form class="form"><div class="form-grille">
          <label>Code *<input name="code" value="${esc(p.code)}" required></label><label>Description<input name="description" value="${esc(p.description || '')}"></label>
          <label>Type<select name="typeReduction"><option value="POURCENTAGE" ${p.typeReduction === 'POURCENTAGE' ? 'selected' : ''}>Pourcentage</option><option value="MONTANT" ${p.typeReduction === 'MONTANT' ? 'selected' : ''}>Montant fixe (FCFA)</option></select></label>
          <label>Valeur *<input name="valeur" type="number" min="1" value="${p.valeur}" required></label>
          <label>Réduction maximale (FCFA)<input name="reductionMax" type="number" min="0" value="${p.reductionMax ?? ''}"></label>
          <label>Utilisations max<input name="utilisationsMax" type="number" min="1" value="${p.utilisationsMax ?? ''}"></label>
          <label>Début<input name="dateDebut" type="datetime-local" value="${dt(p.dateDebut)}"></label><label>Fin<input name="dateFin" type="datetime-local" value="${dt(p.dateFin)}"></label>
          <label class="case"><input type="checkbox" name="uneFoisParUtilisateur" ${p.uneFoisParUtilisateur ? 'checked' : ''}> Une fois par utilisateur</label>
          <label class="case"><input type="checkbox" name="actif" ${p.actif ? 'checked' : ''}> Actif</label></div>
          <button class="btn btn-primaire">Enregistrer</button></form>`);
        corps.querySelector('form').onsubmit = async (e) => {
          e.preventDefault();
          const d = UI.donnees(e.target);
          ['valeur', 'reductionMax', 'utilisationsMax'].forEach((k) => d[k] = d[k] === null ? null : Number(d[k]));
          try { id ? await Api.put('/admin/promos/' + id, d) : await Api.post('/admin/promos', d); UI.fermerModale(); toast('Code enregistré', 'succes'); App.recharger(); }
          catch (err) { toast(err.message, 'erreur'); }
        };
      }
    });
  }
};

// --------------------------------------------------------------------------- journal d'audit (BNF-06)
Pages.journal = {
  titre: "Journal d'administration", groupe: 'Configuration', roles: ['ADMIN'],
  async rendu(el) {
    const lignes = await Api.get('/admin/journal');
    el.innerHTML = `<div class="panneau"><h3>200 dernières actions</h3>${table([
      { t: 'Date', v: (j) => date(j.createdAt) }, { t: 'Auteur', v: (j) => esc(j.adminNom) }, { t: 'Action', v: (j) => `<code>${esc(j.action)}</code>` },
      { t: 'Cible', v: (j) => j.cibleType ? `${esc(j.cibleType)} #${j.cibleId ?? ''}` : '—' }, { t: 'Détails', v: (j) => esc(j.details || '') },
      { t: 'IP', v: (j) => esc(j.ip || '') }
    ], lignes)}</div>`;
  }
};

// --------------------------------------------------------------------------- mon compte
Pages.compte = {
  titre: 'Mon compte', roles: ['ADMIN', 'SUPPORT'], cache: true,
  async rendu(el) {
    const moi = await Api.get('/admin/moi');
    el.innerHTML = `<div class="panneau" style="max-width:520px"><h3>${esc(moi.prenom)} ${esc(moi.nom)}</h3>
      <p class="muted">${esc(moi.email)} — ${esc(libelle(moi.role))}</p>
      <form class="form"><label>Mot de passe actuel<input type="password" name="actuel" required></label>
      <label>Nouveau mot de passe (8 caractères minimum)<input type="password" name="nouveau" minlength="8" required></label>
      <button class="btn btn-primaire">Changer le mot de passe</button></form></div>`;
    el.querySelector('form').onsubmit = async (e) => {
      e.preventDefault();
      try { await Api.put('/admin/moi/mot-de-passe', UI.donnees(e.target)); e.target.reset(); toast('Mot de passe modifié', 'succes'); }
      catch (err) { toast(err.message, 'erreur'); }
    };
  }
};
