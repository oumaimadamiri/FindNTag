package com.IOTprojet.backend.config;

import com.IOTprojet.backend.entity.Animal;
import com.IOTprojet.backend.repository.AnimalRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Donne un identifiant public aux animaux créés avant l'introduction du champ (au démarrage). */
@Component
public class PublicIdBackfill implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PublicIdBackfill.class);

    private final AnimalRepository animalRepository;

    public PublicIdBackfill(AnimalRepository animalRepository) {
        this.animalRepository = animalRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Animal> missing = animalRepository.findByPublicIdIsNull();
        for (Animal a : missing) {
            a.setPublicId(UUID.randomUUID().toString());
        }
        if (!missing.isEmpty()) {
            animalRepository.saveAll(missing);
            log.info("Identifiant public généré pour {} animal(aux)", missing.size());
        }
    }
}
