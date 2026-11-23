package com.IOTprojet.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OtpServiceTest {

    /** Horloge que le test fait avancer à volonté (pas d'attente réelle). */
    static class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-01-01T10:00:00Z");

        void advance(Duration d) { now = now.plus(d); }

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    private MutableClock clock;
    private OtpService otp;

    @BeforeEach
    void setUp() {
        clock = new MutableClock();
        otp = new OtpService(new BCryptPasswordEncoder(4), clock);   // coût 4 : tests rapides
    }

    @Test
    void correctCodeIsAcceptedOnlyOnce() {
        otp.save("AB1", "123456");
        assertTrue(otp.verify("AB1", "123456"));
        assertFalse(otp.verify("AB1", "123456"), "un code ne sert qu'une fois");
    }

    @Test
    void wrongCodeIsRejectedButTheCodeStaysValid() {
        otp.save("AB1", "123456");
        assertFalse(otp.verify("AB1", "000000"));
        assertTrue(otp.verify("AB1", "123456"));
    }

    @Test
    void unknownUserIsRejected() {
        assertFalse(otp.verify("INCONNU", "123456"));
    }

    @Test
    void codeIsLockedAfterFiveWrongAttempts() {
        otp.save("AB1", "123456");
        for (int i = 0; i < 5; i++) assertFalse(otp.verify("AB1", "00000" + i));
        assertFalse(otp.verify("AB1", "123456"), "même le bon code est refusé après 5 échecs");
        // un nouveau code peut être demandé ensuite
        otp.save("AB1", "654321");
        assertTrue(otp.verify("AB1", "654321"));
    }

    @Test
    void fourWrongAttemptsStillAllowTheCorrectCode() {
        otp.save("AB1", "123456");
        for (int i = 0; i < 4; i++) assertFalse(otp.verify("AB1", "00000" + i));
        assertTrue(otp.verify("AB1", "123456"));
    }

    @Test
    void attemptsOfOneUserDoNotLockAnother() {
        otp.save("AB1", "111111");
        otp.save("CD2", "222222");
        for (int i = 0; i < 6; i++) otp.verify("AB1", "999999");
        assertTrue(otp.verify("CD2", "222222"));
    }

    @Test
    void codeExpiresAfterTenMinutes() {
        otp.save("AB1", "123456");
        clock.advance(Duration.ofMinutes(10).plusSeconds(1));
        assertFalse(otp.verify("AB1", "123456"));
    }

    @Test
    void codeIsStillValidJustBeforeExpiry() {
        otp.save("AB1", "123456");
        clock.advance(Duration.ofMinutes(9).plusSeconds(59));
        assertTrue(otp.verify("AB1", "123456"));
    }

    @Test
    void resendIsLimitedToOncePerMinute() {
        assertEquals(0, otp.secondsBeforeResend("AB1"), "aucun code envoyé : pas d'attente");
        otp.save("AB1", "123456");
        assertEquals(60, otp.secondsBeforeResend("AB1"));
        clock.advance(Duration.ofSeconds(20));
        assertEquals(40, otp.secondsBeforeResend("AB1"));
        clock.advance(Duration.ofSeconds(40));
        assertEquals(0, otp.secondsBeforeResend("AB1"));
        clock.advance(Duration.ofHours(1));
        assertEquals(0, otp.secondsBeforeResend("AB1"));
    }

    @Test
    void newCodeReplacesTheOldOne() {
        otp.save("AB1", "111111");
        otp.save("AB1", "222222");
        assertFalse(otp.verify("AB1", "111111"));
        assertTrue(otp.verify("AB1", "222222"));
    }

    @Test
    void removedCodeCannotBeUsed() {
        otp.save("AB1", "123456");
        otp.remove("AB1");
        assertFalse(otp.verify("AB1", "123456"));
        assertEquals(0, otp.secondsBeforeResend("AB1"));
    }
}
