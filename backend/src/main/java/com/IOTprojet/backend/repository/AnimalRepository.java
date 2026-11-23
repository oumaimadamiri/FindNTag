package com.IOTprojet.backend.repository;

import com.IOTprojet.backend.entity.Animal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AnimalRepository extends JpaRepository<Animal, Long> {

    List<Animal> findAllByTagId(String tagId);

    Optional<Animal> findByPublicId(String publicId);

    /** Animaux créés avant la phase 5 : leur publicId est généré au démarrage. */
    List<Animal> findByPublicIdIsNull();

    // Le transfert change déjà le propriétaire : pas besoin de consulter l'historique des ventes
    // (l'ancienne requête excluait à tort un animal vendu puis racheté).
    List<Animal> findByOwnerCin(String cin);

    @Query("SELECT a FROM Animal a WHERE a.owner.id = :ownerId")
    List<Animal> findByOwnerId(@Param("ownerId") Long ownerId);

    @Query("SELECT COUNT(a) FROM Animal a WHERE a.owner.cin = :cin")
    Long countByUserCin(@Param("cin") String cin);

    @Query("SELECT a.fileUrl FROM Animal a WHERE a.tagId = :tagId")
    List<String> findFileUrlsByTagId(@Param("tagId") String tagId);
}
