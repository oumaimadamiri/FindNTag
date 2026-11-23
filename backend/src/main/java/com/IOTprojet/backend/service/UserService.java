package com.IOTprojet.backend.service;

import com.IOTprojet.backend.entity.User;
import com.IOTprojet.backend.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public boolean existsByCin(String cin) {
        return userRepository.existsByCin(cin.trim());
    }

    public Optional<User> findByCin(String cin) {
        return userRepository.findByCin(cin.trim());
    }

    public User getUserByCin(String cin) {
        return userRepository.findByCin(cin)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur non trouvé pour ce CIN : " + cin));
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
