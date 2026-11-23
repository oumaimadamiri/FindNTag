import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute, useNavigation } from "@react-navigation/native";
import { animalsApi } from "../api";
import { writeTagWithRetry } from "../nfc/writeFlow";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInRight,
  BounceIn,
  Layout,
  EntryExitAnimationFunction,
} from "react-native-reanimated";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

export default function SellAnimalScreen({ route }) {
  const userInfo = route.params?.userInfo || {};
  const navigation = useNavigation();
  const [animals, setAnimals] = useState([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState(null);
  const [cinAcheteur, setCinAcheteur] = useState("");
  const [nomAcheteur, setNomAcheteur] = useState("");
  const [prenomAcheteur, setPrenomAcheteur] = useState("");
  const [telAcheteur, setTelAcheteur] = useState("");
  const [emailAcheteur, setEmailAcheteur] = useState("");
  const [loading, setLoading] = useState(false);

  // Animations
  const titleScale = useSharedValue(0);
  const userInfoOpacity = useSharedValue(0);
  const buyerFormOpacity = useSharedValue(0);
  const buyerFormTranslateY = useSharedValue(50);

  const isConnected =
    userInfo.nom && userInfo.prenom && userInfo.telephone && userInfo.cin;

  useEffect(() => {
    // Animation d'entrée
    titleScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    userInfoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchAnimals();
    }
  }, [isConnected]);

  useEffect(() => {
    if (route.params?.buyerInfo) {
      const { nom, prenom, cin, telephone, email } = route.params.buyerInfo;
      setNomAcheteur(nom || "");
      setPrenomAcheteur(prenom || "");
      setCinAcheteur(cin || "");
      setTelAcheteur(telephone || "");
      setEmailAcheteur(email || "");
      navigation.setParams({ buyerInfo: undefined });
    }
  }, [route.params?.buyerInfo]);

  useEffect(() => {
    const restoreSelectedAnimal = async () => {
      const savedAnimalId = await AsyncStorage.getItem("selectedAnimalId");
      if (savedAnimalId) {
        setSelectedAnimalId(Number(savedAnimalId));
        await AsyncStorage.removeItem("selectedAnimalId");
      }
    };
    restoreSelectedAnimal();
  }, []);

  useEffect(() => {
    // Animation du formulaire acheteur
    if (selectedAnimalId) {
      buyerFormOpacity.value = withTiming(1, { duration: 400 });
      buyerFormTranslateY.value = withSpring(0, {
        damping: 12,
        stiffness: 100,
      });
    } else {
      buyerFormOpacity.value = withTiming(0, { duration: 300 });
      buyerFormTranslateY.value = withTiming(50, { duration: 300 });
    }
  }, [selectedAnimalId]);

  const fetchAnimals = async () => {
    try {
      setAnimals(await animalsApi.listByCin(userInfo.cin));
    } catch {
      Alert.alert("Erreur", "Impossible de récupérer la liste des animaux");
    }
  };

  const handleTransfer = async () => {
    if (!selectedAnimalId)
      return Alert.alert("Erreur", "Veuillez sélectionner un animal.");
    if (!cinAcheteur || !nomAcheteur || !prenomAcheteur) {
      return Alert.alert(
        "Erreur",
        "Veuillez entrer un CIN valide et des informations complètes.",
      );
    }

    setLoading(true);

    try {
      const selectedAnimal = animals.find((a) => a.id === selectedAnimalId);
      await animalsApi.transfer(selectedAnimalId, userInfo.cin, cinAcheteur);

      // Le tag garde le même identifiant : on y met seulement le contact du nouveau propriétaire
      let written = false;
      if (selectedAnimal?.publicId) {
        written = await writeTagWithRetry(
          {
            publicId: selectedAnimal.publicId,
            nom: selectedAnimal.nom,
            telephone: telAcheteur,
          },
          {
            intro:
              "Vente enregistrée. Approchez le tag NFC de l'animal pour y mettre le contact du nouveau propriétaire.",
          },
        );
      }

      Alert.alert(
        written ? "Succès" : "Vente enregistrée",
        written
          ? "Le tag NFC a été mis à jour."
          : "Le tag n'a pas été mis à jour : le nouveau propriétaire pourra le reprogrammer depuis « Modifier un animal ».",
      );
      navigation.navigate("Home", { screen: "Animaux" });

      // Réinitialiser les champs
      setSelectedAnimalId(null);
      setCinAcheteur("");
      setNomAcheteur("");
      setPrenomAcheteur("");
      setTelAcheteur("");
      setEmailAcheteur("");
    } catch (error) {
      Alert.alert(
        "Erreur",
        error.response?.data?.message || "Échec du transfert",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate("Login", { redirectTo: "SellAnimal" });
  };

  const handleAnimalSelect = (animalId) => {
    setSelectedAnimalId(animalId);
  };

  // Styles animés
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
  }));

  const userInfoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: userInfoOpacity.value,
  }));

  const buyerFormAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buyerFormOpacity.value,
    transform: [{ translateY: buyerFormTranslateY.value }],
  }));

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={styles.loginPrompt}
          entering={FadeIn.duration(800)}
        >
          <Animated.View entering={BounceIn.delay(300)}>
            <Ionicons name="lock-closed" size={64} color="#8B5CF6" />
          </Animated.View>
          <Animated.Text
            style={styles.loginTitle}
            entering={SlideInDown.delay(500).springify()}
          >
            Reconnexion requise
          </Animated.Text>
          <Animated.Text
            style={styles.loginSubtitle}
            entering={SlideInDown.delay(700).springify()}
          >
            Vous devez vous reconnecter pour vendre un animal.
          </Animated.Text>
          <Animated.View
            style={styles.loginButton}
            entering={SlideInDown.delay(900).springify()}
          >
            <TouchableOpacity style={styles.purpleButton} onPress={handleLogin}>
              <Text style={styles.buttonText}>Se reconnecter</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  const renderAnimalItem = ({ item, index }) => (
    <AnimatedTouchableOpacity
      style={[
        styles.itemContainer,
        selectedAnimalId === item.id && styles.selectedItem,
      ]}
      onPress={() => handleAnimalSelect(item.id)}
      entering={SlideInRight.delay(index * 100).springify()}
      layout={Layout.springify()}
    >
      <Text style={styles.name}>{item.nom}</Text>
      <Text style={styles.info}>
        {item.race || item.espece} • {item.age} ans
      </Text>
      {selectedAnimalId === item.id && (
        <Animated.View style={styles.selectedIndicator} entering={BounceIn}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        </Animated.View>
      )}
    </AnimatedTouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.title, titleAnimatedStyle]}>
        Mes animaux à vendre
      </Animated.Text>

      <Animated.View style={[styles.userInfo, userInfoAnimatedStyle]}>
        <Text style={styles.userText}>
          Connecté en tant que: {userInfo.prenom} {userInfo.nom}
        </Text>
      </Animated.View>

      <FlatList
        data={animals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderAnimalItem}
        ListEmptyComponent={
          <Animated.View
            style={styles.emptyContainer}
            entering={FadeIn.delay(500)}
          >
            <Ionicons name="paw" size={64} color="#C8B3F0" />
            <Text style={styles.emptyText}>Aucun animal trouvé</Text>
          </Animated.View>
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {selectedAnimalId && (
        <Animated.View style={[styles.buyerForm, buyerFormAnimatedStyle]}>
          <Text style={styles.label}>Informations de l'acheteur :</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.readonlyInput}
              value={cinAcheteur}
              placeholder="CIN"
              editable={false}
              placeholderTextColor="#A78BFA"
            />
            <TextInput
              style={styles.readonlyInput}
              value={nomAcheteur}
              placeholder="Nom"
              editable={false}
              placeholderTextColor="#A78BFA"
            />
            <TextInput
              style={styles.readonlyInput}
              value={prenomAcheteur}
              placeholder="Prénom"
              editable={false}
              placeholderTextColor="#A78BFA"
            />
            <TextInput
              style={styles.readonlyInput}
              value={telAcheteur}
              placeholder="Téléphone"
              editable={false}
              placeholderTextColor="#A78BFA"
            />
            <TextInput
              style={styles.readonlyInput}
              value={emailAcheteur}
              placeholder="Email (optionnel)"
              editable={false}
              placeholderTextColor="#A78BFA"
            />
          </View>

          <TouchableOpacity
            style={styles.scanButton}
            onPress={async () => {
              await AsyncStorage.setItem(
                "selectedAnimalId",
                selectedAnimalId.toString(),
              );
              navigation.navigate("ScanBuyerCardScreen", { userInfo });
            }}
          >
            <Ionicons
              name="scan"
              size={20}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.buttonText}>Scanner carte acheteur</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!nomAcheteur || !prenomAcheteur || !cinAcheteur) &&
                styles.disabledButton,
            ]}
            onPress={handleTransfer}
            disabled={!nomAcheteur || !prenomAcheteur || !cinAcheteur}
          >
            <Text style={styles.buttonText}>Confirmer la vente</Text>
          </TouchableOpacity>

          {loading && (
            <Animated.View style={styles.loadingContainer} entering={FadeIn}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Traitement en cours...</Text>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    color: "#8B5CF6",
    textShadowColor: "rgba(139, 92, 246, 0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  userInfo: {
    backgroundColor: "#F3E8FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#8B5CF6",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userText: {
    fontSize: 16,
    color: "#6D28D9",
    fontWeight: "600",
  },
  label: {
    marginVertical: 12,
    fontWeight: "bold",
    fontSize: 18,
    color: "#7C3AED",
  },
  buyerForm: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 16,
  },
  readonlyInput: {
    borderWidth: 2,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#F8FAFC",
    color: "#6B7280",
    borderColor: "#E5E7EB",
    fontSize: 16,
  },
  itemContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#8B5CF6",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    position: "relative",
  },
  selectedItem: {
    borderLeftColor: "#10B981",
    backgroundColor: "#F0FDF4",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  selectedIndicator: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  info: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "500",
  },
  listContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 16,
  },
  loginPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 24,
    marginBottom: 12,
  },
  loginSubtitle: {
    fontSize: 18,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 26,
  },
  loginButton: {
    width: "100%",
    maxWidth: 200,
  },
  purpleButton: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButton: {
    backgroundColor: "#A855F7",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8B5CF6",
    fontWeight: "500",
  },
});
