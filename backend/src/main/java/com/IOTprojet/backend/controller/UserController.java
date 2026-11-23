package com.IOTprojet.backend.controller;

import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.UserRepository;
// import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.service.UserService;

import jakarta.persistence.EntityNotFoundException;

import com.IOTprojet.backend.service.AnimalService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UserService userService;

    @SuppressWarnings("unused")
    @Autowired
    private AnimalService animalService;

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        try {
            if (userService.existsByCin(user.getCin())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "CIN déjà utilisé"));
            }

            User savedUser = userService.createUser(user);
            return new ResponseEntity<>(savedUser, HttpStatus.CREATED);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur lors de la création: " + e.getMessage()));
        }
    }

    @GetMapping("/check_cin/{cin}")
    public ResponseEntity<?> checkCinExists(@PathVariable String cin) {
        boolean exists = userService.existsByCin(cin);
        return ResponseEntity.ok(Collections.singletonMap("exists", exists));
    }
    @GetMapping("/{cin}")
    public ResponseEntity<?> getUserByCin(@PathVariable String cin) {
        Optional<User> user = userRepository.findByCin(cin);
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Utilisateur introuvable");
        }
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            User user = userService.getUserById(id);

            if (!user.getAnimals().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Impossible de supprimer : l'utilisateur a des animaux associés"));
            }

            userService.deleteUser(id);
            return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé avec succès"));
        } catch (jakarta.persistence.EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur lors de la suppression: " + e.getMessage()));
        }
    }
    @DeleteMapping("/by-cin/{cin}")
    public ResponseEntity<?> deleteUserByCin(@PathVariable String cin) {
        try {
            User user = userService.getUserByCin(cin);

            if (!user.getAnimals().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Impossible de supprimer : l'utilisateur a des animaux associés"));
            }

            userService.deleteUser(user.getId());
            return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé avec succès"));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur lors de la suppression: " + e.getMessage()));
        }
    }


}

