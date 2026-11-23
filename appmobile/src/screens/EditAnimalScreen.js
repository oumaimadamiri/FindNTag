import React, { useContext, useState } from "react";
import { View, TextInput, Text, Button, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { animalsApi } from "../api";
import { UserContext } from "../context/UserContext";
import { readAnimalTag } from "../nfc/animalTag";
import { writeTagWithRetry } from "../nfc/writeFlow";

export default function EditAnimalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userInfo: contextUser } = useContext(UserContext);
  const userInfo = route.params?.userInfo || contextUser || {};

  const [animalData, setAnimalData] = useState({
    id: "",
    publicId: "",
    nom: "",
    race: "",
    age: "",
    telephone: "",
  });

  const [tagRead, setTagRead] = useState(false);
  const [legacyTag, setLegacyTag] = useState(false);
  const isConnected = !!(userInfo.cin && userInfo.nom);

  const handleScanNfc = async () => {
    if (!isConnected) {
      Alert.alert(
        "Authentification requise",
        "Vous devez vous reconnecter pour modifier un animal.",
        [
          {
            text: "Se reconnecter",
            onPress: () =>
              navigation.navigate("Login", { redirectTo: "EditAnimal" }),
          },
        ],
      );
      return;
    }

    try {
      Alert.alert("Lecture du tag", "Approchez le tag NFC de l'animal...");
      const tag = await readAnimalTag();

      if (tag.kind === "empty") {
        Alert.alert("Tag vide", "Ce tag ne contient aucun animal.");
        return;
      }

      // On ne retrouve que SES animaux (le serveur répond 404 pour ceux des autres)
      let animal = null;
      try {
        if (tag.kind === "v2") {
          animal = await animalsApi.getByPublicId(tag.publicId);
        } else if (tag.tagUid) {
          animal = await animalsApi.getByTag(tag.tagUid); // ancien format
        }
      } catch (error) {
        if (error.response?.status !== 404) throw error;
      }

      if (!animal) {
        Alert.alert(
          "Animal introuvable",
          "Ce tag ne correspond à aucun de vos animaux.",
        );
        return;
      }

      setAnimalData({
        id: animal.id,
        publicId: animal.publicId,
        nom: animal.nom ?? "",
        race: animal.race ?? "",
        age: animal.age != null ? String(animal.age) : "",
        telephone: animal.ownerTelephone || userInfo.telephone || "",
      });
      setLegacyTag(tag.kind === "legacy");
      setTagRead(true);
    } catch (error) {
      console.warn("Erreur lecture NFC:", error);
      Alert.alert("Erreur", "Échec de lecture du tag NFC.");
    }
  };

  const handleUpdateNfc = async () => {
    if (!animalData.nom || !animalData.race || !animalData.age) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    if (!animalData.id) {
      Alert.alert(
        "Erreur",
        "ID de l'animal non trouvé. Impossible de mettre à jour.",
      );
      return;
    }

    try {
      await animalsApi.update(animalData.id, {
        nom: animalData.nom,
        race: animalData.race,
        age: parseInt(animalData.age),
      });

      // Réécriture du tag au nouveau format (migre aussi les anciens tags)
      const written = await writeTagWithRetry(
        {
          publicId: animalData.publicId,
          nom: animalData.nom,
          telephone: animalData.telephone,
        },
        {
          intro: legacyTag
            ? "Ce tag utilise l'ancien format. Il va être reprogrammé : le CIN et l'email du propriétaire n'y seront plus écrits."
            : "Informations enregistrées. Approchez le tag NFC pour le mettre à jour.",
        },
      );

      Alert.alert(
        written ? "Succès" : "Animal mis à jour",
        written
          ? "Animal mis à jour dans la base et sur le tag."
          : "Animal mis à jour dans la base, mais le tag n'a pas été réécrit.",
      );
      navigation.navigate("Home", { screen: "Animaux" });
    } catch (error) {
      console.error("Erreur de mise à jour:", error);
      Alert.alert(
        "Erreur",
        `Impossible de modifier l'animal: ${error.response?.data?.message || error.message}`,
      );
    }
  };

  return (
    <View className="flex-1 bg-white p-6">
      <Text className="text-3xl font-bold text-purple-700 text-center mb-8">
        Modifier un Animal
      </Text>

      {!tagRead && (
        <View className="bg-purple-50 p-6 rounded-xl border border-purple-200 mb-6">
          <Text className="text-purple-600 text-center mb-4 text-base">
            Scannez le tag NFC de l'animal pour commencer
          </Text>
          <View className="bg-purple-600 rounded-lg overflow-hidden">
            <Button
              title="Lire un tag NFC"
              onPress={handleScanNfc}
              color="#7c3aed"
            />
          </View>
        </View>
      )}

      {tagRead && (
        <View className="bg-purple-50 p-6 rounded-xl border border-purple-200">
          <Text className="text-purple-700 font-semibold text-lg mb-4 text-center">
            Informations de l'animal
          </Text>

          <Text className="text-green-600 text-center mb-4">
            ✓ Animal trouvé
          </Text>

          {legacyTag && (
            <Text className="text-orange-600 text-center mb-4 text-sm">
              Ancien tag détecté : il sera reprogrammé au nouveau format.
            </Text>
          )}

          <TextInput
            className="bg-white border-2 border-purple-300 rounded-lg px-4 py-3 mb-4 text-base text-purple-800 shadow-sm"
            placeholder="Nom de l'animal"
            placeholderTextColor="#9333ea"
            value={animalData.nom}
            onChangeText={(text) => setAnimalData({ ...animalData, nom: text })}
          />

          <TextInput
            className="bg-white border-2 border-purple-300 rounded-lg px-4 py-3 mb-4 text-base text-purple-800 shadow-sm"
            placeholder="Race"
            placeholderTextColor="#9333ea"
            value={animalData.race}
            onChangeText={(text) =>
              setAnimalData({ ...animalData, race: text })
            }
          />

          <TextInput
            className="bg-white border-2 border-purple-300 rounded-lg px-4 py-3 mb-6 text-base text-purple-800 shadow-sm"
            placeholder="Âge"
            placeholderTextColor="#9333ea"
            value={animalData.age}
            onChangeText={(text) => setAnimalData({ ...animalData, age: text })}
            keyboardType="numeric"
          />

          <View className="bg-purple-600 rounded-lg overflow-hidden shadow-lg">
            <Button
              title="Mettre à jour le tag NFC"
              onPress={handleUpdateNfc}
              color="#7c3aed"
            />
          </View>
        </View>
      )}
    </View>
  );
}
