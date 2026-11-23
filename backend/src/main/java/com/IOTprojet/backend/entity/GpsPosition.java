package com.IOTprojet.backend.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "gps_position",
       indexes = @Index(name = "idx_gps_animal_time", columnList = "animal_id, recorded_at"))
public class GpsPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "animal_id", nullable = false)
    private Animal animal;

    private double latitude;
    private double longitude;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    public Long getId() { return id; }
    public Animal getAnimal() { return animal; }
    public void setAnimal(Animal animal) { this.animal = animal; }
    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    public Instant getRecordedAt() { return recordedAt; }
    public void setRecordedAt(Instant recordedAt) { this.recordedAt = recordedAt; }
}
