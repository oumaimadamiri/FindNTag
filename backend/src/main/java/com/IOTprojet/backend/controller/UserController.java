package com.IOTprojet.backend.controller;

import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.security.CurrentUser;
import com.IOTprojet.backend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public User me() {
        return userService.getUserByCin(CurrentUser.cin());
    }

    /** Compatibilité avec l'app : uniquement son propre profil. */
    @GetMapping("/{cin}")
    public User getByCin(@PathVariable String cin) {
        CurrentUser.requireSelf(cin);
        return userService.getUserByCin(cin.trim());
    }

    /** Infos minimales d'un acheteur (vente d'un animal). */
    @GetMapping("/lookup/{cin}")
    public Map<String, String> lookup(@PathVariable String cin) {
        User u = userService.findByCin(cin.toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        return Map.of("cin", u.getCin(), "nom", u.getNom(), "prenom", u.getPrenom(),
                "telephone", u.getTelephone() == null ? "" : u.getTelephone());
    }

    @PutMapping("/me/push-token")
    public Map<String, String> savePushToken(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token == null || !token.startsWith("ExponentPushToken[") || token.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Jeton push invalide");
        }
        User user = userService.getUserByCin(CurrentUser.cin());
        user.setExpoPushToken(token);
        userService.saveUser(user);
        return Map.of("message", "OK");
    }

    @DeleteMapping("/me")
    public Map<String, String> deleteMe() {
        return deleteAccount(CurrentUser.cin());
    }

    /** Compatibilité avec l'app : uniquement son propre identifiant. */
    @DeleteMapping("/{id}")
    public Map<String, String> deleteById(@PathVariable Long id) {
        User u = userService.getUserById(id);
        CurrentUser.requireSelf(u.getCin());
        return deleteAccount(u.getCin());
    }

    private Map<String, String> deleteAccount(String cin) {
        User u = userService.getUserByCin(cin);
        if (u.getAnimals() != null && !u.getAnimals().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Impossible de supprimer : l'utilisateur a des animaux associés");
        }
        userService.deleteUser(u.getId());
        return Map.of("message", "Utilisateur supprimé avec succès");
    }
}