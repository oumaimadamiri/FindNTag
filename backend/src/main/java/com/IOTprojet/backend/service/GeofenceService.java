package com.IOTprojet.backend.service;

import com.IOTprojet.backend.dto.GeoPoint;
import com.IOTprojet.backend.dto.GeofenceDTO;
import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.entity.Geofence;
import com.IOTprojet.backend.repository.GeofenceRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class GeofenceService {

    private static final Logger log = LoggerFactory.getLogger(GeofenceService.class);
    private static final TypeReference<List<GeoPoint>> POINTS_TYPE = new TypeReference<>() {};

    private final GeofenceRepository geofenceRepository;
    private final PushService pushService;
    private final ObjectMapper mapper;

    public GeofenceService(GeofenceRepository geofenceRepository, PushService pushService, ObjectMapper mapper) {
        this.geofenceRepository = geofenceRepository;
        this.pushService = pushService;
        this.mapper = mapper;
    }

    public GeofenceDTO get(Long animalId) {
        return geofenceRepository.findByAnimalId(animalId)
                .map(this::toDto)
                .orElse(new GeofenceDTO(false, List.of(), null));
    }

    @Transactional
    public GeofenceDTO save(Animal animal, GeofenceDTO in) {
        List<GeoPoint> points = in.points() == null ? List.of() : in.points();
        if (points.size() < 3 || points.size() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Une zone doit avoir entre 3 et 200 points");
        }
        for (GeoPoint p : points) {
            if (Math.abs(p.latitude()) > 90 || Math.abs(p.longitude()) > 180) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coordonnées hors limites");
            }
        }
        Geofence g = geofenceRepository.findByAnimalId(animal.getId()).orElseGet(Geofence::new);
        g.setAnimal(animal);
        g.setPointsJson(write(points));
        g.setEnabled(in.enabled());
        g.setLastInside(null);   // on repart d'un état inconnu
        return toDto(geofenceRepository.save(g));
    }

    /** Appelé à chaque nouvelle position : alerte UNIQUEMENT quand l'animal sort de la zone. */
    public void onPosition(Animal animal, double lat, double lng) {
        Geofence g = geofenceRepository.findByAnimalId(animal.getId()).orElse(null);
        if (g == null || !g.isEnabled()) return;

        List<GeoPoint> polygon = read(g.getPointsJson());
        if (polygon.size() < 3) return;

        boolean inside = contains(polygon, lat, lng);
        Boolean last = g.getLastInside();

        if (!inside && (last == null || last)) {
            log.info("Animal {} sorti de la zone ({}, {})", animal.getId(), lat, lng);
            pushService.send(animal.getOwner().getExpoPushToken(),
                    "🚨 Alerte zone",
                    animal.getNom() + " est sorti de la zone autorisée",
                    Map.of("animalId", animal.getId()));
        }
        if (last == null || last != inside) {
            g.setLastInside(inside);
            geofenceRepository.save(g);
        }
    }

    /** Test « point dans polygone » (lancer de rayon). */
    public static boolean contains(List<GeoPoint> zone, double lat, double lng) {
        boolean inside = false;
        for (int i = 0, j = zone.size() - 1; i < zone.size(); j = i++) {
            double xi = zone.get(i).latitude(), yi = zone.get(i).longitude();
            double xj = zone.get(j).latitude(), yj = zone.get(j).longitude();
            boolean intersect = ((yi > lng) != (yj > lng))
                    && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    private GeofenceDTO toDto(Geofence g) {
        return new GeofenceDTO(g.isEnabled(), read(g.getPointsJson()), g.getLastInside());
    }

    private String write(List<GeoPoint> points) {
        try {
            return mapper.writeValueAsString(points);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Zone invalide");
        }
    }

    private List<GeoPoint> read(String json) {
        try {
            return json == null ? List.of() : mapper.readValue(json, POINTS_TYPE);
        } catch (JsonProcessingException e) {
            log.error("Zone illisible en base", e);
            return List.of();
        }
    }
}
