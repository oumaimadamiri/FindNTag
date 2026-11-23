package com.IOTprojet.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);
    private static final String EXPO_URL = "https://exp.host/--/api/v2/push/send";

    private final RestTemplate rest;

    public PushService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        this.rest = new RestTemplate(factory);
    }

    /** Envoie une notification push Expo. N'échoue jamais : un échec est seulement journalisé. */
    public void send(String token, String title, String body, Map<String, Object> data) {
        if (token == null || !token.startsWith("ExponentPushToken[")) {
            return; // l'utilisateur n'a pas (encore) de jeton push
        }
        try {
            rest.postForEntity(EXPO_URL,
                    Map.of("to", token, "title", title, "body", body, "sound", "default",
                           "channelId", "default", "data", data),
                    String.class);
        } catch (Exception e) {
            log.warn("Notification push impossible : {}", e.getMessage());
        }
    }
}
