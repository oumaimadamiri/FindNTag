package com.IOTprojet.backend.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtServiceTest {

    private static final String SECRET = "un-secret-de-test-assez-long-pour-hmac-0123456789";

    private final JwtService jwt = new JwtService(SECRET, 1);

    @Test
    void tokenRoundTrip() {
        String token = jwt.generate("AB123456");
        assertEquals("AB123456", jwt.parse(token));
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = jwt.generate("AB123456");
        String tampered = token.substring(0, token.length() - 3) + (token.endsWith("AAA") ? "BBB" : "AAA");
        assertNotEquals(token, tampered);
        assertNull(jwt.parse(tampered));
    }

    @Test
    void payloadSwapWithSameSignatureIsRejected() {
        String[] a = jwt.generate("AAA11111").split("\\.");
        String[] b = jwt.generate("BBB22222").split("\\.");
        assertNull(jwt.parse(b[0] + "." + b[1] + "." + a[2]), "on ne peut pas se faire passer pour quelqu'un d'autre");
    }

    @Test
    void garbageIsRejectedWithoutException() {
        assertNull(jwt.parse("garbage"));
        assertNull(jwt.parse("a.b.c"));
        assertNull(jwt.parse(""));
        assertNull(jwt.parse(null));
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        JwtService other = new JwtService("un-tout-autre-secret-de-test-0123456789012345", 1);
        assertNull(jwt.parse(other.generate("AB123456")));
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService expired = new JwtService(SECRET, -1);   // durée de vie négative : déjà expiré
        assertNull(jwt.parse(expired.generate("AB123456")));
    }

    @Test
    void tooShortSecretIsRefusedAtStartup() {
        assertThrows(IllegalStateException.class, () -> new JwtService("trop-court", 1));
    }
}
