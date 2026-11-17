import { UserRole } from '../types';

export function navigateToMessages(
  navigation: { navigate: (name: string, params?: object) => void },
  role: UserRole | undefined,
  peerId: number
) {
  const root = role === 'CONDUCTEUR' ? 'Conducteur' : role === 'EXPEDITEUR' ? 'Expediteur' : 'Passager';
  navigation.navigate(root, { screen: 'Messages', params: { peerId } });
}
