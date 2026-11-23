package com.IOTprojet.backend.dto;

import java.util.List;

/** `inside` : état connu (null si aucune position évaluée). Ignoré à l'écriture. */
public record GeofenceDTO(boolean enabled, List<GeoPoint> points, Boolean inside) {}
