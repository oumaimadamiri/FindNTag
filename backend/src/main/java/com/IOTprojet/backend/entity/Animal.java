package com.IOTprojet.backend.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
public class Animal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String race;
    private String age;
    private String tagId;

    /** Identifiant public aléatoire, écrit sur le tag NFC à la place des données personnelles. */
    @Column(name = "public_id", unique = true, length = 36)
    private String publicId;

    @ManyToOne
    @JoinColumn(name = "owner_id")
    @JsonBackReference
    private User owner;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    // Getters et Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getRace() { return race; }
    public void setRace(String race) { this.race = race; }

    public String getAge() { return age; }
    public void setAge(String age) { this.age = age; }

    public String getTagId() { return tagId; }
    public void setTagId(String tagId) { this.tagId = tagId; }

    public String getPublicId() { return publicId; }
    public void setPublicId(String publicId) { this.publicId = publicId; }

    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }

    @PrePersist
    void ensurePublicId() {
        if (publicId == null) {
            publicId = java.util.UUID.randomUUID().toString();
        }
    }
}
