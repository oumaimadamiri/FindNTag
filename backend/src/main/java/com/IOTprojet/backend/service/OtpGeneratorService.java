package com.IOTprojet.backend.service;

import org.springframework.stereotype.Service;
import java.util.Random;

@Service
public class OtpGeneratorService {

    public String generateOtp() {
        // Génère un code OTP aléatoire de 6 chiffres
        return String.format("%06d", new Random().nextInt(1000000));
    }
}
