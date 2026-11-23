package com.IOTprojet.backend.repository;

import com.IOTprojet.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByCin(String cin);
    Optional<User> findByCinAndNomAndPrenom(String cin, String nom, String prenom);
    boolean existsByCin(String cin);

    Optional<User> findByEmail(String email);  
    Optional<User> findByTelephone(String telephone);

}
