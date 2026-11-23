import React, { useEffect } from 'react';
import { StatusBar, Platform, NativeModules } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import NfcManager from 'react-native-nfc-manager';
import { setNavigationBarVisibility } from 'react-native-system-navigation-bar';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import { LogBox } from 'react-native';

import { UserProvider } from './src/context/UserContext'; // <-- importer UserProvider

export default function App() {
  useEffect(() => {
    const initApp = async () => {
      try {
        if (Platform.OS === 'android') {
          try {
            await setNavigationBarVisibility('hidden');
          } catch (e) {
            StatusBar.setHidden(true, 'fade');
            if (NativeModules.AndroidModule) {
              NativeModules.AndroidModule.setImmersiveMode();
            } else {
              console.warn('NativeModules.AndroidModule non disponible');
            }
          }
        }

        const isSupported = await NfcManager.isSupported();
        if (isSupported) await NfcManager.start();
      } catch (error) {
        console.error('Erreur initialisation:', error);
      }
    };

    initApp();
  }, []);

  return (
    <UserProvider>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
        hidden={false}
      />
      <AppNavigator />
    </UserProvider>
  );
}