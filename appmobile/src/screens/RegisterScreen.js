import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import * as ImagePicker from "expo-image-picker";
import { ocrApi, authApi } from "../api";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  ZoomIn,
  FlipInXUp,
  BounceInDown,
  BounceInUp,
  RotateInDownLeft,
  LightSpeedInLeft,
  BounceInLeft,
  FlipInYLeft,
  SlideInLeft,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function RegisterScreen() {
  const { control, handleSubmit, setValue } = useForm({
    defaultValues: {
      cin: "",
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
    },
  });
  const navigation = useNavigation();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const floatingAnimation = useSharedValue(0);

  React.useEffect(() => {
    floatingAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 }),
      ),
      -1,
      true,
    );
  }, []);

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatingAnimation.value, [0, 1], [0, -10]) },
    ],
  }));

  const animatedPhotoButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  const pickImage = async () => {
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1.05, { duration: 100 }),
      withTiming(1, { duration: 100 }),
    );
    rotation.value = withSequence(
      withTiming(5, { duration: 100 }),
      withTiming(-5, { duration: 100 }),
      withTiming(0, { duration: 100 }),
    );

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      alert("Permission caméra requise");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);
      extractTextFromImage(imageUri);
    }
  };

  const extractTextFromImage = async (uri) => {
    setLoading(true);
    try {
      const { cin, nom, prenom } = await ocrApi.extractCin(uri);
      setValue("cin", cin || "");
      setValue("nom", nom || "");
      setValue("prenom", prenom || "");
    } catch {
      Alert.alert("Erreur OCR", "Impossible d'extraire les données.");
    } finally {
      setLoading(false);
    }
  };

  // Dans RegisterScreen.js, modifiez la fonction onSubmit

  const onSubmit = async (data) => {
    if (!image) {
      Alert.alert("Image requise", "Veuillez prendre une photo de votre CIN.");
      return;
    }
    try {
      const user = await authApi.register(image, data);
      const userEmail = user?.email || data.email;
      if (!userEmail) {
        Alert.alert("Erreur", "Email manquant dans la réponse.");
        return;
      }
      try {
        await authApi.sendOtp(userEmail);
        Alert.alert(
          "Succès",
          "Un code de vérification a été envoyé à votre email.",
        );
        navigation.navigate("EnterPin", {
          email: userEmail,
          mode: "register",
          userInfo: user,
          redirectTo: "PostRegisterChoice",
        });
      } catch (otpError) {
        console.error("Erreur envoi OTP:", otpError);
        Alert.alert("Erreur", "Impossible d'envoyer le code de vérification.");
      }
    } catch (error) {
      console.error("Erreur inscription:", error);
      const message =
        error.response?.status === 409
          ? "Cette CIN est déjà inscrite."
          : "Échec de l'inscription.";
      Alert.alert("Erreur", message);
    }
  };

  const fieldAnimations = [
    RotateInDownLeft,
    LightSpeedInLeft,
    BounceInLeft,
    FlipInYLeft,
    SlideInLeft,
  ];

  return (
    <LinearGradient
      colors={["#F8FAFC", "#F1F5F9", "#E2E8F0"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={BounceInDown.delay(100).duration(1000).springify()}
          style={floatingStyle}
        >
          <Text style={styles.title}>Inscription Magique</Text>
          <Text style={styles.subtitle}>Créer votre compte en un scan</Text>
        </Animated.View>

        <Animated.View
          entering={FlipInXUp.delay(200).duration(1000)}
          style={animatedPhotoButtonStyle}
        >
          <TouchableOpacity onPress={pickImage} style={styles.photoButton}>
            <LinearGradient
              colors={["#8B5CF6", "#A855F7", "#C084FC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.photoButtonGradient}
            >
              <Text style={styles.photoButtonText}>SCANNER VOTRE CIN</Text>
              <Text style={styles.photoSubtext}>
                Reconnaissance automatique
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {image && (
          <Animated.View entering={ZoomIn.duration(800).springify()}>
            <Image source={{ uri: image }} style={styles.previewImage} />
          </Animated.View>
        )}

        {["cin", "nom", "prenom", "email", "telephone"].map((field, index) => (
          <Animated.View
            key={field}
            entering={fieldAnimations[index]
              .delay(400 + index * 150)
              .duration(800)
              .springify()}
          >
            <Controller
              control={control}
              name={field}
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{field.toUpperCase()}</Text>
                  <TextInput
                    placeholder={`Entrez votre ${field}`}
                    placeholderTextColor="rgba(139, 92, 246, 0.4)"
                    style={styles.input}
                    onChangeText={onChange}
                    value={value}
                    keyboardType={
                      field === "telephone"
                        ? "phone-pad"
                        : field === "email"
                          ? "email-address"
                          : "default"
                    }
                  />
                </View>
              )}
            />
          </Animated.View>
        ))}

        {loading ? (
          <Animated.View entering={BounceInUp.duration(600)}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Extraction des données...</Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            entering={BounceInUp.delay(1000).duration(1000).springify()}
          >
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              style={styles.submitButton}
            >
              <LinearGradient
                colors={["#DDD6FE", "#C4B5FD"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}
              >
                <Text style={styles.submitText}>Créer mon compte</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  scrollContainer: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#5B21B6",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#7C3AED",
    textAlign: "center",
    marginBottom: 20,
  },
  photoButton: {
    marginBottom: 25,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  photoButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 25,
    alignItems: "center",
  },
  photoButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  photoSubtext: {
    color: "#F3E8FF",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  previewImage: {
    width: 120,
    height: 80,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#A855F7",
  },
  inputContainer: { marginBottom: 14 },
  inputLabel: {
    fontWeight: "600",
    fontSize: 14,
    color: "#5B21B6",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F3E8FF",
    borderRadius: 16,
    borderColor: "#DDD6FE",
    borderWidth: 1,
    marginTop: 20,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    marginTop: 10,
    color: "#5B21B6",
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    marginTop: 30,
    borderRadius: 18,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  submitGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  submitText: {
    color: "#5B21B6",
    fontSize: 18,
    fontWeight: "800",
    textShadowColor: "rgba(255,255,255,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
