package com.IOTprojet.backend.dto;

import com.IOTprojet.backend.entity.GpsPosition;

import java.time.Instant;

public record PositionDTO(double latitude, double longitude, Instant recordedAt) {
    public static PositionDTO of(GpsPosition p) {
        return new PositionDTO(p.getLatitude(), p.getLongitude(), p.getRecordedAt());
    }
}
