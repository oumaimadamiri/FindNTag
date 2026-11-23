package com.IOTprojet.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OcrService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ocr.api.url}")
    private String ocrApiUrl;

    /** Envoie l'image au service Flask et renvoie {cin, nom, prenom} (valeurs vides si non trouvées). */
    @SuppressWarnings("rawtypes")
    public Map<String, String> extract(MultipartFile file) throws IOException {
        final String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "cin.jpg";
        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", resource);

        ResponseEntity<Map> response = restTemplate.postForEntity(ocrApiUrl, new HttpEntity<>(body, headers), Map.class);
        Object data = response.getBody() == null ? null : response.getBody().get("data");
        if (!(data instanceof Map<?, ?> map)) {
            throw new IllegalStateException("Réponse OCR invalide : clé 'data' absente");
        }

        Map<String, String> result = new HashMap<>();
        for (String key : List.of("cin", "nom", "prenom")) {
            Object value = map.get(key);
            result.put(key, value instanceof String s ? s : "");
        }
        return result;
    }
}