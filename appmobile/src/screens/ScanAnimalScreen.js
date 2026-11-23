import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  Linking,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { readAnimalTag, cancelNfc } from "../nfc/animalTag";
import { useRoute } from "@react-navigation/native";
import * as Location from "expo-location";
import Animated, {
  FadeInUp,
  BounceIn,
  SlideInRight,
  SlideInLeft,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { animalsApi, publicApi, mediaUrl } from "../api";

const { width } = Dimensions.get("window");

export default function ScanAnimalScreen() {
  const route = useRoute();
  const userInfo = route.params?.userInfo || {};

  const [animalData, setAnimalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyVets, setNearbyVets] = useState([]);
  const [aiInfo, setAiInfo] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // ✅ NOUVEAUX ÉTATS POUR L'IMAGE
  const [animalPhoto, setAnimalPhoto] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  // Animation pulsante du bouton
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.05, { duration: 1000 }),
      -1,
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // ✅ FONCTION POUR RÉCUPÉRER LA PHOTO DEPUIS L'API
  const fetchAnimalPhoto = async (tagId) => {
    try {
      setLoadingPhoto(true);
      console.log("Récupération photo pour tagId:", tagId);

      try {
        const fileUrl = await animalsApi.getPhotoByTag(tagId);
        if (fileUrl) {
          setAnimalPhoto(mediaUrl(fileUrl));
          return;
        }
      } catch (e) {
        if (e.response?.status !== 404)
          console.warn("Photo API indisponible:", e.message);
      }

      // Fallback: essayer depuis AsyncStorage
      const storedPhoto = await AsyncStorage.getItem(`animal_photo_${tagId}`);
      if (storedPhoto) {
        console.log("Photo trouvée dans AsyncStorage");
        // Si c'est du base64, ajouter le préfixe data:image
        const photoUri = storedPhoto.startsWith("data:")
          ? storedPhoto
          : `data:image/jpeg;base64,${storedPhoto}`;
        setAnimalPhoto(photoUri);
      } else {
        console.log("Aucune photo trouvée pour ce tag");
      }
    } catch (error) {
      console.error("Erreur récupération photo:", error);
    } finally {
      setLoadingPhoto(false);
    }
  };

  const readNfc = async () => {
    try {
      setIsLoading(true);
      setAnimalPhoto(null);
      const tag = await readAnimalTag();

      if (tag.kind === "empty") {
        Alert.alert(
          "Tag vide",
          "Ce tag ne contient aucune information d'animal.",
        );
        return;
      }

      // Ancien format : les informations sont directement sur le tag
      if (tag.kind === "legacy") {
        setAnimalData({
          nom: tag.nom || "Non disponible",
          race: tag.race || "Non disponible",
          age: tag.age || "Non disponible",
          tagId: tag.tagUid,
          nomProprio: tag.nomProprio || "Non disponible",
          prenomProprio: tag.prenomProprio || "Non disponible",
          telephone: tag.telephone || "Non disponible",
          cinProprio: tag.cinProprio || "Non disponible",
          emailProprio: tag.emailProprio || "",
          type: tag.type || "animal",
        });
        await fetchAnimalPhoto(tag.tagUid);
        return;
      }

      // Nouveau format : on affiche tout de suite ce qui est sur le tag (fonctionne hors ligne)
      setAnimalData({
        nom: tag.nom || "Non disponible",
        race: "Non disponible",
        age: "Non disponible",
        tagId: tag.publicId,
        nomProprio: "",
        prenomProprio: "",
        telephone: tag.telephone || "Non disponible",
        cinProprio: "Non disponible",
        emailProprio: "",
        type: "animal",
      });

      // ...puis on le complète avec le serveur si le réseau est disponible
      setLoadingPhoto(true);
      try {
        const info = await publicApi.getAnimal(tag.publicId);
        setAnimalData((prev) => ({
          ...prev,
          nom: info.nom || prev.nom,
          race: info.race || "Non disponible",
          age: info.age || "Non disponible",
          prenomProprio: info.ownerPrenom || "",
          // le téléphone du serveur est à jour même si le tag a changé de main
          telephone: info.ownerTelephone || prev.telephone,
        }));
        if (info.photoUrl) setAnimalPhoto(mediaUrl(info.photoUrl));
      } catch (e) {
        console.log("Détails indisponibles (hors ligne ?) :", e.message);
      } finally {
        setLoadingPhoto(false);
      }
    } catch (ex) {
      console.warn("Erreur:", ex);
      Alert.alert("Erreur", "Échec de lecture NFC");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FONCTION DE CONTACT MISE À JOUR
  const handleContactOwner = () => {
    if (!animalData?.telephone || animalData.telephone === "Non disponible") {
      Alert.alert(
        "Information manquante",
        "Numéro de téléphone non disponible",
      );
      return;
    }

    Alert.alert(
      "Contacter le propriétaire",
      `Contacter ${animalData.prenomProprio} ${animalData.nomProprio} ?\n\n📞 ${animalData.telephone}`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Appeler",
          onPress: () => Linking.openURL(`tel:${animalData.telephone}`),
        },
        { text: "WhatsApp", onPress: () => handleWhatsApp() },
      ],
    );
  };

  // ✅ FONCTION WHATSAPP AMÉLIORÉE POUR LE MAROC
  const handleWhatsApp = () => {
    let cleanPhone = animalData.telephone.replace(/[\s\-\.$$$$]/g, "");

    // Gestion spécifique pour les numéros marocains
    if (cleanPhone.startsWith("06") || cleanPhone.startsWith("07")) {
      cleanPhone = "212" + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith("05")) {
      cleanPhone = "212" + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith("6") || cleanPhone.startsWith("7")) {
      cleanPhone = "212" + cleanPhone;
    } else if (cleanPhone.startsWith("5") && cleanPhone.length === 8) {
      cleanPhone = "212" + cleanPhone;
    } else if (cleanPhone.startsWith("212")) {
      cleanPhone = cleanPhone;
    } else if (cleanPhone.startsWith("+212")) {
      cleanPhone = cleanPhone.substring(1);
    } else {
      Alert.alert(
        "Numéro invalide",
        "Le format du numéro de téléphone n'est pas reconnu",
      );
      return;
    }

    const message = `السلام عليكم ${animalData.prenomProprio}، لقد وجدت ${animalData.type} الخاص بك ${animalData.nom} (${animalData.race}). يرجى التواصل معي من فضلك.`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(waUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(waUrl);
        } else {
          const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
          return Linking.canOpenURL(whatsappUrl).then((whatsappSupported) => {
            if (whatsappSupported) {
              return Linking.openURL(whatsappUrl);
            } else {
              Alert.alert(
                "WhatsApp غير متوفر",
                "WhatsApp غير مثبت على هذا الجهاز أو الرقم غير صحيح",
              );
            }
          });
        }
      })
      .catch((err) => {
        console.error("Erreur WhatsApp:", err);
        Alert.alert("خطأ", "لا يمكن فتح WhatsApp");
      });
  };

  // Recherche vétérinaires proches
  const getNearbyVets = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission refusée",
          "Autorisation de localisation nécessaire.",
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=veterinaire&limit=5&bounded=1&viewbox=${longitude - 0.05},${latitude + 0.05},${longitude + 0.05},${latitude - 0.05}`,
        {
          headers: {
            "User-Agent": "PetNTagApp/1.0 (contact@petntag.local)",
            Accept: "application/json",
          },
        },
      );
      if (!response.ok) {
        const text = await response.text();
        console.warn("Erreur de réponse :", text);
        Alert.alert("Erreur", "La recherche de vétérinaires a échoué.");
        return;
      }
      const data = await response.json();
      if (data.length > 0) {
        setNearbyVets(data);
      } else {
        Alert.alert("Aucun vétérinaire trouvé à proximité.");
      }
    } catch (error) {
      console.error("Erreur getNearbyVets:", error);
      Alert.alert(
        "Erreur",
        "Impossible de localiser ou de chercher les vétérinaires.",
      );
    }
  };

  // Appel Wikipedia en français
  const fetchAIInfo = async () => {
    if (!animalData?.race || animalData.race === "Non disponible") {
      Alert.alert("Erreur", "Race d'animal non définie.");
      return;
    }
    setLoadingAi(true);
    setAiInfo("");
    try {
      let response = await fetch(
        `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(animalData.race)}`,
        {
          headers: {
            "User-Agent": "PetNTagApp/1.0 (contact@petntag.local)",
            Accept: "application/json",
          },
        },
      );
      let wikipediaInfo = "";
      if (response.ok) {
        const data = await response.json();

        if (data.extract && data.extract.length > 50) {
          wikipediaInfo = data.extract;
        } else {
          const searchTerm = `${animalData.race} ${animalData.type || "chien"}`;
          response = await fetch(
            `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`,
            {
              headers: {
                "User-Agent": "PetNTagApp/1.0 (contact@petntag.local)",
                Accept: "application/json",
              },
            },
          );
          if (response.ok) {
            const searchData = await response.json();
            wikipediaInfo = searchData.extract || "";
          }
        }
      }

      if (!wikipediaInfo || wikipediaInfo.length < 50) {
        const searchResponse = await fetch(
          `https://fr.wikipedia.org/api/rest_v1/page/search/${encodeURIComponent(animalData.race)}`,
          {
            headers: {
              "User-Agent": "PetNTagApp/1.0 (contact@petntag.local)",
              Accept: "application/json",
            },
          },
        );
        if (searchResponse.ok) {
          const searchResults = await searchResponse.json();

          if (searchResults.pages && searchResults.pages.length > 0) {
            const firstResult = searchResults.pages[0];

            const pageResponse = await fetch(
              `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title)}`,
              {
                headers: {
                  "User-Agent": "PetNTagApp/1.0 (contact@petntag.local)",
                  Accept: "application/json",
                },
              },
            );
            if (pageResponse.ok) {
              const pageData = await pageResponse.json();
              wikipediaInfo = pageData.extract || "";
            }
          }
        }
      }

      if (wikipediaInfo && wikipediaInfo.length > 50) {
        let formattedInfo = wikipediaInfo.substring(0, 500);

        const lastSentence = formattedInfo.lastIndexOf(".");
        if (lastSentence > 200) {
          formattedInfo = formattedInfo.substring(0, lastSentence + 1);
        }
        const finalInfo = `🐾 **Informations sur ${animalData.race}**\n\n${formattedInfo}\n\n📚 *Source: Wikipedia*`;

        setAiInfo(finalInfo);
        setModalVisible(true);
      } else {
        const fallbackInfo = `Aucune information suffisante trouvée pour "${animalData.race}". Essayez une autre source.`;
        setAiInfo(fallbackInfo);
        setModalVisible(true);
      }
    } catch (error) {
      console.error("Erreur Wikipedia:", error);
      Alert.alert(
        "Erreur",
        "Impossible de récupérer les informations de Wikipedia.",
      );
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    readNfc();
    return () => {
      cancelNfc();
    };
  }, []);

  if (isLoading) {
    return (
      <LinearGradient
        colors={["#F8FAFC", "#E2E8F0"]}
        style={styles.loadingScreen}
      >
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>
          Approchez le tag NFC de votre appareil...
        </Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {animalData ? (
          <Animated.View entering={FadeInUp.duration(800)} style={styles.card}>
            {/* ✅ SECTION PHOTO DE L'ANIMAL */}
            <Animated.View
              entering={ZoomIn.duration(1000)}
              style={styles.photoSection}
            >
              <Text style={styles.sectionTitle}>📸 Photo de l'Animal</Text>

              {loadingPhoto ? (
                <View style={styles.photoPlaceholder}>
                  <ActivityIndicator size="large" color="#7C3AED" />
                  <Text style={styles.photoLoadingText}>
                    Chargement de la photo...
                  </Text>
                </View>
              ) : animalPhoto ? (
                <TouchableOpacity
                  onPress={() => setPhotoModalVisible(true)}
                  style={styles.photoContainer}
                >
                  <Image
                    source={{ uri: animalPhoto }}
                    style={styles.animalPhoto}
                    resizeMode="cover"
                  />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoOverlayText}>
                      Toucher pour agrandir
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.noPhotoContainer}>
                  <Text style={styles.noPhotoIcon}>📷</Text>
                  <Text style={styles.noPhotoText}>
                    Aucune photo disponible
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* ✅ SECTION INFORMATIONS ANIMAL */}
            <Text style={styles.sectionTitle}>Informations de l'Animal</Text>
            <Text style={styles.infoText}>🐾 Nom : {animalData.nom}</Text>
            <Text style={styles.infoText}>🐶 Race : {animalData.race}</Text>
            <Text style={styles.infoText}>🎂 Âge : {animalData.age}</Text>
            <Text style={styles.infoText}>📌 Type : {animalData.type}</Text>

            {/* ✅ SECTION PROPRIÉTAIRE */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              Propriétaire
            </Text>
            <Text style={styles.infoText}>
              👤 Nom : {animalData.nomProprio}
            </Text>
            <Text style={styles.infoText}>
              👤 Prénom : {animalData.prenomProprio}
            </Text>
            <Text style={styles.infoText}>
              📞 Téléphone : {animalData.telephone}
            </Text>
            <Text style={styles.infoText}>
              🆔 CIN : {animalData.cinProprio}
            </Text>
            {animalData.emailProprio && (
              <Text style={styles.infoText}>
                📧 Email : {animalData.emailProprio}
              </Text>
            )}

            {/* ✅ BOUTONS D'ACTION */}
            {animalData.telephone !== "Non disponible" && (
              <Animated.View
                entering={BounceIn}
                style={[styles.buttonContainer, pulseStyle]}
              >
                <TouchableOpacity
                  style={styles.buttonContact}
                  onPress={handleContactOwner}
                >
                  <Text style={styles.buttonText}>
                    Contacter le propriétaire
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            <Animated.View
              entering={BounceIn}
              style={[styles.buttonContainer, pulseStyle]}
            >
              <TouchableOpacity
                style={styles.buttonVet}
                onPress={getNearbyVets}
              >
                <Text style={styles.buttonText}>
                  Trouver un vétérinaire proche
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              entering={BounceIn}
              style={[styles.buttonContainer, pulseStyle]}
            >
              <TouchableOpacity
                style={[styles.buttonAI, loadingAi && styles.buttonDisabled]}
                onPress={fetchAIInfo}
                disabled={loadingAi}
              >
                <Text style={styles.buttonText}>
                  {loadingAi ? "Chargement informations..." : "Infos générales"}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ✅ LISTE DES VÉTÉRINAIRES */}
            {nearbyVets.length > 0 && (
              <Animated.View
                entering={FadeInUp.delay(300)}
                style={styles.vetsList}
              >
                <Text style={styles.sectionTitle}>🏥 Vétérinaires proches</Text>
                <Text style={styles.vetsSubtitle}>
                  Cliquez sur un vétérinaire pour ouvrir la navigation
                </Text>
                {nearbyVets.map((vet, index) => (
                  <Animated.View
                    key={index}
                    entering={SlideInRight.delay(100 * index)}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(
                          `https://www.google.com/maps/search/?api=1&query=${vet.lat},${vet.lon}`,
                        )
                      }
                      style={styles.vetItem}
                    >
                      <LinearGradient
                        colors={["#FFFFFF", "#F8FAFC"]}
                        style={styles.vetGradient}
                      >
                        <View style={styles.vetHeader}>
                          <Text style={styles.vetNumber}>{index + 1}</Text>
                          <View style={styles.vetInfo}>
                            <Text style={styles.vetName} numberOfLines={2}>
                              {vet.display_name.split(",")[0]}
                            </Text>
                            <Text style={styles.vetAddress} numberOfLines={1}>
                              📍{" "}
                              {vet.display_name
                                .split(",")
                                .slice(1, 3)
                                .join(", ")}
                            </Text>
                          </View>
                          <View style={styles.vetActions}>
                            <Text style={styles.vetDistance}>
                              ~{Math.floor(Math.random() * 5) + 1} km
                            </Text>
                            <Text style={styles.vetArrow}>→</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            {/* ✅ MODAL PHOTO EN GRAND */}
            <Modal
              visible={photoModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setPhotoModalVisible(false)}
            >
              <View style={styles.photoModalOverlay}>
                <TouchableOpacity
                  style={styles.photoModalClose}
                  onPress={() => setPhotoModalVisible(false)}
                >
                  <Text style={styles.photoModalCloseText}>✕</Text>
                </TouchableOpacity>

                {animalPhoto && (
                  <Image
                    source={{ uri: animalPhoto }}
                    style={styles.photoModalImage}
                    resizeMode="contain"
                  />
                )}

                <View style={styles.photoModalInfo}>
                  <Text style={styles.photoModalTitle}>{animalData.nom}</Text>
                  <Text style={styles.photoModalSubtitle}>
                    {animalData.race} • {animalData.age}
                  </Text>
                </View>
              </View>
            </Modal>

            {/* ✅ MODAL INFORMATIONS IA */}
            <Modal
              visible={modalVisible}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <ScrollView>
                    <Text style={styles.aiText}>{aiInfo}</Text>
                    <Pressable
                      style={styles.modalCloseButton}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.modalCloseText}>Fermer</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </Animated.View>
        ) : (
          <Text style={styles.noDataText}>
            Aucune donnée d'animal trouvée sur ce tag.
          </Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: "#7C3AED",
    fontWeight: "600",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // ✅ NOUVEAUX STYLES POUR LA PHOTO
  photoSection: {
    marginBottom: 24,
    alignItems: "center",
  },
  photoContainer: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  animalPhoto: {
    width: width * 0.7,
    height: width * 0.7 * 0.8,
    borderRadius: 20,
  },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(124, 58, 237, 0.8)",
    paddingVertical: 8,
    alignItems: "center",
  },
  photoOverlayText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  photoPlaceholder: {
    width: width * 0.7,
    height: width * 0.7 * 0.8,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  photoLoadingText: {
    marginTop: 12,
    color: "#7C3AED",
    fontSize: 16,
    fontWeight: "600",
  },
  noPhotoContainer: {
    width: width * 0.7,
    height: width * 0.7 * 0.8,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  noPhotoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noPhotoText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "500",
  },

  // ✅ STYLES MODAL PHOTO
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalCloseText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  photoModalImage: {
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: 20,
  },
  photoModalInfo: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: "rgba(124, 58, 237, 0.9)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  photoModalTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  photoModalSubtitle: {
    color: "#E9D5FF",
    fontSize: 16,
    fontWeight: "500",
  },

  // Styles existants...
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#7C3AED",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 1,
  },
  infoText: {
    fontSize: 16,
    color: "#6B46C1",
    marginBottom: 8,
    fontWeight: "600",
  },
  buttonContainer: {
    marginTop: 18,
    alignItems: "center",
  },
  buttonContact: {
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: width * 0.75,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 12,
  },
  buttonVet: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: width * 0.75,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 12,
  },
  buttonAI: {
    backgroundColor: "#A855F7",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: width * 0.75,
    shadowColor: "#C084FC",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 0.8,
  },
  vetsList: {
    marginTop: 30,
  },
  vetsSubtitle: {
    textAlign: "center",
    color: "#6B46C1",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 16,
    fontStyle: "italic",
  },
  vetItem: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  vetGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
  },
  vetHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  vetNumber: {
    backgroundColor: "#7C3AED",
    color: "#FFFFFF",
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: "center",
    lineHeight: 32,
    fontWeight: "900",
    fontSize: 16,
    marginRight: 12,
  },
  vetInfo: {
    flex: 1,
  },
  vetName: {
    color: "#6B46C1",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 4,
  },
  vetAddress: {
    color: "#8B5CF6",
    fontSize: 13,
    fontWeight: "500",
  },
  vetActions: {
    alignItems: "flex-end",
  },
  vetDistance: {
    color: "#A855F7",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  vetArrow: {
    color: "#7C3AED",
    fontSize: 20,
    fontWeight: "900",
  },
  noDataText: {
    marginTop: 40,
    fontSize: 18,
    color: "#7C3AED",
    fontWeight: "700",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(139, 92, 246, 0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    maxHeight: "80%",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  aiText: {
    fontSize: 16,
    color: "#6B46C1",
    marginBottom: 20,
    fontWeight: "600",
    lineHeight: 24,
  },
  modalCloseButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
});
