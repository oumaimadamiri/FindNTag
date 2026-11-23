package com.IOTprojet.backend;

import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.AnimalRepository;
import com.IOTprojet.backend.repository.UserRepository;
import com.IOTprojet.backend.security.JwtService;
import com.IOTprojet.backend.service.PushService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Scénario complet : traceur → positions → zone → alerte à la sortie → droits → suppression. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TrackingFlowTest {

    private static final String KEY = "cle-de-test";   // app.gps.ingest-key (application-test.properties)
    private static final String ZONE = """
            {"enabled":true,"points":[
              {"latitude":33.570,"longitude":-7.600},{"latitude":33.570,"longitude":-7.580},
              {"latitude":33.580,"longitude":-7.580},{"latitude":33.580,"longitude":-7.600}]}""";

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired UserRepository users;
    @Autowired AnimalRepository animals;
    @MockitoBean PushService push;

    private Animal animal;
    private String token;
    private String deviceId;

    @BeforeEach
    void setUp() {
        String suffix = String.valueOf(System.nanoTime());
        User owner = new User();
        owner.setCin("T" + suffix);
        owner.setNom("Test");
        owner.setPrenom("User");
        owner.setEmail("t@example.com");
        owner = users.save(owner);

        animal = new Animal();
        animal.setNom("Rex");
        animal.setRace("Berger");
        animal.setAge("3");
        animal.setOwner(owner);
        animal = animals.save(animal);

        token = jwt.generate(owner.getCin());
        deviceId = "dev" + suffix;
    }

    private ResultActions auth(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder b) throws Exception {
        return mvc.perform(b.header("Authorization", "Bearer " + token));
    }

    private ResultActions ingest(String device, String key, double lat, double lng) throws Exception {
        var req = post("/api/gps/ingest").contentType(MediaType.APPLICATION_JSON)
                .content("{\"deviceId\":\"" + device + "\",\"latitude\":\"" + lat + "\",\"longitude\":\"" + lng + "\"}");
        if (key != null) req = req.header("X-Device-Key", key);
        return mvc.perform(req);
    }

    @Test
    void fullTrackingFlow() throws Exception {
        long id = animal.getId();

        // Sans jeton : refusé
        mvc.perform(get("/api/animals/{id}/tracker", id)).andExpect(status().isUnauthorized());

        // Association du traceur (identifiant invalide refusé)
        auth(put("/api/animals/{id}/tracker", id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"deviceId\":\"a/b\"}")).andExpect(status().isBadRequest());
        auth(put("/api/animals/{id}/tracker", id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"deviceId\":\"" + deviceId + "\"}")).andExpect(status().isOk());
        auth(get("/api/animals/{id}/tracker", id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.deviceId").value(deviceId));

        // Ingestion : clé absente/fausse -> 401, traceur inconnu -> 404
        ingest(deviceId, null, 33.575, -7.590).andExpect(status().isUnauthorized());
        ingest(deviceId, "mauvaise-cle", 33.575, -7.590).andExpect(status().isUnauthorized());
        ingest("inconnu", KEY, 33.575, -7.590).andExpect(status().isNotFound());
        ingest(deviceId, KEY, 99.0, -7.590).andExpect(status().isBadRequest());

        // Dernière position (pas de position avant la première ingestion)
        auth(get("/api/gps/{id}", id)).andExpect(status().isNotFound());
        ingest(deviceId, KEY, 33.575, -7.590).andExpect(status().isOk());
        auth(get("/api/gps/{id}", id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(33.575))
                .andExpect(jsonPath("$.longitude").value(-7.59));

        // Zone : refusée si < 3 points, acceptée sinon
        auth(put("/api/animals/{id}/geofence", id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":true,\"points\":[{\"latitude\":1,\"longitude\":1}]}"))
                .andExpect(status().isBadRequest());
        auth(put("/api/animals/{id}/geofence", id).contentType(MediaType.APPLICATION_JSON).content(ZONE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.points.length()").value(4));

        // Alerte UNIQUEMENT à la sortie : dedans, dehors, dehors, dedans, dehors  =>  2 alertes
        ingest(deviceId, KEY, 33.575, -7.590).andExpect(status().isOk());   // dedans (état inconnu -> dedans)
        verify(push, times(0)).send(any(), any(), any(), any());
        ingest(deviceId, KEY, 34.000, -7.000).andExpect(status().isOk());   // sortie  -> alerte 1
        ingest(deviceId, KEY, 34.100, -7.000).andExpect(status().isOk());   // toujours dehors -> pas d'alerte
        verify(push, times(1)).send(any(), any(), any(), any());
        ingest(deviceId, KEY, 33.575, -7.590).andExpect(status().isOk());   // retour dedans
        ingest(deviceId, KEY, 34.000, -7.000).andExpect(status().isOk());   // nouvelle sortie -> alerte 2
        verify(push, times(2)).send(any(), any(), any(), any());

        auth(get("/api/animals/{id}/geofence", id)).andExpect(jsonPath("$.inside").value(false));

        // Historique : positions du plus ancien au plus récent, limité
        auth(get("/api/animals/{id}/positions", id).param("limit", "3")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));

        // Alertes désactivées -> plus de push
        auth(put("/api/animals/{id}/geofence", id).contentType(MediaType.APPLICATION_JSON)
                .content(ZONE.replace("\"enabled\":true", "\"enabled\":false"))).andExpect(status().isOk());
        ingest(deviceId, KEY, 34.5, -7.0).andExpect(status().isOk());
        verify(push, times(2)).send(any(), any(), any(), any());

        // Un autre utilisateur n'a accès à rien
        User other = new User();
        other.setCin("X" + System.nanoTime());
        other.setNom("Autre");
        other.setPrenom("User");
        other.setEmail("o@example.com");
        other = users.save(other);
        String otherToken = jwt.generate(other.getCin());
        mvc.perform(get("/api/gps/{id}", id).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/animals/{id}/geofence", id).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/animals/{id}/tracker", id).header("Authorization", "Bearer " + otherToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"deviceId\":\"vole-" + deviceId + "\"}"))
                .andExpect(status().isForbidden());

        // Un même traceur ne peut pas servir à deux animaux
        Animal second = new Animal();
        second.setNom("Mina");
        second.setRace("Chat");
        second.setAge("2");
        second.setOwner(users.findByCin(animal.getOwner().getCin()).orElseThrow());
        second = animals.save(second);
        auth(put("/api/animals/{id}/tracker", second.getId()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"deviceId\":\"" + deviceId + "\"}")).andExpect(status().isConflict());

        // Suppression d'un animal avec traceur, positions et zone : plus d'erreur de clé étrangère
        auth(delete("/api/animals/{id}", id)).andExpect(status().isNoContent());
        ingest(deviceId, KEY, 33.575, -7.590).andExpect(status().isNotFound());   // traceur libéré
    }
}
