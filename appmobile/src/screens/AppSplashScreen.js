import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
  useAnimatedProps
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

// Désactiver l'auto-masquage de l'écran de démarrage
SplashScreen.preventAutoHideAsync().catch(() => {
  console.warn("Impossible de prévenir l'auto-masquage du SplashScreen");
});

const { width, height } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function AppSplashScreen({ navigation }) {
  // Valeurs partagées pour les animations
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.5);
  const logoRotate = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  
  // Animations des éléments de tracking
  const dogSlideX = useSharedValue(-200);
  const dogBounce = useSharedValue(0);
  const phoneSlideX = useSharedValue(200);
  const phoneGlow = useSharedValue(0);
  const satelliteRotate = useSharedValue(0);
  const satelliteOrbit = useSharedValue(0);
  
  // Animations des signaux et connexions
  const signalPulse = useSharedValue(0.3);
  const connectionProgress = useSharedValue(0);
  const particlesAnim = useSharedValue(0);
  
  // Animation de la barre de progression
  const progressValue = useSharedValue(0);
  const progressGlow = useSharedValue(0);
  
  // Animation de texte
  const textWave = useSharedValue(0);
  const loadingDots = useSharedValue(0);
  
  // Animation de fond
  const backgroundShift = useSharedValue(0);
  const starsTwinkle = useSharedValue(0);

  // État pour les points de chargement


const dotsStyle = useAnimatedStyle(() => {
  return {
    opacity: loadingDots.value % 1,
  };
});


  // Fonction pour mettre à jour les points
  const updateDots = (value) => {
    'worklet';
    const steps = ['', '.', '..', '...'];
    const index = Math.floor(value) % 4;
    runOnJS(setDots)(steps[index]);
  };

  // Fonction pour mettre à jour le progrès
  const updateProgress = (value) => {
    'worklet';
    runOnJS(setLoadingProgress)(Math.round(value));
  };
const [loadingProgress, setLoadingProgress] = useState(0);
const [dots, setDots] = useState('');

  useEffect(() => {
    // Animation d'entrée spectaculaire
    fadeAnim.value = withDelay(300, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    scaleAnim.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 100 }));
    
    // Animation du logo avec rotation et échelle
    logoRotate.value = withDelay(500, withSpring(360, { damping: 15, stiffness: 80 }));
    logoScale.value = withDelay(500, withSequence(
      withSpring(1.2, { damping: 10 }),
      withSpring(1, { damping: 12 })
    ));

    // Animation du chien avec rebond
    dogSlideX.value = withDelay(800, withSpring(0, { damping: 8, stiffness: 100 }));
    dogBounce.value = withDelay(1200, withRepeat(
      withSequence(
        withTiming(-10, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    ));

    // Animation du téléphone avec lueur
    phoneSlideX.value = withDelay(800, withSpring(0, { damping: 8, stiffness: 100 }));
    phoneGlow.value = withDelay(1500, withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    ));

    // Animation du satellite avec orbite
    satelliteRotate.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
    satelliteOrbit.value = withDelay(1000, withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false
    ));

    // Animation des signaux
    signalPulse.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.cubic) }),
        withTiming(0.3, { duration: 1000, easing: Easing.in(Easing.cubic) })
      ),
      -1,
      false
    );

    // Animation de la connexion
    connectionProgress.value = withDelay(1200, withTiming(1, { 
      duration: 2000, 
      easing: Easing.out(Easing.cubic) 
    }));

    // Animation des particules
    particlesAnim.value = withDelay(1500, withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    ));

    // Animation de la barre de progression
    progressValue.value = withDelay(2000, withTiming(100, { 
      duration: 6000, 
      easing: Easing.out(Easing.cubic) 
    }));
    progressGlow.value = withDelay(2000, withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      false
    ));

    // Animation du texte ondulant
    textWave.value = withDelay(1000, withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    ));

    // Animation des points de chargement
    loadingDots.value = withRepeat(
      withTiming(4, { duration: 1200, easing: Easing.linear }),
      -1,
      false
    );

    // Animation du fond
    backgroundShift.value = withRepeat(
      withTiming(1, { duration: 10000, easing: Easing.linear }),
      -1,
      false
    );

    // Animation des étoiles
    starsTwinkle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

  // ✅ Simulation de l'avancement de progression
  const progressInterval = setInterval(() => {
    setLoadingProgress(prev => {
      if (prev >= 100) return 100;
      return prev + 2;
    });
  }, 120); // vitesse : 2% toutes les 120 ms

  // ✅ Animation des points (".", "..", "...")
  const dotsInterval = setInterval(() => {
    setDots(prev => {
      if (prev === '') return '.';
      if (prev === '.') return '..';
      if (prev === '..') return '...';
      return '';
    });
  }, 400); // changer vitesse si tu veux


    // Transition vers l'écran principal
 const timer = setTimeout(() => {
  // Lancer les animations de sortie (fade + zoom)
  fadeAnim.value = withTiming(0, { duration: 1000 });
  scaleAnim.value = withTiming(1.3, { duration: 1000 });

  // Attendre la fin de l'animation avant de cacher le splash natif et naviguer
  setTimeout(async () => {
    try {
      await SplashScreen.hideAsync();
      navigation.replace('Start');
    } catch (error) {
      console.warn("Erreur de transition Splash:", error);
      navigation.replace('Start');
    }
  }, 1000);
}, 13000); // 💡 Affiche le splash React Native pendant 13s


    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
      clearInterval(dotsInterval);
    
    };
  }, []);

  // Styles animés
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ 
      translateX: interpolate(
        backgroundShift.value,
        [0, 1],
        [0, -50],
        Extrapolation.CLAMP
      )
    }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${logoRotate.value}deg` },
      { scale: logoScale.value }
    ],
  }));

  const dogAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dogSlideX.value },
      { translateY: dogBounce.value }
    ],
  }));

  const phoneAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: phoneSlideX.value }],
    shadowOpacity: interpolate(
      phoneGlow.value,
      [0, 1],
      [0.2, 0.8],
      Extrapolation.CLAMP
    ),
  }));

  const satelliteAnimatedStyle = useAnimatedStyle(() => {
    const orbitRadius = 40;
    const orbitX = Math.cos((satelliteOrbit.value * Math.PI) / 180) * orbitRadius;
    const orbitY = Math.sin((satelliteOrbit.value * Math.PI) / 180) * orbitRadius;
    
    return {
      transform: [
        { translateX: orbitX },
        { translateY: orbitY },
        { rotate: `${satelliteRotate.value}deg` }
      ],
    };
  });

  const signalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      signalPulse.value,
      [0.3, 1.5],
      [0.3, 1],
      Extrapolation.CLAMP
    ),
    transform: [{ scale: signalPulse.value }],
  }));

  const connectionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: connectionProgress.value,
    transform: [{ scaleX: connectionProgress.value }],
  }));

  const progressBarAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
    shadowOpacity: interpolate(
      progressGlow.value,
      [0.3, 1],
      [0.3, 0.8],
      Extrapolation.CLAMP
    ),
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{
      translateY: interpolate(
        textWave.value,
        [0, 1],
        [0, -5],
        Extrapolation.CLAMP
      )
    }],
  }));

  const particlesAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      particlesAnim.value,
      [0, 0.5, 1],
      [0, 1, 0],
      Extrapolation.CLAMP
    ),
    transform: [{
      translateY: interpolate(
        particlesAnim.value,
        [0, 1],
        [0, -100],
        Extrapolation.CLAMP
      )
    }],
  }));

  const starsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: starsTwinkle.value,
  }));

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Fond animé avec gradient */}
      <Animated.View style={[styles.backgroundContainer, backgroundAnimatedStyle]}>
        <LinearGradient
          colors={['#f8f5ff', '#ffffff', '#f0ebff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        />
      </Animated.View>

      {/* Étoiles scintillantes */}
      <Animated.View style={[styles.starsContainer, starsAnimatedStyle]}>
        {[...Array(20)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }
            ]}
          />
        ))}
      </Animated.View>

      {/* Contenu principal */}
      <Animated.View style={[styles.logoContainer, containerAnimatedStyle]}>
        
        {/* Section avec illustration animée */}
        <View style={styles.illustrationContainer}>
          
          {/* Particules flottantes */}
          <Animated.View style={[styles.particlesContainer, particlesAnimatedStyle]}>
            {[...Array(5)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.particle,
                  {
                    left: `${20 + i * 15}%`,
                    opacity: 0.6 - i * 0.1,
                  }
                ]}
              />
            ))}
          </Animated.View>

          {/* Chien avec animation de rebond */}
          <Animated.View style={[styles.dogContainer, dogAnimatedStyle]}>
            <View style={styles.dogImageContainer}>
              <Image
                source={require('../assets/pet-dog.png')}
                style={styles.dogImage}
                resizeMode="contain"
              />
            </View>
            <Animated.View style={[styles.signalWave, signalAnimatedStyle]} />
            <Animated.View style={[styles.signalWave2, signalAnimatedStyle]} />
          </Animated.View>
          
          {/* Ligne de connexion animée avec SVG */}
          <Animated.View style={[styles.connectionContainer, connectionAnimatedStyle]}>
            <Svg width="180" height="20" style={styles.connectionSvg}>
              <Defs>
                <RadialGradient id="connectionGrad" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#8B5CF6" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#A78BFA" stopOpacity="0.8" />
                </RadialGradient>
              </Defs>
              <Path
                d="M10,10 Q90,5 170,10"
                stroke="url(#connectionGrad)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
              <Circle cx="10" cy="10" r="6" fill="#8B5CF6" />
              <Circle cx="170" cy="10" r="6" fill="#8B5CF6" />
            </Svg>
          </Animated.View>
          
          {/* Téléphone avec écran lumineux */}
          <Animated.View style={[styles.phoneContainer, phoneAnimatedStyle]}>
            <View style={styles.phoneFrame}>
              <LinearGradient
                colors={['#ffffff', '#faf8ff']}
                style={styles.phoneScreen}
              >
                <View style={styles.mapPin} />
                <View style={styles.mapRoad} />
                <View style={styles.mapArea} />
              </LinearGradient>
              <View style={styles.phoneButton} />
            </View>
          </Animated.View>
          
          {/* Satellite en orbite */}
          <Animated.View style={[styles.satelliteContainer, satelliteAnimatedStyle]}>
            <View style={styles.satellite}>
              <View style={styles.satellitePanel1} />
              <View style={styles.satellitePanel2} />
              <View style={styles.satelliteAntenna} />
            </View>
          </Animated.View>
        </View>

        {/* Logo avec animation spectaculaire */}
        <Animated.View style={[styles.logoCircle, logoAnimatedStyle]}>
          <LinearGradient
            colors={['#ffffff', '#f8f5ff']}
            style={styles.logoGradient}
          >
            <Image
              source={require('../assets/pet-dog.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </LinearGradient>
        </Animated.View>
        
        {/* Titre avec effet ondulant */}
        <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
          <Text style={styles.title}>FIND'N'TAG</Text>
          <Text style={styles.subtitle}>Pet Tracker</Text>
        </Animated.View>

        {/* Barre de progression avec lueur */}
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, progressBarAnimatedStyle]} />
          <View style={styles.progressTrack} />
        </View>

        {/* Texte de chargement */}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initialisation</Text>
          <Text style={styles.loadingDots}>{dots}</Text>
          <Text style={styles.progressText}>{loadingProgress}%</Text>
        </View>
      </Animated.View>

      {/* Slogan */}
      <Text style={styles.tagline}>Gardez un œil sur vos animaux, où qu'ils soient</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f5ff',
    overflow: 'hidden',
  },
  backgroundContainer: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 1.5,
    top: -height * 0.25,
    left: -width * 0.25,
  },
  gradientBackground: {
    flex: 1,
  },
  starsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#DDD6FE',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: width * 0.85,
    paddingVertical: 20,
  },
  illustrationContainer: {
    width: width * 0.85,
    height: 200,
    position: 'relative',
    marginBottom: 30,
  },
  particlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8B5CF6',
    opacity: 0.6,
  },
  dogContainer: {
    position: 'absolute',
    left: 30,
    bottom: 40,
    zIndex: 3,
  },
  dogImageContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  dogImage: {
    width: 80,
    height: 60,
    borderRadius: 10,
  },
  signalWave: {
    position: 'absolute',
    top: -5,
    right: -15,
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#10B981',
    opacity: 0.7,
  },
  signalWave2: {
    position: 'absolute',
    top: -5,
    right: -15,
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#10B981',
    opacity: 0.3,
  },
  connectionContainer: {
    position: 'absolute',
    top: 95,
    left: 95,
    zIndex: 2,
  },
  connectionSvg: {
    overflow: 'visible',
  },
  phoneContainer: {
    position: 'absolute',
    right: 30,
    top: 30,
    zIndex: 2,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
  },
  phoneFrame: {
    width: 80,
    height: 140,
    borderWidth: 4,
    borderColor: '#8B5CF6',
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    overflow: 'hidden',
    position: 'relative',
  },
  phoneScreen: {
    flex: 1,
    margin: 4,
    borderRadius: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneButton: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 30,
    height: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  mapPin: {
    position: 'absolute',
    top: '25%',
    left: '30%',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EC4899',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  mapRoad: {
    position: 'absolute',
    top: '50%',
    left: '15%',
    width: '70%',
    height: 4,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  mapArea: {
    position: 'absolute',
    bottom: '20%',
    right: '20%',
    width: 20,
    height: 15,
    backgroundColor: '#10B981',
    borderRadius: 4,
    opacity: 0.7,
  },
  satelliteContainer: {
    position: 'absolute',
    top: 15,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 40,
    zIndex: 4,
  },
  satellite: {
    width: 30,
    height: 30,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    position: 'relative',
  },
  satellitePanel1: {
    position: 'absolute',
    top: -2,
    left: -8,
    width: 6,
    height: 20,
    backgroundColor: '#FBBF24',
    borderRadius: 1,
  },
  satellitePanel2: {
    position: 'absolute',
    top: -2,
    right: -8,
    width: 6,
    height: 20,
    backgroundColor: '#FBBF24',
    borderRadius: 1,
  },
  satelliteAntenna: {
    position: 'absolute',
    top: -6,
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 8,
    backgroundColor: '#ffffff',
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 15,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 70,
    height: 70,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#7C3AED',
    letterSpacing: 2,
    textShadowColor: '#ffffff',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
  },
  progressBarContainer: {
    width: '80%',
    height: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 4,
    marginBottom: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  progressTrack: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingDots: {
    fontSize: 16,
    color: '#8B5CF6',
    width: 25,
    fontWeight: 'bold',
  },
  progressText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    marginLeft: 5,
  },
  tagline: {
    position: 'absolute',
    bottom: 60,
    fontSize: 15,
    color: '#6B7280',
    fontStyle: 'italic',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});