package com.IOTprojet.backend.service;

import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.entity.GpsPosition;
import com.IOTprojet.backend.entity.Tracker;
import com.IOTprojet.backend.repository.GpsPositionRepository;
import com.IOTprojet.backend.repository.TrackerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class GpsService {

    private static final Logger log = LoggerFactory.getLogger(GpsService.class);

    private final TrackerRepository trackerRepository;
    private final GpsPositionRepository positionRepository;
    private final GeofenceService geofenceService;
    private final long retentionDays;

    public GpsService(TrackerRepository trackerRepository, GpsPositionRepository positionRepository,
                      GeofenceService geofenceService,
                      @Value("${app.gps.retention-days:30}") long retentionDays) {
        this.trackerRepository = trackerRepository;
        this.positionRepository = positionRepository;
        this.geofenceService = geofenceService;
        this.retentionDays = retentionDays;
    }

    /** Enregistre une position reçue d'un traceur. Renvoie false si le traceur est inconnu. */
    @Transactional
    public boolean ingest(String deviceId, double lat, double lng) {
        Tracker tracker = trackerRepository.findByDeviceId(deviceId).orElse(null);
        if (tracker == null) {
            log.warn("Position reçue d'un traceur inconnu : {}", deviceId);
            return false;
        }
        Animal animal = tracker.getAnimal();
        Instant now = Instant.now();

        GpsPosition position = new GpsPosition();
        position.setAnimal(animal);
        position.setLatitude(lat);
        position.setLongitude(lng);
        position.setRecordedAt(now);
        positionRepository.save(position);

        tracker.setLastSeenAt(now);
        geofenceService.onPosition(animal, lat, lng);
        return true;
    }

    public Optional<GpsPosition> getLastPosition(Long animalId) {
        return positionRepository.findFirstByAnimalIdOrderByRecordedAtDesc(animalId);
    }

    /** Les `limit` dernières positions, de la plus ancienne à la plus récente. */
    public List<GpsPosition> getTrack(Long animalId, int limit) {
        List<GpsPosition> latest = new ArrayList<>(
                positionRepository.findByAnimalIdOrderByRecordedAtDesc(animalId, PageRequest.of(0, limit)));
        Collections.reverse(latest);
        return latest;
    }

    public Optional<Tracker> getTracker(Long animalId) {
        return trackerRepository.findByAnimalId(animalId);
    }

    @Transactional
    public Tracker claimTracker(Animal animal, String deviceId) {
        Optional<Tracker> existing = trackerRepository.findByDeviceId(deviceId);
        if (existing.isPresent() && !existing.get().getAnimal().getId().equals(animal.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce traceur est déjà associé à un autre animal");
        }
        Tracker tracker = trackerRepository.findByAnimalId(animal.getId()).orElseGet(Tracker::new);
        tracker.setAnimal(animal);
        tracker.setDeviceId(deviceId);
        return trackerRepository.save(tracker);
    }

    @Transactional
    public void releaseTracker(Long animalId) {
        trackerRepository.deleteByAnimalId(animalId);
    }

    /** Chaque nuit à 3 h 30 : supprime les positions plus vieilles que la durée de rétention. */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeOldPositions() {
        int deleted = positionRepository.purgeBefore(Instant.now().minus(retentionDays, ChronoUnit.DAYS));
        log.info("Purge GPS : {} position(s) supprimée(s)", deleted);
    }
}
