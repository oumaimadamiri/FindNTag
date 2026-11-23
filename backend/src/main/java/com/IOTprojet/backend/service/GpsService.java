package com.IOTprojet.backend.service;

import com.IOTprojet.backend.dto.GpsDTO;
import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.repository.AnimalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;

@Service
public class GpsService {

    private static final Logger logger = LoggerFactory.getLogger(GpsService.class);
    
    @Autowired
    private AnimalRepository animalRepository;

    public boolean updateLocation(Long animalId, GpsDTO gps) {
        logger.info("Recherche de l'animal avec ID: {}", animalId);
        
        Optional<Animal> optionalAnimal = animalRepository.findById(animalId);
        if (optionalAnimal.isEmpty()) {
            logger.error("Animal avec ID {} non trouvé dans la base de données", animalId);
            return false;
        }

        Animal animal = optionalAnimal.get();
        logger.info("Animal trouvé: {}", animal.toString()); // Assurez-vous d'avoir une méthode toString dans Animal
        
        String oldLatitude = animal.getLatitude();
        String oldLongitude = animal.getLongitude();
        
        animal.setLatitude(gps.getLatitude());
        animal.setLongitude(gps.getLongitude());
        
        try {
            Animal savedAnimal = animalRepository.save(animal);
            logger.info("Position mise à jour avec succès:");
            logger.info("  Ancienne position: lat={}, lng={}", oldLatitude, oldLongitude);
            logger.info("  Nouvelle position: lat={}, lng={}", savedAnimal.getLatitude(), savedAnimal.getLongitude());
            return true;
        } catch (Exception e) {
            logger.error("Erreur lors de la sauvegarde: {}", e.getMessage(), e);
            return false;
        }
    }

    public Optional<GpsDTO> getLocation(Long animalId) {
        logger.info("Récupération de la position pour l'animal {}", animalId);
        
        return animalRepository.findById(animalId).map(animal -> {
            GpsDTO dto = new GpsDTO();
            dto.setLatitude(animal.getLatitude());
            dto.setLongitude(animal.getLongitude());
            logger.info("Position récupérée: lat={}, lng={}", dto.getLatitude(), dto.getLongitude());
            return dto;
        });
    }
}