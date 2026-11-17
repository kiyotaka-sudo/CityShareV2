export const formatDate = (value: string | Date, lang = 'fr') => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).format(date);
};

export const formatPrice = (amount: number) => `${amount.toLocaleString('fr-FR')} FCFA`;
