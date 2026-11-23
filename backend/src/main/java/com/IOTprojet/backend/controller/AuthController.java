package com.IOTprojet.backend.controller;

import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.security.JwtService;
import com.IOTprojet.backend.service.*;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final EmailService emailService;
    private final OcrService ocrService;
    private final OtpGeneratorService otpGenerator;
    private final OtpService otpService;
    private final JwtService jwtService;

    public AuthController(UserService userService, EmailService emailService, OcrService ocrService,
                          OtpGeneratorService otpGenerator, OtpService otpService, JwtService jwtService) {
        this.userService = userService;
        this.emailService = emailService;
        this.ocrService = ocrService;
        this.otpGenerator = otpGenerator;
        this.otpService = otpService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestParam("file") MultipartFile file,
                                      @RequestParam("email") String email,
                                      @RequestParam("telephone") String telephone,
                                      @RequestParam(value = "cin", required = false) String cinFromFront,
                                      @RequestParam(value = "nom", required = false) String nomFromFront,
                                      @RequestParam(value = "prenom", required = false) String prenomFromFront) {
        try {
            boolean frontComplete = !blank(cinFromFront) && !blank(nomFromFront) && !blank(prenomFromFront);
            Map<String, String> ocr = frontComplete ? Map.of() : ocrService.extract(file);

            String cin = pick(cinFromFront, ocr.get("cin")).toUpperCase();
            String nom = pick(nomFromFront, ocr.get("nom"));
            String prenom = pick(prenomFromFront, ocr.get("prenom"));

            if (cin.isEmpty() || nom.isEmpty() || prenom.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "CIN, nom ou prénom introuvable sur la carte."));
            }
            if (blank(email) || !email.contains("@")) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email invalide."));
            }
            if (userService.existsByCin(cin)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Utilisateur déjà inscrit."));
            }

            User user = new User();
            user.setCin(cin);
            user.setNom(nom);
            user.setPrenom(prenom);
            user.setEmail(email.trim());
            user.setTelephone(telephone.trim());
            userService.saveUser(user);

            return ResponseEntity.ok(Map.of("cin", cin, "nom", nom, "prenom", prenom,
                    "email", email.trim(), "telephone", telephone.trim()));
        } catch (Exception e) {
            log.error("Erreur lors de l'inscription", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur lors de l'inscription"));
        }
    }

    /** Envoie un code à 6 chiffres à l'email enregistré pour ce CIN. */
    @PostMapping("/request-otp")
    public ResponseEntity<?> requestOtp(@RequestBody Map<String, String> body) {
        String cin = normalize(body.get("cin"));
        if (cin.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "CIN requis"));
        }

        User user;
        try {
            user = userService.getUserByCin(cin);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Aucun compte associé à ce CIN"));
        }
        if (blank(user.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Aucun email enregistré pour ce compte"));
        }

        long wait = otpService.secondsBeforeResend(cin);
        if (wait > 0) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Veuillez patienter " + wait + " s avant de redemander un code"));
        }

        String otp = otpGenerator.generateOtp();
        otpService.save(cin, otp);
        try {
            emailService.sendEmail(user.getEmail(), "Votre code de vérification",
                    "Bonjour " + user.getPrenom() + ",\n\nVotre code de vérification est : " + otp
                            + "\n\nCe code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.");
        } catch (Exception e) {
            otpService.remove(cin);
            log.error("Envoi de l'email impossible", e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message", "Erreur lors de l'envoi de l'email"));
        }
        return ResponseEntity.ok(Map.of("message", "Code envoyé", "maskedEmail", mask(user.getEmail())));
    }

    /** Vérifie le code et renvoie le jeton JWT avec le profil. */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String cin = normalize(body.get("cin"));
        String code = body.get("code");
        if (cin.isEmpty() || code == null || !code.matches("\\d{6}")) {
            return ResponseEntity.badRequest().body(Map.of("message", "CIN et code à 6 chiffres requis"));
        }
        if (!otpService.verify(cin, code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Code invalide ou expiré"));
        }
        User user = userService.getUserByCin(cin);
        return ResponseEntity.ok(Map.of("token", jwtService.generate(cin), "user", user));
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String pick(String fromFront, String fromOcr) {
        if (!blank(fromFront)) return fromFront.trim();
        return fromOcr == null ? "" : fromOcr.trim();
    }

    private static String normalize(String cin) {
        return cin == null ? "" : cin.trim().toUpperCase();
    }

    private static String mask(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return "***" + email.substring(Math.max(at, 0));
        return email.charAt(0) + "***" + email.substring(at);
    }
}