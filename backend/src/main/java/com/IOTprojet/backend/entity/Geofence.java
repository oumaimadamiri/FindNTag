package com.IOTprojet.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "geofence")
public class Geofence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "animal_id", unique = true, nullable = false)
    private Animal animal;

    /** Polygone au format JSON : [{"latitude":..,"longitude":..}, ...] */
    @Column(name = "points_json", length = 20000)
    private String pointsJson;

    private boolean enabled = true;

    /** Dernier état connu (null = inconnu). Sert à n'alerter qu'à la sortie de la zone. */
    private Boolean lastInside;

    public Long getId() { return id; }
    public Animal getAnimal() { return animal; }
    public void setAnimal(Animal animal) { this.animal = animal; }
    public String getPointsJson() { return pointsJson; }
    public void setPointsJson(String pointsJson) { this.pointsJson = pointsJson; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public Boolean getLastInside() { return lastInside; }
    public void setLastInside(Boolean lastInside) { this.lastInside = lastInside; }
}
