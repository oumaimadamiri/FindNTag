// src/context/UserContext.js
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usersApi } from "../api";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);

  // Optionnel : charger userInfo à partir de AsyncStorage si tu veux une persistance
  useEffect(() => {
    const loadUser = async () => {
      const cin = await AsyncStorage.getItem("cin");
      if (cin) {
        try {
          setUserInfo(await usersApi.getByCin(cin));
        } catch (e) {
          console.log("Erreur récupération utilisateur:", e);
        }
      }
    };
    loadUser();
  }, []);

  return (
    <UserContext.Provider value={{ userInfo, setUserInfo }}>
      {children}
    </UserContext.Provider>
  );
};
