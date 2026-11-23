package com.IOTprojet.backend.repository;

import com.IOTprojet.backend.entity.AnimalTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnimalTransferRepository extends JpaRepository<AnimalTransfer, Long> {
    void deleteByAnimalId(Long animalId);
}