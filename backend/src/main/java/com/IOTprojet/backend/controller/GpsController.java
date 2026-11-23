package com.IOTprojet.backend.controller;

import com.IOTprojet.backend.dto.GpsDTO;
import com.IOTprojet.backend.service.GpsService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;

@RestController
@RequestMapping("/api/gps")
@CrossOrigin(origins = "*")
public class GpsController {

    private static final Logger logger = LoggerFactory.getLogger(GpsController.class);
    
    @Autowired
    private GpsService gpsService;

    @PostMapping("/{animalId}")
    public ResponseEntity<?> updateAnimalLocation(
            @PathVariable Long animalId, 
            @RequestBody GpsDTO gps) {
        
        // FORCER L'AFFICHAGE DANS LA CONSOLE
        System.out.println("========================================");
        System.out.println("🔥 REQUÊTE POST REÇUE ! 🔥");
        System.out.println("Animal ID: " + animalId);
        System.out.println("Latitude reçue: " + gps.getLatitude());
        System.out.println("Longitude reçue: " + gps.getLongitude());
        System.out.println("Timestamp: " + java.time.LocalDateTime.now());
        System.out.println("========================================");
        
        // Log aussi avec SLF4J
        logger.info("=== REQUÊTE GPS REÇUE ===");
        logger.info("Animal ID: {}", animalId);
        logger.info("GPS Data reçues:");
        logger.info("  Latitude: {}", gps.getLatitude());
        logger.info("  Longitude: {}", gps.getLongitude());
        
        // Validation des données
        if (gps.getLatitude() == null || gps.getLongitude() == null) {
            System.out.println("❌ ERREUR: Données GPS manquantes");
            logger.error("Données GPS invalides - latitude ou longitude manquante");
            return ResponseEntity.badRequest().body("Latitude ou longitude manquante");
        }
        
        if (gps.getLatitude().trim().isEmpty() || gps.getLongitude().trim().isEmpty()) {
            System.out.println("❌ ERREUR: Données GPS vides");
            logger.error("Données GPS invalides - latitude ou longitude vide");
            return ResponseEntity.badRequest().body("Latitude ou longitude vide");
        }
        
        try {
            // Validation du format numérique
            Double lat = Double.parseDouble(gps.getLatitude());
            Double lng = Double.parseDouble(gps.getLongitude());
            System.out.println("✅ Coordonnées validées: " + lat + ", " + lng);
        } catch (NumberFormatException e) {
            System.out.println("❌ ERREUR: Format GPS invalide - " + e.getMessage());
            logger.error("Format GPS invalide: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Format de coordonnées invalide");
        }
        
        // Tentative de mise à jour
        System.out.println("🔄 Tentative de mise à jour pour l'animal " + animalId);
        logger.info("Tentative de mise à jour de la position pour l'animal {}", animalId);
        
        boolean updated = gpsService.updateLocation(animalId, gps);
        
        if (!updated) {
            System.out.println("❌ ERREUR: Animal " + animalId + " non trouvé");
            logger.error("Animal avec ID {} non trouvé", animalId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Animal non trouvé");
        }
        
        System.out.println("✅ SUCCESS: Position mise à jour pour l'animal " + animalId);
        System.out.println("========================================");
        logger.info("Position mise à jour avec succès pour l'animal {}", animalId);
        logger.info("=== FIN REQUÊTE GPS ===");
        
        return ResponseEntity.ok("Position mise à jour avec succès");
    }

    @GetMapping("/{animalId}")
    public ResponseEntity<?> getAnimalLocation(@PathVariable Long animalId) {
        System.out.println("🔍 GET request pour animal " + animalId);
        logger.info("Récupération de la position pour l'animal {}", animalId);
        
        Optional<GpsDTO> gpsOpt = gpsService.getLocation(animalId);
        if (gpsOpt.isPresent()) {
            System.out.println("✅ Position trouvée: lat=" + gpsOpt.get().getLatitude() + 
                             ", lng=" + gpsOpt.get().getLongitude());
            logger.info("Position trouvée pour l'animal {}: lat={}, lng={}", 
                       animalId, gpsOpt.get().getLatitude(), gpsOpt.get().getLongitude());
            return ResponseEntity.ok(gpsOpt.get());
        } else {
            System.out.println("❌ Animal " + animalId + " non trouvé");
            logger.warn("Animal avec ID {} non trouvé", animalId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Animal non trouvé");
        }
    }
    
    // Endpoint de test
    @GetMapping("/test")
    public ResponseEntity<String> testEndpoint() {
        System.out.println("🧪 Test endpoint appelé - " + java.time.LocalDateTime.now());
        logger.info("Test endpoint appelé");
        return ResponseEntity.ok("Backend GPS est opérationnel - " + java.time.LocalDateTime.now());
    }
    
    // Capturer TOUTES les requêtes POST
    @PostMapping("/")
    public ResponseEntity<?> catchAllPost(@RequestBody(required = false) String body) {
        System.out.println("🔥 CATCH-ALL POST REÇU:");
        System.out.println("Body: " + body);
        System.out.println("Timestamp: " + java.time.LocalDateTime.now());
        return ResponseEntity.ok("Catch-all endpoint - requête reçue");
    }
}
