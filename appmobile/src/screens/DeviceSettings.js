import React, { useState, useEffect } from 'react';
import { View, Text, Switch, Alert, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const DeviceSettings = ({ navigation }) => {
  const [notifications, setNotifications] = useState(false);
  const [gps, setGps] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [dataUsage, setDataUsage] = useState('wifi'); // wifi, mobile, both
  const [loading, setLoading] = useState(true);
  const scaleValue = new Animated.Value(0.9);

  useEffect(() => {
    checkPermissions();
    loadSettings();
    
    // Animation d'entrée
    Animated.spring(scaleValue, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      checkPermissions();
    }, [])
  );

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setDarkMode(settings.darkMode || false);
        setBiometric(settings.biometric || false);
        setAutoSync(settings.autoSync !== false);
        setSoundEnabled(settings.soundEnabled !== false);
        setVibrationEnabled(settings.vibrationEnabled !== false);
        setDataUsage(settings.dataUsage || 'wifi');
      }
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      const currentSettings = {
        darkMode,
        biometric,
        autoSync,
        soundEnabled,
        vibrationEnabled,
        dataUsage,
        ...newSettings
      };
      await AsyncStorage.setItem('appSettings', JSON.stringify(currentSettings));
    } catch (error) {
      console.error('Erreur sauvegarde paramètres:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      const notificationStatus = await Notifications.getPermissionsAsync();
      setNotifications(notificationStatus.granted);
      
      const locationStatus = await Location.getForegroundPermissionsAsync();
      setGps(locationStatus.granted);
    } catch (error) {
      console.error('Erreur vérification permissions:', error);
    }
  };

  const toggleNotifications = async () => {
    try {
      if (!notifications) {
        const { status } = await Notifications.requestPermissionsAsync();
        setNotifications(status === 'granted');
        if (status !== 'granted') {
          Alert.alert(
            "Permission refusée",
            "Vous pouvez activer les notifications dans les paramètres de votre appareil.",
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert(
          "Désactiver les notifications",
          "Les notifications seront désactivées pour cette session. Pour les réactiver définitivement, utilisez les paramètres de votre appareil.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Désactiver", onPress: () => setNotifications(false) }
          ]
        );
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de modifier les paramètres de notification");
    }
  };

  const toggleGPS = async () => {
    try {
      if (!gps) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setGps(status === 'granted');
        if (status !== 'granted') {
          Alert.alert(
            "Permission refusée",
            "Vous pouvez activer la localisation dans les paramètres de votre appareil.",
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert(
          "Désactiver la localisation",
          "La localisation sera désactivée pour cette session.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Désactiver", onPress: () => setGps(false) }
          ]
        );
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de modifier les paramètres de localisation");
    }
  };

  const handleToggle = (setter, value, settingName) => {
    setter(!value);
    saveSettings({ [settingName]: !value });
  };

  const SettingCard = ({ title, subtitle, icon, iconColor, children, premium = false }) => (
    <Animated.View style={[styles.settingCard, { transform: [{ scale: scaleValue }] }]}>
      <LinearGradient
        colors={['#ffffff', '#fefefe']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={[iconColor, iconColor + '80']}
            style={styles.cardIconContainer}
          >
            <Ionicons name={icon} size={22} color="#fff" />
          </LinearGradient>
          <View style={styles.cardTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{title}</Text>
              {premium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
        </View>
        {children}
      </LinearGradient>
    </Animated.View>
  );

  const DataUsageSelector = () => (
    <View style={styles.selectorContainer}>
      {[
        { key: 'wifi', label: 'Wi-Fi uniquement', icon: 'wifi' },
        { key: 'mobile', label: 'Données mobiles', icon: 'cellular' },
        { key: 'both', label: 'Wi-Fi + Mobile', icon: 'globe' }
      ].map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.selectorOption,
            dataUsage === option.key && styles.selectorOptionActive
          ]}
          onPress={() => {
            setDataUsage(option.key);
            saveSettings({ dataUsage: option.key });
          }}
        >
          <Ionicons 
            name={option.icon} 
            size={18} 
            color={dataUsage === option.key ? '#8B5CF6' : '#64748b'} 
          />
          <Text style={[
            styles.selectorText,
            dataUsage === option.key && styles.selectorTextActive
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={['#8B5CF6', '#A855F7', '#C084FC']}
          style={styles.loadingContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.loadingSpinner}>
            <Ionicons name="settings-outline" size={32} color="#fff" />
            <Text style={styles.loadingText}>Chargement des paramètres...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header avec dégradé */}
        <LinearGradient
          colors={['#8B5CF6', '#A855F7', '#C084FC']}
          style={styles.headerContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Paramètres</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>

        <View style={styles.contentContainer}>
          {/* Permissions */}
          <Text style={styles.sectionTitle}>Permissions</Text>
          
          <SettingCard
            title="Notifications"
            subtitle="Recevoir des alertes et rappels"
            icon="notifications-outline"
            iconColor="#8B5CF6"
          >
            <Switch
              value={notifications}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#e5d3ff', true: '#8B5CF6' }}
              thumbColor={notifications ? '#ffffff' : '#f8fafc'}
              style={styles.switch}
            />
          </SettingCard>

          <SettingCard
            title="Localisation GPS"
            subtitle="Accéder à votre position"
            icon="location-outline"
            iconColor="#10B981"
          >
            <Switch
              value={gps}
              onValueChange={toggleGPS}
              trackColor={{ false: '#d1fae5', true: '#10B981' }}
              thumbColor={gps ? '#ffffff' : '#f8fafc'}
              style={styles.switch}
            />
          </SettingCard>



          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinner: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    padding: 30,
    borderRadius: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 10,
    fontWeight: '600',
  },
  headerContainer: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    marginTop: -20,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 15,
    marginTop: 25,
    marginLeft: 5,
  },
  settingCard: {
    marginBottom: 15,
    borderRadius: 18,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    borderRadius: 18,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  premiumBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  switch: {
    alignSelf: 'flex-end',
  },
  selectorContainer: {
    gap: 8,
  },
  selectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    gap: 10,
  },
  selectorOptionActive: {
    backgroundColor: '#ede9fe',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  selectorText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  selectorTextActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  actionButton: {
    marginBottom: 15,
    borderRadius: 18,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#B91C1C',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default DeviceSettings;