/**
 * Charte MboaRide, issue du logo : bleu marine (couleur principale), orange (accent, icône),
 * vert et jaune (bande de la route : succès, étoiles). Contrastes élevés pour une lecture en plein soleil (BNF-08).
 */
export const couleurs = {
  primaire: '#032E5D',
  primaireFonce: '#021F40',
  primaireClair: '#E6EDF6',
  accent: '#F78B03',
  accentFonce: '#C46E00',
  accentClair: '#FFF1DD',
  vert: '#047030',
  vertClair: '#E2F3E8',
  jaune: '#F8D902',
  rouge: '#D64545',
  rougeClair: '#FDECEC',
  orange: '#F78B03',
  orangeClair: '#FFF1DD',
  bleu: '#2563EB',
  texte: '#0F1B2D',
  texteSecondaire: '#4B5563',
  bord: '#D1D5DB',
  fond: '#F4F6F9',
  blanc: '#FFFFFF'
};

export const espace = { xs: 4, s: 8, m: 16, l: 24, xl: 32 };
export const rayon = { s: 8, m: 12, l: 20 };
export const police = { petite: 13, normale: 16, grande: 20, titre: 26 };

/** Polices (Google Fonts, licence OFL) : Poppins pour les titres et les prix, Inter pour les textes. */
export const polices = {
  titre: 'Poppins_700Bold',
  titreDemi: 'Poppins_600SemiBold',
  texte: 'Inter_400Regular',
  texteMoyen: 'Inter_500Medium',
  texteGras: 'Inter_600SemiBold'
};

/** Échelle typographique. */
export const typo = {
  legende: { fontFamily: polices.texte, fontSize: 12, lineHeight: 16 },
  petit: { fontFamily: polices.texte, fontSize: 14, lineHeight: 20 },
  corps: { fontFamily: polices.texte, fontSize: 16, lineHeight: 22 },
  corpsGras: { fontFamily: polices.texteGras, fontSize: 16, lineHeight: 22 },
  sousTitre: { fontFamily: polices.titreDemi, fontSize: 18, lineHeight: 24 },
  titre: { fontFamily: polices.titre, fontSize: 22, lineHeight: 28 },
  grandTitre: { fontFamily: polices.titre, fontSize: 28, lineHeight: 34 },
  prix: { fontFamily: polices.titre, fontSize: 36, lineHeight: 42, fontVariant: ['tabular-nums' as const] }
};

/** Règles de mouvement communes (durées en ms, ressorts Reanimated). */
export const mouvement = {
  rapide: 150,
  normal: 250,
  lent: 350,
  camera: 800,
  deplacementVehicule: 5000,
  ressort: { damping: 18, stiffness: 180, mass: 1 },
  ressortDoux: { damping: 22, stiffness: 140, mass: 1 },
  ressortVif: { damping: 12, stiffness: 260, mass: 0.8 }
};

/** Ombres portées homogènes (iOS + Android). */
export const ombres = {
  legere: { shadowColor: '#0F1B2D', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  moyenne: { shadowColor: '#0F1B2D', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  forte: { shadowColor: '#0F1B2D', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 }
};
