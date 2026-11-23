package com.IOTprojet.backend;

import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.UserRepository;
import com.IOTprojet.backend.security.JwtService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Base64;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Création, modification, suppression et lecture des animaux : validation, propriété, photos. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AnimalApiTest {

    // PNG de 1x1 pixel
    private static final String PNG_BASE64 =
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired UserRepository users;

    private User alice;
    private User bob;
    private String aliceAuth;
    private String bobAuth;

    private User newUser(String prefix) {
        User u = new User();
        u.setCin(prefix + System.nanoTime());
        u.setNom("Nom");
        u.setPrenom(prefix);
        u.setEmail(prefix + "@example.com");
        u.setTelephone("0600000000");
        return users.save(u);
    }

    @BeforeEach
    void setUp() {
        alice = newUser("A");
        bob = newUser("B");
        aliceAuth = "Bearer " + jwt.generate(alice.getCin());
        bobAuth = "Bearer " + jwt.generate(bob.getCin());
    }

    private ResultActions create(String auth, String json) throws Exception {
        return mvc.perform(post("/api/animals").header("Authorization", auth)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private long createRex() throws Exception {
        String body = create(aliceAuth, "{\"nom\":\"Rex\",\"race\":\"Berger\",\"age\":\"3\"}")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    @Test
    void creationAssignsThePublicIdAndIgnoresAnyClaimedOwner() throws Exception {
        // le client prétend créer l'animal pour Bob : c'est ignoré, le propriétaire est l'utilisateur connecté
        String body = create(aliceAuth,
                "{\"nom\":\"Rex\",\"race\":\"Berger\",\"age\":\"3\",\"ownerId\":" + bob.getId() + "}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nom").value("Rex"))
                .andExpect(jsonPath("$.publicId").isString())
                .andExpect(jsonPath("$.owner").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        String publicId = JsonPath.read(body, "$.publicId");
        org.junit.jupiter.api.Assertions.assertEquals(36, publicId.length());

        mvc.perform(get("/api/animals/user/" + alice.getCin()).header("Authorization", aliceAuth))
                .andExpect(jsonPath("$[*].publicId", hasItem(publicId)));
        mvc.perform(get("/api/animals/user/" + bob.getCin()).header("Authorization", bobAuth))
                .andExpect(jsonPath("$[*].publicId", not(hasItem(publicId))));
    }

    @Test
    void creationRejectsMissingOrBlankFields() throws Exception {
        create(aliceAuth, "{\"race\":\"Berger\",\"age\":\"3\"}").andExpect(status().isBadRequest());
        create(aliceAuth, "{\"nom\":\"Rex\",\"age\":\"3\"}").andExpect(status().isBadRequest());
        create(aliceAuth, "{\"nom\":\"Rex\",\"race\":\"Berger\"}").andExpect(status().isBadRequest());
        create(aliceAuth, "{\"nom\":\"   \",\"race\":\"Berger\",\"age\":\"3\"}").andExpect(status().isBadRequest());
        create(aliceAuth, "pas du json").andExpect(status().isBadRequest());
    }

    @Test
    void numericAgeFromTheMobileAppIsAccepted() throws Exception {
        create(aliceAuth, "{\"nom\":\"Rex\",\"race\":\"Berger\",\"age\":3}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.age").value("3"));
    }

    @Test
    void photoSentInBase64IsStoredAndServed() throws Exception {
        String body = create(aliceAuth,
                "{\"nom\":\"Rex\",\"race\":\"Berger\",\"age\":\"3\",\"image\":\"" + PNG_BASE64 + "\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileUrl").value(startsWith("/uploads/")))
                .andReturn().getResponse().getContentAsString();
        String url = JsonPath.read(body, "$.fileUrl");

        byte[] served = mvc.perform(get(url)).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        org.junit.jupiter.api.Assertions.assertArrayEquals(Base64.getDecoder().decode(PNG_BASE64), served,
                "la photo servie est identique (non tronquée) à celle envoyée");
    }

    @Test
    void invalidOrNonImageDataIsIgnoredWithoutFailingTheCreation() throws Exception {
        String notBase64 = "%%pas-du-base64%%";
        String notAnImage = Base64.getEncoder().encodeToString("<script>alert(1)</script>".getBytes());   // base64 valide, mais pas une image
        for (String image : new String[]{notBase64, notAnImage}) {
            create(aliceAuth, "{\"nom\":\"Rex\",\"race\":\"Berger\",\"age\":\"3\",\"image\":\"" + image + "\"}")
                    .andExpect(status().isOk()).andExpect(jsonPath("$.fileUrl").value(nullValue()));
        }
    }

    @Test
    void multipartUploadAcceptsRealImagesOnly() throws Exception {
        byte[] png = Base64.getDecoder().decode(PNG_BASE64);
        mvc.perform(multipart("/api/animals/upload-file")
                        .file(new MockMultipartFile("file", "photo.jpg", "image/jpeg", png))   // contenu PNG, nom .jpg
                        .header("Authorization", aliceAuth))
                .andExpect(status().isOk())
                .andExpect(content().string(startsWith("/uploads/")));

        // type MIME annoncé « image » mais contenu quelconque : refusé
        mvc.perform(multipart("/api/animals/upload-file")
                        .file(new MockMultipartFile("file", "photo.jpg", "image/jpeg", "pas une image".getBytes()))
                        .header("Authorization", aliceAuth))
                .andExpect(status().isBadRequest());
        // type MIME non image : refusé
        mvc.perform(multipart("/api/animals/upload-file")
                        .file(new MockMultipartFile("file", "a.txt", "text/plain", png))
                        .header("Authorization", aliceAuth))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ownerCanUpdateButNeverChangeTheOwner() throws Exception {
        long id = createRex();

        mvc.perform(put("/api/animals/{id}", id).header("Authorization", aliceAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nom\":\"Max\",\"ownerId\":" + bob.getId() + "}"))   // champs partiels + tentative de vol
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nom").value("Max"))
                .andExpect(jsonPath("$.race").value("Berger"));   // champ non fourni : inchangé

        mvc.perform(get("/api/animals/{id}", id).header("Authorization", aliceAuth)).andExpect(status().isOk());
        mvc.perform(get("/api/animals/{id}", id).header("Authorization", bobAuth)).andExpect(status().isForbidden());
    }

    @Test
    void othersCannotReadUpdateOrDeleteAnAnimal() throws Exception {
        long id = createRex();

        mvc.perform(get("/api/animals/{id}", id).header("Authorization", bobAuth)).andExpect(status().isForbidden());
        mvc.perform(put("/api/animals/{id}", id).header("Authorization", bobAuth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nom\":\"Vole\"}")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/animals/{id}", id).header("Authorization", bobAuth)).andExpect(status().isForbidden());

        // rien n'a changé pour le propriétaire
        mvc.perform(get("/api/animals/{id}", id).header("Authorization", aliceAuth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nom").value("Rex"));
    }

    @Test
    void unknownAnimalIsNotFound() throws Exception {
        mvc.perform(get("/api/animals/{id}", 999999999L).header("Authorization", aliceAuth)).andExpect(status().isNotFound());
        mvc.perform(put("/api/animals/{id}", 999999999L).header("Authorization", aliceAuth)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isNotFound());
        mvc.perform(delete("/api/animals/{id}", 999999999L).header("Authorization", aliceAuth)).andExpect(status().isNotFound());
    }

    @Test
    void deletionRemovesTheAnimal() throws Exception {
        long id = createRex();
        mvc.perform(delete("/api/animals/{id}", id).header("Authorization", aliceAuth)).andExpect(status().isNoContent());
        mvc.perform(get("/api/animals/{id}", id).header("Authorization", aliceAuth)).andExpect(status().isNotFound());
        mvc.perform(get("/api/animals/user/" + alice.getCin()).header("Authorization", aliceAuth))
                .andExpect(jsonPath("$[*].id", not(hasItem((int) id))));
    }

    @Test
    void countOnlyCountsMyAnimals() throws Exception {
        createRex();
        createRex();
        mvc.perform(get("/api/animals/count/by-user/" + alice.getCin()).header("Authorization", aliceAuth))
                .andExpect(status().isOk()).andExpect(content().string("2"));
        mvc.perform(get("/api/animals/count/by-user/" + bob.getCin()).header("Authorization", bobAuth))
                .andExpect(status().isOk()).andExpect(content().string("0"));
    }

    @Test
    void transferValidation() throws Exception {
        long id = createRex();
        // à soi-même, à un inconnu, sans CIN : refusés ; et on ne vend pas l'animal d'un autre
        mvc.perform(post("/api/animals/{id}/transfer", id).header("Authorization", aliceAuth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"toCin\":\"" + alice.getCin() + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/animals/{id}/transfer", id).header("Authorization", aliceAuth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"toCin\":\"INCONNU999\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/animals/{id}/transfer", id).header("Authorization", aliceAuth)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/animals/{id}/transfer", id).header("Authorization", bobAuth)
                .contentType(MediaType.APPLICATION_JSON).content("{\"toCin\":\"" + bob.getCin() + "\"}"))
                .andExpect(status().isForbidden());

        // l'animal est toujours à Alice
        mvc.perform(get("/api/animals/user/" + alice.getCin()).header("Authorization", aliceAuth))
                .andExpect(jsonPath("$", hasSize(1)));
    }
}
