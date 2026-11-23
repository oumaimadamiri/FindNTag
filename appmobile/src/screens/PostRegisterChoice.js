import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function PostRegisterChoice() {
  const navigation = useNavigation();
  const { userInfo } = useRoute().params;

  const goToHome = () => {
    navigation.navigate('Home', { 
      screen: "Accueil",
      params: { userInfo },
    });
  };

  return (
    <View className="flex-1 justify-center items-center px-6 bg-white">
      <Text className="text-2xl font-semibold text-purple-800 mb-2 text-center">
        Bienvenue, {userInfo.prenom} !
      </Text>
      <Text className="text-base text-purple-600 mb-10 text-center">
        Choisissez une option pour continuer :
      </Text>

      <TouchableOpacity
        className="bg-purple-600 px-8 py-4 rounded-xl w-full items-center mb-4 shadow-lg"
        onPress={() => navigation.navigate('AddAnimalNFC', { cin: userInfo.cin })}
      >
        <Text className="text-white text-base font-semibold">Ajouter via NFC</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-purple-100 border-2 border-purple-300 px-8 py-4 rounded-xl w-full items-center shadow-sm"
        onPress={goToHome}
      >
        <Text className="text-purple-700 text-base font-semibold">Continuer sans NFC</Text>
      </TouchableOpacity>
    </View>
  );
}