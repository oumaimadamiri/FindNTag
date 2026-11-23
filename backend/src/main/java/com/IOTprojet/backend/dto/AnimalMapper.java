package com.IOTprojet.backend.dto;

import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.entity.User;

public final class AnimalMapper {

    private AnimalMapper() {}

    /** Animal + coordonnées de son propriétaire (pour son propriétaire uniquement). */
    public static AnimalDTO toDto(Animal a) {
        AnimalDTO dto = new AnimalDTO();
        dto.setId(a.getId());
        dto.setNom(a.getNom());
        dto.setRace(a.getRace());
        dto.setAge(a.getAge());
        dto.setTagId(a.getTagId());
        dto.setPublicId(a.getPublicId());
        dto.setFileUrl(a.getFileUrl());
        User owner = a.getOwner();
        if (owner != null) {
            dto.setOwnerId(owner.getId());
            dto.setOwnerNom(owner.getNom());
            dto.setOwnerPrenom(owner.getPrenom());
            dto.setOwnerTelephone(owner.getTelephone());
        }
        return dto;
    }
}
