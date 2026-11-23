package com.IOTprojet.backend.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

public final class CurrentUser {

    private CurrentUser() {}

    /** CIN de l'utilisateur authentifié (contenu dans le jeton). */
    public static String cin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Non authentifié");
        }
        return auth.getName();
    }

    /** Refuse (403) si le CIN demandé n'est pas celui de l'utilisateur connecté. */
    public static void requireSelf(String cin) {
        if (cin == null || !cin().equalsIgnoreCase(cin.trim())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé");
        }
    }
}