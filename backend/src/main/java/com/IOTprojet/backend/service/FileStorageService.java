package com.IOTprojet.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
    private final Path root;

    public FileStorageService(@Value("${app.upload-dir}") String uploadDir) throws IOException {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
        log.info("Dossier d'upload : {}", root);
    }

    /** Enregistre un fichier envoyé en multipart. Renvoie un chemin relatif "/uploads/xxx.jpg". */
    public String store(MultipartFile file) throws IOException {
        return write(file.getBytes(), extensionOf(file.getOriginalFilename()));
    }

    /** Enregistre une image base64 (avec ou sans préfixe data:image/...). Renvoie null en cas d'échec. */
    public String storeBase64(String base64) {
        if (base64 == null || base64.isBlank()) {
            return null;
        }
        String data = base64.contains(",") ? base64.substring(base64.indexOf(',') + 1) : base64;
        try {
            return write(Base64.getMimeDecoder().decode(data), ".jpg");
        } catch (IllegalArgumentException | IOException e) {
            log.error("Impossible d'enregistrer l'image base64", e);
            return null;
        }
    }

    private String write(byte[] bytes, String extension) throws IOException {
        String filename = System.currentTimeMillis() + "_" + UUID.randomUUID() + extension;
        Files.write(root.resolve(filename), bytes);
        return "/uploads/" + filename;
    }

    private String extensionOf(String name) {
        if (name == null || !name.contains(".")) {
            return ".jpg";
        }
        String ext = name.substring(name.lastIndexOf('.')).toLowerCase();
        return ext.matches("\\.(jpg|jpeg|png|webp|gif)") ? ext : ".jpg";
    }
}