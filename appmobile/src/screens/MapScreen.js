import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from "react-native";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { animalsApi, gpsApi, trackingApi } from "../api";
import { UserContext } from "../context/UserContext";
import { leafletHtml } from "../map/leafletHtml";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  SlideInDown,
  BounceIn,
} from "react-native-reanimated";

const SELECTED_ANIMAL_KEY = "selectedAnimalId";

// Zone proposée dans l'éditeur quand l'animal n'en a pas encore
const defaultZone = [
  { latitude: 33.53867, longitude: -7.6593 }, // Sud-Ouest
  { latitude: 33.53867, longitude: -7.65879 }, // Sud-Est
  { latitude: 33.53917, longitude: -7.65879 }, // Nord-Est
  { latitude: 33.53917, longitude: -7.6593 }, // Nord-Ouest
];

const isInsideZone = (point, zone) => {
  if (zone.length < 3) return true; // Pas assez de points pour former une zone

  let x = point.latitude,
    y = point.longitude;
  let inside = false;
  for (let i = 0, j = zone.length - 1; i < zone.length; j = i++) {
    const xi = zone[i].latitude,
      yi = zone[i].longitude;
    const xj = zone[j].latitude,
      yj = zone[j].longitude;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

export default function MapScreen() {
  const navigation = useNavigation();
  const { userInfo } = useContext(UserContext);
  const webViewRef = useRef(null);
  const lastPayloadRef = useRef(null);
  const seqRef = useRef(0);
  const lastInsideRef = useRef(null);
  const recenterRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState([]);
  const [animalId, setAnimalId] = useState(null);
  const [gps, setGps] = useState(null);
  const [allowedZone, setAllowedZone] = useState([]);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zonePoints, setZonePoints] = useState([]);
  const [editingPoint, setEditingPoint] = useState(null);
  const [zoneAlerts, setZoneAlerts] = useState(true);
  const [tempLat, setTempLat] = useState("");
  const [tempLng, setTempLng] = useState("");

  // Animations
  const modalScale = useSharedValue(0);
  const fabRotation = useSharedValue(0);
  const fabOpacity = useSharedValue(1);

  // 1. Animaux de l'utilisateur (rechargés à chaque affichage de l'onglet)
  useFocusEffect(
    useCallback(() => {
      if (!userInfo?.cin) {
        setLoading(false);
        return undefined;
      }
      let active = true;
      (async () => {
        try {
          const list = await animalsApi.listByCin(userInfo.cin);
          const saved = Number(await AsyncStorage.getItem(SELECTED_ANIMAL_KEY));
          if (!active) return;
          setAnimals(list);
          setAnimalId((current) => {
            if (current && list.some((a) => a.id === current)) return current;
            return (list.find((a) => a.id === saved) ?? list[0])?.id ?? null;
          });
        } catch (e) {
          console.error("Erreur chargement animaux:", e.message);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [userInfo?.cin]),
  );

  // 2. Changement d'animal : on recharge sa zone depuis le serveur
  useEffect(() => {
    if (!animalId) return undefined;
    lastInsideRef.current = null;
    recenterRef.current = true;
    setGps(null);
    AsyncStorage.setItem(SELECTED_ANIMAL_KEY, String(animalId)).catch(() => {});
    let active = true;
    (async () => {
      try {
        const g = await trackingApi.getGeofence(animalId);
        if (!active) return;
        const pts = g.points ?? [];
        setAllowedZone(pts);
        setZonePoints(pts.length >= 3 ? pts : defaultZone);
        setZoneAlerts(pts.length >= 3 ? g.enabled : true);
      } catch (e) {
        console.error("Erreur chargement zone:", e.message);
        if (active) {
          setAllowedZone([]);
          setZonePoints(defaultZone);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [animalId]);

  // 3. Position + trajet, toutes les 10 secondes
  useEffect(() => {
    if (!animalId) return undefined;
    fetchGps();
    const interval = setInterval(fetchGps, 10000);
    return () => clearInterval(interval);
  }, [animalId, allowedZone, zoneAlerts]);

  const sendToMap = (payload) => {
    const message = JSON.stringify({ ...payload, seq: ++seqRef.current });
    lastPayloadRef.current = message;
    webViewRef.current?.postMessage(message);
  };

  // La carte peut finir de charger après le premier envoi : on renvoie le dernier état
  const handleMapLoaded = () => {
    if (lastPayloadRef.current) {
      webViewRef.current?.postMessage(lastPayloadRef.current);
    }
  };

  const saveZone = async (zone) => {
    try {
      const saved = await trackingApi.saveGeofence(animalId, {
        enabled: true,
        points: zone,
      });
      setAllowedZone(saved.points ?? zone);
      setZoneAlerts(true);
      lastInsideRef.current = null;
      Alert.alert("Succès", "Zone sauvegardée avec succès !");
    } catch (error) {
      console.error("Erreur sauvegarde zone:", error);
      Alert.alert(
        "Erreur",
        error.response?.data?.message || "Impossible de sauvegarder la zone.",
      );
    }
  };

  const toggleAlerts = async (value) => {
    setZoneAlerts(value);
    if (allowedZone.length >= 3) {
      try {
        await trackingApi.saveGeofence(animalId, {
          enabled: value,
          points: allowedZone,
        });
      } catch (e) {
        setZoneAlerts(!value);
        Alert.alert("Erreur", "Impossible de modifier les alertes.");
      }
    }
  };

  const fetchGps = async () => {
    if (!animalId) return;
    try {
      let location = null;
      try {
        const p = await gpsApi.getLocation(animalId);
        location = {
          latitude: parseFloat(p.latitude),
          longitude: parseFloat(p.longitude),
        };
      } catch (e) {
        if (e.response?.status !== 404) throw e; // 404 = pas encore de position
      }
      setGps(location);

      const trail = location
        ? await trackingApi.getPositions(animalId, 50)
        : [];
      const hasZone = allowedZone.length >= 3;
      const inside =
        location && hasZone ? isInsideZone(location, allowedZone) : true;

      // Alerte à l'écran quand l'animal vient de sortir (le serveur envoie le push)
      const wasInside = lastInsideRef.current;
      lastInsideRef.current = inside;
      if (location && zoneAlerts && hasZone && !inside && wasInside !== false) {
        Alert.alert(
          "Alerte Zone",
          "Votre animal est sorti de la zone autorisée !",
        );
      }

      const recenter = recenterRef.current && !!location;
      if (recenter) recenterRef.current = false;
      const animalName =
        animals.find((a) => a.id === animalId)?.nom ?? "Animal";

      sendToMap({
        center: location,
        zoom: 16,
        recenter,
        marker: location
          ? { position: location, popup: `${animalName} : dernière position` }
          : null,
        zone: hasZone
          ? { coordinates: allowedZone, color: inside ? "green" : "red" }
          : null,
        trail: trail.map((t) => ({
          latitude: t.latitude,
          longitude: t.longitude,
        })),
      });
    } catch (e) {
      console.error("Erreur GPS:", e.message);
    }
  };

  const openZoneEditor = () => {
    setShowZoneModal(true);
    modalScale.value = withSpring(1, {
      damping: 20,
      stiffness: 100,
      mass: 0.8,
    });
    fabRotation.value = withTiming(45, { duration: 300 });
    fabOpacity.value = withTiming(0, { duration: 300 });
  };

  const closeZoneEditor = () => {
    modalScale.value = withSpring(0, {
      damping: 20,
      stiffness: 100,
    });
    fabRotation.value = withTiming(0, { duration: 300 });
    fabOpacity.value = withTiming(1, { duration: 300 });
    setTimeout(() => {
      setShowZoneModal(false);
      setEditingPoint(null);
      setTempLat("");
      setTempLng("");
    }, 300);
  };

  const addPoint = () => {
    if (tempLat && tempLng) {
      const newPoint = {
        latitude: parseFloat(tempLat),
        longitude: parseFloat(tempLng),
      };
      setZonePoints([...zonePoints, newPoint]);
      setTempLat("");
      setTempLng("");
    } else {
      Alert.alert("Erreur", "Veuillez entrer des coordonnées valides.");
    }
  };

  const editPoint = (index) => {
    setEditingPoint(index);
    setTempLat(zonePoints[index].latitude.toString());
    setTempLng(zonePoints[index].longitude.toString());
  };

  const updatePoint = () => {
    if (tempLat && tempLng && editingPoint !== null) {
      const updatedPoints = [...zonePoints];
      updatedPoints[editingPoint] = {
        latitude: parseFloat(tempLat),
        longitude: parseFloat(tempLng),
      };
      setZonePoints(updatedPoints);
      setEditingPoint(null);
      setTempLat("");
      setTempLng("");
    }
  };

  const deletePoint = (index) => {
    if (zonePoints.length > 3) {
      const updatedPoints = zonePoints.filter((_, i) => i !== index);
      setZonePoints(updatedPoints);
      // Si on supprime le point en cours d'édition, on annule l'édition
      if (editingPoint === index) {
        setEditingPoint(null);
        setTempLat("");
        setTempLng("");
      }
      // Si on supprime un point avant celui en cours d'édition, on ajuste l'index
      else if (editingPoint !== null && index < editingPoint) {
        setEditingPoint(editingPoint - 1);
      }
    } else {
      Alert.alert("Erreur", "Une zone doit avoir au moins 3 points.");
    }
  };

  const resetToDefault = () => {
    Alert.alert(
      "Réinitialiser",
      "Voulez-vous vraiment réinitialiser la zone par défaut ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Réinitialiser",
          onPress: () => {
            setZonePoints(defaultZone);
            setEditingPoint(null);
            setTempLat("");
            setTempLng("");
            Alert.alert("Succès", "Zone réinitialisée.");
          },
        },
      ],
    );
  };

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
  }));

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${fabRotation.value}deg` }],
    opacity: fabOpacity.value,
  }));

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  if (!animalId) {
    return (
      <View style={styles.loading}>
        <Ionicons name="paw-outline" size={40} color="#9CA3AF" />
        <Text style={styles.loadingText}>
          Ajoutez un animal pour suivre sa position.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: leafletHtml }}
        originWhitelist={["*"]}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={handleMapLoaded}
      />

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 8 }}
        >
          {animals.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => setAnimalId(a.id)}
              style={[
                styles.animalChip,
                a.id === animalId && styles.animalChipActive,
              ]}
            >
              <Text
                style={[
                  styles.animalChipText,
                  a.id === animalId && styles.animalChipTextActive,
                ]}
              >
                {a.nom}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.animalChip}
            onPress={() =>
              navigation.navigate("Tracker", {
                animalId,
                animalName: animals.find((a) => a.id === animalId)?.nom,
              })
            }
          >
            <Ionicons name="hardware-chip-outline" size={14} color="#6B7280" />
            <Text style={styles.animalChipText}> Traceur</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.infoItem}>
          <Ionicons name="location" size={16} color="#007AFF" />
          <Text style={styles.infoText}>
            {gps
              ? `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`
              : "Position inconnue"}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons
            name={
              isInsideZone(gps || {}, allowedZone)
                ? "checkmark-circle"
                : "alert-circle"
            }
            size={16}
            color={isInsideZone(gps || {}, allowedZone) ? "#10B981" : "#EF4444"}
          />
          <Text
            style={[
              styles.infoText,
              {
                color: isInsideZone(gps || {}, allowedZone)
                  ? "#10B981"
                  : "#EF4444",
              },
            ]}
          >
            {isInsideZone(gps || {}, allowedZone)
              ? "Dans la zone"
              : "Hors zone"}
          </Text>
        </View>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={fetchGps} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.refreshText}>Rafraîchir</Text>
        </TouchableOpacity>

        <View style={styles.alertToggle}>
          <Text style={styles.alertText}>Alertes</Text>
          <Switch
            value={zoneAlerts}
            onValueChange={toggleAlerts}
            trackColor={{ false: "#D1D5DB", true: "#60A5FA" }}
            thumbColor={zoneAlerts ? "#007AFF" : "#9CA3AF"}
          />
        </View>
      </View>

      {/* FAB */}
      <AnimatedTouchableOpacity
        style={[styles.fab, fabAnimatedStyle]}
        onPress={openZoneEditor}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </AnimatedTouchableOpacity>

      {/* Zone Editor Modal */}
      <Modal
        visible={showZoneModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeZoneEditor}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configuration de la zone</Text>
              <TouchableOpacity
                onPress={closeZoneEditor}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Points existants */}
              <Text style={styles.sectionTitle}>
                Points de la zone ({zonePoints.length})
              </Text>
              <View style={styles.pointsScrollWrapper}>
                <ScrollView style={styles.pointsContainer}>
                  {zonePoints.map((point, index) => (
                    <View
                      key={index}
                      style={[
                        styles.pointCard,
                        editingPoint === index && styles.pointCardEditing,
                      ]}
                    >
                      <View style={styles.pointInfo}>
                        <Text style={styles.pointTitle}>Point {index + 1}</Text>
                        <Text style={styles.pointCoords}>
                          {point.latitude.toFixed(5)},{" "}
                          {point.longitude.toFixed(5)}
                        </Text>
                      </View>
                      <View style={styles.pointActions}>
                        <TouchableOpacity
                          onPress={() => editPoint(index)}
                          style={[
                            styles.editButton,
                            editingPoint === index && styles.editButtonActive,
                          ]}
                        >
                          <Ionicons
                            name="pencil"
                            size={16}
                            color={
                              editingPoint === index ? "#FFFFFF" : "#007AFF"
                            }
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => deletePoint(index)}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="trash" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Section d'ajout/modification avec séparateur visuel */}
              <View style={styles.editSection}>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>
                  {editingPoint !== null
                    ? `Modifier le point ${editingPoint + 1}`
                    : "Ajouter un point"}
                </Text>

                <View style={styles.inputContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Latitude</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: 33.53867"
                      value={tempLat}
                      onChangeText={setTempLat}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Longitude</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: -7.65930"
                      value={tempLng}
                      onChangeText={setTempLng}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.addButton]}
                    onPress={editingPoint !== null ? updatePoint : addPoint}
                  >
                    <Ionicons
                      name={editingPoint !== null ? "checkmark" : "add"}
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.addButtonText}>
                      {editingPoint !== null ? "Modifier" : "Ajouter"}
                    </Text>
                  </TouchableOpacity>

                  {editingPoint !== null && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => {
                        setEditingPoint(null);
                        setTempLat("");
                        setTempLng("");
                      }}
                    >
                      <Ionicons name="close" size={20} color="#6B7280" />
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Actions principales */}
              <View style={styles.mainActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.resetButton]}
                  onPress={resetToDefault}
                >
                  <Ionicons name="refresh" size={20} color="#6B7280" />
                  <Text style={styles.resetButtonText}>Réinitialiser</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={() => {
                    if (zonePoints.length >= 3) {
                      saveZone(zonePoints);
                      closeZoneEditor();
                    } else {
                      Alert.alert(
                        "Erreur",
                        "Une zone doit avoir au moins 3 points.",
                      );
                    }
                  }}
                >
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Sauvegarder</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  map: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  animalChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  animalChipActive: { backgroundColor: "#007AFF" },
  animalChipText: { fontSize: 13, color: "#4B5563", fontWeight: "500" },
  animalChipTextActive: { color: "#FFFFFF" },
  infoBar: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    color: "#374151",
    fontWeight: "500",
  },
  bottomBar: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopColor: "#E5E7EB",
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  refreshText: {
    color: "#007AFF",
    fontWeight: "600",
    marginLeft: 4,
  },
  alertToggle: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertText: {
    fontSize: 14,
    color: "#374151",
    marginRight: 8,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    width: "90%",
    maxHeight: "85%",
    minHeight: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
  },
  closeButton: {
    padding: 4,
    borderRadius: 6,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  pointsContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  pointCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  pointCardEditing: {
    backgroundColor: "#EFF6FF",
    borderLeftColor: "#1D4ED8",
  },
  pointInfo: {
    flex: 1,
  },
  pointTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  pointCoords: {
    fontSize: 12,
    color: "#6B7280",
  },
  pointActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
  },
  editButtonActive: {
    backgroundColor: "#007AFF",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
  },
  // Nouvelle section d'édition avec séparateur
  editSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#374151",
  },
  // Actions réorganisées
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  mainActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    minHeight: 48,
  },
  addButton: {
    backgroundColor: "#007AFF",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontWeight: "600",
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: "#F3F4F6",
  },
  resetButtonText: {
    color: "#6B7280",
    fontWeight: "600",
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: "#10B981",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  pointsScrollWrapper: {
    flexGrow: 1,
    marginBottom: 20,
  },

  pointsContainer: {
    flexGrow: 0,
  },
});
