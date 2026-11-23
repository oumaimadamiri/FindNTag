package com.IOTprojet.backend.controller;

import com.IOTprojet.backend.dto.OtpRequest;
import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.service.OtpGeneratorService;
import com.IOTprojet.backend.service.OtpService;
import com.IOTprojet.backend.service.EmailService;
import com.IOTprojet.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.IOTprojet.backend.service.OcrService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);


    @Autowired
    private UserService userService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private OcrService ocrService;

    @Autowired
    private OtpGeneratorService otpGenerator;

    @Autowired
    private OtpService otpService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestParam("file") MultipartFile file,
                                          @RequestParam("email") String email,
                                          @RequestParam("telephone") String telephone,
                                          @RequestParam(value = "cin", required = false) String cinFromFront,
                                          @RequestParam(value = "nom", required = false) String nomFromFront,
                                          @RequestParam(value = "prenom", required = false) String prenomFromFront) {
            logger.info("Entrée dans registerUser");
            try {
                        // L'app a déjà fait l'OCR : on ne le relance que s'il manque des champs
            boolean frontComplete = cinFromFront != null && !cinFromFront.isBlank()
                    && nomFromFront != null && !nomFromFront.isBlank()
                    && prenomFromFront != null && !prenomFromFront.isBlank();
            Map<String, String> ocrData = frontComplete ? Map.of() : ocrService.extract(file);            
            String cin = (cinFromFront != null && !cinFromFront.isEmpty()) ? cinFromFront : ocrData.getOrDefault("cin", "");
            String nom = (nomFromFront != null && !nomFromFront.isEmpty()) ? nomFromFront : ocrData.getOrDefault("nom", "");
            String prenom = (prenomFromFront != null && !prenomFromFront.isEmpty()) ? prenomFromFront : ocrData.getOrDefault("prenom", "");

            if (cin.isEmpty() || nom.isEmpty() || prenom.isEmpty()) {
                return ResponseEntity.badRequest().body("Échec de l'extraction OCR via Flask.");
            }
            if (userService.existsByCin(cin)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("Utilisateur déjà inscrit.");
            }

            User user = new User();
            user.setCin(cin);
            user.setNom(nom);
            user.setPrenom(prenom);
            user.setEmail(email);
            user.setTelephone(telephone);
            userService.saveUser(user);

            Map<String, String> response = new HashMap<>();
            response.put("cin", cin);
            response.put("nom", nom);
            response.put("prenom", prenom);
            response.put("email", email);        // ← ajoute ceci
            response.put("telephone", telephone); 

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Exception capturée dans registerUser : " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de l’inscription : " + e.getMessage());
        }
    }

    @PostMapping("/set-otp")
    public ResponseEntity<?> setOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String pin = request.get("pin");
        
        if (email == null || pin == null || pin.length() != 6) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email et PIN (6 chiffres) requis"));
        }

        User user = userService.getUserByEmail(email);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Aucun utilisateur avec cet email"));
        }

        // Sauvegarder le PIN pour cet utilisateur
        otpService.saveOtp(email, pin);
        
        return ResponseEntity.ok(Map.of("message", "PIN enregistré avec succès"));
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody OtpRequest request) {
        String email = request.getEmail();

        User user = userService.getUserByEmail(email);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Aucun utilisateur avec cet email"));
        }

        String otp = otpGenerator.generateOtp();
        otpService.saveOtp(email, otp);

        try {
            // Envoyer l'email avec le code OTP
            emailService.sendEmail(email, "Votre code de vérification", 
                "Bonjour,\n\nVotre code de vérification est : " + otp + 
                "\n\nCe code expire dans 10 minutes.\n\nCordialement,\nVotre équipe");
            
            return ResponseEntity.ok(Map.of("message", "OTP envoyé avec succès"));
        } catch (Exception e) {
            System.err.println("Erreur envoi email: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur lors de l'envoi de l'email"));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String pin = request.get("pin");

        if (email == null || pin == null) {
            return ResponseEntity.badRequest()
                    .body("Email et PIN requis");
        }

        User user = userService.getUserByEmail(email);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Aucun utilisateur avec cet email");
        }

        String savedOtp = otpService.getOtp(email);
        if (savedOtp != null && savedOtp.equals(pin)) {
            otpService.removeOtp(email);
            return ResponseEntity.ok(Map.of("message", "OTP vérifié avec succès"));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Code PIN incorrect");
        }
    }

}
