package com.IOTprojet.backend.dto;

public class GpsIngestDTO {
    private String deviceId;
    private String latitude;
    private String longitude;

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public String getLatitude() { return latitude; }
    public void setLatitude(String latitude) { this.latitude = latitude; }
    public String getLongitude() { return longitude; }
    public void setLongitude(String longitude) { this.longitude = longitude; }
}
