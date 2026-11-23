package com.IOTprojet.backend.dto;

/**
 * Échanges avec l'application mobile.
 * Le contrôle des champs obligatoires est fait dans AnimalService (la mise à jour accepte des champs partiels).
 */
public class AnimalDTO {
    private Long id;
    private String nom;
    private String race;
    private String age;
    private String tagId;
    private String publicId;
    private Long ownerId;
    private String fileUrl;

    /** Image envoyée en base64 par l'application (création et modification). */
    private String image;

    // Informations du propriétaire (lecture seule)
    private String ownerNom;
    private String ownerPrenom;
    private String ownerTelephone;

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

    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public String getOwnerNom() { return ownerNom; }
    public void setOwnerNom(String ownerNom) { this.ownerNom = ownerNom; }

    public String getOwnerPrenom() { return ownerPrenom; }
    public void setOwnerPrenom(String ownerPrenom) { this.ownerPrenom = ownerPrenom; }

    public String getOwnerTelephone() { return ownerTelephone; }
    public void setOwnerTelephone(String ownerTelephone) { this.ownerTelephone = ownerTelephone; }
}
