package com.IOTprojet.backend.repository;

import com.IOTprojet.backend.entity.Animal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface AnimalRepository extends JpaRepository<Animal, Long> {
    List<Animal> findAllByTagId(String tagId);

    // ✅ AJOUT : Méthode pour chercher par ownerId
    @Query("SELECT a FROM Animal a WHERE a.owner.id = :ownerId")
    List<Animal> findByOwnerId(@Param("ownerId") Long ownerId);

    @Query("SELECT a FROM Animal a WHERE a.owner.cin = :cin AND a.id NOT IN (SELECT at.animal.id FROM AnimalTransfer at WHERE at.fromCin = :cin)")
    List<Animal> findNonTransferredByOwnerCin(@Param("cin") String cin);

    @Query("SELECT COUNT(a) FROM Animal a WHERE a.owner.cin = :cin")
    Long countByUserCin(@Param("cin") String cin);
    
    @Query("SELECT a.fileUrl FROM Animal a WHERE a.tagId = :tagId")
    List<String> findFileUrlsByTagId(@Param("tagId") String tagId);
}