import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AnimalManagerScreen({ navigation, route }) {
  const userInfo = route.params?.userInfo;
  console.log('userInfo passé au menu:', userInfo);

  const menuItems = [
    {
      id: 1,
      title: 'Ajouter un animal',
      subtitle: 'Enregistrer un nouvel animal',
      icon: 'add-circle',
      route: 'AddAnimal'
    },
    {
      id: 2,
      title: 'Voir mes animaux',
      subtitle: 'Consulter la liste complète',
      icon: 'paw',
      route: 'AnimalList'
    },
    {
      id: 3,
      title: 'Scanner NFC',
      subtitle: 'Lire un tag NFC',
      icon: 'scan',
      route: 'ScanAnimal'
    },
    {
      id: 4,
      title: 'Modifier un animal',  
      subtitle: 'Mettre à jour les informations',
      icon: 'create-outline',
      route: 'EditAnimal'
    },
    {
      id: 5,
      title: 'Supprimer un animal',
      subtitle: 'Retirer de la liste',
      icon: 'trash',
      route: 'DeleteAnimal'
    },
    {
  id: 6,
  title: 'Vendre un animal',
  subtitle: 'Transférer à un autre propriétaire',
  icon: 'swap-horizontal',
  color: '#00bcd4',
  backgroundColor: '#e0f7fa',
  route: 'SellAnimal'
}

  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={{
          paddingTop: 40,
          paddingHorizontal: 20,
          paddingBottom: 40,
          backgroundColor: '#8B5CF6',
          alignItems: 'center'
        }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <Ionicons name="paw" size={40} color="#FFFFFF" />
          </View>
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: 8,
            textAlign: 'center'
          }}>
            Gestion des animaux
          </Text>
          <Text style={{
            fontSize: 16,
            color: '#E9D5FF',
            textAlign: 'center',
            lineHeight: 22,
            paddingHorizontal: 20
          }}>
            Gérez facilement vos compagnons à quatre pattes
          </Text>
        </View>

        {/* Menu Cards */}
        <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#8B5CF6',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
                borderWidth: 1,
                borderColor: '#F3E8FF'
              }}
              onPress={() => navigation.navigate(item.route, { userInfo })}
              activeOpacity={0.7}
            >
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: '#F3E8FF',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16
              }}>
                <Ionicons name={item.icon} size={28} color="#8B5CF6" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#1F2937',
                  marginBottom: 4
                }}>
                  {item.title}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#6B7280',
                  lineHeight: 20
                }}>
                  {item.subtitle}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#C7B5E3" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 30 }} />

      </ScrollView>
    </SafeAreaView>
  );
}