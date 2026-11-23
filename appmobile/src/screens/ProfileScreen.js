import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
  Image,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { UserContext } from "../context/UserContext";
import { usersApi } from "../api";

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState({
    nom: "",
    prenom: "",
    cin: "",
    profileImage: null,
  });
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const scaleValue = new Animated.Value(1);
  const { setUserInfo } = useContext(UserContext);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const cin = await AsyncStorage.getItem("cin");
        if (!cin) {
          console.log("Aucun CIN trouvé");
          setLoading(false);
          return;
        }

        console.log("CIN récupéré depuis AsyncStorage:", cin);
        const data = await usersApi.getByCin(cin);
        console.log("Données reçues:", data);

        // Récupérer l'image de profil stockée localement
        const savedImage = await AsyncStorage.getItem(`profileImage_${cin}`);
        if (savedImage) {
          data.profileImage = savedImage;
        }

        setUserData(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      } finally {
        setLoading(false);
        // Animation d'entrée
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }
    };

    fetchUserData();
  }, []);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission requise",
        "Nous avons besoin de votre permission pour accéder à la galerie.",
      );
      return false;
    }
    return true;
  };

  const selectImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    Alert.alert(
      "Choisir une photo",
      "Comment souhaitez-vous ajouter votre photo de profil ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Galerie", onPress: () => pickImageFromGallery() },
        { text: "Appareil photo", onPress: () => pickImageFromCamera() },
      ],
    );
  };

  const pickImageFromGallery = async () => {
    try {
      setImageLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await saveProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Erreur lors de la sélection de l'image:", error);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de la sélection de l'image.",
      );
    } finally {
      setImageLoading(false);
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission requise",
          "Nous avons besoin de votre permission pour utiliser l'appareil photo.",
        );
        return;
      }

      setImageLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await saveProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Erreur lors de la prise de photo:", error);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de la prise de photo.",
      );
    } finally {
      setImageLoading(false);
    }
  };

  const saveProfileImage = async (imageUri) => {
    try {
      const cin = await AsyncStorage.getItem("cin");
      if (!cin) return;

      // Sauvegarder l'image localement
      await AsyncStorage.setItem(`profileImage_${cin}`, imageUri);

      // Mettre à jour l'état local
      setUserData((prev) => ({
        ...prev,
        profileImage: imageUri,
      }));

      // Optionnel : Envoyer l'image au serveur
      // await uploadImageToServer(imageUri, cin);

      Alert.alert("Succès", "Votre photo de profil a été mise à jour !");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors de la sauvegarde de votre photo.",
      );
    }
  };

  const removeProfileImage = async () => {
    Alert.alert(
      "Supprimer la photo",
      "Voulez-vous vraiment supprimer votre photo de profil ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const cin = await AsyncStorage.getItem("cin");
              if (cin) {
                await AsyncStorage.removeItem(`profileImage_${cin}`);
                setUserData((prev) => ({
                  ...prev,
                  profileImage: null,
                }));
                Alert.alert("Succès", "Votre photo de profil a été supprimée.");
              }
            } catch (error) {
              console.error("Erreur lors de la suppression:", error);
              Alert.alert(
                "Erreur",
                "Une erreur est survenue lors de la suppression.",
              );
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = async () => {
    try {
      const cin = await AsyncStorage.getItem("cin");
      if (!cin) {
        Alert.alert("Erreur", "Impossible de récupérer votre identifiant.");
        return;
      }

      Alert.alert(
        "Confirmer la suppression",
        "Voulez-vous vraiment supprimer votre compte ? Cette action est irréversible.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: async () => {
              try {
                await usersApi.remove(userData.id);
              } catch (error) {
                console.error("Erreur suppression compte :", error);
                Alert.alert(
                  "Erreur",
                  "Une erreur est survenue lors de la suppression.",
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error("Erreur récupération CIN :", error);
      Alert.alert("Erreur", "Une erreur est survenue.");
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("cin");
    setUserInfo(null);
    navigation.replace("Start");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={["#8B5CF6", "#A855F7", "#C084FC"]}
          style={styles.loadingContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.loadingSpinner}>
            <Ionicons name="hourglass-outline" size={32} color="#fff" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec dégradé purple */}
        <LinearGradient
          colors={["#8B5CF6", "#A855F7", "#C084FC"]}
          style={styles.headerContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Motif décoratif en arrière-plan */}
          <View style={styles.decorativePattern}>
            <View style={[styles.circle, styles.circle1]} />
            <View style={[styles.circle, styles.circle2]} />
            <View style={[styles.circle, styles.circle3]} />
          </View>

          <Animated.View
            style={[
              styles.avatarContainer,
              { transform: [{ scale: scaleValue }] },
            ]}
          >
            <View style={styles.profileImageContainer}>
              <TouchableOpacity
                style={styles.imageWrapper}
                onPress={selectImage}
                disabled={imageLoading}
              >
                {userData.profileImage ? (
                  <Image
                    source={{ uri: userData.profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <LinearGradient
                    colors={[
                      "rgba(255, 255, 255, 0.4)",
                      "rgba(255, 255, 255, 0.2)",
                    ]}
                    style={styles.avatar}
                  >
                    <Ionicons name="person" size={44} color="#fff" />
                  </LinearGradient>
                )}

                {/* Overlay pour l'édition - visible seulement s'il n'y a pas d'image */}
                {!userData.profileImage && (
                  <View style={styles.editOverlay}>
                    <Ionicons
                      name={imageLoading ? "hourglass-outline" : "camera"}
                      size={20}
                      color="#fff"
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.welcomeText}>Bienvenue</Text>
            <Text style={styles.userNameText}>
              {userData.prenom} {userData.nom}
            </Text>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.statusText}>Connecté</Text>
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={styles.contentContainer}>
          {/* Carte d'informations personnelles avec style premium */}
          <Animated.View
            style={[
              styles.modernInfoCard,
              { transform: [{ scale: scaleValue }] },
            ]}
          >
            <LinearGradient
              colors={["#ffffff", "#fefefe"]}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <LinearGradient
                  colors={["#8B5CF6", "#A855F7"]}
                  style={styles.cardIconContainer}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={24}
                    color="#fff"
                  />
                </LinearGradient>
                <Text style={styles.cardTitle}>Informations personnelles</Text>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <View style={styles.labelContainer}>
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color="#8B5CF6"
                      />
                      <Text style={styles.label}>Nom</Text>
                    </View>
                    <Text style={styles.value}>
                      {userData.nom || "Non renseigné"}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <View style={styles.labelContainer}>
                      <Ionicons
                        name="happy-outline"
                        size={16}
                        color="#A855F7"
                      />
                      <Text style={styles.label}>Prénom</Text>
                    </View>
                    <Text style={styles.value}>
                      {userData.prenom || "Non renseigné"}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <View style={styles.labelContainer}>
                      <Ionicons name="card-outline" size={16} color="#C084FC" />
                      <Text style={styles.label}>CIN</Text>
                    </View>
                    <Text style={styles.value}>
                      {userData.cin || "Non renseigné"}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Section des actions avec design premium */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>

            <TouchableOpacity
              style={styles.modernButton}
              onPress={() => navigation.navigate("DeviceSettings")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#ffffff", "#fefefe"]}
                style={styles.buttonGradient}
              >
                <LinearGradient
                  colors={["#8B5CF6", "#A855F7"]}
                  style={styles.buttonIconContainer}
                >
                  <Ionicons name="settings-outline" size={22} color="#fff" />
                </LinearGradient>
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.buttonTitle}>Paramètres</Text>
                  <Text style={styles.buttonSubtitle}>
                    Gérer vos préférences
                  </Text>
                </View>
                <View style={styles.buttonArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modernButton, { backgroundColor: "#F87171" }]}
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#FEE2E2", "#FCA5A5"]}
                style={styles.buttonGradient}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={22}
                  color="#B91C1C"
                />
                <View style={styles.buttonTextContainer}>
                  <Text style={[styles.buttonTitle, { color: "#B91C1C" }]}>
                    Supprimer mon compte
                  </Text>
                  <Text style={[styles.buttonSubtitle, { color: "#991B1B" }]}>
                    Action irréversible
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modernButton, styles.logoutButton]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#ffffff", "#fefcfc"]}
                style={styles.buttonGradient}
              >
                <View style={styles.logoutIconContainer}>
                  <MaterialIcons name="logout" size={22} color="#EF4444" />
                </View>
                <View style={styles.buttonTextContainer}>
                  <Text style={[styles.buttonTitle, styles.logoutText]}>
                    Se déconnecter
                  </Text>
                  <Text style={styles.buttonSubtitle}>
                    Quitter votre session
                  </Text>
                </View>
                <View style={styles.buttonArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#EF4444" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingSpinner: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    padding: 30,
    borderRadius: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#fff",
    marginTop: 10,
    fontWeight: "600",
  },
  headerContainer: {
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  decorativePattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  circle1: {
    width: 120,
    height: 120,
    top: -60,
    right: -60,
  },
  circle2: {
    width: 80,
    height: 80,
    top: 20,
    left: -40,
  },
  circle3: {
    width: 60,
    height: 60,
    bottom: -30,
    right: 20,
  },
  avatarContainer: {
    alignItems: "center",
    zIndex: 1,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 15,
  },
  imageWrapper: {
    position: "relative",
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  editOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(139, 92, 246, 0.9)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#fff",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.95)",
    marginBottom: 5,
    fontWeight: "500",
  },
  userNameText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    marginTop: -30,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modernInfoCard: {
    marginBottom: 25,
    borderRadius: 20,
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 25,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  infoGrid: {
    gap: 20,
  },
  infoRow: {
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: "#8B5CF6",
  },
  infoItem: {
    gap: 8,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  value: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "600",
  },
  actionsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 20,
    marginLeft: 5,
  },
  modernButton: {
    marginBottom: 15,
    borderRadius: 18,
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  logoutButton: {
    shadowColor: "#EF4444",
  },
  buttonIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },
  logoutIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  logoutText: {
    color: "#EF4444",
  },
  buttonSubtitle: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  buttonArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
});
