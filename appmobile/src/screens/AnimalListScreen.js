import React, { useEffect, useState } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { animalsApi, mediaUrl } from "../api";
import { Image } from "react-native";

const AnimalListScreen = () => {
  const [cin, setCin] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCinAndAnimals = async () => {
      try {
        const cin = await AsyncStorage.getItem("cin");
        if (!cin) {
          console.warn("Aucun CIN trouvé dans AsyncStorage.");
          setLoading(false);
          return;
        }

        setCin(cin);
        console.log("Fetching animals for CIN:", cin);

        setAnimals(await animalsApi.listByCin(cin));
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des animaux :",
          error.message,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCinAndAnimals();
  }, []);

  const renderAnimalItem = ({ item }) => (
    <View className="bg-white p-4 rounded-xl mb-4 shadow-lg border border-purple-100">
      {item.fileUrl ? (
        <Image
          source={{ uri: mediaUrl(item.fileUrl) }}
          style={{
            width: "100%",
            height: 180,
            borderRadius: 12,
            marginBottom: 10,
          }}
          resizeMode="cover"
        />
      ) : null}
      <Text className="text-lg font-semibold mb-1 text-purple-700">
        {item.nom}
      </Text>
      <Text className="text-purple-600">Nom : {item.nom}</Text>
      <Text className="text-purple-600">Race : {item.race}</Text>
      <Text className="text-purple-600">Âge : {item.age}</Text>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-purple-50">
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-purple-50 px-4 py-6">
      <Text className="text-2xl font-bold text-center text-purple-800 mb-4">
        Liste des animaux
      </Text>

      {animals.length === 0 ? (
        <Text className="text-center text-purple-500 text-base mt-10">
          Aucun animal trouvé pour ce propriétaire.
        </Text>
      ) : (
        <FlatList
          data={animals}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAnimalItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

export default AnimalListScreen;
