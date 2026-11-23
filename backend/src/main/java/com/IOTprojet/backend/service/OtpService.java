package com.IOTprojet.backend.service;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Service
public class OtpService {

    private final Map<String, String> otpMap = new ConcurrentHashMap<>();

    // Enregistre le code OTP associé au téléphone
    public void saveOtp(String email, String otp) {
        otpMap.put(email, otp);
    }

    // Récupère le code OTP associé à un téléphone
    public String getOtp(String email) {
        return otpMap.get(email);
    }

    // Supprime le code OTP après vérification
    public void removeOtp(String email) {
        otpMap.remove(email);
    }
}
