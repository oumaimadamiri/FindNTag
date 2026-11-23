package com.IOTprojet.backend.controller;

import com.IOTprojet.backend.dto.GpsIngestDTO;
import com.IOTprojet.backend.dto.PositionDTO;
import com.IOTprojet.backend.security.CurrentUser;
import com.IOTprojet.backend.service.AnimalService;
import com.IOTprojet.backend.service.GpsService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@RestController
@RequestMapping("/api/gps")
public class GpsController {

    private final GpsService gpsService;
    private final AnimalService animalService;
    private final String ingestKey;

    public GpsController(GpsService gpsService, AnimalService animalService,
                         @Value("${app.gps.ingest-key}") String ingestKey) {
        this.gpsService = gpsService;
        this.animalService = animalService;
        this.ingestKey = ingestKey;
    }

    /** Appelé par le bridge MQTT, avec le header X-Device-Key. */
    @PostMapping("/ingest")
    public ResponseEntity<?> ingest(@RequestHeader(value = "X-Device-Key", required = false) String key,
                                    @RequestBody GpsIngestDTO body) {
        if (key == null || !MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8),
                ingestKey.getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Clé d'équipement invalide"));
        }
        if (body.getDeviceId() == null || body.getDeviceId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "deviceId requis"));
        }
        double lat;
        double lng;
        try {
            lat = Double.parseDouble(body.getLatitude());
            lng = Double.parseDouble(body.getLongitude());
        } catch (NumberFormatException | NullPointerException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Format de coordonnées invalide"));
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return ResponseEntity.badRequest().body(Map.of("message", "Coordonnées hors limites"));
        }
        if (!gpsService.ingest(body.getDeviceId().trim(), lat, lng)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Traceur inconnu ou non associé"));
        }
        return ResponseEntity.ok(Map.of("message", "Position enregistrée"));
    }

    /** Dernière position connue : réservée au propriétaire de l'animal. */
    @GetMapping("/{animalId}")
    public ResponseEntity<?> getLocation(@PathVariable Long animalId) {
        animalService.getOwned(animalId, CurrentUser.cin());
        return gpsService.getLastPosition(animalId)
                .<ResponseEntity<?>>map(p -> ResponseEntity.ok(PositionDTO.of(p)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Aucune position")));
    }
}
