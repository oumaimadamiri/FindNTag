import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ocrApi, usersApi, authApi } from "../api";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  FadeInUp,
  ZoomIn,
  SlideInRight,
  BounceIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pulse = useSharedValue(1);
  const floatAnim = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 900 }),
        withTiming(1, { duration: 900 }),
      ),
      -1,
    );
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 }),
      ),
      -1,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(floatAnim.value, [0, 1], [0, -8]),
      },
    ],
  }));

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

      if (result.canceled || !result.assets?.length) return;
      const imageUri = result.assets[0].uri;
      if (!isJpeg(imageUri)) {
        Alert.alert("L'image doit être au format JPEG.");
        return;
      }

      setImage(imageUri);
      verifyCin(imageUri);
    } catch (err) {
      Alert.alert("Erreur lors de la capture");
    }
  };

  const verifyCin = async (uri) => {
    setLoading(true);
    try {
      const { cin } = await ocrApi.extractCin(uri);
      if (!cin) {
        Alert.alert(
          "Erreur",
          "Impossible d'extraire les informations de la CIN.",
        );
        return;
      }
      const exists = await usersApi.checkCin(cin);
      if (!exists) {
        Alert.alert(
          "Utilisateur non trouvé",
          "Aucun compte associé à cette CIN.",
        );
        return;
      }
      const userInfo = await usersApi.getByCin(cin);
      await AsyncStorage.setItem("cin", cin);
      await AsyncStorage.setItem("userInfo", JSON.stringify(userInfo));

      if (!userInfo.email) {
        Alert.alert(
          "Erreur",
          "Email manquant dans les informations utilisateur.",
        );
        return;
      }
      try {
        await authApi.sendOtp(userInfo.email);
        navigation.navigate("EnterPin", {
          email: userInfo.email,
          mode: "login",
          redirectTo: route.params?.redirectTo || "Home",
          userInfo,
        });
      } catch (otpError) {
        console.error("Erreur envoi OTP login:", otpError);
        Alert.alert("Erreur", "Impossible d'envoyer le code de vérification.");
      }
    } catch (e) {
      console.error("Erreur de vérification:", e);
      Alert.alert(
        "Erreur de vérification",
        "Problème de connexion au serveur.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#f3e8ff", "#e879f9", "#d946ef"]}
      style={styles.container}
    >
      <Animated.View
        entering={FadeInUp.delay(200).duration(800)}
        style={styles.header}
      >
        <Animated.Text style={[styles.title, floatStyle]}>
          Connexion Magique
        </Animated.Text>
        <Text style={styles.subtitle}>Authentifiez-vous par votre CIN</Text>
      </Animated.View>

      <Animated.View
        entering={ZoomIn.delay(500).duration(1000)}
        style={[styles.scanContainer, pulseStyle]}
      >
        <TouchableOpacity onPress={pickImage}>
          <LinearGradient
            colors={["#a855f7", "#9333ea"]}
            style={styles.scanButton}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.scanIcon}>📷</Text>
              <Text style={styles.scanText}>Scanner votre CIN</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {image && (
        <Animated.View
          entering={BounceIn.delay(200)}
          style={styles.previewContainer}
        >
          <View style={styles.imageWrapper}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <View style={styles.overlay}>
              <Text style={styles.imageLabel}>CIN Capturée ✅</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {loading && (
        <Animated.View entering={FadeInUp} style={styles.loadingContainer}>
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#9333ea" />
            <Text style={styles.loadingText}>Analyse en cours...</Text>
          </View>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#581c87",
    letterSpacing: 1.5,
    textAlign: "center",
    textShadowColor: "rgba(168, 85, 247, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#7c3aed",
    marginTop: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  scanContainer: {
    alignItems: "center",
    marginBottom: 50,
  },
  scanButton: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 12,
    shadowColor: "#9333ea",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  scanIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  scanText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  previewContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  imageWrapper: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  previewImage: {
    width: 220,
    height: 140,
    borderRadius: 20,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(147, 51, 234, 0.9)",
    paddingVertical: 8,
    alignItems: "center",
  },
  imageLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: "center",
    marginTop: 30,
  },
  loadingWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 20,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  loadingText: {
    color: "#7c3aed",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
});
