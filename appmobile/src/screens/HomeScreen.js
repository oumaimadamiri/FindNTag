import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  Image,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { animalsApi, gpsApi } from "../api";
import Animated, {
  BounceInUp,
  FadeInDown,
  SlideInRight,
  ZoomIn,
  FlipInYLeft,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  interpolateColor,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

// Palette de couleurs harmonisée avec AnimalManagerScreen
const THEME_COLORS = {
  // Violets principaux (harmonisés avec AnimalManager)
  primary: "#8B5CF6", // Violet principal AnimalManager
  primaryLight: "#A78BFA", // Violet clair
  primaryDark: "#7C3AED", // Violet foncé
  secondary: "#F3E8FF", // Violet très clair AnimalManager

  // Blancs et gris
  white: "#FFFFFF", // Blanc pur
  brightWhite: "#FEFEFE", // Blanc éclatant
  lightGray: "#F8F8F8", // Gris très clair
  cardBackground: "#FDFDFD", // Fond de carte

  // Accents violets (harmonisés)
  accent1: "#F3E8FF", // Violet pastel AnimalManager
  accent2: "#E9D5FF", // Violet doux AnimalManager
  accent3: "#C7B5E3", // Violet moyen AnimalManager

  // Textes
  textPrimary: "#1F2937", // Texte principal AnimalManager
  textSecondary: "#6B7280", // Texte secondaire AnimalManager
  textLight: "#9E9E9E", // Texte clair
};
import * as Notifications from "expo-notifications";

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function setupNotifications() {
  if (Platform.OS !== "web") {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("Notifications permission denied");
    }
  }
}

export default function HomeScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const [userInfo, setUserInfo] = useState(route.params?.userInfo || null);
  const [profileImage, setProfileImage] = useState(null);
  const [stats, setStats] = useState({ animalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Animated shared values
  const headerScale = useSharedValue(0);
  const headerOpacity = useSharedValue(0);
  const floatingOffset = useSharedValue(0);
  const shimmerOffset = useSharedValue(0);
  const backgroundColorValue = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  // Animated styles
  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
    opacity: headerOpacity.value,
  }));

  const animatedFloatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatingOffset.value }],
  }));

  const animatedShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerOffset.value }],
  }));

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      backgroundColorValue.value,
      [0, 1, 2],
      [THEME_COLORS.white, THEME_COLORS.brightWhite, THEME_COLORS.accent1],
    );
    return { backgroundColor: bgColor };
  });

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  useEffect(() => {
    // Animate header
    headerScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    headerOpacity.value = withTiming(1, { duration: 700 });

    // Background color cycling animation
    backgroundColorValue.value = withRepeat(
      withTiming(2, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    // Floating animation for cards
    floatingOffset.value = withRepeat(
      withSequence(
        withTiming(-2, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(2, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    // Shimmer animation
    shimmerOffset.value = withRepeat(
      withTiming(width + 100, { duration: 2500 }),
      -1,
      false,
    );

    // Pulse animation
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  useEffect(() => {
    const loadUserInfo = async () => {
      if (!userInfo) {
        try {
          const stored = await AsyncStorage.getItem("userInfo");
          if (stored) setUserInfo(JSON.parse(stored));
          else {
            Alert.alert(
              "Erreur",
              "Utilisateur non trouvé. Veuillez vous reconnecter.",
            );
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          }
        } catch (e) {
          console.error("AsyncStorage error:", e);
        }
      }
    };
    loadUserInfo();
  }, []);

  // Nouveau useEffect pour charger la photo de profil
  useEffect(() => {
    const loadProfileImage = async () => {
      if (userInfo?.cin) {
        try {
          const savedImage = await AsyncStorage.getItem(
            `profileImage_${userInfo.cin}`,
          );
          if (savedImage) {
            setProfileImage(savedImage);
          }
        } catch (error) {
          console.error(
            "Erreur lors du chargement de la photo de profil:",
            error,
          );
        }
      }
    };
    loadProfileImage();
  }, [userInfo]);

  // Listener pour mettre à jour la photo de profil quand on revient du ProfileScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      if (userInfo?.cin) {
        try {
          const savedImage = await AsyncStorage.getItem(
            `profileImage_${userInfo.cin}`,
          );
          setProfileImage(savedImage);
        } catch (error) {
          console.error(
            "Erreur lors du rechargement de la photo de profil:",
            error,
          );
        }
      }
    });

    return unsubscribe;
  }, [navigation, userInfo]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userInfo?.cin) return;
      try {
        setStats({ animalCount: await animalsApi.countByCin(userInfo.cin) });
      } catch (error) {
        console.error("Erreur de stats:", error);
      } finally {
        setLoading(false);
      }
    };
    if (userInfo) fetchStats();
  }, [userInfo]);

  useEffect(() => {
    setupNotifications();

    if (!userInfo?.cin) return;

    const checkAnimalPosition = async () => {
      try {
        const savedZone = await AsyncStorage.getItem(ZONE_STORAGE_KEY);
        const allowedZone = savedZone ? JSON.parse(savedZone) : defaultZone;

        const res = { data: await gpsApi.getLocation(ANIMAL_ID) };
        const location = {
          latitude: parseFloat(res.data.latitude),
          longitude: parseFloat(res.data.longitude),
        };

        if (!isInsideZone(location, allowedZone)) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Alerte Zone",
              body: "Votre animal est hors de la zone autorisée",
              sound: true,
              data: { location },
            },
            trigger: null,
          });
        }
      } catch (error) {
        console.error("Erreur vérification position:", error);
      }
    };

    const interval = setInterval(checkAnimalPosition, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userInfo]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const quickActions = [
    {
      id: 1,
      title: "Ajouter un animal",
      subtitle: "Enregistrer un nouveau compagnon",
      icon: "add-circle",
      colorStart: THEME_COLORS.primary,
      colorEnd: THEME_COLORS.secondary,
      route: "AddAnimal",
    },
    {
      id: 2,
      title: "Mes animaux",
      subtitle: "Consulter votre liste",
      icon: "paw",
      colorStart: THEME_COLORS.primaryLight,
      colorEnd: THEME_COLORS.accent3,
      route: "AnimalList",
    },
  ];

  const ShimmerEffect = () => (
    <Animated.View
      style={[
        animatedShimmerStyle,
        {
          position: "absolute",
          top: 0,
          left: -80,
          width: 80,
          height: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          transform: [{ skewX: "-20deg" }],
          borderRadius: 12,
        },
      ]}
    />
  );

  const AnimatedStatCard = ({ children, index }) => (
    <Animated.View
      entering={BounceInUp.delay(index * 200).springify()}
      style={animatedFloatingStyle}
    >
      {children}
    </Animated.View>
  );

  const AnimatedActionCard = ({ children, index }) => (
    <Animated.View
      entering={SlideInRight.delay(index * 150).springify()}
      style={animatedFloatingStyle}
    >
      {children}
    </Animated.View>
  );

  // Composant pour le bouton de profil avec photo
  const ProfileButton = () => (
    <TouchableOpacity
      onPress={() => navigation.navigate("Mon Compte")}
      style={{
        backgroundColor: THEME_COLORS.accent1,
        padding: 4,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: THEME_COLORS.primary,
        shadowColor: THEME_COLORS.primary,
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}
      activeOpacity={0.8}
    >
      {profileImage ? (
        <Image
          source={{ uri: profileImage }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 2,
            borderColor: THEME_COLORS.white,
          }}
        />
      ) : (
        <LinearGradient
          colors={[THEME_COLORS.primary, THEME_COLORS.primaryLight]}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="person" size={24} color={THEME_COLORS.white} />
        </LinearGradient>
      )}
    </TouchableOpacity>
  );

  // Composant Calendrier avec thème violet harmonisé
  const CalendarModal = () => {
    const currentDate = new Date();
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    const monthNames = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ];

    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

    return (
      <Modal
        visible={showCalendar}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(139, 92, 246, 0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: THEME_COLORS.white,
              borderRadius: 24,
              padding: 24,
              margin: 20,
              width: width * 0.9,
              maxHeight: height * 0.7,
              shadowColor: THEME_COLORS.primary,
              shadowOpacity: 0.2,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 20,
              borderWidth: 1,
              borderColor: THEME_COLORS.accent1,
            }}
          >
            {/* Header du calendrier */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
                paddingHorizontal: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedDate(newDate);
                }}
                style={{
                  backgroundColor: THEME_COLORS.accent1,
                  padding: 12,
                  borderRadius: 12,
                }}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={THEME_COLORS.primary}
                />
              </TouchableOpacity>

              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: THEME_COLORS.textPrimary,
                  textAlign: "center",
                }}
              >
                {monthNames[currentMonth]} {currentYear}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedDate(newDate);
                }}
                style={{
                  backgroundColor: THEME_COLORS.accent1,
                  padding: 12,
                  borderRadius: 12,
                }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={THEME_COLORS.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Jours de la semaine */}
            <View
              style={{
                flexDirection: "row",
                marginBottom: 16,
                paddingHorizontal: 4,
              }}
            >
              {dayNames.map((day, index) => (
                <View key={index} style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: THEME_COLORS.primary,
                    }}
                  >
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Grille des dates */}
            <View style={{ paddingHorizontal: 4 }}>
              {Array.from({ length: 6 }, (_, weekIndex) => (
                <View
                  key={weekIndex}
                  style={{ flexDirection: "row", marginBottom: 4 }}
                >
                  {days
                    .slice(weekIndex * 7, (weekIndex + 1) * 7)
                    .map((date, dayIndex) => {
                      const isCurrentMonth = date.getMonth() === currentMonth;
                      const isToday =
                        date.toDateString() === currentDate.toDateString();

                      return (
                        <TouchableOpacity
                          key={dayIndex}
                          style={{
                            flex: 1,
                            aspectRatio: 1,
                            justifyContent: "center",
                            alignItems: "center",
                            margin: 2,
                            borderRadius: 12,
                            backgroundColor: isToday
                              ? THEME_COLORS.primary
                              : isCurrentMonth
                                ? THEME_COLORS.brightWhite
                                : "transparent",
                            borderWidth: isCurrentMonth && !isToday ? 1 : 0,
                            borderColor: THEME_COLORS.accent1,
                          }}
                          onPress={() => {
                            setSelectedDate(date);
                            setShowCalendar(false);
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: isToday ? "800" : "600",
                              color: isToday
                                ? THEME_COLORS.white
                                : isCurrentMonth
                                  ? THEME_COLORS.textPrimary
                                  : THEME_COLORS.textLight,
                            }}
                          >
                            {date.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ))}
            </View>

            {/* Bouton fermer */}
            <TouchableOpacity
              style={{
                marginTop: 24,
                backgroundColor: THEME_COLORS.primary,
                padding: 16,
                borderRadius: 16,
                alignItems: "center",
                shadowColor: THEME_COLORS.primary,
                shadowOpacity: 0.3,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
              onPress={() => setShowCalendar(false)}
            >
              <Text
                style={{
                  color: THEME_COLORS.white,
                  fontWeight: "800",
                  fontSize: 18,
                }}
              >
                Fermer
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Dashboard avec thème violet harmonisé
  const DashboardCompact = () => (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      {/* Animaux enregistrés */}
      <AnimatedStatCard index={0}>
        <Animated.View style={[animatedPulseStyle]}>
          <View
            style={{
              backgroundColor: THEME_COLORS.white,
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: THEME_COLORS.primary,
              shadowOpacity: 0.12,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 12,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: THEME_COLORS.accent1,
            }}
          >
            <ShimmerEffect />
            <LinearGradient
              colors={[THEME_COLORS.primary, THEME_COLORS.primaryLight]}
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
                shadowColor: THEME_COLORS.primary,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 12,
              }}
            >
              <Ionicons name="paw" size={28} color={THEME_COLORS.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Animated.Text
                entering={ZoomIn.delay(500)}
                style={{
                  fontSize: 28,
                  fontWeight: "900",
                  color: THEME_COLORS.textPrimary,
                  textShadowColor: "rgba(139, 92, 246, 0.1)",
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {loading ? "..." : stats.animalCount}
              </Animated.Text>
              <Text
                style={{
                  fontSize: 14,
                  color: THEME_COLORS.textSecondary,
                  fontWeight: "600",
                  marginTop: 4,
                }}
              >
                Animaux enregistrés
              </Text>
            </View>
            <View
              style={{
                backgroundColor: THEME_COLORS.accent1,
                padding: 10,
                borderRadius: 12,
              }}
            >
              <Ionicons
                name="trending-up"
                size={20}
                color={THEME_COLORS.primary}
              />
            </View>
          </View>
        </Animated.View>
      </AnimatedStatCard>

      {/* Date avec calendrier cliquable */}
      <AnimatedStatCard index={1}>
        <TouchableOpacity
          onPress={() => setShowCalendar(true)}
          activeOpacity={0.8}
        >
          <View
            style={{
              backgroundColor: THEME_COLORS.white,
              borderRadius: 20,
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: THEME_COLORS.primary,
              shadowOpacity: 0.12,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 12,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: THEME_COLORS.accent1,
            }}
          >
            <ShimmerEffect />
            <LinearGradient
              colors={[THEME_COLORS.primaryLight, THEME_COLORS.secondary]}
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
                shadowColor: THEME_COLORS.primaryLight,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 12,
              }}
            >
              <Ionicons name="calendar" size={28} color={THEME_COLORS.white} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Animated.Text
                entering={ZoomIn.delay(700)}
                style={{
                  fontSize: 24,
                  fontWeight: "900",
                  color: THEME_COLORS.textPrimary,
                  textShadowColor: "rgba(167, 139, 250, 0.1)",
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {selectedDate.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </Animated.Text>
              <Text
                style={{
                  fontSize: 14,
                  color: THEME_COLORS.textSecondary,
                  fontWeight: "600",
                  marginTop: 4,
                }}
              >
                Cliquez pour le calendrier
              </Text>
            </View>
            <View
              style={{
                backgroundColor: THEME_COLORS.accent1,
                padding: 10,
                borderRadius: 12,
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={THEME_COLORS.primary}
              />
            </View>
          </View>
        </TouchableOpacity>
      </AnimatedStatCard>
    </View>
  );

  return (
    <Animated.View style={[animatedBackgroundStyle, { flex: 1 }]}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {/* Header avec thème violet harmonisé et bouton de profil avec photo */}
          <Animated.View
            style={[
              animatedHeaderStyle,
              {
                paddingHorizontal: 20,
                paddingVertical: 24,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottomLeftRadius: 28,
                borderBottomRightRadius: 28,
                shadowColor: THEME_COLORS.primary,
                shadowOpacity: 0.18,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 16,
              },
            ]}
          >
            <LinearGradient
              colors={[
                THEME_COLORS.white,
                THEME_COLORS.brightWhite,
                THEME_COLORS.accent1,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderBottomLeftRadius: 28,
                borderBottomRightRadius: 28,
              }}
            />

            <View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: THEME_COLORS.textSecondary,
                  letterSpacing: 0.5,
                }}
              >
                {getTimeGreeting()}
              </Text>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "900",
                  color: THEME_COLORS.textPrimary,
                  marginTop: 4,
                  textShadowColor: "rgba(139, 92, 246, 0.1)",
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {userInfo?.prenom || "Utilisateur"} !
              </Text>
            </View>

            {/* Bouton de profil avec photo */}
            <ProfileButton />
          </Animated.View>

          {/* Dashboard */}
          <DashboardCompact />

          {/* Quick Actions avec thème violet harmonisé */}
          <View
            style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 40 }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "900",
                color: THEME_COLORS.textPrimary,
                marginBottom: 20,
                textShadowColor: "rgba(139, 92, 246, 0.1)",
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 3,
              }}
            >
              Accès rapide
            </Text>

            {quickActions.map((action, i) => (
              <AnimatedActionCard key={action.id} index={i}>
                <TouchableOpacity
                  onPress={() => navigation.navigate(action.route)}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: THEME_COLORS.white,
                    borderRadius: 24,
                    padding: 20,
                    marginBottom: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: THEME_COLORS.primary,
                    shadowOpacity: 0.12,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 16,
                    borderWidth: 1,
                    borderColor: THEME_COLORS.accent1,
                  }}
                >
                  <ShimmerEffect />
                  <LinearGradient
                    colors={[action.colorStart, action.colorEnd]}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 20,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 20,
                      shadowColor: action.colorStart,
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 12,
                    }}
                  >
                    <Ionicons
                      name={action.icon}
                      size={32}
                      color={THEME_COLORS.white}
                    />
                  </LinearGradient>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "800",
                        color: THEME_COLORS.textPrimary,
                      }}
                    >
                      {action.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: THEME_COLORS.textSecondary,
                        marginTop: 4,
                        fontWeight: "600",
                      }}
                    >
                      {action.subtitle}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: THEME_COLORS.accent1,
                      padding: 12,
                      borderRadius: 16,
                    }}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={THEME_COLORS.primary}
                    />
                  </View>
                </TouchableOpacity>
              </AnimatedActionCard>
            ))}
          </View>
        </ScrollView>

        {/* Modal du calendrier */}
        <CalendarModal />
      </SafeAreaView>
    </Animated.View>
  );
}
