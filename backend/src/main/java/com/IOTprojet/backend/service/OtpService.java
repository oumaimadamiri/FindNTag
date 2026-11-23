package com.IOTprojet.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class OtpService {

    private static final Duration TTL = Duration.ofMinutes(10);
    private static final Duration RESEND_DELAY = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 5;

    private record Entry(String hash, Instant expiresAt, Instant sentAt, AtomicInteger attempts) {}

    private final Map<String, Entry> store = new ConcurrentHashMap<>();
    private final PasswordEncoder encoder;
    private final Clock clock;

    @Autowired
    public OtpService(PasswordEncoder encoder) {
        this(encoder, Clock.systemUTC());
    }

    /** Horloge injectable pour les tests (expiration, délai entre deux envois). */
    OtpService(PasswordEncoder encoder, Clock clock) {
        this.encoder = encoder;
        this.clock = clock;
    }

    /** Secondes à attendre avant de pouvoir redemander un code (0 si c'est possible). */
    public long secondsBeforeResend(String cin) {
        Entry e = store.get(cin);
        if (e == null) return 0;
        long elapsed = Duration.between(e.sentAt(), Instant.now(clock)).getSeconds();
        return Math.max(0, RESEND_DELAY.getSeconds() - elapsed);
    }

    public void save(String cin, String otp) {
        Instant now = Instant.now(clock);
        store.values().removeIf(e -> now.isAfter(e.expiresAt()));   // nettoyage
        store.put(cin, new Entry(encoder.encode(otp), now.plus(TTL), now, new AtomicInteger()));
    }

    public void remove(String cin) {
        store.remove(cin);
    }

    /** Vérifie le code. Il est invalidé après un succès, après expiration ou après 5 essais. */
    public boolean verify(String cin, String otp) {
        Entry e = store.get(cin);
        if (e == null) return false;
        if (Instant.now(clock).isAfter(e.expiresAt()) || e.attempts().incrementAndGet() > MAX_ATTEMPTS) {
            store.remove(cin);
            return false;
        }
        if (!encoder.matches(otp, e.hash())) return false;
        store.remove(cin);
        return true;
    }
}
