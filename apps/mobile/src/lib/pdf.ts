import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { api } from './api';

/**
 * Fetches a prescription PDF through the authenticated client, caches it, and
 * hands it to the OS share sheet. The Expo sandbox blocks plain-link downloads,
 * so this is the way to get a file off the device.
 */
export async function sharePrescriptionPdf(id: string): Promise<void> {
  const res = await api.get<ArrayBuffer>(`/prescriptions/${id}/pdf`, {
    responseType: 'arraybuffer',
  });

  const file = new File(Paths.cache, `prescription-${id}.pdf`);
  try {
    if (file.exists) file.delete();
  } catch {
    // ignore — write below recreates it
  }
  file.write(new Uint8Array(res.data));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Prescription',
    });
  }
}
