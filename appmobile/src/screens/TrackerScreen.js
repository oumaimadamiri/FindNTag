import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { trackingApi } from "../api";

export default function TrackerScreen() {
  const { animalId, animalName } = useRoute().params;
  const [tracker, setTracker] = useState(null);
  const [deviceId, setDeviceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setTracker(await trackingApi.getTracker(animalId));
    } catch (e) {
      Alert.alert("Erreur", "Impossible de charger le traceur.");
    } finally {
      setLoading(false);
    }
  }, [animalId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const associate = async () => {
    const id = deviceId.trim();
    if (!id) {
      Alert.alert(
        "Identifiant requis",
        "Saisissez l'identifiant de votre traceur.",
      );
      return;
    }
    setSaving(true);
    try {
      await trackingApi.setTracker(animalId, id);
      setDeviceId("");
      await load();
      Alert.alert("Succès", "Traceur associé.");
    } catch (e) {
      Alert.alert(
        "Erreur",
        e.response?.data?.message || "Association impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const dissociate = () => {
    Alert.alert("Dissocier", "Ce traceur ne sera plus suivi pour cet animal.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Dissocier",
        style: "destructive",
        onPress: async () => {
          try {
            await trackingApi.removeTracker(animalId);
            setTracker(null);
          } catch (e) {
            Alert.alert("Erreur", "Impossible de dissocier le traceur.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{animalName ?? "Animal"}</Text>

      {tracker ? (
        <View style={styles.card}>
          <Text style={styles.label}>Traceur associé</Text>
          <Text style={styles.value}>{tracker.deviceId}</Text>
          <Text style={styles.hint}>
            {tracker.lastSeenAt
              ? `Dernier signal : ${new Date(tracker.lastSeenAt).toLocaleString()}`
              : "Aucun signal reçu pour l'instant"}
          </Text>
          <TouchableOpacity style={styles.dangerButton} onPress={dissociate}>
            <Text style={styles.dangerText}>Dissocier</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Identifiant du traceur</Text>
          <TextInput
            style={styles.input}
            value={deviceId}
            onChangeText={setDeviceId}
            placeholder="ex. a9g"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            C'est le nom utilisé dans le topic MQTT :
            gps_tracker/&lt;identifiant&gt;/location
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={associate}
            disabled={saving}
          >
            <Text style={styles.buttonText}>{saving ? "..." : "Associer"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FAFAFA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4C1D95",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    elevation: 2,
  },
  label: { fontSize: 13, color: "#6B7280", marginBottom: 6 },
  value: { fontSize: 20, fontWeight: "600", color: "#111827", marginBottom: 8 },
  hint: { fontSize: 12, color: "#9CA3AF", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 16,
    backgroundColor: "#8B5CF6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  dangerButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  dangerText: { color: "#EF4444", fontWeight: "600" },
});
