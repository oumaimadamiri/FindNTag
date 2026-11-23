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
import NfcManager, { Ndef, NfcTech } from "react-native-nfc-manager";
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
    const supported = await NfcManager.isSupported();
    if (supported) {
      await NfcManager.start();
    } else {
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

  // Fonction d'écriture identique à AddAnimal
  const writeToNfcTag = async (text) => {
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag(); // Lire le tag
      const tagId = tag?.id || null;
      const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);
      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        return tagId;
      }
      return null;
    } catch (error) {
      console.error("Erreur écriture NFC :", error);
      Alert.alert("Erreur", "Impossible d'écrire sur le tag NFC.");
      return null;
    } finally {
      await NfcManager.cancelTechnologyRequest();
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
              const tagId = await writeToNfcTag("Tag vide");

              if (tagId) {
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
// import React, { useEffect, useState } from 'react';
// import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Button } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';
// import axios from 'axios';

// export default function DeleteAnimalScreen({ navigation, route }) {
//   const userInfo = route.params?.userInfo || {};
//   const [animals, setAnimals] = useState([]);
//   const [isConnected, setIsConnected] = useState(
//     userInfo.nom && userInfo.prenom && userInfo.telephone && userInfo.cin
//   );

//   useEffect(() => {
//     if (isConnected) {
//       fetchAnimals();
//     }
//     checkNfcSupport();
//   }, [isConnected]);

//   const checkNfcSupport = async () => {
//     const supported = await NfcManager.isSupported();
//     if (supported) {
//       await NfcManager.start();
//     } else {
//       Alert.alert("NFC non supporté", "Ce téléphone ne supporte pas la technologie NFC.");
//     }
//   };

//   const fetchAnimals = async () => {
//     try {
//       console.log('Tentative de récupération des animaux pour CIN:', userInfo.cin);
//       const response = await axios.get(`http://192.168.127.233:8081/api/animals/user/${userInfo.cin}`);
//       console.log('Réponse reçue:', response.data);
//       setAnimals(response.data);
//     } catch (err) {
//       console.error('Erreur lors du chargement des animaux :', err);
//       if (err.response) {
//         console.error('Statut d\'erreur:', err.response.status);
//         console.error('Données d\'erreur:', err.response.data);
//       }
//       Alert.alert('Erreur', 'Impossible de charger la liste des animaux.');
//     }
//   };

//   const deleteAnimalFromAPI = async (animalId) => {
//     try {
//       const response = await fetch(`http://192.168.127.233:8081/api/animals/${animalId}`, {
//         method: 'DELETE',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       });

//       if (!response.ok) {
//         throw new Error(`Erreur HTTP: ${response.status}`);
//       }

//       return true;
//     } catch (error) {
//       console.error('Erreur lors de la suppression :', error);
//       throw error;
//     }
//   };

//   // Fonction d'écriture identique à AddAnimal
//   const writeToNfcTag = async (text) => {
//     try {
//       await NfcManager.requestTechnology(NfcTech.Ndef);
//       const tag = await NfcManager.getTag(); // Lire le tag
//       const tagId = tag?.id || null;
//       const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);
//       if (bytes) {
//         await NfcManager.ndefHandler.writeNdefMessage(bytes);
//         return tagId;
//       }
//       return null;
//     } catch (error) {
//       console.error('Erreur écriture NFC :', error);
//       Alert.alert('Erreur', "Impossible d'écrire sur le tag NFC.");
//       return null;
//     } finally {
//       await NfcManager.cancelTechnologyRequest();
//     }
//   };

//   const handleDelete = async (animalId, animalName) => {
//     try {
//       // 1. Supprimer de la base de données
//       await deleteAnimalFromAPI(animalId);

//       // 2. Mettre à jour la liste locale
//       setAnimals((prev) => prev.filter((a) => a.id !== animalId));

//       // 3. Demander d'approcher le tag NFC pour l'effacer
//       Alert.alert(
//         'Suppression réussie',
//         `${animalName} a été supprimé de la base de données.\n\nApprochez maintenant le tag NFC pour l'effacer.`,
//         [
//           {
//             text: 'Effacer le tag NFC',
//             onPress: async () => {
//               const tagId = await writeToNfcTag('Tag vide');

//               if (tagId) {
//                 Alert.alert('Succès complet', 'L\'animal a été supprimé et le tag NFC effacé avec succès.');
//               } else {
//                 Alert.alert(
//                   'Attention',
//                   'L\'animal a été supprimé de la base mais le tag NFC n\'a pas pu être effacé. Veuillez réessayer manuellement.',
//                   [{ text: 'OK', onPress: () => navigation.navigate('DeleteAnimal') }]
//                 );
//               }
//             }
//           },
//           {
//             text: 'Ignorer le tag',
//             style: 'cancel',
//             onPress: () => navigation.navigate('DeleteAnimal'),
//           }
//         ]
//       );

//     } catch (err) {
//       console.error('Erreur lors de la suppression :', err);
//       Alert.alert('Erreur', "La suppression a échoué. Veuillez réessayer.");
//     }
//   };

//   const confirmDelete = (animalId, animalName) => {
//     Alert.alert(
//       'Confirmer la suppression',
//       `Êtes-vous sûr de vouloir supprimer définitivement ${animalName} ?\n\nCette action est irréversible.`,
//       [
//         { text: 'Annuler', style: 'cancel' },
//         {
//           text: 'Supprimer définitivement',
//           onPress: () => handleDelete(animalId, animalName),
//           style: 'destructive'
//         },
//       ]
//     );
//   };

//   const handleLogin = () => {
//     navigation.navigate('Login', { redirectTo: 'DeleteAnimal' });
//   };

//   const renderItem = ({ item }) => (
//     <View style={styles.itemContainer}>
//       <View style={{ flex: 1 }}>
//         <Text style={styles.name}>{item.nom}</Text>
//         <Text style={styles.info}>
//           {item.race || item.espece} • {item.age} ans
//         </Text>
//         {item.nomProprio && (
//           <Text style={styles.owner}>
//             Propriétaire: {item.prenomProprio} {item.nomProprio}
//           </Text>
//         )}
//       </View>
//       <TouchableOpacity
//         onPress={() => confirmDelete(item.id, item.nom)}
//         style={styles.deleteButton}
//       >
//         <Ionicons name="trash" size={24} color="#dc3545" />
//       </TouchableOpacity>
//     </View>
//   );

//   const renderEmptyList = () => (
//     <View style={styles.emptyContainer}>
//       <Ionicons name="paw" size={64} color="#ccc" />
//       <Text style={styles.emptyText}>Aucun animal trouvé</Text>
//       <Text style={styles.emptySubtext}>
//         Vous n'avez pas encore d'animaux enregistrés à supprimer.
//       </Text>
//     </View>
//   );

//   // Si l'utilisateur n'est pas connecté
//   if (!isConnected) {
//     return (
//       <View style={styles.container}>
//         <View style={styles.loginPrompt}>
//           <Ionicons name="lock-closed" size={64} color="#007bff" />
//           <Text style={styles.loginTitle}>Connexion requise</Text>
//           <Text style={styles.loginSubtitle}>
//             Vous devez vous reconnecter pour supprimer vos animaux.
//           </Text>
//           <View style={styles.loginButton}>
//             <Button
//               title="Se reconnecter"
//               onPress={handleLogin}
//               color="#007bff"
//             />
//           </View>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Mes animaux à supprimer</Text>

//       {/* Informations utilisateur */}
//       <View style={styles.userInfo}>
//         <Text style={styles.userText}>
//           Connecté en tant que: {userInfo.prenom} {userInfo.nom}
//         </Text>
//       </View>

//       <FlatList
//         data={animals}
//         keyExtractor={(item) => item.id.toString()}
//         renderItem={renderItem}
//         ListEmptyComponent={renderEmptyList}
//         contentContainerStyle={styles.listContainer}
//         showsVerticalScrollIndicator={false}
//       />

//       {animals.length > 0 && (
//         <View style={styles.warningFooter}>
//           <Ionicons name="warning" size={20} color="#ffc107" />
//           <Text style={styles.warningText}>
//             La suppression est définitive et irréversible
//           </Text>
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f8f9fa'
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginVertical: 20,
//     textAlign: 'center',
//     color: '#dc3545'
//   },
//   userInfo: {
//     backgroundColor: '#e7f3ff',
//     padding: 12,
//     marginHorizontal: 16,
//     borderRadius: 8,
//     marginBottom: 10,
//     borderLeftWidth: 4,
//     borderLeftColor: '#007bff'
//   },
//   userText: {
//     fontSize: 14,
//     color: '#0056b3',
//     fontWeight: '500'
//   },
//   listContainer: {
//     padding: 16,
//     flexGrow: 1
//   },
//   itemContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#fff',
//     padding: 16,
//     marginBottom: 12,
//     borderRadius: 12,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 4,
//     elevation: 3,
//     borderLeftWidth: 4,
//     borderLeftColor: '#dc3545'
//   },
//   name: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#343a40',
//     marginBottom: 4
//   },
//   info: {
//     color: '#6c757d',
//     fontSize: 14,
//     marginBottom: 2
//   },
//   owner: {
//     color: '#495057',
//     fontSize: 12,
//     fontStyle: 'italic'
//   },
//   deleteButton: {
//     padding: 8,
//     borderRadius: 8,
//     backgroundColor: '#fff5f5',
//     borderWidth: 1,
//     borderColor: '#fecaca'
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingTop: 100
//   },
//   emptyText: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#6c757d',
//     marginTop: 16,
//     marginBottom: 8
//   },
//   emptySubtext: {
//     fontSize: 14,
//     color: '#adb5bd',
//     textAlign: 'center',
//     paddingHorizontal: 32
//   },
//   loginPrompt: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 32
//   },
//   loginTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#343a40',
//     marginTop: 20,
//     marginBottom: 12
//   },
//   loginSubtitle: {
//     fontSize: 16,
//     color: '#6c757d',
//     textAlign: 'center',
//     marginBottom: 32,
//     lineHeight: 24
//   },
//   loginButton: {
//     width: '100%',
//     maxWidth: 200
//   },
//   warningFooter: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#fff3cd',
//     padding: 12,
//     marginHorizontal: 16,
//     marginBottom: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#ffeaa7'
//   },
//   warningText: {
//     fontSize: 12,
//     color: '#856404',
//     marginLeft: 8,
//     fontWeight: '500'
//   }
// });
// import React, { useEffect, useState } from 'react';
// import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
// import apiService from '../../services/apiService';
// import { Ionicons } from '@expo/vector-icons';
// import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Animated, {
//   FadeIn,
//   SlideInDown,
//   BounceIn,
// } from 'react-native-reanimated';

// export default function DeleteAnimalScreen({ navigation, route }) {
//   const userInfo = route.params?.userInfo || {};
//   // const [isConnected, setIsConnected] = useState(false);
//   const [selectedAnimalId, setSelectedAnimalId] = useState(null);
//   const [animals, setAnimals] = useState([]);

//   // useEffect(() => {
//   //   const initialize = async () => {
//   //     if (!userInfo) {
//   //       try {
//   //         const stored = await AsyncStorage.getItem('userInfo');
//   //         if (stored) {
//   //           const parsed = JSON.parse(stored);
//   //           setUserInfo(parsed);
//   //           setIsConnected(
//   //             parsed?.nom && parsed?.prenom && parsed?.telephone && parsed?.cin
//   //           );
//   //         }
//   //       } catch (error) {
//   //         console.error('Erreur récupération userInfo:', error);
//   //       }
//   //     } else {
//   //       setIsConnected(
//   //         userInfo?.nom && userInfo?.prenom && userInfo?.telephone && userInfo?.cin
//   //       );
//   //     }
//   //   };

//   //   initialize();
//   //   fetchAnimals();
//   //   checkNfcSupport();
//   // }, [userInfo]);
//   const isConnected = userInfo.nom && userInfo.prenom && userInfo.telephone && userInfo.cin;

//   useEffect(() => {
//     if (isConnected) {
//       fetchAnimals();
//     }
//   }, [isConnected]);
//   useEffect(() => {
//     const restoreSelectedAnimal = async () => {
//       const savedAnimalId = await AsyncStorage.getItem('selectedAnimalId');
//       if (savedAnimalId) {
//         setSelectedAnimalId(Number(savedAnimalId));
//         await AsyncStorage.removeItem('selectedAnimalId');
//       }
//     };
//     restoreSelectedAnimal();
//   }, []);

//   const checkNfcSupport = async () => {
//     const supported = await NfcManager.isSupported();
//     if (supported) {
//       await NfcManager.start();
//     } else {
//       Alert.alert("NFC non supporté", "Ce téléphone ne supporte pas la technologie NFC.");
//     }
//   };

//   const handleLogin = () => {
//     navigation.navigate('Login', { redirectTo: 'DeleteAnimal' });
//   };

//   const fetchAnimals = async () => {
//     try {
//       const allAnimals = await apiService.animal.getAllAnimals();
//       const userAnimals = allAnimals.filter(animal => animal.ownerId === userInfo?.id);
//       setAnimals(userAnimals);
//     } catch (err) {
//       console.error('Erreur lors du chargement des animaux :', err);
//     }
//   };
//   // const fetchAnimals = async () => {
//   //   try {
//   //     const res = await axios.get(`http://192.168.127.233:8081/api/animals/user/${userInfo.cin}`);
//   //     setAnimals(res.data);
//   //   } catch {
//   //     Alert.alert("Erreur", "Impossible de récupérer la liste des animaux");
//   //   }
//   // };

//   const writeToNfcTag = async (text) => {
//     try {
//       await NfcManager.requestTechnology(NfcTech.Ndef);
//       const tag = await NfcManager.getTag();
//       const tagId = tag?.id || null;
//       const bytes = Ndef.encodeMessage([Ndef.textRecord(text)]);
//       if (bytes) {
//         await NfcManager.ndefHandler.writeNdefMessage(bytes);
//         Alert.alert('Succès', `Les données ont été écrites sur le tag.`);
//         return tagId;
//       }
//       return null;
//     } catch (error) {
//       console.error('Erreur écriture NFC :', error);
//       Alert.alert('Erreur', "Impossible d'écrire sur le tag NFC.");
//     } finally {
//       await NfcManager.cancelTechnologyRequest();
//     }
//   };

//   const handleDelete = async () => {
//     try {
//       if (!selectedAnimalId) return Alert.alert('Erreur', 'Veuillez sélectionner un animal.');
//       setLoading(true);
//       await apiService.animal.deleteAnimal(selectedAnimalId);
//       setAnimals((prev) => prev.filter((a) => a.id !== selectedAnimalId));
//       Alert.alert('Suppression', "L'animal a été supprimé de la base.", [
//         {
//           text: 'OK',
//           onPress: () => {
//             Alert.alert('Approchez le tag NFC', "Approche le tag afin d'effacer les données.");
//           }
//         }
//       ]);
//       const tagId = await writeToNfcTag("tagvide");
//       if (tagId) {
//         Alert.alert('Succès', 'Les données dans le tag sont supprimées avec succès');
//       } else {
//         Alert.alert('Erreur', "Impossible d'écrire sur le tag NFC.");
//       }
//     } catch (err) {
//       console.error('Erreur lors de la suppression :', err);
//       Alert.alert('Erreur', "La suppression a échoué.");
//     }
//   };

//   const confirmDelete = (animalId) => {
//     Alert.alert(
//       'Confirmer la suppression',
//       'Es-tu sûr de vouloir supprimer cet animal ?',
//       [
//         { text: 'Annuler', style: 'cancel' },
//         { text: 'Supprimer', onPress: () => handleDelete(animalId), style: 'destructive' },
//       ]
//     );
//   };

//   const renderItem = ({ item }) => (
//     <View className="flex-row bg-white px-6 py-4 mb-4 rounded-2xl items-center shadow-lg border border-purple-100">
//       <View className="flex-1">
//         <Text className="text-xl font-bold text-purple-800">{item.nom}</Text>
//         <Text className="text-base text-purple-600 mt-1">{item.espece} • {item.age} ans</Text>
//       </View>
//       <TouchableOpacity
//         onPress={() => confirmDelete(item.id)}
//         className="bg-purple-100 p-3 rounded-full"
//       >
//         <Ionicons name="trash" size={24} color="#7c3aed" />
//       </TouchableOpacity>
//     </View>
//   );

//   if (!isConnected) {
//     return (
//       <View className="flex-1 justify-center items-center bg-purple-50 px-6">
//         <Ionicons name="lock-closed" size={64} color="#7c3aed" />
//         <Text className="text-2xl font-bold text-center text-purple-800 mt-6 mb-2">
//           Connexion requise
//         </Text>
//         <Text className="text-base text-purple-600 text-center mb-4">
//           Vous devez vous reconnecter pour supprimer vos animaux.
//         </Text>
//         <TouchableOpacity
//           onPress={handleLogin}
//           className="bg-purple-600 px-6 py-3 rounded-xl"
//         >
//           <Text className="text-white font-semibold text-base">Se reconnecter</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <View className="flex-1 bg-purple-50 p-4">
//       <FlatList
//         data={animals}
//         renderItem={renderItem}
//         keyExtractor={(item) => item.id.toString()}
//         ListEmptyComponent={
//           <Text className="text-center text-purple-800 mt-10">
//             Aucun animal enregistré.
//           </Text>
//         }
//       />
//     </View>
//   );
// }
