package com.IOTprojet.backend.service;

import com.IOTprojet.backend.dto.GeoPoint;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Test « point dans polygone » (la base de l'alerte de sortie de zone). */
class GeofenceServiceTest {

    private static GeoPoint p(double lat, double lng) { return new GeoPoint(lat, lng); }

    // Rectangle autour de Casablanca
    private static final List<GeoPoint> SQUARE = List.of(
            p(33.570, -7.600), p(33.570, -7.580), p(33.580, -7.580), p(33.580, -7.600));

    @Test
    void pointInsideASquare() {
        assertTrue(GeofenceService.contains(SQUARE, 33.575, -7.590));
        assertTrue(GeofenceService.contains(SQUARE, 33.5799, -7.5999), "tout près d'un coin, mais dedans");
    }

    @Test
    void pointOutsideASquare() {
        assertFalse(GeofenceService.contains(SQUARE, 34.0, -7.0));
        assertFalse(GeofenceService.contains(SQUARE, 33.569, -7.590), "juste au sud");
        assertFalse(GeofenceService.contains(SQUARE, 33.575, -7.570), "juste à l'est");
        assertFalse(GeofenceService.contains(SQUARE, 33.575, -7.610), "juste à l'ouest");
    }

    @Test
    void latitudeAndLongitudeAreNotMixedUp() {
        assertFalse(GeofenceService.contains(SQUARE, -7.590, 33.575));
    }

    @Test
    void orderOfVerticesDoesNotMatter() {
        List<GeoPoint> reversed = List.of(SQUARE.get(3), SQUARE.get(2), SQUARE.get(1), SQUARE.get(0));
        assertTrue(GeofenceService.contains(reversed, 33.575, -7.590));
        assertFalse(GeofenceService.contains(reversed, 34.0, -7.0));
    }

    @Test
    void concavePolygonExcludesItsNotch() {
        // Forme en « L » : le coin supérieur droit (8, 8) est dans l'encoche, donc dehors
        List<GeoPoint> l = List.of(p(0, 0), p(0, 10), p(5, 10), p(5, 5), p(10, 5), p(10, 0));
        assertTrue(GeofenceService.contains(l, 2, 2));
        assertTrue(GeofenceService.contains(l, 8, 2));
        assertTrue(GeofenceService.contains(l, 2, 8));
        assertFalse(GeofenceService.contains(l, 8, 8));
    }

    @Test
    void triangle() {
        List<GeoPoint> t = List.of(p(0, 0), p(0, 10), p(10, 0));
        assertTrue(GeofenceService.contains(t, 2, 2));
        assertFalse(GeofenceService.contains(t, 8, 8));
    }

    @Test
    void degeneratePolygonsContainNothingAndDoNotCrash() {
        assertFalse(GeofenceService.contains(List.of(), 1, 1));
        assertFalse(GeofenceService.contains(List.of(p(0, 0)), 0, 0));
        assertFalse(GeofenceService.contains(List.of(p(0, 0), p(1, 1)), 0.5, 0.5));
    }
}
