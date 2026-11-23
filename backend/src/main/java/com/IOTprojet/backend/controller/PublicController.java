package com.IOTprojet.backend.controller;

import com.IOTprojet.backend.dto.PublicAnimalDTO;
import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.AnimalRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.regex.Pattern;

/** Routes accessibles sans compte : la personne qui retrouve un animal scanne son tag. */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    private static final Pattern UUID_FORMAT =
            Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

    private final AnimalRepository animalRepository;

    public PublicController(AnimalRepository animalRepository) {
        this.animalRepository = animalRepository;
    }

    @GetMapping("/animals/{publicId}")
    public PublicAnimalDTO animal(@PathVariable String publicId) {
        if (!UUID_FORMAT.matcher(publicId).matches()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Animal introuvable");
        }
        Animal a = animalRepository.findByPublicId(publicId.toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Animal introuvable"));
        User owner = a.getOwner();
        return new PublicAnimalDTO(
                a.getNom(), a.getRace(), a.getAge(), a.getFileUrl(),
                owner == null ? null : owner.getPrenom(),
                owner == null ? null : owner.getTelephone());
    }
}
