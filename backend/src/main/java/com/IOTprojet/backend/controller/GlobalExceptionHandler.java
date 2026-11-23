package com.IOTprojet.backend.controller;

import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;

/** Toutes les erreurs sortent en JSON {"message": ...} avec le bon code HTTP ; le détail interne n'est jamais exposé. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleStatus(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode())
                .body(Map.of("message", e.getReason() != null ? e.getReason() : "Erreur"));
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(EntityNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", String.valueOf(e.getMessage())));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, String>> handleNoResource(NoResourceFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Ressource introuvable"));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class,
            MissingServletRequestPartException.class, MultipartException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String, String>> handleBadRequest(Exception e) {
        return ResponseEntity.badRequest().body(Map.of("message", "Requête invalide"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleOther(Exception e) {
        // Les erreurs HTTP de Spring MVC (405 méthode non autorisée, 415 type non supporté...) gardent leur code
        if (e instanceof ErrorResponse spring) {
            HttpStatusCode status = spring.getStatusCode();
            return ResponseEntity.status(status).body(Map.of("message", messageFor(status.value())));
        }
        log.error("Erreur non gérée", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erreur interne"));
    }

    private static String messageFor(int status) {
        return switch (status) {
            case 405 -> "Méthode non autorisée";
            case 406 -> "Format de réponse non acceptable";
            case 415 -> "Type de contenu non supporté";
            default -> "Requête invalide";
        };
    }
}
