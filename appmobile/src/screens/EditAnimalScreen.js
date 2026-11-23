import React, { useState } from "react";
import { View, TextInput, Text, Button, Alert } from "react-native";
import NfcManager, { NfcTech, Ndef } from "react-native-nfc-manager";
import { useNavigation, useRoute } from "@react-navigation/native";
import { animalsApi } from "../api";

export default function EditAnimalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const userInfo = route.params?.userInfo || {};

  const [animalData, setAnimalData] = useState({
    id: "",
    nom: "",
    race: "",
    age: "",
    ownerId: "",
    nomProprio: "",
    prenomProprio: "",
    cinProprio: "",
    telephone: "",
    email: "",
    tagId: "",
  });

  const [tagRead, setTagRead] = useState(false);
  const [isConnected, setIsConnected] = useState(
    userInfo.nom && userInfo.prenom && userInfo.telephone,
  );

  const handleScanNfc = async () => {
    try {
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();

      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        const payload = tag.ndefMessage[0].payload;
        const text = Ndef.text.decodePayload(payload);
        const data = JSON.parse(text);
        const tagId = tag.id || tag.serialNumber || "";

        console.log("Données lues depuis NFC:", data);

        // CORRECTION: Récupérer l'ID de l'animal depuis la base de données
        // en utilisant le tagId ou les informations de l'animal
        const animalId = await fetchAnimalIdByTag(tagId, data);

        setAnimalData({
          id: animalId || "", // ID récupéré depuis la base
          nom: data.n || "",
          race: data.r || "",
          age: data.a ? data.a.toString() : "",
          ownerId: data.o || "",
          nomProprio: data.pn || userInfo.nom || "",
          prenomProprio: data.pp || userInfo.prenom || "",
          cinProprio: data.pc || userInfo.cin || "",
          telephone: data.pt || userInfo.telephone || "",
          email: data.pe || userInfo.email || "",
          tagId: tagId,
        });
        setTagRead(true);

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
        }
      } else {
        Alert.alert("Erreur", "Aucune donnée NDEF trouvée sur le tag.");
      }
    } catch (error) {
      console.warn("Erreur lecture NFC:", error);
      Alert.alert("Erreur", "Échec de lecture du tag NFC.");
    } finally {
      await NfcManager.cancelTechnologyRequest();
    }
  };

  const fetchAnimalIdByTag = async (tagId) => {
    if (!tagId) return null;
    try {
      const animal = await animalsApi.getByTag(tagId);
      return animal.id;
    } catch (error) {
      if (error.response?.status !== 404)
        console.error("Erreur recherche animal:", error);
      return null;
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
      const updatedAnimal = {
        nom: animalData.nom,
        race: animalData.race,
        age: parseInt(animalData.age),
        tagId: animalData.tagId || "",
        ownerId: animalData.ownerId,
      };

      console.log("Mise à jour animal ID:", animalData.id);
      console.log("Données à envoyer:", updatedAnimal);

      const response = await animalsApi.update(animalData.id, updatedAnimal);

      console.log("Animal mis à jour dans la base de données");

      // Mise à jour du tag NFC
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const compressed = {
        n: updatedAnimal.nom,
        r: updatedAnimal.race,
        a: updatedAnimal.age,
        o: animalData.ownerId,
        t: animalData.tagId,
        pn: animalData.nomProprio,
        pp: animalData.prenomProprio,
        pc: animalData.cinProprio,
        pt: animalData.telephone,
        pe: animalData.email,
      };

      const jsonToWrite = JSON.stringify(compressed);
      const bytes = Ndef.encodeMessage([Ndef.textRecord(jsonToWrite)]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        Alert.alert("Succès", "Animal mis à jour dans la base et sur le tag.");
        navigation.navigate("Home", { screen: "Animaux" });
      }
    } catch (error) {
      console.error("Erreur de mise à jour:", error);
      Alert.alert(
        "Erreur",
        `Impossible de modifier l'animal: ${error.message}`,
      );
    } finally {
      await NfcManager.cancelTechnologyRequest();
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

      {tagRead && isConnected && (
        <View className="bg-purple-50 p-6 rounded-xl border border-purple-200">
          <Text className="text-purple-700 font-semibold text-lg mb-4 text-center">
            Informations de l'animal
          </Text>

          {animalData.id && (
            <Text className="text-green-600 text-center mb-4">
              ✓ Animal trouvé (ID: {animalData.id})
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

      {tagRead && !isConnected && (
        <View className="bg-purple-50 p-6 rounded-xl border border-purple-200">
          <Text className="text-purple-700 text-center text-base font-medium">
            Vous devez vous reconnecter pour modifier les données de l'animal.
          </Text>
        </View>
      )}
    </View>
  );
}
