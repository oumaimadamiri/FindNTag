// Carte Leaflet : créée UNE fois, puis mise à jour à chaque message de l'application.
export const leafletHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map').setView([33.5731, -7.5898], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    var layer = L.layerGroup().addTo(map);
    var lastSeq = 0;

    function toPair(c) { return [c.latitude, c.longitude]; }

    function render(data) {
      if (!data || data.seq <= lastSeq) return;   // ignore les doublons (Android envoie sur document ET window selon la version)
      lastSeq = data.seq;
      layer.clearLayers();

      if (data.zone && data.zone.coordinates.length >= 3) {
        L.polygon(data.zone.coordinates.map(toPair), {
          color: data.zone.color || '#8B5CF6', weight: 2, fillOpacity: 0.1
        }).addTo(layer);
      }
      if (data.trail && data.trail.length > 1) {
        L.polyline(data.trail.map(toPair), { color: '#8B5CF6', weight: 3, opacity: 0.8 }).addTo(layer);
      }
      if (data.marker) {
        var m = L.marker(toPair(data.marker.position)).addTo(layer);
        if (data.marker.popup) m.bindPopup(data.marker.popup);
      }
      if (data.recenter && data.center) {
        map.setView(toPair(data.center), data.zoom || 16);
      }
    }

    function onMessage(event) {
      try { render(JSON.parse(event.data)); } catch (e) {}
    }
    document.addEventListener('message', onMessage);
    window.addEventListener('message', onMessage);
  </script>
</body>
</html>`;
