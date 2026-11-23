package com.IOTprojet.backend.controller;

import com.IOTprojet.backend.dto.GeofenceDTO;
import com.IOTprojet.backend.dto.PositionDTO;
import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.entity.Tracker;
import com.IOTprojet.backend.security.CurrentUser;
import com.IOTprojet.backend.service.AnimalService;
import com.IOTprojet.backend.service.GeofenceService;
import com.IOTprojet.backend.service.GpsService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/animals/{animalId}")
public class AnimalTrackingController {

    // L'identifiant sert de segment de topic MQTT : pas de / + #
    private static final Pattern DEVICE_ID = Pattern.compile("^[A-Za-z0-9_-]{3,64}$");

    private final AnimalService animalService;
    private final GpsService gpsService;
    private final GeofenceService geofenceService;

    public AnimalTrackingController(AnimalService animalService, GpsService gpsService,
                                    GeofenceService geofenceService) {
        this.animalService = animalService;
        this.gpsService = gpsService;
        this.geofenceService = geofenceService;
    }

    private Animal owned(Long animalId) {
        return animalService.getOwned(animalId, CurrentUser.cin());
    }

    @GetMapping("/positions")
    public List<PositionDTO> positions(@PathVariable Long animalId, @RequestParam(defaultValue = "100") int limit) {
        owned(animalId);
        int safeLimit = Math.max(1, Math.min(limit, 500));
        return gpsService.getTrack(animalId, safeLimit).stream().map(PositionDTO::of).toList();
    }

    @GetMapping("/geofence")
    public GeofenceDTO getGeofence(@PathVariable Long animalId) {
        owned(animalId);
        return geofenceService.get(animalId);
    }

    @PutMapping("/geofence")
    public GeofenceDTO putGeofence(@PathVariable Long animalId, @RequestBody GeofenceDTO body) {
        return geofenceService.save(owned(animalId), body);
    }

    @GetMapping("/tracker")
    public Map<String, Object> getTracker(@PathVariable Long animalId) {
        owned(animalId);
        Tracker t = gpsService.getTracker(animalId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucun traceur associé"));
        return Map.of("deviceId", t.getDeviceId(),
                "lastSeenAt", t.getLastSeenAt() == null ? "" : t.getLastSeenAt().toString());
    }

    @PutMapping("/tracker")
    public Map<String, String> setTracker(@PathVariable Long animalId, @RequestBody Map<String, String> body) {
        Animal animal = owned(animalId);
        String deviceId = body.get("deviceId") == null ? "" : body.get("deviceId").trim();
        if (!DEVICE_ID.matcher(deviceId).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Identifiant invalide (3 à 64 caractères : lettres, chiffres, - et _)");
        }
        gpsService.claimTracker(animal, deviceId);
        return Map.of("deviceId", deviceId);
    }

    @DeleteMapping("/tracker")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeTracker(@PathVariable Long animalId) {
        owned(animalId);
        gpsService.releaseTracker(animalId);
    }
}
