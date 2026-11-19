import i18n from '../i18n';

export const fcfa = (v?: number | null) =>
  v === null || v === undefined ? '—' : `${new Intl.NumberFormat('fr-FR').format(v).replace(/ /g, ' ')} FCFA`;

export const dateHeure = (v?: string) =>
  v ? new Date(v).toLocaleString(i18n.language === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const heure = (v?: string) => (v ? new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—');

/** Format d'affichage d'un numéro camerounais : +237 6 90 00 00 01. */
export const telephone = (t?: string) => (t && t.startsWith('+237') && t.length === 13
  ? `+237 ${t[4]} ${t.slice(5, 7)} ${t.slice(7, 9)} ${t.slice(9, 11)} ${t.slice(11)}` : t ?? '');

/** Date locale au format ISO sans fuseau, attendue par l'API (LocalDateTime). */
export const isoLocal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
};
