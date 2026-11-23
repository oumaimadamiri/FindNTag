package com.IOTprojet.backend;

import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.AnimalRepository;
import com.IOTprojet.backend.repository.UserRepository;
import com.IOTprojet.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Phase 5 : tag NFC = identifiant opaque. Ce que voit un inconnu, droits du propriétaire, vente puis rachat. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PublicAnimalTest {

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired UserRepository users;
    @Autowired AnimalRepository animals;

    private User alice;
    private User bob;
    private Animal rex;
    private String aliceToken;
    private String bobToken;

    private User newUser(String prefix, String prenom, String tel) {
        User u = new User();
        u.setCin(prefix + System.nanoTime());
        u.setNom("Nom" + prefix);
        u.setPrenom(prenom);
        u.setEmail(prefix.toLowerCase() + "@secret.example");
        u.setTelephone(tel);
        return users.save(u);
    }

    @BeforeEach
    void setUp() {
        alice = newUser("A", "Alice", "0600000001");
        bob = newUser("B", "Bob", "0600000002");
        rex = new Animal();
        rex.setNom("Rex");
        rex.setRace("Berger");
        rex.setAge("3");
        rex.setFileUrl("/uploads/rex.jpg");
        rex.setOwner(alice);
        rex = animals.save(rex);
        aliceToken = jwt.generate(alice.getCin());
        bobToken = jwt.generate(bob.getCin());
    }

    @Test
    void publicIdIsGeneratedAndStable() {
        org.junit.jupiter.api.Assertions.assertNotNull(rex.getPublicId());
        org.junit.jupiter.api.Assertions.assertEquals(36, rex.getPublicId().length());
    }

    @Test
    void anyoneCanScanATagButSeesNoPersonalData() throws Exception {
        mvc.perform(get("/api/public/animals/{id}", rex.getPublicId()))   // sans jeton
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nom").value("Rex"))
                .andExpect(jsonPath("$.race").value("Berger"))
                .andExpect(jsonPath("$.photoUrl").value("/uploads/rex.jpg"))
                .andExpect(jsonPath("$.ownerPrenom").value("Alice"))
                .andExpect(jsonPath("$.ownerTelephone").value("0600000001"))
                // RIEN d'autre : ni CIN, ni email, ni nom de famille, ni identifiants internes
                .andExpect(content().string(not(containsString(alice.getCin()))))
                .andExpect(content().string(not(containsString("secret.example"))))
                .andExpect(content().string(not(containsString("NomA"))))
                .andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.ownerId").doesNotExist())
                .andExpect(jsonPath("$.cin").doesNotExist());
    }

    @Test
    void unknownOrMalformedIdentifiersAreNotFound() throws Exception {
        mvc.perform(get("/api/public/animals/{id}", "00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/public/animals/{id}", "pas-un-uuid")).andExpect(status().isNotFound());
        mvc.perform(get("/api/public/animals/{id}", "1 OR 1=1")).andExpect(status().isNotFound());
    }

    @Test
    void onlyTheOwnerCanResolveItsOwnTag() throws Exception {
        mvc.perform(get("/api/animals/by-public-id/{id}", rex.getPublicId()))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/animals/by-public-id/{id}", rex.getPublicId())
                        .header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(rex.getId()))
                .andExpect(jsonPath("$.publicId").value(rex.getPublicId()))
                .andExpect(jsonPath("$.ownerTelephone").value("0600000001"));
        mvc.perform(get("/api/animals/by-public-id/{id}", rex.getPublicId())
                        .header("Authorization", "Bearer " + bobToken))
                .andExpect(status().isNotFound());   // on ne révèle pas l'existence
    }

    @Test
    void soldThenBoughtBackAnimalIsListedAgain() throws Exception {
        String publicId = rex.getPublicId();

        // Alice vend à Bob
        mvc.perform(post("/api/animals/{id}/transfer", rex.getId()).header("Authorization", "Bearer " + aliceToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"toCin\":\"" + bob.getCin() + "\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/animals/user/{cin}", alice.getCin()).header("Authorization", "Bearer " + aliceToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", not(hasItem(rex.getId().intValue()))));
        mvc.perform(get("/api/animals/user/{cin}", bob.getCin()).header("Authorization", "Bearer " + bobToken))
                .andExpect(jsonPath("$[*].id", hasItem(rex.getId().intValue())));

        // L'identifiant du tag ne change pas avec le propriétaire : le tag reste valable
        mvc.perform(get("/api/public/animals/{id}", publicId)).andExpect(jsonPath("$.ownerPrenom").value("Bob"));

        // Bob revend à Alice : l'animal doit réapparaître chez Alice (bug de l'ancienne requête NOT IN)
        mvc.perform(post("/api/animals/{id}/transfer", rex.getId()).header("Authorization", "Bearer " + bobToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"toCin\":\"" + alice.getCin() + "\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/animals/user/{cin}", alice.getCin()).header("Authorization", "Bearer " + aliceToken))
                .andExpect(jsonPath("$[*].id", hasItem(rex.getId().intValue())));
    }
}
