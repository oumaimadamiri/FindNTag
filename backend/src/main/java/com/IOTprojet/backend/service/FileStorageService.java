package com.IOTprojet.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

/** Enregistre les photos des animaux. N'accepte que de vraies images (vérifiées sur leur contenu, pas sur leur nom). */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
    private static final long MAX_BYTES = 8L * 1024 * 1024;

    private final Path root;

    public FileStorageService(@Value("${app.upload-dir}") String uploadDir) throws IOException {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
        log.info("Dossier d'upload : {}", root);
    }

    /** Enregistre un fichier envoyé en multipart. Renvoie un chemin relatif "/uploads/xxx.jpg". */
    public String store(MultipartFile file) throws IOException {
        return write(file.getBytes());
    }

    /** Enregistre une image base64 (avec ou sans préfixe data:image/...). Renvoie null si ce n'est pas une image valide. */
    public String storeBase64(String base64) {
        if (base64 == null || base64.isBlank()) {
            return null;
        }
        String data = base64.contains(",") ? base64.substring(base64.indexOf(',') + 1) : base64;
        try {
            // décodage strict : les caractères illégaux provoquent une erreur au lieu d'être ignorés
            byte[] bytes = Base64.getDecoder().decode(data.replaceAll("\\s", ""));
            return write(bytes);
        } catch (IllegalArgumentException | ResponseStatusException | IOException e) {
            log.warn("Image base64 refusée : {}", e.getMessage());
            return null;
        }
    }

    private String write(byte[] bytes) throws IOException {
        if (bytes.length > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image trop volumineuse (max 8 Mo)");
        }
        String extension = imageExtension(bytes);
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le fichier n'est pas une image valide");
        }
        String filename = System.currentTimeMillis() + "_" + UUID.randomUUID() + extension;
        Files.write(root.resolve(filename), bytes);
        return "/uploads/" + filename;
    }

    /** Extension d'après les premiers octets (JPEG, PNG, GIF, WebP) ; null si ce n'est pas une image. */
    static String imageExtension(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return ".jpg";
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return ".png";
        }
        if (b.length >= 6 && new String(b, 0, 4, StandardCharsets.US_ASCII).equals("GIF8")) {
            return ".gif";
        }
        if (b.length >= 12 && new String(b, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                && new String(b, 8, 4, StandardCharsets.US_ASCII).equals("WEBP")) {
            return ".webp";
        }
        return null;
    }
}
