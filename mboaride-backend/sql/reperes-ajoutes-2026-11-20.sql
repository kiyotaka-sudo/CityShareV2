-- Repères ajoutés le 20/11/2026 (positions : liens Google Maps fournis et OpenStreetMap). Rejouable sans doublon.
INSERT INTO repere (nom, description, categorie, ville, latitude, longitude, statut, nb_utilisations, created_at)
SELECT * FROM (
  SELECT 'Institut des Grandes Écoles Européennes – Campus Titi Garage' AS nom, 'Campus des grandes écoles européennes, Titi Garage (Ngousso)' AS description,
         'ECOLE' AS categorie, 'Yaoundé' AS ville, 3.8838599 AS latitude, 11.5504473 AS longitude, 'VALIDE' AS statut, 0 AS nb, NOW() AS d
  UNION ALL SELECT 'Institut des Grandes Écoles Européennes – Campus Bastos', 'Bâtiment Paris Santé, Bastos',
         'ECOLE', 'Yaoundé', 3.8877971, 11.5120057, 'VALIDE', 0, NOW()
  UNION ALL SELECT 'Mobile Omnisport', 'Station MRS (ex-Mobil) près du stade Omnisport, Mfandena',
         'CARREFOUR', 'Yaoundé', 3.8858900, 11.5362600, 'VALIDE', 0, NOW()
) n
WHERE NOT EXISTS (SELECT 1 FROM repere r WHERE r.nom = n.nom);
