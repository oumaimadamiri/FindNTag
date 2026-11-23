package com.IOTprojet.backend.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class OtpGeneratorService {

    private final SecureRandom random = new SecureRandom();

    public String generateOtp() {
        return String.format("%06d", random.nextInt(1_000_000));
    }
}