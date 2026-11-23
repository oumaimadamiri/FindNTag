package com.IOTprojet.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "animal_transfers")
public class AnimalTransfer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Animal animal;

    private String fromCin;
    private String toCin;

    private LocalDateTime transferDate = LocalDateTime.now();

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Animal getAnimal() {
        return animal;
    }

    public void setAnimal(Animal animal) {
        this.animal = animal;
    }

    public String getFromCin() {
        return fromCin;
    }

    public void setFromCin(String fromCin) {
        this.fromCin = fromCin;
    }

    public String getToCin() {
        return toCin;
    }

    public void setToCin(String toCin) {
        this.toCin = toCin;
    }

    public LocalDateTime getTransferDate() {
        return transferDate;
    }

    public void setTransferDate(LocalDateTime transferDate) {
        this.transferDate = transferDate;
    }
}
