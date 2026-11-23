package com.IOTprojet.backend.controller;

import com.IOTprojet.backend.dto.AnimalDTO;
import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.AnimalRepository;
import com.IOTprojet.backend.repository.UserRepository;
import com.IOTprojet.backend.service.AnimalService;
import com.IOTprojet.backend.service.FileStorageService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.io.IOException;

import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/animals")
@CrossOrigin(origins = "*")
public class AnimalController {

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AnimalService animalService;

    public static class TransferDTO {
        public String toCin;

        public String getToCin() {
            return toCin;
        }

        public void setToCin(String toCin) {
            this.toCin = toCin;
        }
    }

        @Autowired
    private FileStorageService fileStorageService;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AnimalController.class);

    @PostMapping("/{id}/transfer")
    public ResponseEntity<?> transferAnimal(
            @PathVariable Long id,
            @RequestBody TransferDTO transfer,
            @RequestHeader("cin") String fromCin
    ) {
        try {
            animalService.transferAnimal(id, fromCin, transfer.getToCin());
            return ResponseEntity.ok("Transfert effectué avec succès.");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping("/photo/{tagId}")
    public ResponseEntity<?> getAnimalPhotoByTagId(@PathVariable String tagId) {
        String url = animalService.getAnimalPhotoByTagId(tagId);
        if (url != null) {
            Map<String, String> response = new HashMap<>();
            response.put("fileUrl", url);
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.notFound().build();
        }
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de l'enregistrement du fichier");
        }
    }

    // ✅ MODIFIÉ : Traiter l'image base64 dans addAnimal
    @PostMapping
    public ResponseEntity<Animal> addAnimal(@RequestBody AnimalDTO dto) {
        try {
            // Vérification des champs obligatoires
            if (dto.getNom() == null || dto.getRace() == null || dto.getAge() == null || dto.getOwnerId() == null) {
                return ResponseEntity.badRequest().body(null);
            }

            // Récupération de l'utilisateur propriétaire
            Optional<User> userOpt = userRepository.findById(dto.getOwnerId());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
            }

            // ✅ NOUVEAU : Traiter l'image base64
            String fileUrl = null;
            if (dto.getImage() != null && !dto.getImage().isEmpty()) {
                fileUrl = fileStorageService.storeBase64(dto.getImage());
                System.out.println("Image traitée pour animal: " + dto.getNom() + " -> " + fileUrl);
            }

            // Construction de l'objet Animal
            Animal animal = new Animal();
            animal.setNom(dto.getNom());
            animal.setRace(dto.getRace());
            animal.setAge(dto.getAge());
            animal.setTagId(dto.getTagId());
            animal.setFileUrl(fileUrl); // ✅ URL de l'image sauvegardée
            animal.setOwner(userOpt.get());

            // Sauvegarde et retour
            Animal savedAnimal = animalRepository.save(animal);
            System.out.println("Animal sauvegardé avec succès: " + savedAnimal.getId());
            
            return ResponseEntity.ok(savedAnimal);

        } catch (Exception e) {
            System.err.println("Erreur lors de l'ajout d'animal: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/owner/{ownerId}")
    public ResponseEntity<AnimalDTO> getAnimalByOwnerId(@PathVariable Long ownerId) {
        List<Animal> animals = animalRepository.findByOwnerId(ownerId);

        if (animals.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Animal animal = animals.get(0);

        AnimalDTO dto = new AnimalDTO();
        dto.setId(animal.getId());
        dto.setNom(animal.getNom());
        dto.setRace(animal.getRace());
        dto.setAge(animal.getAge());
        dto.setTagId(animal.getTagId());
        dto.setFileUrl(animal.getFileUrl());
        dto.setOwnerId(ownerId);

        User owner = animal.getOwner();
        if (owner != null) {
            dto.setOwnerNom(owner.getNom());
            dto.setOwnerPrenom(owner.getPrenom());
            dto.setOwnerTelephone(owner.getTelephone());
        }

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/tag/{tagId}")
    public ResponseEntity<AnimalDTO> getAnimalByTagId(@PathVariable String tagId) {
        List<Animal> animals = animalRepository.findAllByTagId(tagId);

        if (animals.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Animal animal = animals.get(0);

        AnimalDTO dto = new AnimalDTO();
        dto.setId(animal.getId());
        dto.setNom(animal.getNom());
        dto.setRace(animal.getRace());
        dto.setAge(animal.getAge());
        dto.setTagId(animal.getTagId());
        dto.setFileUrl(animal.getFileUrl());
        dto.setOwnerId(animal.getOwner().getId());

        User owner = animal.getOwner();
        if (owner != null) {
            dto.setOwnerNom(owner.getNom());
            dto.setOwnerPrenom(owner.getPrenom());
            dto.setOwnerTelephone(owner.getTelephone());
        }

        return ResponseEntity.ok(dto);
    }

    @GetMapping
    public List<Animal> getAllAnimals() {
        return animalRepository.findAll();
    }

    @GetMapping("/{id}")
    public Animal getAnimalById(@PathVariable Long id) {
        return animalRepository.findById(id).orElse(null);
    }

    @PutMapping("/{id}")
    public Animal updateAnimal(@PathVariable Long id, @RequestBody AnimalDTO dto) {
        return animalRepository.findById(id).map(animal -> {
            animal.setNom(dto.getNom());
            animal.setRace(dto.getRace());
            animal.setAge(dto.getAge());
            animal.setTagId(dto.getTagId());

            // ✅ NOUVEAU : Traiter nouvelle image si fournie
            if (dto.getImage() != null && !dto.getImage().isEmpty()) {
                String newFileUrl = fileStorageService.storeBase64(dto.getImage());
                if (newFileUrl != null) {
                    animal.setFileUrl(newFileUrl);
                }
            } else if (dto.getFileUrl() != null) {
                animal.setFileUrl(dto.getFileUrl());
            }

            if (dto.getOwnerId() != null) {
                Optional<User> userOpt = userRepository.findById(dto.getOwnerId());
                userOpt.ifPresent(animal::setOwner);
            }

            return animalRepository.save(animal);
        }).orElse(null);
    }

    @DeleteMapping("/{id}")
    public void deleteAnimal(@PathVariable Long id) {
        animalRepository.deleteById(id);
    }

    @GetMapping("/user/{cin}")
    public List<Animal> getCurrentAnimalsByUserCin(@PathVariable String cin) {
        return animalRepository.findNonTransferredByOwnerCin(cin);
    }

    @GetMapping("/count/by-user/{cin}")
    public ResponseEntity<Long> countByUserCin(@PathVariable String cin) {
        Long count = animalService.countByUserCin(cin);
        return ResponseEntity.ok(count);
    }
}
// package com.IOTprojet.backend.controller;

// import com.IOTprojet.backend.dto.AnimalDTO;
// import com.IOTprojet.backend.entity.Animal;
// import com.IOTprojet.backend.entity.User;
// import com.IOTprojet.backend.repository.AnimalRepository;
// import com.IOTprojet.backend.repository.UserRepository;
// import com.IOTprojet.backend.service.AnimalService;

// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.http.HttpStatus;
// import org.springframework.http.ResponseEntity;
// import org.springframework.web.bind.annotation.*;

// import java.util.HashMap;
// import java.util.List;
// import java.util.Map;
// import java.util.Optional;
// import java.util.UUID;

// import org.springframework.web.multipart.MultipartFile;

// import java.io.IOException;
// import java.nio.file.*;

// @RestController
// @RequestMapping("/api/animals")
// @CrossOrigin(origins = "*")
// public class AnimalController {

//     @Autowired
//     private AnimalRepository animalRepository;

//     @Autowired
//     private UserRepository userRepository;

//     @Autowired
//     private AnimalService animalService;

//     public static class TransferDTO {
//         public String toCin;

//         public String getToCin() {
//             return toCin;
//         }

//         public void setToCin(String toCin) {
//             this.toCin = toCin;
//         }
//     }

//     @PostMapping("/{id}/transfer")
//     public ResponseEntity<?> transferAnimal(
//             @PathVariable Long id,
//             @RequestBody TransferDTO transfer,
//             @RequestHeader("cin") String fromCin
//     ) {
//         try {
//             animalService.transferAnimal(id, fromCin, transfer.getToCin());
//             return ResponseEntity.ok("Transfert effectué avec succès.");
//         } catch (RuntimeException e) {
//             return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
//         }
//     }

//     @GetMapping("/photo/{tagId}")
//     public ResponseEntity<?> getAnimalPhotoByTagId(@PathVariable String tagId) {
//         String url = animalService.getAnimalPhotoByTagId(tagId);
//         if (url != null) {
//             Map<String, String> response = new HashMap<>();
//             response.put("fileUrl", url);
//             return ResponseEntity.ok(response);
//         } else {
//             return ResponseEntity.notFound().build();
//         }
//     }

//     @PostMapping("/upload-file")
//     public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
//         try {
//             // ✅ Validation du fichier
//             if (file.isEmpty()) {
//                 return ResponseEntity.status(HttpStatus.BAD_REQUEST)
//                         .body("Fichier vide");
//             }
            
//             // ✅ Validation du type MIME
//             String contentType = file.getContentType();
//             if (contentType == null || !contentType.startsWith("image/")) {
//                 return ResponseEntity.status(HttpStatus.BAD_REQUEST)
//                         .body("Seuls les fichiers image sont autorisés");
//             }
            
//             // ✅ Validation de la taille (max 5MB)
//             if (file.getSize() > 5 * 1024 * 1024) {
//                 return ResponseEntity.status(HttpStatus.BAD_REQUEST)
//                         .body("Fichier trop volumineux (max 5MB)");
//             }
            
//             // ✅ Logs pour debug
//             System.out.println("=== UPLOAD FILE DEBUG ===");
//             System.out.println("Nom original: " + file.getOriginalFilename());
//             System.out.println("Type MIME: " + contentType);
//             System.out.println("Taille: " + file.getSize() + " bytes");
            
//             // ✅ Créer le dossier s'il n'existe pas
//             String folderPath = "C:/Users/pc/Desktop/Application/backend/src/main/resources/static/uploads/";
//             Path uploadDir = Paths.get(folderPath);
//             if (!Files.exists(uploadDir)) {
//                 Files.createDirectories(uploadDir);
//                 System.out.println("Dossier créé: " + uploadDir.toAbsolutePath());
//             }
            
//             // ✅ Générer nom de fichier unique
//             String originalFilename = file.getOriginalFilename();
//             String fileExtension = "";
//             if (originalFilename != null && originalFilename.contains(".")) {
//                 fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
//             }
//             String filename = System.currentTimeMillis() + "_" + UUID.randomUUID().toString() + fileExtension;
            
//             // ✅ Chemin complet du fichier
//             Path filePath = uploadDir.resolve(filename);
//             System.out.println("Chemin final: " + filePath.toAbsolutePath());
            
//             // ✅ Écrire le fichier
//             Files.write(filePath, file.getBytes());
//             System.out.println("Fichier écrit avec succès");
            
//             // ✅ Vérifier que le fichier a été créé
//             if (!Files.exists(filePath)) {
//                 return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                         .body("Échec de la création du fichier");
//             }
            
//             // ✅ Retourner l'URL complète
//             String fileUrl = "http://192.168.127.233:8081/uploads/" + filename;
//             System.out.println("URL finale: " + fileUrl);
            
//             return ResponseEntity.ok(fileUrl);
            
//         } catch (IOException e) {
//             System.err.println("Erreur I/O lors de l'upload: " + e.getMessage());
//             e.printStackTrace();
//             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                     .body("Erreur lors de l'écriture du fichier: " + e.getMessage());
//         } catch (Exception e) {
//             System.err.println("Erreur générale lors de l'upload: " + e.getMessage());
//             e.printStackTrace();
//             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
//                     .body("Erreur inattendue: " + e.getMessage());
//         }
//     }

//     @PostMapping
//     public ResponseEntity<Animal> addAnimal(@RequestBody AnimalDTO dto) {
//         // Vérification des champs obligatoires
//         if (dto.getNom() == null || dto.getRace() == null || dto.getAge() == null || dto.getOwnerId() == null) {
//             return ResponseEntity.badRequest().body(null);
//         }

//         // Récupération de l'utilisateur propriétaire
//         Optional<User> userOpt = userRepository.findById(dto.getOwnerId());
//         if (userOpt.isEmpty()) {
//             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
//         }

//         // Construction de l'objet Animal
//         Animal animal = new Animal();
//         animal.setNom(dto.getNom());
//         animal.setRace(dto.getRace());
//         animal.setAge(dto.getAge());
//         animal.setTagId(dto.getTagId());
//         animal.setFileUrl(dto.getFileUrl()); // ✅ Ajout du fileUrl
//         animal.setOwner(userOpt.get());

//         // Sauvegarde et retour
//         Animal savedAnimal = animalRepository.save(animal);
//         return ResponseEntity.ok(savedAnimal);
//     }

//     // ✅ CORRECTION : Chercher par ownerId au lieu de findById
//     @GetMapping("/owner/{ownerId}")
//     public ResponseEntity<AnimalDTO> getAnimalByOwnerId(@PathVariable Long ownerId) {
//         // Chercher tous les animaux de ce propriétaire
//         List<Animal> animals = animalRepository.findByOwnerId(ownerId);

//         if (animals.isEmpty()) {
//             return ResponseEntity.notFound().build();
//         }

//         // Prendre le premier animal trouvé
//         Animal animal = animals.get(0);

//         AnimalDTO dto = new AnimalDTO();
//         dto.setId(animal.getId());
//         dto.setNom(animal.getNom());
//         dto.setRace(animal.getRace());
//         dto.setAge(animal.getAge());
//         dto.setTagId(animal.getTagId());
//         dto.setFileUrl(animal.getFileUrl()); // ✅ Inclure fileUrl
//         dto.setOwnerId(ownerId);

//         User owner = animal.getOwner();
//         if (owner != null) {
//             dto.setOwnerNom(owner.getNom());
//             dto.setOwnerPrenom(owner.getPrenom());
//             dto.setOwnerTelephone(owner.getTelephone());
//         }

//         return ResponseEntity.ok(dto);
//     }

//     // ✅ NOUVEAU : Endpoint pour chercher par tagId et retourner avec infos owner
//     @GetMapping("/tag/{tagId}")
// public ResponseEntity<AnimalDTO> getAnimalByTagId(@PathVariable String tagId) {
//     List<Animal> animals = animalRepository.findAllByTagId(tagId);

//     if (animals.isEmpty()) {
//         return ResponseEntity.notFound().build();
//     }

//     Animal animal = animals.get(0); // ⚠ On prend arbitrairement le premier

//     AnimalDTO dto = new AnimalDTO();
//     dto.setId(animal.getId());
//     dto.setNom(animal.getNom());
//     dto.setRace(animal.getRace());
//     dto.setAge(animal.getAge());
//     dto.setTagId(animal.getTagId());
//     dto.setFileUrl(animal.getFileUrl());
//     dto.setOwnerId(animal.getOwner().getId());

//     User owner = animal.getOwner();
//     if (owner != null) {
//         dto.setOwnerNom(owner.getNom());
//         dto.setOwnerPrenom(owner.getPrenom());
//         dto.setOwnerTelephone(owner.getTelephone());
//     }

//     return ResponseEntity.ok(dto);
// }

//     // 🔸 Récupérer tous les animaux
//     @GetMapping
//     public List<Animal> getAllAnimals() {
//         return animalRepository.findAll();
//     }

//     // 🔸 Récupérer un animal par ID
//     @GetMapping("/{id}")
//     public Animal getAnimalById(@PathVariable Long id) {
//         return animalRepository.findById(id).orElse(null);
//     }

//     // 🔸 Mettre à jour un animal
//     @PutMapping("/{id}")
//     public Animal updateAnimal(@PathVariable Long id, @RequestBody AnimalDTO dto) {
//         return animalRepository.findById(id).map(animal -> {
//             animal.setNom(dto.getNom());
//             animal.setRace(dto.getRace());
//             animal.setAge(dto.getAge());
//             animal.setTagId(dto.getTagId());
//             animal.setFileUrl(dto.getFileUrl()); // ✅ Mettre à jour fileUrl

//             if (dto.getOwnerId() != null) {
//                 Optional<User> userOpt = userRepository.findById(dto.getOwnerId());
//                 userOpt.ifPresent(animal::setOwner);
//             }

//             return animalRepository.save(animal);
//         }).orElse(null);
//     }

//     // 🔸 Supprimer un animal
//     @DeleteMapping("/{id}")
//     public void deleteAnimal(@PathVariable Long id) {
//         animalRepository.deleteById(id);
//     }

//     @GetMapping("/user/{cin}")
//     public List<Animal> getCurrentAnimalsByUserCin(@PathVariable String cin) {
//         return animalRepository.findNonTransferredByOwnerCin(cin);
//     }

//     @GetMapping("/count/by-user/{cin}")
//     public ResponseEntity<Long> countByUserCin(@PathVariable String cin) {
//         Long count = animalService.countByUserCin(cin);
//         return ResponseEntity.ok(count);
//     }
// }