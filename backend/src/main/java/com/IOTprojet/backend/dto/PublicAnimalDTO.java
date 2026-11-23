package com.IOTprojet.backend.dto;

/**
 * Ce que voit n'importe qui en scannant le tag d'un animal.
 * Volontairement SANS CIN, email, nom de famille ni identifiant interne.
 */
public record PublicAnimalDTO(String nom, String race, String age, String photoUrl,
                              String ownerPrenom, String ownerTelephone) {}
