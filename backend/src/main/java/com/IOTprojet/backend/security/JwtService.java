package com.IOTprojet.backend.security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long ttlMillis;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.ttl-hours}") long ttlHours) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET doit contenir au moins 32 caractères");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.ttlMillis = ttlHours * 3_600_000L;
    }

    public String generate(String cin) {
        Date now = new Date();
        return Jwts.builder()
                .subject(cin)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttlMillis))
                .signWith(key)
                .compact();
    }

    /** Renvoie le CIN contenu dans le jeton, ou null si le jeton est invalide ou expiré. */
    public String parse(String token) {
        try {
            return Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload().getSubject();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}