
import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Image,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
  Easing,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  SlideInLeft,
  SlideInRight,
  BounceIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Composant pour les emojis d'animaux animés
const AnimatedAnimal = ({ emoji, style, delay = 0 }) => {
  const float = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-15, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(15, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    rotate.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(10, { duration: 3000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) })
        ),
        -1,
        true
      )
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: float.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value }
    ],
  }));

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {emoji}
    </Animated.Text>
  );
};

// Composant pour les pattes d'animaux
const PawPrint = ({ style, delay = 0 }) => {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.cubic) }),
          withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.cubic) })
        ),
        -1,
        true
      )
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[style, animatedStyle]}>
      🐾
    </Animated.Text>
  );
};

// Composant pour les étoiles scintillantes
const TwinklingStar = ({ style, delay = 0 }) => {
  const twinkle = useSharedValue(0.4);
  const rotate = useSharedValue(0);

  useEffect(() => {
    twinkle.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.cubic) }),
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.cubic) })
        ),
        -1,
        true
      )
    );

    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: 4000, easing: Easing.linear }),
        -1,
        false
      )
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: twinkle.value,
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.Text style={[style, animatedStyle]}>
      ✨
    </Animated.Text>
  );
};

export default function StartScreen({ navigation }) {
  // Animations principales
  const logoFloat = useSharedValue(0);
  const logoGlow = useSharedValue(0.5);
  const titleShimmer = useSharedValue(0);
  
  // Animations des boutons
  const buttonPulse1 = useSharedValue(1);
  const buttonPulse2 = useSharedValue(1);
  const buttonGlow = useSharedValue(0);
  
  // Animations du fond
  const backgroundShift = useSharedValue(0);
  const heartsFloat = useSharedValue(0);
  const cloudsMove = useSharedValue(0);
  
  // Animation du lien
  const linkPulse = useSharedValue(1);
  const linkFloat = useSharedValue(0);

  useEffect(() => {
    // Animation flottante du logo
    logoFloat.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(8, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Lueur douce du logo
    logoGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );

    // Effet shimmer sur le titre
    titleShimmer.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    // Animations des boutons
    buttonPulse1.value = withRepeat(
      withSequence(
        withDelay(0, withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.cubic) })),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );

    buttonPulse2.value = withRepeat(
      withSequence(
        withDelay(600, withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.cubic) })),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );

    buttonGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    // Animation du fond
    backgroundShift.value = withRepeat(
      withTiming(1, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    // Cœurs flottants
    heartsFloat.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      true
    );

    // Nuages en mouvement
    cloudsMove.value = withRepeat(
      withTiming(1, { duration: 15000, easing: Easing.linear }),
      -1,
      false
    );

    // Animation du lien
    linkPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 1000, easing: Easing.in(Easing.cubic) })
      ),
      -1,
      true
    );

    linkFloat.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  // Styles animés
  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          backgroundShift.value,
          [0, 1],
          [0, -50],
          Extrapolation.CLAMP
        )
      }
    ],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: logoFloat.value },
      { scale: interpolate(logoGlow.value, [0.5, 1], [0.98, 1.02]) }
    ],
    shadowOpacity: interpolate(logoGlow.value, [0.5, 1], [0.3, 0.7]),
  }));

  const titleShimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      titleShimmer.value,
      [0, 1],
      [-150, 150],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX }],
    };
  });

  const button1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonPulse1.value }],
    shadowOpacity: interpolate(buttonGlow.value, [0.4, 1], [0.4, 0.8]),
    shadowRadius: interpolate(buttonGlow.value, [0.4, 1], [8, 20]),
  }));

  const button2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonPulse2.value }],
    shadowOpacity: interpolate(buttonGlow.value, [0.4, 1], [0.4, 0.8]),
    shadowRadius: interpolate(buttonGlow.value, [0.4, 1], [8, 20]),
  }));

  const linkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: linkPulse.value },
      { translateY: linkFloat.value }
    ],
  }));

  const heartsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(heartsFloat.value, [0, 1], [0.5, 0.9]),
    transform: [
      {
        translateY: interpolate(
          heartsFloat.value,
          [0, 1],
          [30, -30],
          Extrapolation.CLAMP
        )
      }
    ],
  }));

  const cloudsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          cloudsMove.value,
          [0, 1],
          [0, width],
          Extrapolation.CLAMP
        )
      }
    ],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" />
      
      {/* Fond avec gradient violet lumineux */}
      <AnimatedLinearGradient
        colors={['#e0e7ff', '#c7d2fe', '#a5b4fc', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.backgroundGradient, backgroundAnimatedStyle]}
      />

      {/* Éléments décoratifs mignons */}
      <View style={styles.decorativeContainer}>
        {/* Nuages flottants */}
        <Animated.Text style={[styles.cloud1, cloudsAnimatedStyle]}>☁️</Animated.Text>
        <Animated.Text style={[styles.cloud2, cloudsAnimatedStyle]}>☁️</Animated.Text>
        <Animated.Text style={[styles.cloud3, cloudsAnimatedStyle]}>☁️</Animated.Text>

        {/* Cœurs violets flottants */}
        {[...Array(8)].map((_, i) => (
          <Animated.Text
            key={`heart-${i}`}
            style={[
              styles.heart,
              heartsAnimatedStyle,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                fontSize: Math.random() * 10 + 15,
                animationDelay: `${Math.random() * 2}s`,
              }
            ]}
          >
            💜
          </Animated.Text>
        ))}

        {/* Étoiles scintillantes */}
        {[...Array(10)].map((_, i) => (
          <TwinklingStar
            key={`star-${i}`}
            style={[
              styles.star,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                fontSize: Math.random() * 8 + 12,
              }
            ]}
            delay={Math.random() * 2000}
          />
        ))}

        {/* Pattes d'animaux */}
        {[...Array(12)].map((_, i) => (
          <PawPrint
            key={`paw-${i}`}
            style={[
              styles.pawPrint,
              {
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                fontSize: Math.random() * 8 + 12,
              }
            ]}
            delay={Math.random() * 2000}
          />
        ))}

        {/* Animaux flottants */}
        <AnimatedAnimal emoji="🐕" style={[styles.animal, { top: '20%', left: '10%' }]} delay={0} />
        <AnimatedAnimal emoji="🐱" style={[styles.animal, { top: '15%', right: '15%' }]} delay={500} />
        <AnimatedAnimal emoji="🐰" style={[styles.animal, { top: '60%', left: '5%' }]} delay={1000} />
        <AnimatedAnimal emoji="🐹" style={[styles.animal, { bottom: '25%', right: '10%' }]} delay={1500} />
        <AnimatedAnimal emoji="🐦" style={[styles.animal, { top: '40%', right: '20%' }]} delay={2000} />
        <AnimatedAnimal emoji="🐨" style={[styles.animal, { bottom: '40%', left: '20%' }]} delay={2500} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>

          {/* Logo avec animations mignonnes */}
          <Animated.View entering={ZoomIn.duration(1200).springify()} style={styles.logoSection}>
            <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
              <View style={styles.logoBackground}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.95)', 'rgba(196,181,253,0.8)']}
                  style={styles.logoGradient}
                />
                <Image
                  source={require('../assets/pet-dog.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
            
            {/* Titre avec effet shimmer */}
            <Animated.View 
              entering={FadeInDown.delay(400).duration(1000)} 
              style={styles.titleContainer}
            >
              <View style={styles.titleWrapper}>
                <Text style={styles.mainTitle}>Find'N'Tag</Text>
                <Animated.View style={[styles.shimmerOverlay, titleShimmerStyle]} />
              </View>
            </Animated.View>
          </Animated.View>

          {/* Info Box avec style mignon */}
          <Animated.View
            entering={FadeInUp.delay(800).duration(1000).springify()}
            style={styles.infoContainer}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(196,181,253,0.9)']}
              style={styles.infoBox}
            >
              <Text style={styles.infoText}>
                Une solution complète pour garder la trace de votre animal grâce à la{" "}
                <Text style={styles.highlightText}>technologie NFC</Text> et{" "}
                <Text style={styles.highlightText}>GPS</Text> 
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Boutons avec style mignon */}
          <Animated.View 
            entering={SlideInLeft.delay(1200).duration(800)} 
            style={styles.buttonsContainer}
          >
            <AnimatedTouchableOpacity
              style={[styles.primaryButton, button1AnimatedStyle]}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed', '#6d28d9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.primaryButtonText}>Se connecter</Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>

            <AnimatedTouchableOpacity
              style={[styles.secondaryButton, button2AnimatedStyle]}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ffffff', '#f3f4f6', '#e5e7eb']}
                style={styles.buttonGradient}
              >
                <Text style={styles.secondaryButtonText}>S'inscrire</Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>
          </Animated.View>

          {/* Lien avec style mignon */}
          <Animated.View 
            entering={BounceIn.delay(1600).duration(1000)}
            style={styles.linkContainer}
          >
            <AnimatedTouchableOpacity
              style={[styles.linkWrapper, linkAnimatedStyle]}
              onPress={() => navigation.navigate('ScanAnimal')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.98)', 'rgba(224,231,255,0.95)']}
                style={styles.linkBackground}
              >
                <Text style={styles.linkText}>🔍 J'ai trouvé un animal</Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#e0e7ff',
  },
  backgroundGradient: {
    position: 'absolute',
    width: width * 1.2,
    height: height * 1.2,
    top: -height * 0.1,
    left: -width * 0.1,
  },
  decorativeContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  cloud1: {
    position: 'absolute',
    top: '10%',
    left: -50,
    fontSize: 30,
    opacity: 0.8,
  },
  cloud2: {
    position: 'absolute',
    top: '25%',
    left: -40,
    fontSize: 24,
    opacity: 0.7,
  },
  cloud3: {
    position: 'absolute',
    top: '40%',
    left: -45,
    fontSize: 20,
    opacity: 0.6,
  },
  heart: {
    position: 'absolute',
    opacity: 0.7,
  },
  star: {
    position: 'absolute',
    color: '#fbbf24',
  },
  pawPrint: {
    position: 'absolute',
    color: '#8b5cf6',
  },
  animal: {
    position: 'absolute',
    fontSize: 28,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 25,
  },
  logoBackground: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  logoGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  logoEmoji: {
    fontSize: 60,
    marginBottom: 5,
  },
  logoAnimal: {
    fontSize: 40,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    alignItems: 'center',
  },
  titleWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#4c1d95',
    letterSpacing: 1,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.8)',
    opacity: 0.9,
  },
  subtitle: {
    fontSize: 18,
    color: '#6d28d9',
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  infoContainer: {
    width: '100%',
    marginBottom: 40,
  },
  infoBox: {
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderWidth: 2,
    borderColor: '#c4b5fd',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#4c1d95',
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 8,
  },
  infoEmoji: {
    fontSize: 20,
  },
  highlightText: {
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 25,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  secondaryButton: {
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#c4b5fd',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: '#4c1d95',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  linkContainer: {
    marginTop: 16,
  },
  linkWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  linkBackground: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#c4b5fd',
  },
  linkText: {
    color: '#4c1d95',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
};