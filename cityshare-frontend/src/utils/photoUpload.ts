import * as ImagePicker from 'expo-image-picker';

/** Image carrée légère pour stockage en base64 (colonne TEXT côté serveur). */
export async function pickProfilePhotoBase64(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.35,
    base64: true
  });

  if (result.canceled || !result.assets[0]?.base64) {
    return null;
  }

  const base64 = result.assets[0].base64;
  const photoUrl = `data:image/jpeg;base64,${base64}`;

  if (photoUrl.length > 900_000) {
    throw new Error('PHOTO_TOO_LARGE');
  }

  return photoUrl;
}
