package com.IOTprojet.backend.service;

import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.UserRepository;

import jakarta.persistence.EntityNotFoundException;

// import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public User createUser(User user) {
        return userRepository.save(user);
    }

    public Optional<User> authenticate(String cin, String nom, String prenom) {
        if (cin == null || nom == null || prenom == null) return Optional.empty();

        Optional<User> userOptional = userRepository.findByCin(cin.trim());
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            if (user.getNom().equalsIgnoreCase(nom.trim()) &&
                user.getPrenom().equalsIgnoreCase(prenom.trim())) {
                return Optional.of(user);
            }
        }
        return Optional.empty();
    }

    public boolean existsByCin(String cin) {
        return userRepository.existsByCin(cin.trim());
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }


    public int countAnimalsByUserCin(String cin) {
        User user = userRepository.findByCin(cin)
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return user.getAnimals().size();
    }
    public User getUserByCin(String cin) {
    User user = userRepository.findByCin(cin)
        .orElseThrow(() -> new EntityNotFoundException("Utilisateur non trouvé pour ce CIN : " + cin));
    return user;
}

public User getUserByEmail(String email) {
    return userRepository.findByEmail(email)
            .orElse(null);
}

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur introuvable avec ID: " + id));
    }
    
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new EntityNotFoundException("Utilisateur introuvable avec ID: " + id);
        }
        userRepository.deleteById(id);
    }

    public void saveUser(User user) {
        userRepository.save(user);
    }
  
}

