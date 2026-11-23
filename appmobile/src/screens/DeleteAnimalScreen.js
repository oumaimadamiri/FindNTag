import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isNfcSupported, eraseTag } from "../nfc/animalTag";
import { animalsApi } from "../api";
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

export default function DeleteAnimalScreen({ navigation, route }) {
  const userInfo = route.params?.userInfo || {};
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(
    userInfo.nom && userInfo.prenom && userInfo.telephone && userInfo.cin,
  );

  // Animations
  const titleScale = useSharedValue(0);
  const userInfoOpacity = useSharedValue(0);
  const warningOpacity = useSharedValue(0);

  useEffect(() => {
    // Animation d'entrée
    titleScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    userInfoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    warningOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchAnimals();
    }
    checkNfcSupport();
  }, [isConnected]);

  const checkNfcSupport = async () => {
    if (!(await isNfcSupported())) {
      Alert.alert(
        "NFC non supporté",
        "Ce téléphone ne supporte pas la technologie NFC.",
      );
    }
  };

  const fetchAnimals = async () => {
    try {
      console.log(
        "Tentative de récupération des animaux pour CIN:",
        userInfo.cin,
      );
      setAnimals(await animalsApi.listByCin(userInfo.cin));
    } catch (err) {
      console.error("Erreur lors du chargement des animaux :", err);
      if (err.response) {
        console.error("Statut d'erreur:", err.response.status);
        console.error("Données d'erreur:", err.response.data);
      }
      Alert.alert("Erreur", "Impossible de charger la liste des animaux.");
    }
  };

  const deleteAnimalFromAPI = async (animalId) => {
    await animalsApi.remove(animalId);
    return true;
  };

  // Efface le tag : il ne contient plus aucun animal
  const eraseNfcTag = async () => {
    try {
      await eraseTag();
      return true;
    } catch (error) {
      console.error("Erreur effacement NFC :", error);
      Alert.alert("Erreur", "Impossible d'effacer le tag NFC.");
      return false;
    }
  };

  const handleDelete = async (animalId, animalName) => {
    setLoading(true);

    try {
      // 1. Supprimer de la base de données
      await deleteAnimalFromAPI(animalId);

      // 2. Mettre à jour la liste locale
      setAnimals((prev) => prev.filter((a) => a.id !== animalId));

      // 3. Demander d'approcher le tag NFC pour l'effacer
      Alert.alert(
        "Suppression réussie",
        `${animalName} a été supprimé de la base de données.\n\nApprochez maintenant le tag NFC pour l'effacer.`,
        [
          {
            text: "Effacer le tag NFC",
            onPress: async () => {
              const erased = await eraseNfcTag();

              if (erased) {
                Alert.alert(
                  "Succès complet",
                  "L'animal a été supprimé et le tag NFC effacé avec succès.",
                  [
                    {
                      text: "OK",
                      onPress: () =>
                        navigation.navigate("Home", { screen: "Animaux" }),
                    },
                  ],
                );
              } else {
                Alert.alert(
                  "Attention",
                  "L'animal a été supprimé de la base mais le tag NFC n'a pas pu être effacé. Veuillez réessayer manuellement.",
                  [
                    {
                      text: "OK",
                      onPress: () =>
                        navigation.navigate("Home", { screen: "Animaux" }),
                    },
                  ],
                );
              }
            },
          },
          {
            text: "Ignorer le tag",
            style: "cancel",
            onPress: () => navigation.navigate("Home", { screen: "Animaux" }),
          },
        ],
      );
    } catch (err) {
      console.error("Erreur lors de la suppression :", err);
      Alert.alert("Erreur", "La suppression a échoué. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (animalId, animalName) => {
    Alert.alert(
      "Confirmer la suppression",
      `Êtes-vous sûr de vouloir supprimer définitivement ${animalName} ?\n\nCette action est irréversible.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer définitivement",
          onPress: () => handleDelete(animalId, animalName),
          style: "destructive",
        },
      ],
    );
  };

  const handleLogin = () => {
    navigation.navigate("Login", { redirectTo: "DeleteAnimal" });
  };

  // Styles animés
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
  }));

  const userInfoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: userInfoOpacity.value,
  }));

  const warningAnimatedStyle = useAnimatedStyle(() => ({
    opacity: warningOpacity.value,
  }));

  // Si l'utilisateur n'est pas connecté
  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={styles.loginPrompt}
          entering={FadeIn.duration(800)}
        >
          <Animated.View entering={BounceIn.delay(300)}>
            <Ionicons name="lock-closed" size={64} color="#DC2626" />
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
            Vous devez vous reconnecter pour supprimer vos animaux.
          </Animated.Text>
          <Animated.View
            style={styles.loginButton}
            entering={SlideInDown.delay(900).springify()}
          >
            <TouchableOpacity style={styles.redButton} onPress={handleLogin}>
              <Text style={styles.buttonText}>Se reconnecter</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  const renderItem = ({ item, index }) => (
    <AnimatedTouchableOpacity
      style={styles.itemContainer}
      entering={SlideInRight.delay(index * 100).springify()}
      layout={Layout.springify()}
    >
      <View style={styles.itemContent}>
        <Text style={styles.name}>{item.nom}</Text>
        <Text style={styles.info}>
          {item.race || item.espece} • {item.age} ans
        </Text>
        {item.nomProprio && (
          <Text style={styles.owner}>
            Propriétaire: {item.prenomProprio} {item.nomProprio}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => confirmDelete(item.id, item.nom)}
        style={styles.deleteButton}
      >
        <Ionicons name="trash" size={24} color="#DC2626" />
      </TouchableOpacity>
    </AnimatedTouchableOpacity>
  );

  const renderEmptyList = () => (
    <Animated.View style={styles.emptyContainer} entering={FadeIn.delay(500)}>
      <Ionicons name="paw" size={64} color="#F87171" />
      <Text style={styles.emptyText}>Aucun animal trouvé</Text>
      <Text style={styles.emptySubtext}>
        Vous n'avez pas encore d'animaux enregistrés à supprimer.
      </Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.title, titleAnimatedStyle]}>
        Mes animaux à supprimer
      </Animated.Text>

      <Animated.View style={[styles.userInfo, userInfoAnimatedStyle]}>
        <Text style={styles.userText}>
          Connecté en tant que: {userInfo.prenom} {userInfo.nom}
        </Text>
      </Animated.View>

      <FlatList
        data={animals}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {animals.length > 0 && (
        <Animated.View style={[styles.warningFooter, warningAnimatedStyle]}>
          <Ionicons name="warning" size={20} color="#F59E0B" />
          <Text style={styles.warningText}>
            La suppression est définitive et irréversible
          </Text>
        </Animated.View>
      )}

      {loading && (
        <Animated.View style={styles.loadingContainer} entering={FadeIn}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Suppression en cours...</Text>
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
    color: "#DC2626",
    textShadowColor: "rgba(220, 38, 38, 0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  userInfo: {
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userText: {
    fontSize: 16,
    color: "#991B1B",
    fontWeight: "600",
  },
  listContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  itemContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 12,
    borderRadius: 16,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  itemContent: {
    flex: 1,
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
    marginBottom: 2,
  },
  owner: {
    color: "#9CA3AF",
    fontSize: 14,
    fontStyle: "italic",
  },
  deleteButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: "#FECACA",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#D1D5DB",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 24,
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
  redButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  warningFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFBEB",
    padding: 16,
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FED7AA",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningText: {
    fontSize: 14,
    color: "#92400E",
    marginLeft: 8,
    fontWeight: "600",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "500",
  },
});
