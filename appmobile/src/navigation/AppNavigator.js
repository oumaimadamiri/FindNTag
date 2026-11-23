import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

// Import des écrans
import AppSplashScreen from "../screens/AppSplashScreen";
import StartScreen from "../screens/StartScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import MapScreen from "../screens/MapScreen";
import AddAnimalScreen from "../screens/AddAnimalScreen";
import ProfileScreen from "../screens/ProfileScreen";
import DeviceSettings from "../screens/DeviceSettings";
import ScanAnimalScreen from "../screens/ScanAnimalScreen";
import EditAnimalScreen from "../screens/EditAnimalScreen";
import PostRegisterChoice from "../screens/PostRegisterChoice";
import AnimalManagerScreen from "../screens/AnimalManagerScreen";
import AnimalListScreen from "../screens/AnimalListScreen";
import DeleteAnimalScreen from "../screens/DeleteAnimalScreen";
import AddAnimalNFCScreen from "../screens/AddAnimalNFCScreen";
import EnterPinScreen from "../screens/EnterPinScreen";
import SellAnimalScreen from "../screens/SellAnimalScreen";
import ScanBuyerCardScreen from "../screens/ScanBuyerCardScreen";
import TrackerScreen from "../screens/TrackerScreen";
import React, { useContext } from "react";
import { UserContext } from "../context/UserContext";
import { navigationRef } from "./navigationRef";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Accueil")
            iconName = focused ? "home" : "home-outline";
          else if (route.name === "Carte")
            iconName = focused ? "map" : "map-outline";
          else if (route.name === "Animaux")
            iconName = focused ? "paw" : "paw-outline";
          else if (route.name === "Mon Compte")
            iconName = focused ? "person" : "person-outline";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#8b5cf6", // Violet fort
        tabBarInactiveTintColor: "#c4b5fd", // Violet clair
        tabBarStyle: {
          position: "absolute",
          marginBottom: 15,
          marginHorizontal: 15,
          borderRadius: 20,
          height: 70,
          paddingTop: 5,
          paddingBottom: 10,
          backgroundColor: "white",
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 5,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Accueil" component={HomeScreen} />
      <Tab.Screen name="Carte" component={MapScreen} />
      <Tab.Screen name="Animaux" component={AnimalManagerScreen} />
      <Tab.Screen name="Mon Compte" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { userInfo } = useContext(UserContext);
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: "#FFFFFF" },
        }}
      >
        <Stack.Screen name="Splash" component={AppSplashScreen} />
        <Stack.Screen
          name="PostRegisterChoice"
          component={PostRegisterChoice}
        />
        <Stack.Screen name="Start" component={StartScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeTabs} />

        <Stack.Screen
          name="DeleteAnimal"
          options={{ headerShown: true, title: "Supprimer un animal" }}
        >
          {(props) => <DeleteAnimalScreen {...props} userInfo={userInfo} />}
        </Stack.Screen>

        <Stack.Screen
          name="ScanAnimal"
          component={ScanAnimalScreen}
          options={{ headerShown: true, title: "Scanner un animal" }}
        />
        <Stack.Screen
          name="AddAnimal"
          component={AddAnimalScreen}
          options={{ headerShown: true, title: "Ajouter un animal" }}
        />
        <Stack.Screen
          name="EnterPin"
          component={EnterPinScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EditAnimal"
          component={EditAnimalScreen}
          options={{ headerShown: true, title: "Modifier animal" }}
        />
        <Stack.Screen
          name="DeviceSettings"
          component={DeviceSettings}
          options={{ headerShown: true, title: "Paramètres" }}
        />
        <Stack.Screen
          name="AnimalList"
          component={AnimalListScreen}
          options={{ headerShown: true, title: "Voir mes animaux" }}
        />
        <Stack.Screen
          name="AddAnimalNFC"
          component={AddAnimalNFCScreen}
          options={{ headerShown: true, title: "Ajouter un animal" }}
        />
        <Stack.Screen
          name="SellAnimal"
          component={SellAnimalScreen}
          options={{ headerShown: true, title: "Vender un animal" }}
        />

        <Stack.Screen
          name="ScanBuyerCardScreen"
          component={ScanBuyerCardScreen}
          options={{ headerShown: true, title: "Scanner Acheteur" }}
        />
        <Stack.Screen
          name="Tracker"
          component={TrackerScreen}
          options={{ headerShown: true, title: "Traceur GPS" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
