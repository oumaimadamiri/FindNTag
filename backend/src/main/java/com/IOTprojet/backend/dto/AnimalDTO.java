package com.IOTprojet.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class AnimalDTO {
    private Long id;

    @NotBlank(message = "Le nom est obligatoire")
    private String nom;

    @NotBlank(message = "La race est obligatoire")
    private String race;

    private String age;
    private String tagId;
    private Long ownerId;
    private String fileUrl;
    
    // ✅ NOUVEAU : Champ pour recevoir l'image en base64
    private String image; // Base64 de l'image depuis React Native

    // Champs pour propriétaire
    private String ownerNom;
    private String ownerPrenom;
    private String ownerTelephone;

    // Getters & Setters existants...
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

    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getOwnerNom() { return ownerNom; }
    public void setOwnerNom(String ownerNom) { this.ownerNom = ownerNom; }

    public String getOwnerPrenom() { return ownerPrenom; }
    public void setOwnerPrenom(String ownerPrenom) { this.ownerPrenom = ownerPrenom; }

    public String getOwnerTelephone() { return ownerTelephone; }
    public void setOwnerTelephone(String ownerTelephone) { this.ownerTelephone = ownerTelephone; }

    // ✅ NOUVEAU : Getter/Setter pour image base64
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
}
// package com.IOTprojet.backend.dto;

// import jakarta.validation.constraints.NotBlank;

// public class AnimalDTO {
//     private Long id;

//     @NotBlank(message = "Le nom est obligatoire")
//     private String nom;

//     @NotBlank(message = "La race est obligatoire")
//     private String race;

//     private String age;
//     private String tagId;
//     private Long ownerId;
//     private String fileUrl;

//     // ✅ Champs manquants pour propriétaire
//     private String ownerNom;
//     private String ownerPrenom;
//     private String ownerTelephone;

//     // Getters & Setters

//     public Long getId() { return id; }
//     public void setId(Long id) { this.id = id; }

//     public String getNom() { return nom; }
//     public void setNom(String nom) { this.nom = nom; }

//     public String getRace() { return race; }
//     public void setRace(String race) { this.race = race; }

//     public String getAge() { return age; }
//     public void setAge(String age) { this.age = age; }

//     public String getTagId() { return tagId; }
//     public void setTagId(String tagId) { this.tagId = tagId; }

//     public Long getOwnerId() { return ownerId; }
//     public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

//     public String getFileUrl() { return fileUrl; }
//     public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

//     public String getOwnerNom() { return ownerNom; }
//     public void setOwnerNom(String ownerNom) { this.ownerNom = ownerNom; }

//     public String getOwnerPrenom() { return ownerPrenom; }
//     public void setOwnerPrenom(String ownerPrenom) { this.ownerPrenom = ownerPrenom; }

//     public String getOwnerTelephone() { return ownerTelephone; }
//     public void setOwnerTelephone(String ownerTelephone) { this.ownerTelephone = ownerTelephone; }
// }
