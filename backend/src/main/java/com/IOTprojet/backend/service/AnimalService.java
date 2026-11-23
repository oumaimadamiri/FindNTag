package com.IOTprojet.backend.service;

import com.IOTprojet.backend.dto.AnimalDTO;
import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.entity.AnimalTransfer;
import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.AnimalRepository;
import com.IOTprojet.backend.repository.AnimalTransferRepository;
import com.IOTprojet.backend.repository.GeofenceRepository;
import com.IOTprojet.backend.repository.GpsPositionRepository;
import com.IOTprojet.backend.repository.TrackerRepository;
import com.IOTprojet.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AnimalService {

    private final AnimalRepository animalRepository;
    private final UserRepository userRepository;
    private final AnimalTransferRepository animalTransferRepository;
    private final GpsPositionRepository gpsPositionRepository;
    private final GeofenceRepository geofenceRepository;
    private final TrackerRepository trackerRepository;
    private final FileStorageService fileStorageService;

    public AnimalService(AnimalRepository animalRepository, UserRepository userRepository,
                         AnimalTransferRepository animalTransferRepository,
                         GpsPositionRepository gpsPositionRepository,
                         GeofenceRepository geofenceRepository, TrackerRepository trackerRepository,
                         FileStorageService fileStorageService) {
        this.animalRepository = animalRepository;
        this.userRepository = userRepository;
        this.animalTransferRepository = animalTransferRepository;
        this.gpsPositionRepository = gpsPositionRepository;
        this.geofenceRepository = geofenceRepository;
        this.trackerRepository = trackerRepository;
        this.fileStorageService = fileStorageService;
    }

    // ===== Lecture =====

    /** Renvoie l'animal s'il appartient à ce CIN : 404 s'il n'existe pas, 403 s'il est à quelqu'un d'autre. */
    public Animal getOwned(Long id, String cin) {
        Animal animal = animalRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Animal introuvable"));
        if (animal.getOwner() == null || !animal.getOwner().getCin().equalsIgnoreCase(cin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cet animal ne vous appartient pas");
        }
        return animal;
    }

    public List<Animal> listByOwner(String cin) {
        return animalRepository.findByOwnerCin(cin);
    }

    public Long countByUserCin(String cin) {
        return animalRepository.countByUserCin(cin);
    }

    /** Ancien format de tag : retrouve SON animal par l'identifiant matériel du tag. */
    public Optional<Animal> findOwnedByTag(String tagId, String cin) {
        return animalRepository.findAllByTagId(tagId).stream()
                .filter(a -> isOwnedBy(a, cin))
                .findFirst();
    }

    /** Nouveau format de tag : retrouve SON animal par l'identifiant public. */
    public Optional<Animal> findOwnedByPublicId(String publicId, String cin) {
        return animalRepository.findByPublicId(publicId).filter(a -> isOwnedBy(a, cin));
    }

    public String getAnimalPhotoByTagId(String tagId) {
        List<String> urls = animalRepository.findFileUrlsByTagId(tagId);
        return urls.isEmpty() ? null : urls.get(0);
    }

    // ===== Écriture =====

    /** Le propriétaire est TOUJOURS l'utilisateur connecté (le ownerId envoyé par le client est ignoré). */
    @Transactional
    public Animal create(String ownerCin, AnimalDTO dto) {
        if (isBlank(dto.getNom()) || isBlank(dto.getRace()) || isBlank(dto.getAge())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nom, race et âge sont obligatoires");
        }
        User owner = userRepository.findByCin(ownerCin)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur inconnu"));

        Animal animal = new Animal();
        animal.setNom(dto.getNom());
        animal.setRace(dto.getRace());
        animal.setAge(dto.getAge());
        animal.setTagId(dto.getTagId());
        animal.setFileUrl(fileStorageService.storeBase64(dto.getImage()));
        animal.setOwner(owner);
        return animalRepository.save(animal);
    }

    /** Met à jour les champs fournis. Le propriétaire ne change QUE via {@link #transferAnimal}. */
    @Transactional
    public Animal update(Long id, String cin, AnimalDTO dto) {
        Animal animal = getOwned(id, cin);
        if (dto.getNom() != null) animal.setNom(dto.getNom());
        if (dto.getRace() != null) animal.setRace(dto.getRace());
        if (dto.getAge() != null) animal.setAge(dto.getAge());
        if (dto.getTagId() != null) animal.setTagId(dto.getTagId());

        if (!isBlank(dto.getImage())) {
            String newUrl = fileStorageService.storeBase64(dto.getImage());
            if (newUrl != null) animal.setFileUrl(newUrl);
        } else if (dto.getFileUrl() != null) {
            animal.setFileUrl(dto.getFileUrl());
        }
        return animalRepository.save(animal);
    }

    @Transactional
    public void transferAnimal(Long animalId, String fromCin, String toCin) {
        if (toCin == null || toCin.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CIN de l'acheteur requis");
        }
        String buyerCin = toCin.trim().toUpperCase();
        Animal animal = getOwned(animalId, fromCin);   // d'abord le droit (403), ensuite la validité de la demande
        if (buyerCin.equalsIgnoreCase(fromCin)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vous ne pouvez pas vous vendre un animal à vous-même");
        }
        User newOwner = userRepository.findByCin(buyerCin)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Acheteur introuvable"));

        animal.setOwner(newOwner);
        animalRepository.save(animal);

        AnimalTransfer transfer = new AnimalTransfer();
        transfer.setAnimal(animal);
        transfer.setFromCin(fromCin);
        transfer.setToCin(buyerCin);
        transfer.setTransferDate(LocalDateTime.now());
        animalTransferRepository.save(transfer);

        // Vie privée : le nouveau propriétaire ne voit pas l'historique ni la zone de l'ancien.
        // Le traceur reste associé à l'animal.
        gpsPositionRepository.deleteByAnimalId(animalId);
        geofenceRepository.deleteByAnimalId(animalId);
    }

    @Transactional
    public void deleteOwned(Long id, String cin) {
        Animal animal = getOwned(id, cin);
        gpsPositionRepository.deleteByAnimalId(id);
        geofenceRepository.deleteByAnimalId(id);
        trackerRepository.deleteByAnimalId(id);
        animalTransferRepository.deleteByAnimalId(id);   // l'historique des ventes part avec l'animal
        animalRepository.delete(animal);
    }

    private static boolean isOwnedBy(Animal a, String cin) {
        return a.getOwner() != null && a.getOwner().getCin().equalsIgnoreCase(cin);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
