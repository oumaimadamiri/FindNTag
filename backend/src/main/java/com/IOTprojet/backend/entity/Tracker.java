package com.IOTprojet.backend.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tracker")
public class Tracker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", unique = true, nullable = false)
    private String deviceId;

    @OneToOne
    @JoinColumn(name = "animal_id", unique = true, nullable = false)
    private Animal animal;

    private Instant lastSeenAt;

    public Long getId() { return id; }
    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public Animal getAnimal() { return animal; }
    public void setAnimal(Animal animal) { this.animal = animal; }
    public Instant getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(Instant lastSeenAt) { this.lastSeenAt = lastSeenAt; }
}
