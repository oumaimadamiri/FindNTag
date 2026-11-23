import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { usersApi } from "../api";

/**
 * Enregistre le jeton push de l'appareil sur le serveur.
 * Ne plante jamais : sans configuration Firebase, Android refuse le jeton
 * et on continue sans notifications en arrière-plan.
 */
export async function registerPushToken() {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    await usersApi.savePushToken(token);
    return token;
  } catch (e) {
    console.log("Notifications push indisponibles :", e.message);
    return null;
  }
}
