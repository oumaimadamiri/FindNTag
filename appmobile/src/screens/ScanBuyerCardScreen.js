import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ocrApi, usersApi } from "../api";
import { useRoute, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ScanBuyerCardScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const isJpeg = (uri) =>
    uri.toLowerCase().endsWith(".jpg") || uri.toLowerCase().endsWith(".jpeg");

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission caméra requise");
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        Alert.alert("Aucune image capturée.");
        return;
      }

      const imageUri = result.assets[0].uri;
      if (!isJpeg(imageUri)) {
        Alert.alert("L'image capturée n'est pas au format JPEG.");
        return;
      }

      setImage(imageUri);
      verifyCin(imageUri);
    } catch (error) {
      Alert.alert("Erreur lors de la capture de l'image");
      console.error("Erreur de capture:", error);
    }
  };

  const verifyCin = async (uri) => {
    setLoading(true);

    try {
      const { cin } = await ocrApi.extractCin(uri);
      if (!cin) {
        Alert.alert("Erreur OCR", "Impossible d'extraire le CIN");
        return;
      }
            let buyerInfo;
      try {
        buyerInfo = await usersApi.lookup(cin);
      } catch (e) {
        if (e.response?.status === 404) {
          Alert.alert("Utilisateur introuvable", "Aucun utilisateur avec cette CIN.");
          return;
        }
        throw e;
      }
      await AsyncStorage.setItem("buyerInfo", JSON.stringify(buyerInfo));
      navigation.navigate("SellAnimal", {
        userInfo: route.params?.userInfo,
        buyerInfo: {
          nom: buyerInfo.nom,
          prenom: buyerInfo.prenom,
          cin: buyerInfo.cin,
          telephone: buyerInfo.telephone,
        },
      });
    } catch (error) {
      console.error("Erreur OCR ou API:", error);
      Alert.alert("Erreur", "Impossible de traiter la carte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scanner carte acheteur</Text>
        <Text style={styles.subtitle}>
          Positionnez la carte CIN dans le cadre
        </Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity onPress={pickImage} style={styles.scanButton}>
          <View style={styles.scanButtonContent}>
            <Text style={styles.cameraIcon}>📷</Text>
            <Text style={styles.scanButtonText}>Scanner CIN acheteur</Text>
            <Text style={styles.scanButtonSubtext}>
              Appuyez pour ouvrir l'appareil photo
            </Text>
          </View>
        </TouchableOpacity>

        {image && (
          <View style={styles.imageContainer}>
            <Text style={styles.imageLabel}>Image capturée :</Text>
            <Image source={{ uri: image }} style={styles.image} />
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Traitement en cours...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: "white",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#8B5CF6",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#6B7280",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  scanButton: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    marginBottom: 30,
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  scanButtonContent: {
    alignItems: "center",
  },
  cameraIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  scanButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#8B5CF6",
    marginBottom: 8,
    textAlign: "center",
  },
  scanButtonSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    fontWeight: "500",
  },
  imageContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8B5CF6",
    marginBottom: 15,
    textAlign: "center",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    resizeMode: "contain",
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#8B5CF6",
    fontWeight: "600",
  },
});
