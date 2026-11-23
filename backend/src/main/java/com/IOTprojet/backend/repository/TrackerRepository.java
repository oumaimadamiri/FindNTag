package com.IOTprojet.backend.repository;

import com.IOTprojet.backend.entity.Tracker;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TrackerRepository extends JpaRepository<Tracker, Long> {
    Optional<Tracker> findByDeviceId(String deviceId);
    Optional<Tracker> findByAnimalId(Long animalId);
    void deleteByAnimalId(Long animalId);
}
