import { Reservation, Trip } from '../types';

export function normalizeTrip(t: Trip): Trip {
  const dateHeure = t.dateHeure ?? '';
  const [datePart, timePart] = dateHeure.split('T');
  const conducteur = t.conducteur
    ? {
        ...t.conducteur,
        vehicule: t.conducteur.vehicule ?? t.conducteur.vehiculeMarque ?? '',
        plaque: t.conducteur.plaque ?? t.conducteur.vehiculeImmatriculation ?? ''
      }
    : t.conducteur;

  return {
    ...t,
    conducteur,
    depart: t.depart ?? t.villeDepart,
    arrivee: t.arrivee ?? t.villeArrivee,
    date: t.date ?? datePart,
    heure: t.heure ?? (timePart?.slice(0, 5) ?? ''),
    prix: t.prix ?? t.prixParPlace,
    placesDisponibles: t.placesDisponibles ?? t.nbPlacesDispo,
    stops: t.stops ?? t.arrets?.map((a) => a.ville) ?? []
  };
}

export function normalizeTrips(trips: Trip[]): Trip[] {
  return trips.map(normalizeTrip);
}

export function reservationToTrip(reservation: Reservation): Trip {
  return normalizeTrip(reservation.trajet);
}

export function formatReservationQr(reservation: Reservation): string {
  return `CITYSHARE:${reservation.id}:${reservation.qrCodeToken}`;
}

export function parseReservationQr(data: string): { reservationId: number; token: string } | null {
  const trimmed = data.trim();
  if (!trimmed.startsWith('CITYSHARE:')) {
    return null;
  }
  const parts = trimmed.split(':');
  if (parts.length < 3) {
    return null;
  }
  const reservationId = Number(parts[1]);
  const token = parts.slice(2).join(':');
  if (!Number.isFinite(reservationId) || !token) {
    return null;
  }
  return { reservationId, token };
}
