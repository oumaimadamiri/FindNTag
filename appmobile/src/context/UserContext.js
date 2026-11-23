import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usersApi } from "../api";
import { setAuthToken, setUnauthorizedHandler } from "../api/client";
import { tokenStorage } from "../auth/tokenStorage";
import { navigationRef } from "../navigation/navigationRef";
import { registerPushToken } from "../notifications/push";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);

  /** Appelé après la vérification de l'OTP. */
  const login = useCallback(async (token, user) => {
    setAuthToken(token);
    await tokenStorage.set(token);
    await AsyncStorage.setItem("cin", user.cin);
    await AsyncStorage.setItem("userInfo", JSON.stringify(user));
    setUserInfo(user);
    registerPushToken();
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await tokenStorage.clear();
    await AsyncStorage.multiRemove(["cin", "userInfo"]);
    setUserInfo(null);
    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: "Start" }] });
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout); // jeton expiré -> déconnexion
    (async () => {
      try {
        const token = await tokenStorage.get();
        if (token) {
          setAuthToken(token);
          setUserInfo(await usersApi.me());
          registerPushToken();
        }
      } catch (e) {
        console.log("Session non restaurée :", e.message);
      }
    })();
  }, [logout]);

  return (
    <UserContext.Provider value={{ userInfo, setUserInfo, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
