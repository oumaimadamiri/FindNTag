// services/nfcService.js
import { Platform } from 'react-native';
import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';

let isNfcBusy = false;

export async function writeToNfcTag(dataObject) {
  if (isNfcBusy) throw new Error('Une opération NFC est déjà en cours');

  isNfcBusy = true;

  try {
    console.log('🔄 Début écriture NFC');

    try { await NfcManager.cancelTechnologyRequest(); } catch {}

    await new Promise(resolve => setTimeout(resolve, 300));
    await NfcManager.start();
    console.log('✅ NFC démarré');

    await NfcManager.requestTechnology(NfcTech.Ndef, {
      alertMessage: 'Approchez le tag NFC',
      invalidateAfterFirstRead: false,
    });

    // Compactage des données
    const compactData = {
      n: dataObject.nom,
      t: dataObject.type,
      r: dataObject.race,
    };
    const jsonString = JSON.stringify(compactData);
    console.log('📝 Données préparées:', jsonString);

    const ndefRecord = Ndef.textRecord(jsonString);

    console.log('✍ Écriture en cours...');
    try {
      await NfcManager.writeNdefMessage([ndefRecord]);
      console.log('✅ Écriture réussie');
    } catch (e) {
      if (e.message?.includes('reconnectAfterWrite')) {
        console.warn('⚠ Ignoré: reconnectAfterWrite détecté');
      } else {
        throw e;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000)); // Pause post-écriture

    return true;

  } catch (err) {
    console.error('❌ Erreur complète:', err);
    throw err;
  } finally {
    try { await NfcManager.cancelTechnologyRequest(); } catch {}
    isNfcBusy = false;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}
