package com.IOTprojet.backend.repository;

import com.IOTprojet.backend.entity.GpsPosition;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface GpsPositionRepository extends JpaRepository<GpsPosition, Long> {

    Optional<GpsPosition> findFirstByAnimalIdOrderByRecordedAtDesc(Long animalId);

    List<GpsPosition> findByAnimalIdOrderByRecordedAtDesc(Long animalId, Pageable pageable);

    @Modifying
    @Query("DELETE FROM GpsPosition p WHERE p.animal.id = :animalId")
    void deleteByAnimalId(@Param("animalId") Long animalId);

    @Modifying
    @Query("DELETE FROM GpsPosition p WHERE p.recordedAt < :limit")
    int purgeBefore(@Param("limit") Instant limit);
}
