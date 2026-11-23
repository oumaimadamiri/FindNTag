import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Dimensions,
} from "react-native";
import { writeTagWithRetry } from "../nfc/writeFlow";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { usersApi, animalsApi } from "../api";

const { width } = Dimensions.get("window");

export default function AddAnimalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const userInfo = route.params?.userInfo || {};

  const [nom, setNom] = useState("");
  const [race, setRace] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagePickerModal, setImagePickerModal] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (userInfo?.cin) {
        try {
          setLoadingUser(true);
          setUserData(await usersApi.getByCin(userInfo.cin));
        } catch (error) {
          console.error("Erreur réseau:", error);
        } finally {
          setLoadingUser(false);
        }
      }
    };

    fetchUserData();
  }, [userInfo.cin]);

  useEffect(() => {
    const loadData = async () => {
      const pendingAnimalJSON = await AsyncStorage.getItem("pendingAnimal");
      if (pendingAnimalJSON) {
        const pendingAnimal = JSON.parse(pendingAnimalJSON);
        setNom(pendingAnimal.nom || "");
        setRace(pendingAnimal.race || "");
        setAge(pendingAnimal.age || "");
        setImageUri(pendingAnimal.imageUri || null);
        setImageBase64(pendingAnimal.imageBase64 || null);
      }

      if (!userInfo || !userInfo.nom) {
        const storedUserInfo = await AsyncStorage.getItem("userInfo");
        if (storedUserInfo) {
          const parsed = JSON.parse(storedUserInfo);
          route.params = { userInfo: parsed };
        }
      }
    };

    loadData();
  }, []);

  // ✅ Fonction pour convertir l'image en base64 avec fetch (sans expo-file-system)
  const convertToBase64 = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(",")[1]; // Enlever le préfixe data:image/...
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Erreur conversion base64:", error);
      throw error;
    }
  };

  // Pas de troncature : couper un base64 corrompt l'image (JPEG incomplet)
  const compressImage = async (base64String) => base64String;

  // Fonction pour sélectionner une image
  const selectImage = () => {
    setImagePickerModal(true);
  };

  // ✅ Fonction pour prendre une photo avec Expo ImagePicker
  const takePhoto = async () => {
    try {
      setImagePickerModal(false);

      // Demander permission caméra
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission requise",
          "Nous avons besoin de la permission pour utiliser la caméra.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true, // ✅ Demander directement le base64
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);

        // Utiliser le base64 directement ou convertir
        let base64;
        if (asset.base64) {
          base64 = asset.base64;
        } else {
          base64 = await convertToBase64(asset.uri);
        }

        const compressedBase64 = await compressImage(base64);
        setImageBase64(compressedBase64);

        console.log("Photo prise et traitée avec succès");
      }
    } catch (error) {
      console.error("Erreur prise de photo:", error);
      Alert.alert("Erreur", "Impossible de prendre la photo");
    }
  };

  // ✅ Fonction pour choisir depuis la galerie avec Expo ImagePicker
  const chooseFromGallery = async () => {
    try {
      setImagePickerModal(false);

      // Demander permission galerie
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission requise",
          "Nous avons besoin de la permission pour accéder à vos photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true, // ✅ Demander directement le base64
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);

        // Utiliser le base64 directement ou convertir
        let base64;
        if (asset.base64) {
          base64 = asset.base64;
        } else {
          base64 = await convertToBase64(asset.uri);
        }

        const compressedBase64 = await compressImage(base64);
        setImageBase64(compressedBase64);

        console.log("Image sélectionnée et traitée avec succès");
      }
    } catch (error) {
      console.error("Erreur sélection image:", error);
      Alert.alert("Erreur", "Impossible de sélectionner l'image");
    }
  };

  // Fonction pour supprimer l'image
  const removeImage = () => {
    setImageUri(null);
    setImageBase64(null);
  };

  const handleWriteNfc = async () => {
    if (!nom || !race || !age) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (!userInfo.cin || !userData) {
      const animalData = { nom, race, age, imageUri, imageBase64 };
      await AsyncStorage.setItem("pendingAnimal", JSON.stringify(animalData));
      Alert.alert(
        "Authentification requise",
        "Vous devez être connecté pour ajouter un animal.",
        [
          {
            text: "Se connecter",
            onPress: () =>
              navigation.navigate("Login", { redirectTo: "AddAnimal" }),
          },
        ],
      );
      return;
    }
    try {
      setLoading(true);

      // 1. L'animal est d'abord enregistré : le serveur lui attribue son identifiant public
      const created = await animalsApi.create({
        nom,
        race,
        age,
        image: imageBase64,
      });
      await AsyncStorage.removeItem("pendingAnimal");

      // 2. Le tag reçoit uniquement cet identifiant, le nom et le téléphone du propriétaire
      const written = await writeTagWithRetry({
        publicId: created.publicId,
        nom,
        telephone: userData.telephone,
      });

      Alert.alert(
        written ? "Succès" : "Animal enregistré",
        written
          ? `${nom} a été enregistré avec succès !`
          : `${nom} est enregistré, mais son tag n'a pas été écrit. Vous pourrez le programmer depuis « Modifier un animal ».`,
      );
      navigation.navigate("Home", { screen: "Animaux" });
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f3e8ff" }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          shadowColor: "#a855f7",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            textAlign: "center",
            color: "#7c3aed",
          }}
        >
          Ajouter un Animal
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        {/* Section Photo */}
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderColor: "#c4b5fd",
          }}
        >
          <Text
            style={{
              color: "#7c3aed",
              fontWeight: "600",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            📸 Photo de l'animal
          </Text>

          {imageUri ? (
            <View style={{ alignItems: "center" }}>
              <TouchableOpacity onPress={() => setShowImageModal(true)}>
                <Image
                  source={{ uri: imageUri }}
                  style={{
                    width: width * 0.6,
                    height: width * 0.6 * 0.75,
                    borderRadius: 12,
                  }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <View style={{ flexDirection: "row", marginTop: 12, gap: 12 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#8b5cf6",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                  onPress={selectImage}
                >
                  <Text style={{ color: "white", fontWeight: "500" }}>
                    Changer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: "#ef4444",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                  onPress={removeImage}
                >
                  <Text style={{ color: "white", fontWeight: "500" }}>
                    Supprimer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: "#f3e8ff",
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: "#c4b5fd",
                borderRadius: 12,
                paddingVertical: 32,
                alignItems: "center",
              }}
              onPress={selectImage}
            >
              <Text style={{ color: "#8b5cf6", fontSize: 32, marginBottom: 8 }}>
                📷
              </Text>
              <Text style={{ color: "#8b5cf6", fontWeight: "500" }}>
                Ajouter une photo
              </Text>
              <Text style={{ color: "#a855f7", fontSize: 12, marginTop: 4 }}>
                Touchez pour sélectionner
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderWidth: 2,
            borderColor: "#c4b5fd",
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 16,
            fontSize: 16,
            color: "#7c3aed",
            fontWeight: "500",
          }}
          placeholder="Nom de l'animal"
          placeholderTextColor="#a855f7"
          value={nom}
          onChangeText={setNom}
        />

        <TextInput
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderWidth: 2,
            borderColor: "#c4b5fd",
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 16,
            fontSize: 16,
            color: "#7c3aed",
            fontWeight: "500",
          }}
          placeholder="Race"
          placeholderTextColor="#a855f7"
          value={race}
          onChangeText={setRace}
        />

        <TextInput
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderWidth: 2,
            borderColor: "#c4b5fd",
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 16,
            fontSize: 16,
            color: "#7c3aed",
            fontWeight: "500",
          }}
          placeholder="Âge"
          placeholderTextColor="#a855f7"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
        />

        {userInfo.cin && userData && (
          <View
            style={{
              backgroundColor: "#dbeafe",
              borderRadius: 12,
              padding: 16,
              marginTop: 24,
              borderWidth: 2,
              borderColor: "#93c5fd",
            }}
          >
            <Text
              style={{
                color: "#1d4ed8",
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              📋 Informations du propriétaire (seront incluses dans le tag NFC)
            </Text>
            <TextInput
              style={{
                backgroundColor: "#eff6ff",
                color: "#1e40af",
                borderWidth: 1,
                borderColor: "#93c5fd",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                marginBottom: 12,
                fontWeight: "500",
              }}
              value={userData?.nom || ""}
              placeholder="Nom utilisateur"
              editable={false}
            />
            <TextInput
              style={{
                backgroundColor: "#eff6ff",
                color: "#1e40af",
                borderWidth: 1,
                borderColor: "#93c5fd",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                marginBottom: 12,
                fontWeight: "500",
              }}
              value={userData?.prenom || ""}
              placeholder="Prénom utilisateur"
              editable={false}
            />
            <TextInput
              style={{
                backgroundColor: "#eff6ff",
                color: "#1e40af",
                borderWidth: 1,
                borderColor: "#93c5fd",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                fontWeight: "500",
              }}
              value={userData?.telephone || ""}
              placeholder="Téléphone"
              editable={false}
            />
            <Text
              style={{
                color: "#2563eb",
                fontSize: 12,
                textAlign: "center",
                marginTop: 8,
                fontWeight: "500",
              }}
            >
              Ces informations seront écrites sur le tag NFC avec les données de
              l'animal
            </Text>
          </View>
        )}

        {(!userInfo.cin || !userData) && (
          <View
            style={{
              backgroundColor: "#fef3c7",
              borderRadius: 12,
              padding: 16,
              marginTop: 24,
              borderWidth: 2,
              borderColor: "#fbbf24",
            }}
          >
            <Text
              style={{
                color: "#b45309",
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              ⚠️ Connexion requise
            </Text>
            <Text
              style={{
                color: "#d97706",
                textAlign: "center",
                fontSize: 14,
              }}
            >
              Connectez-vous pour que vos informations de contact soient
              incluses dans le tag NFC
            </Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: 32 }}>
        {loading ? (
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              borderRadius: 16,
              paddingVertical: 24,
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text
              style={{
                color: "#8b5cf6",
                fontWeight: "600",
                marginTop: 12,
              }}
            >
              Écriture en cours...
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={{
              backgroundColor: "#8b5cf6",
              borderRadius: 16,
              paddingVertical: 20,
              shadowColor: "#8b5cf6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
            onPress={handleWriteNfc}
          >
            <Text
              style={{
                color: "white",
                textAlign: "center",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Écrire sur le tag NFC
            </Text>
            <Text
              style={{
                color: "#e9d5ff",
                textAlign: "center",
                fontSize: 14,
                fontWeight: "500",
                marginTop: 4,
              }}
            >
              Données complètes: animal + propriétaire{" "}
              {imageUri ? "+ photo" : ""}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal pour sélectionner la source de l'image */}
      <Modal
        visible={imagePickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setImagePickerModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: 24,
                color: "#374151",
              }}
            >
              Choisir une photo
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: "#8b5cf6",
                borderRadius: 12,
                paddingVertical: 16,
                marginBottom: 12,
              }}
              onPress={takePhoto}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: 18,
                }}
              >
                📷 Prendre une photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#3b82f6",
                borderRadius: 12,
                paddingVertical: 16,
                marginBottom: 12,
              }}
              onPress={chooseFromGallery}
            >
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: 18,
                }}
              >
                🖼️ Choisir depuis la galerie
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#d1d5db",
                borderRadius: 12,
                paddingVertical: 16,
              }}
              onPress={() => setImagePickerModal(false)}
            >
              <Text
                style={{
                  color: "#374151",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: 18,
                }}
              >
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal pour afficher l'image en grand */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{ position: "absolute", top: 48, right: 24, zIndex: 10 }}
            onPress={() => setShowImageModal(false)}
          >
            <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
              ✕
            </Text>
          </TouchableOpacity>

          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={{
                width: width * 0.9,
                height: width * 0.9 * 0.75,
                borderRadius: 12,
              }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}
