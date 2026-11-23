import React, { useState, useEffect } from "react";
import {
  Text,
  TextInput,
  View,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import NfcManager, { Ndef, NfcTech } from "react-native-nfc-manager";
import { usersApi, animalsApi } from "../api";
import { useRoute, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AddAnimalNFCScreen() {
  const route = useRoute();
  const cin = route.params?.cin;
  const navigation = useNavigation();

  const [proprietaireNom, setProprietaireNom] = useState("");
  const [proprietairePrenom, setProprietairePrenom] = useState("");
  const [proprietaireCIN, setProprietaireCIN] = useState(cin || "");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [race, setRace] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    if (cin) {
      setLoadingUser(true);
      usersApi
        .getByCin(cin)
        .then((user) => {
          const { nom, prenom, cin: userCin, telephone, email } = user;
          setProprietaireNom(nom);
          setProprietairePrenom(prenom);
          setProprietaireCIN(userCin);
          setTelephone(telephone);
          setEmail(email || "");
          setUserData(user);
        })
        .catch((error) => {
          console.error("Erreur récupération propriétaire:", error);
          Alert.alert(
            "Erreur",
            "Impossible de récupérer les infos du propriétaire.",
          );
        })
        .finally(() => {
          setLoadingUser(false);
        });
    }
  }, [cin]);

  // Charger les données en attente si elles existent
  useEffect(() => {
    const loadPendingData = async () => {
      const pendingAnimalJSON = await AsyncStorage.getItem("pendingAnimal");
      if (pendingAnimalJSON) {
        const pendingAnimal = JSON.parse(pendingAnimalJSON);
        setNom(pendingAnimal.nom || "");
        setRace(pendingAnimal.race || "");
        setAge(pendingAnimal.age || "");
        setType(pendingAnimal.type || "");
      }
    };

    loadPendingData();
  }, []);

  const writeAnimalToNfcTag = async (animalData, ownerData) => {
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      const tagId = tag?.id || null;

      // Utiliser le même format compressé que dans AddAnimalScreen
      const compressedData = {
        n: animalData.nom,
        r: animalData.race,
        a: animalData.age,
        o: animalData.ownerId,
        t: tagId,
        pn: ownerData.nom,
        pp: ownerData.prenom,
        pc: ownerData.cin,
        pt: ownerData.telephone,
        pe: ownerData.email || "",
      };

      const jsonString = JSON.stringify(compressedData);

      if (jsonString.length > 8000) {
        Alert.alert(
          "Attention",
          "Les données sont trop volumineuses pour ce tag NFC.",
        );
      }

      const bytes = Ndef.encodeMessage([Ndef.textRecord(jsonString)]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        return tagId;
      }
      return null;
    } catch (error) {
      console.error("Erreur écriture NFC:", error);
      throw error;
    } finally {
      await NfcManager.cancelTechnologyRequest();
    }
  };

  const handleWrite = async () => {
    if (!nom || !race || !age) {
      Alert.alert(
        "Erreur",
        "Tous les champs obligatoires doivent être remplis.",
      );
      return;
    }

    if (!cin || !userData) {
      // Sauvegarder les données en attente
      const animalData = { nom, race, age, type };
      await AsyncStorage.setItem("pendingAnimal", JSON.stringify(animalData));
      Alert.alert(
        "Authentification requise",
        "Vous devez être connecté pour ajouter un animal.",
        [
          {
            text: "Se connecter",
            onPress: () =>
              navigation.navigate("Login", { redirectTo: "AddAnimalNFC" }),
          },
        ],
      );
      return;
    }

    setLoading(true);

    try {
      Alert.alert("Approchez le tag NFC pour écrire les données...");

      const tagId = await writeAnimalToNfcTag(
        { nom, race, age: parseInt(age), ownerId: userData.id },
        {
          nom: userData.nom,
          prenom: userData.prenom,
          cin: userData.cin,
          telephone: userData.telephone,
          email: userData.email || "",
        },
      );

      if (!tagId) {
        Alert.alert("Erreur", "Échec de l'écriture NFC");
        return;
      }

      // Enregistrer dans la base de données avec la même structure qu'AddAnimalScreen
      const animalData = {
        nom,
        race,
        age: parseInt(age),
        tagId,
        ownerId: userData.id,
      };

      const response = await animalsApi.create(animalData);

      // Nettoyer les données en attente
      await AsyncStorage.removeItem("pendingAnimal");
      await AsyncStorage.setItem("cin", cin);

      Alert.alert("Succès", `${nom} a été enregistré avec succès!`);
      navigation.navigate("Home", { screen: "Animaux" });
    } catch (error) {
      console.error("Erreur durant l'enregistrement:", error);
      Alert.alert("Erreur", error.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: "#f8fafc", padding: 16 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 40,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-purple-100">
              <Text className="text-3xl font-bold text-center text-purple-800 mb-2">
                ✨ Ajouter un Animal
              </Text>
              <Text className="text-center text-purple-600 text-sm">
                Enregistrez votre compagnon sur un tag NFC
              </Text>
            </View>

            {/* Informations du propriétaire */}
            {cin && userData && (
              <View className="bg-white rounded-2xl shadow-md p-5 mb-6 border-l-4 border-purple-500">
                <Text className="text-lg font-semibold text-purple-800 mb-4">
                  👤 Informations du Propriétaire
                </Text>
                <Text className="text-purple-600 text-xs text-center mb-4">
                  Ces informations seront écrites sur le tag NFC avec les
                  données de l'animal
                </Text>
                <Field
                  label="Nom du propriétaire"
                  value={proprietaireNom}
                  editable={false}
                />
                <Field
                  label="Prénom du propriétaire"
                  value={proprietairePrenom}
                  editable={false}
                />
                <Field label="CIN" value={proprietaireCIN} editable={false} />
                <Field label="Téléphone" value={telephone} editable={false} />
              </View>
            )}

            {/* Avertissement si pas connecté */}
            {(!cin || !userData) && (
              <View className="bg-gradient-to-r from-yellow-50 to-orange-100 rounded-xl p-4 mb-6 border-2 border-yellow-200">
                <Text className="text-yellow-700 font-semibold text-center mb-2">
                  ⚠️ Connexion requise
                </Text>
                <Text className="text-yellow-600 text-center text-sm">
                  Connectez-vous pour que vos informations de contact soient
                  incluses dans le tag NFC
                </Text>
              </View>
            )}

            {/* Informations de l'animal */}
            <View className="bg-white rounded-2xl shadow-md p-5 mb-6 border-l-4 border-purple-400">
              <Text className="text-lg font-semibold text-purple-800 mb-4">
                🐾 Informations de l'Animal
              </Text>
              <Field
                label="Nom de l'animal"
                value={nom}
                onChangeText={setNom}
              />
              <Field label="Race" value={race} onChangeText={setRace} />
              <Field
                label="Âge"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
            </View>

            {/* Bouton d'écriture */}
            {loading ? (
              <View className="bg-white/80 rounded-2xl py-6 items-center shadow-lg shadow-purple-200/50">
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text className="text-purple-600 font-semibold mt-3">
                  Écriture en cours...
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleWrite}
                className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl py-5 shadow-lg shadow-purple-300/50"
              >
                <Text className="text-white text-center text-lg font-bold">
                  Écrire sur le tag NFC
                </Text>
                <Text className="text-purple-100 text-center text-sm font-medium mt-1">
                  Données complètes: animal + propriétaire
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  editable = true,
  keyboardType = "default",
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-purple-700 mb-2 ml-1">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        placeholder={editable ? `Entrer ${label.toLowerCase()}` : ""}
        placeholderTextColor="#a855f7"
        className={`p-4 rounded-xl border-2 text-base ${
          editable
            ? "bg-white border-purple-200 text-purple-900 focus:border-purple-500"
            : "bg-purple-50 border-purple-200 text-purple-600"
        } shadow-sm`}
      />
    </View>
  );
}
