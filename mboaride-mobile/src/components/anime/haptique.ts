import * as Haptics from 'expo-haptics';

/** Retours haptiques homogènes (les erreurs de plateforme sont ignorées : simulateur, appareil sans moteur). */
export const haptique = {
  selection: () => Haptics.selectionAsync().catch(() => undefined),
  leger: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  moyen: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined),
  succes: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  alerte: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
  erreur: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined)
};
