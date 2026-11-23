package com.IOTprojet.backend.repository;

import com.IOTprojet.backend.entity.Geofence;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GeofenceRepository extends JpaRepository<Geofence, Long> {
    Optional<Geofence> findByAnimalId(Long animalId);
    void deleteByAnimalId(Long animalId);
}
