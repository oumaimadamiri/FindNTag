package com.IOTprojet.backend.dto;

public class UserStatsDTO {
    private int animalCount;

    public UserStatsDTO(int animalCount) {
        this.animalCount = animalCount;
    }
    // Getters et setters
    public int getAnimalCount() {
        return animalCount;
    }

    public void setAnimalCount(int animalCount) {
        this.animalCount = animalCount;
    }

}
