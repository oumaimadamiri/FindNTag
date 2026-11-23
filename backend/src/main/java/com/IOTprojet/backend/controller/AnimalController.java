package com.IOTprojet.backend.controller;

import com.IOTprojet.backend.dto.AnimalDTO;
import com.IOTprojet.backend.dto.AnimalMapper;
import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.security.CurrentUser;
import com.IOTprojet.backend.service.AnimalService;
import com.IOTprojet.backend.service.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/animals")
public class AnimalController {

    private static final Logger log = LoggerFactory.getLogger(AnimalController.class);

    private final AnimalService animalService;
    private final FileStorageService fileStorageService;

    public AnimalController(AnimalService animalService, FileStorageService fileStorageService) {
        this.animalService = animalService;
        this.fileStorageService = fileStorageService;
    }

    public static class TransferDTO {
        private String toCin;
        public String getToCin() { return toCin; }
        public void setToCin(String toCin) { this.toCin = toCin; }
    }

    // ===== PUBLIC : lecture d'un ancien tag par une personne sans compte =====

    @GetMapping("/photo/{tagId}")
    public ResponseEntity<?> getPhotoByTagId(@PathVariable String tagId) {
        String url = animalService.getAnimalPhotoByTagId(tagId);
        return url != null ? ResponseEntity.ok(Map.of("fileUrl", url)) : ResponseEntity.notFound().build();
    }

    // ===== AUTHENTIFIÉ =====

    @GetMapping("/user/{cin}")
    public List<Animal> listByUser(@PathVariable String cin) {
        CurrentUser.requireSelf(cin);
        return animalService.listByOwner(cin.trim());
    }

    @GetMapping("/count/by-user/{cin}")
    public Long countByUser(@PathVariable String cin) {
        CurrentUser.requireSelf(cin);
        return animalService.countByUserCin(cin.trim());
    }

    /** Ancien format de tag : identifiant matériel du tag. */
    @GetMapping("/tag/{tagId}")
    public AnimalDTO getByTag(@PathVariable String tagId) {
        return animalService.findOwnedByTag(tagId, CurrentUser.cin())
                .map(AnimalMapper::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Animal introuvable"));
    }

    /** Retrouve SON animal à partir de l'identifiant public lu sur le tag NFC. */
    @GetMapping("/by-public-id/{publicId}")
    public AnimalDTO getByPublicId(@PathVariable String publicId) {
        return animalService.findOwnedByPublicId(publicId, CurrentUser.cin())
                .map(AnimalMapper::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Animal introuvable"));
    }

    @GetMapping("/{id}")
    public Animal getById(@PathVariable Long id) {
        return animalService.getOwned(id, CurrentUser.cin());
    }

    @PostMapping
    public Animal create(@RequestBody AnimalDTO dto) {
        return animalService.create(CurrentUser.cin(), dto);
    }

    @PutMapping("/{id}")
    public Animal update(@PathVariable Long id, @RequestBody AnimalDTO dto) {
        return animalService.update(id, CurrentUser.cin(), dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        animalService.deleteOwned(id, CurrentUser.cin());
    }

    @PostMapping("/{id}/transfer")
    public Map<String, String> transfer(@PathVariable Long id, @RequestBody TransferDTO transfer) {
        animalService.transferAnimal(id, CurrentUser.cin(), transfer.getToCin());
        return Map.of("message", "Transfert effectué avec succès.");
    }

    @PostMapping("/upload-file")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Fichier vide");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body("Seuls les fichiers image sont autorisés");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body("Fichier trop volumineux (max 5MB)");
        }
        try {
            return ResponseEntity.ok(fileStorageService.store(file));
        } catch (IOException e) {
            log.error("Erreur lors de l'upload", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erreur lors de l'enregistrement du fichier");
        }
    }
}
