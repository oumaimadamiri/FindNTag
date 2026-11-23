import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi } from "../api";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function EnterPinScreen({ route, navigation }) {
  const { email, mode, userInfo, redirectTo = "Home" } = route.params;

  // Vérifie que email est fourni
  useEffect(() => {
    if (!email || !email.includes("@")) {
      Alert.alert("Erreur", "Email invalide ou manquant.");
      navigation.goBack();
    }
  }, [email]);

  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const inputRef = useRef(null);

  // Animation shared values
  const backgroundColorValue = useSharedValue(0);
  const titleScale = useSharedValue(1);
  const containerScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      backgroundColorValue.value,
      [0, 1, 2],
      ["#faf5ff", "#f3e8ff", "#e9d5ff"],
    );
    return { backgroundColor: bgColor };
  });

  const animatedTitleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  useEffect(() => {
    backgroundColorValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        withTiming(2, { duration: 3000, easing: Easing.linear }),
        withTiming(0, { duration: 3000, easing: Easing.linear }),
      ),
      -1,
      false,
    );

    const pulse = () => {
      titleScale.value = withSequence(
        withTiming(1.05, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      );
    };
    pulse();
    const interval = setInterval(pulse, 1600);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pin.length === 6) {
      containerScale.value = withSequence(
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 200 }),
      );
      glowOpacity.value = withTiming(1, { duration: 300 });
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [pin]);

  useEffect(() => {
    if (error) {
      containerScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1.05, { duration: 100 }),
        withTiming(1, { duration: 100 }),
      );
    }
  }, [error]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      setError(true);
      Alert.alert("Erreur", "Le code PIN doit contenir 6 chiffres.");
      return;
    }

    setIsValidating(true);
    setError(false);
    buttonScale.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 300 }),
        withTiming(1.1, { duration: 300 }),
      ),
      -1,
      true,
    );

    try {
      if (mode === "register") {
        await authApi.setOtp(email, pin);
      } else {
        await authApi.verifyOtp(email, pin);
      }
      buttonScale.value = withTiming(1, { duration: 300 });
      setIsValidating(false);
      setError(false);
      containerScale.value = withSequence(
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 300 }),
      );
      if (userInfo) {
        await AsyncStorage.setItem("userInfo", JSON.stringify(userInfo));
      }
      navigation.reset({
        index: 0,
        routes: [{ name: redirectTo, params: { userInfo } }],
      });
    } catch (e) {
      setError(true);
      setIsValidating(false);
      buttonScale.value = withTiming(1, { duration: 300 });
      const data = e.response?.data;
      const message = data?.message || (typeof data === "string" ? data : null);
      Alert.alert(
        "Erreur",
        message || "Code PIN invalide ou serveur injoignable.",
      );
    }
  };

  const handleChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);
    setPin(cleaned);
    if (cleaned.length < 6) setError(false);
  };

  return (
    <Animated.View
      style={[
        { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
        animatedBackgroundStyle,
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center" }}
      >
        <Animated.Text
          style={[
            {
              fontSize: 28,
              fontWeight: "900",
              color: "#7c3aed",
              textAlign: "center",
              marginBottom: 40,
              letterSpacing: 2,
              textShadowColor: "#a855f7",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
            },
            animatedTitleStyle,
          ]}
        >
          SAISISSEZ VOTRE CODE PIN
        </Animated.Text>

        <Animated.View
          style={[
            {
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 40,
            },
            animatedContainerStyle,
          ]}
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const digit = pin[i];
            return (
              <View
                key={i}
                style={{
                  width: width / 8,
                  height: width / 6,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: error
                    ? "#dc2626"
                    : digit
                      ? "#8b5cf6"
                      : "#c084fc",
                  backgroundColor: digit ? "#ddd6fe" : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: digit ? "#8b5cf6" : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.6,
                  shadowRadius: 12,
                  elevation: digit ? 8 : 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color: error ? "#dc2626" : digit ? "#6b46c1" : "#a855f7",
                  }}
                >
                  {digit || ""}
                </Text>
              </View>
            );
          })}
        </Animated.View>

        <RNTextInput
          ref={inputRef}
          value={pin}
          onChangeText={handleChange}
          keyboardType="numeric"
          maxLength={6}
          autoFocus
          style={{
            opacity: 0,
            height: 40,
            width: 200,
            position: "absolute",
            alignSelf: "center",
            zIndex: -1,
          }}
          importantForAccessibility="no"
        />

        <Animated.View style={animatedButtonStyle}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isValidating}
            activeOpacity={0.8}
            style={{
              backgroundColor: isValidating ? "#c084fcaa" : "#8b5cf6",
              paddingVertical: 16,
              borderRadius: 30,
              shadowColor: "#7c3aed",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.6,
              shadowRadius: 20,
              width: width * 0.7,
              alignSelf: "center",
              elevation: 12,
            }}
          >
            <LinearGradient
              colors={
                isValidating
                  ? ["#c084fc99", "#8b5cf699"]
                  : ["#a855f7", "#7c3aed"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 30, paddingVertical: 14 }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "white",
                  fontWeight: "900",
                  fontSize: 18,
                  letterSpacing: 1,
                  textShadowColor: "#581c87",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}
              >
                {isValidating ? "VALIDATION..." : "VALIDER"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {error && (
          <Text
            style={{
              color: "#dc2626",
              fontWeight: "700",
              marginTop: 20,
              textAlign: "center",
              letterSpacing: 0.5,
              textShadowColor: "#fca5a5",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            Code PIN incorrect. Veuillez réessayer.
          </Text>
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
