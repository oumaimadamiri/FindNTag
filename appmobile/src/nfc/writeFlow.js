import { Alert } from "react-native";
import { writeAnimalTag } from "./animalTag";

const confirm = (title, message, okText, cancelText) =>
  new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        { text: okText, onPress: () => resolve(true) },
      ],
      { cancelable: false },
    );
  });

/**
 * Écrit le tag NFC avec la possibilité de réessayer (tag mal positionné, retiré trop tôt...).
 * Renvoie true si le tag a été écrit, false si l'utilisateur a renoncé.
 * Ne lève jamais d'exception : à l'appelant de dire « enregistré, mais tag non écrit ».
 */
export async function writeTagWithRetry(
  data,
  { intro = "Approchez le tag NFC du téléphone pour y écrire les données." } = {},
) {
  let proceed = await confirm(
    "Écriture du tag NFC",
    intro,
    "Commencer",
    "Plus tard",
  );
  while (proceed) {
    try {
      await writeAnimalTag(data);
      return true;
    } catch (e) {
      console.warn("Écriture NFC échouée :", e?.message);
      proceed = await confirm(
        "Écriture impossible",
        "Le tag n'a pas pu être écrit. Voulez-vous réessayer ?",
        "Réessayer",
        "Plus tard",
      );
    }
  }
  return false;
}
