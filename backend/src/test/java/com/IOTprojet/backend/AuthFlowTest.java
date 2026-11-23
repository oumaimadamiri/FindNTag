package com.IOTprojet.backend;

import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.UserRepository;
import com.IOTprojet.backend.service.EmailService;
import com.IOTprojet.backend.service.OcrService;
import com.IOTprojet.backend.service.OtpGeneratorService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Inscription, demande de code par email, vérification du code, jeton : le parcours de connexion de bout en bout. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @MockitoBean EmailService email;
    @MockitoBean OtpGeneratorService generator;
    @MockitoBean OcrService ocr;

    @BeforeEach
    void setUp() throws IOException {
        when(generator.generateOtp()).thenReturn("123456");
        when(ocr.extract(any())).thenReturn(Map.of("cin", "", "nom", "", "prenom", ""));
    }

    private User newUser(String email) {
        User u = new User();
        u.setCin("T" + System.nanoTime());
        u.setNom("Test");
        u.setPrenom("Alice");
        u.setEmail(email);
        u.setTelephone("0600000001");
        return users.save(u);
    }

    private void requestOtp(String cin, int expectedStatus) throws Exception {
        mvc.perform(post("/api/auth/request-otp").contentType(MediaType.APPLICATION_JSON)
                .content("{\"cin\":\"" + cin + "\"}")).andExpect(status().is(expectedStatus));
    }

    private org.springframework.test.web.servlet.ResultActions verifyOtp(String cin, String code) throws Exception {
        return mvc.perform(post("/api/auth/verify-otp").contentType(MediaType.APPLICATION_JSON)
                .content("{\"cin\":\"" + cin + "\",\"code\":\"" + code + "\"}"));
    }

    @Test
    void unknownCinIsNotFoundAndBlankCinIsRejected() throws Exception {
        requestOtp("INCONNU999", 404);
        requestOtp("   ", 400);
    }

    @Test
    void fullLoginFlow() throws Exception {
        User alice = newUser("alice@example.com");

        // 1. demande du code : un email part, l'adresse est masquée dans la réponse
        mvc.perform(post("/api/auth/request-otp").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cin\":\"" + alice.getCin() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maskedEmail").value(matchesPattern("^a\\*\\*\\*@example\\.com$")))
                .andExpect(jsonPath("$.maskedEmail").value(not(containsString("alice"))));
        verify(email).sendEmail(eq("alice@example.com"), anyString(), contains("123456"));

        // 2. redemander immédiatement : refusé (une demande par minute)
        mvc.perform(post("/api/auth/request-otp").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cin\":\"" + alice.getCin() + "\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value(containsString("patienter")));

        // 3. mauvais code, code mal formé, code absent
        verifyOtp(alice.getCin(), "000000").andExpect(status().isUnauthorized());
        verifyOtp(alice.getCin(), "12ab56").andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/verify-otp").contentType(MediaType.APPLICATION_JSON)
                .content("{\"cin\":\"" + alice.getCin() + "\"}")).andExpect(status().isBadRequest());

        // 4. bon code : jeton + profil (sans le jeton push)
        String body = verifyOtp(alice.getCin(), "123456")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.cin").value(alice.getCin()))
                .andExpect(jsonPath("$.user.email").value("alice@example.com"))
                .andExpect(jsonPath("$.user.expoPushToken").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        // 5. le même code ne peut pas être rejoué
        verifyOtp(alice.getCin(), "123456").andExpect(status().isUnauthorized());

        // 6. le jeton ouvre l'accès à son profil
        String token = JsonPath.read(body, "$.token");
        mvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cin").value(alice.getCin()));
    }

    @Test
    void cinIsCaseInsensitive() throws Exception {
        User u = newUser("bob@example.com");
        requestOtp(u.getCin().toLowerCase(), 200);
        verifyOtp(u.getCin().toLowerCase(), "123456").andExpect(status().isOk());
    }

    @Test
    void codeIsLockedAfterFiveWrongAttemptsButANewOneCanBeRequested() throws Exception {
        User u = newUser("carol@example.com");
        requestOtp(u.getCin(), 200);
        for (int i = 0; i < 5; i++) verifyOtp(u.getCin(), "00000" + i).andExpect(status().isUnauthorized());
        verifyOtp(u.getCin(), "123456").andExpect(status().isUnauthorized());   // même le bon code est refusé

        requestOtp(u.getCin(), 200);   // le compte n'est pas bloqué : un nouveau code est possible
        verifyOtp(u.getCin(), "123456").andExpect(status().isOk());
    }

    @Test
    void failedEmailDoesNotBlockTheNextRequest() throws Exception {
        User u = newUser("dave@example.com");
        doThrow(new RuntimeException("smtp indisponible")).when(email).sendEmail(any(), any(), any());
        requestOtp(u.getCin(), 502);

        doNothing().when(email).sendEmail(any(), any(), any());
        requestOtp(u.getCin(), 200);   // pas de 429 : le code non envoyé a été annulé
    }

    @Test
    void userWithoutEmailCannotReceiveACode() throws Exception {
        User u = newUser(null);
        requestOtp(u.getCin(), 400);
    }

    // ===== Inscription =====

    private org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder register() {
        return multipart("/api/auth/register")
                .file(new MockMultipartFile("file", "cin.jpg", "image/jpeg", new byte[]{1, 2, 3}));
    }

    @Test
    void registrationCreatesTheUserAndRefusesDuplicates() throws Exception {
        String cin = "r" + System.nanoTime();   // en minuscules : doit être normalisé
        var req = register().param("cin", cin).param("nom", "Benali").param("prenom", "Sara")
                .param("email", "sara@example.com").param("telephone", "0611111111");

        mvc.perform(req).andExpect(status().isOk())
                .andExpect(jsonPath("$.cin").value(cin.toUpperCase()))
                .andExpect(jsonPath("$.nom").value("Benali"));
        org.junit.jupiter.api.Assertions.assertTrue(users.findByCin(cin.toUpperCase()).isPresent());

        mvc.perform(register().param("cin", cin).param("nom", "Benali").param("prenom", "Sara")
                .param("email", "sara@example.com").param("telephone", "0611111111"))
                .andExpect(status().isConflict());
    }

    @Test
    void registrationRejectsInvalidEmailAndMissingIdentity() throws Exception {
        mvc.perform(register().param("cin", "Z" + System.nanoTime()).param("nom", "A").param("prenom", "B")
                .param("email", "pas-un-email").param("telephone", "0611111111"))
                .andExpect(status().isBadRequest());

        // aucun champ d'identité et l'OCR (simulé) ne reconnaît rien
        mvc.perform(register().param("email", "x@example.com").param("telephone", "0611111111"))
                .andExpect(status().isBadRequest());
    }
}
