// AnimalService.java
package com.IOTprojet.backend.service;

import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.entity.AnimalTransfer;
import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.AnimalRepository;
import com.IOTprojet.backend.repository.AnimalTransferRepository;
import com.IOTprojet.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AnimalService {

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AnimalTransferRepository animalTransferRepository;

    public Animal saveAnimal(Animal animal) {
        return animalRepository.save(animal);
    }

    public Animal updateAnimal(Long id, Animal updatedAnimal) {
        Animal existingAnimal = animalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Animal non trouvé"));

        if (updatedAnimal.getNom() != null) existingAnimal.setNom(updatedAnimal.getNom());
        if (updatedAnimal.getRace() != null) existingAnimal.setRace(updatedAnimal.getRace());
        if (updatedAnimal.getAge() != null) existingAnimal.setAge(updatedAnimal.getAge());
        if (updatedAnimal.getTagId() != null) existingAnimal.setTagId(updatedAnimal.getTagId());
        if (updatedAnimal.getOwner() != null && updatedAnimal.getOwner().getId() != null) {
            Optional<User> ownerOpt = userRepository.findById(updatedAnimal.getOwner().getId());
            ownerOpt.ifPresent(existingAnimal::setOwner);
        }
        return animalRepository.save(existingAnimal);
    }

    public Optional<Animal> getAnimalById(Long id) {
        return animalRepository.findById(id);
    }

    public List<Animal> getAllAnimals() {
        return animalRepository.findAll();
    }

    public List<Animal> getAnimalByTagId(String tagId) {
        return animalRepository.findAllByTagId(tagId);
    }

    public void deleteAnimal(Long id) {
        animalRepository.deleteById(id);
    }

    public Long countByUserCin(String cin) {
        return animalRepository.countByUserCin(cin);
    }

    public void transferAnimal(Long animalId, String fromCin, String toCin) {
        Animal animal = animalRepository.findById(animalId)
                .orElseThrow(() -> new RuntimeException("Animal non trouvé"));
        User newOwner = userRepository.findByCin(toCin)
                .orElseThrow(() -> new RuntimeException("Nouvel utilisateur non trouvé"));
        if (animal.getOwner() == null || !animal.getOwner().getCin().equals(fromCin)) {
            throw new RuntimeException("Transfert non autorisé");
        }
        animal.setOwner(newOwner);
        animalRepository.save(animal);

        AnimalTransfer transfer = new AnimalTransfer();
        transfer.setAnimal(animal);
        transfer.setFromCin(fromCin);
        transfer.setToCin(toCin);
        transfer.setTransferDate(LocalDateTime.now());
        animalTransferRepository.save(transfer);
    }
    
    public String getAnimalPhotoByTagId(String tagId) {
        List<String> urls = animalRepository.findFileUrlsByTagId(tagId);
        return urls.isEmpty() ? null : urls.get(0); // Prend la première si plusieurs
    }
}
