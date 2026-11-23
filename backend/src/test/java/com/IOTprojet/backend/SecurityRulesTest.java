package com.IOTprojet.backend;

import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.UserRepository;
import com.IOTprojet.backend.security.JwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Qui a le droit d'appeler quoi : toutes les routes sont fermées sauf celles explicitement publiques. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityRulesTest {

    private static final String UUID0 = "00000000-0000-0000-0000-000000000000";

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired UserRepository users;
    @Value("${app.jwt.secret}") String secret;

    private record Route(HttpMethod method, String path) {}

    private static Route r(HttpMethod m, String p) { return new Route(m, p); }

    private static final List<Route> PROTECTED = List.of(
            r(HttpMethod.GET, "/api/users/me"),
            r(HttpMethod.GET, "/api/users/AB123456"),
            r(HttpMethod.GET, "/api/users/lookup/AB123456"),
            r(HttpMethod.DELETE, "/api/users/me"),
            r(HttpMethod.DELETE, "/api/users/1"),
            r(HttpMethod.PUT, "/api/users/me/push-token"),
            r(HttpMethod.GET, "/api/animals/user/AB123456"),
            r(HttpMethod.GET, "/api/animals/count/by-user/AB123456"),
            r(HttpMethod.GET, "/api/animals/tag/T1"),
            r(HttpMethod.GET, "/api/animals/by-public-id/" + UUID0),
            r(HttpMethod.GET, "/api/animals/1"),
            r(HttpMethod.POST, "/api/animals"),
            r(HttpMethod.PUT, "/api/animals/1"),
            r(HttpMethod.DELETE, "/api/animals/1"),
            r(HttpMethod.POST, "/api/animals/1/transfer"),
            r(HttpMethod.GET, "/api/animals/1/positions"),
            r(HttpMethod.GET, "/api/animals/1/geofence"),
            r(HttpMethod.PUT, "/api/animals/1/geofence"),
            r(HttpMethod.GET, "/api/animals/1/tracker"),
            r(HttpMethod.PUT, "/api/animals/1/tracker"),
            r(HttpMethod.DELETE, "/api/animals/1/tracker"),
            r(HttpMethod.GET, "/api/gps/1"),
            // routes supprimées ou inconnues : fermées elles aussi
            r(HttpMethod.GET, "/api/users"),
            r(HttpMethod.GET, "/api/animals"),
            r(HttpMethod.GET, "/api/inconnue"));

    private User newUser() {
        User u = new User();
        u.setCin("T" + System.nanoTime());
        u.setNom("Test");
        u.setPrenom("User");
        u.setEmail("t@example.com");
        return users.save(u);
    }

    @Test
    void everyProtectedRouteRefusesRequestsWithoutToken() throws Exception {
        for (Route route : PROTECTED) {
            mvc.perform(request(route.method(), route.path()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isUnauthorized());
        }
        // upload multipart
        mvc.perform(multipart("/api/animals/upload-file")).andExpect(status().isUnauthorized());
    }

    @Test
    void publicRoutesDoNotRequireAToken() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mvc.perform(get("/api/public/animals/" + UUID0)).andExpect(status().isNotFound());          // pas 401
        mvc.perform(get("/api/animals/photo/INCONNU")).andExpect(status().isNotFound());           // pas 401
        mvc.perform(request(HttpMethod.POST, "/api/auth/request-otp").contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isBadRequest());
        mvc.perform(request(HttpMethod.POST, "/api/auth/verify-otp").contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isBadRequest());
        mvc.perform(multipart("/api/ocr/cin")).andExpect(status().isBadRequest());                 // fichier manquant : 400, pas 500
    }

    @Test
    void gpsIngestIsProtectedByTheDeviceKeyNotByTheToken() throws Exception {
        mvc.perform(request(HttpMethod.POST, "/api/gps/ingest").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(request(HttpMethod.POST, "/api/gps/ingest").header("X-Device-Key", "mauvaise")
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());
    }

    @Test
    void invalidTokensAreRejected() throws Exception {
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        SecretKey otherKey = Keys.hmacShaKeyFor("une-autre-cle-secrete-de-test-0123456789abcdef".getBytes(StandardCharsets.UTF_8));
        String expired = Jwts.builder().subject("X").expiration(new Date(System.currentTimeMillis() - 60_000)).signWith(key).compact();
        String forged = Jwts.builder().subject("X").expiration(new Date(System.currentTimeMillis() + 60_000)).signWith(otherKey).compact();

        for (String header : new String[]{"Bearer garbage", "Bearer " + expired, "Bearer " + forged,
                "Bearer ", "Basic dXNlcjpwYXNz", "abc"}) {
            mvc.perform(get("/api/users/me").header("Authorization", header)).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void anInvalidTokenDoesNotBreakPublicRoutes() throws Exception {
        mvc.perform(get("/api/animals/photo/INCONNU").header("Authorization", "Bearer garbage"))
                .andExpect(status().isNotFound());
    }

    @Test
    void validTokenGrantsAccessToOwnDataOnly() throws Exception {
        User me = newUser();
        User other = newUser();
        String token = "Bearer " + jwt.generate(me.getCin());

        mvc.perform(get("/api/users/me").header("Authorization", token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.cin").value(me.getCin()));
        mvc.perform(get("/api/users/" + me.getCin()).header("Authorization", token)).andExpect(status().isOk());

        // le profil, les animaux et la suppression d'un autre compte sont interdits
        mvc.perform(get("/api/users/" + other.getCin()).header("Authorization", token)).andExpect(status().isForbidden());
        mvc.perform(get("/api/animals/user/" + other.getCin()).header("Authorization", token)).andExpect(status().isForbidden());
        mvc.perform(get("/api/animals/count/by-user/" + other.getCin()).header("Authorization", token)).andExpect(status().isForbidden());
        mvc.perform(request(HttpMethod.DELETE, "/api/users/" + other.getId()).header("Authorization", token))
                .andExpect(status().isForbidden());
    }

    @Test
    void removedRoutesAreGoneEvenWithAValidToken() throws Exception {
        String token = "Bearer " + jwt.generate(newUser().getCin());
        // la liste de tous les utilisateurs / de tous les animaux n'existe plus
        mvc.perform(get("/api/users").header("Authorization", token)).andExpect(status().is4xxClientError());
        mvc.perform(get("/api/animals").header("Authorization", token)).andExpect(status().is4xxClientError());
    }

    @Test
    void lookupExposesOnlyMinimalBuyerData() throws Exception {
        User buyer = newUser();
        buyer.setTelephone("0699999999");
        users.save(buyer);
        String token = "Bearer " + jwt.generate(newUser().getCin());

        mvc.perform(get("/api/users/lookup/" + buyer.getCin().toLowerCase()).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cin").value(buyer.getCin()))
                .andExpect(jsonPath("$.telephone").value("0699999999"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.animals").doesNotExist())
                .andExpect(jsonPath("$.id").doesNotExist());
        mvc.perform(get("/api/users/lookup/INCONNU").header("Authorization", token)).andExpect(status().isNotFound());
    }
}
