let map;  // global reference

// global:
const featureLayers = {};
let highlightedLayer = null;


// Global storage für Artikel-Marker
const markers = {};



document.addEventListener('DOMContentLoaded', function() {
  // Initialisierung der Leaflet-Karte
  map = L.map('map', {
    minZoom: 6,
    maxZoom: 20,
  }).setView([51.57, 6.9285], 11.3);

  // OpenStreetMap Tile Layer hinzufügen
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors | Powered by GitHub pages | Developed by Benjamin Bleske | published by ©2025 CDU Bottrop',
    maxZoom: 18
  }).addTo(map);

  // Feature Group für Standort-Markierungen
  const locationLayerGroup = L.featureGroup().addTo(map);
  // Feature Group für Artikel-Marker
  const articlesLayerGroup = L.featureGroup().addTo(map);
  // Stadtbezirk-Info Element
  const stadtbezirkInfo = document.getElementById('Stadtbezirk-info');

  // === Control-Klassen ===
  class SearchContainerControl extends L.Control {
    onAdd(map) {
      const container = L.DomUtil.create('div', 'leaflet-control search-container-control');
      container.innerHTML = `
        <div class="search-container">
          <input type="text" id="search-input" placeholder="Straße und Hausnummer..." />
          <button id="search-submit"><i class="fas fa-search"></i></button>
        </div>`;
      L.DomEvent.disableClickPropagation(container);
      return container;
    }
  }
  SearchContainerControl.prototype.options = { position: 'topleft' };

  class CustomSearchControl extends L.Control {
    onAdd(map) {
      const container = L.DomUtil.create('div', 'leaflet-control search-button leaflet-bar');
      container.innerHTML = '<a href="#" title="Adresse suchen"><i class="fas fa-search"></i></a>';
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(container.querySelector('a'), 'click', e => {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        if (!searchContainerControl) {
          searchContainerControl = new SearchContainerControl();
          map.addControl(searchContainerControl);
          addSearchEventListeners();
        } else {
          map.removeControl(searchContainerControl);
          searchContainerControl = null;
        }
      });
      return container;
    }
  }
  CustomSearchControl.prototype.options = { position: 'topleft' };

  class CustomLocateControl extends L.Control {
    onAdd(map) {
      this._map = map;
      const container = L.DomUtil.create('div', 'leaflet-control locate-button leaflet-bar');
      container.innerHTML = '<a href="#" title="Standort bestimmen"><i class="fas fa-location-arrow"></i></a>';
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(container.querySelector('a'), 'click', this._clicked, this);
      return container;
    }
    _clicked(e) {
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      const a = document.querySelector('.locate-button a');
      const active = a.classList.toggle('locate-active');
      if (!active) return this._map.stopLocate();
      this._map.on('locationfound', this.onLocationFound, this);
      this._map.on('locationerror', this.onLocationError, this);
      this._map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
    }
    onLocationFound(e) {
      locationLayerGroup.clearLayers();
      const radius = Math.max(e.accuracy / 2, 50);
      L.circle(e.latlng, { radius, color: '#0000ff', fillColor: '#52b7c1', fillOpacity: 0.5 })
        .addTo(locationLayerGroup);
      L.marker(e.latlng, {
        icon: L.divIcon({
          className: 'located-animation',
          html: '<div style="background:#52b7c1; border:2px solid #0000ff; border-radius:50%; width:30px; height:30px;"></div>',
          iconSize: [30, 30],
          popupAnchor: [0, -15]
        })
      }).bindPopup('Du bist hier :)').addTo(locationLayerGroup);
      this._map.setView(e.latlng, 11);
    }
    onLocationError() {
      alert('Standort konnte nicht ermittelt werden.');
      document.querySelector('.locate-button a').classList.remove('locate-active');
    }
  }
  CustomLocateControl.prototype.options = { position: 'topleft' };

  class CustomFullscreenControl extends L.Control {
    onAdd(map) {
      const container = L.DomUtil.create('div', 'leaflet-control fullscreen-button leaflet-bar');
      container.innerHTML = '<a href="#" title="Zur Wahlkampfkarte"><i class="fas fa-expand"></i></a>';
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(container.querySelector('a'), 'click', e => {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        window.top.location.href = 'https://benjaminbleske.github.io/Stadtbezirkswahlkampf/';
      });
      return container;
    }
  }
  CustomFullscreenControl.prototype.options = { position: 'topleft' };

  // Such-Button: Closure
  let searchContainerControl = null;
  function addSearchEventListeners() {
    document.getElementById('search-submit').addEventListener('click', () => {
      const q = document.getElementById('search-input').value;
      if (q.length >= 3) geocodeAddress(q);
    });
    document.getElementById('search-input').addEventListener('keypress', e => {
      if (e.key === 'Enter' && e.target.value.length >= 3) geocodeAddress(e.target.value);
    });
    document.getElementById('search-input').addEventListener('input', e => {
      clearTimeout(window._debounce);
      window._debounce = setTimeout(() => {
        if (e.target.value.length >= 3) geocodeAddress(e.target.value);
      }, 2500);
    });
  }

  // GeoJSON laden
  fetch('editStadtbezirke.geojson')
    .then(r => r.json())
    .then(data => {
      const geoLayer = L.geoJSON(data, {
        style: () => ({ color: '#52b7c1', fillColor: '#52b7c1', weight: 3.5, fillOpacity: 0.4 }),
        onEachFeature: (feature, layer) => {
          if (feature.properties?.Name) {
            layer.on('mouseover', () => {
              stadtbezirkInfo.textContent = feature.properties.Name;
              stadtbezirkInfo.style.display = 'block';
            });
            layer.on('mouseout', () => stadtbezirkInfo.style.display = 'none');
          }
        }
      }).addTo(map);
      map.fitBounds(geoLayer.getBounds());
    })
    .catch(console.error);

  // Controls hinzufügen
  map.addControl(new CustomFullscreenControl());
  map.addControl(new CustomLocateControl());
  map.addControl(new CustomSearchControl());

  // Geocoding
  function geocodeAddress(q) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&viewbox=6.80,51.65,7.00,51.45&bounded=1&accept-language=de`)
      .then(r => r.json())
      .then(results => {
        if (!results.length) return alert('Adresse nicht gefunden.');
        const { lat, lon, display_name } = results[0];
        map.flyTo([+lat, +lon], 12);
        L.marker([+lat, +lon]).addTo(map).bindPopup(display_name).openPopup();
        if (searchContainerControl) {
          map.removeControl(searchContainerControl);
          searchContainerControl = null;
        }
      })
      .catch(() => alert('Fehler beim Abrufen der Adresse.'));
  }

  // Artikel-Marker erstellen
  const articles = document.querySelectorAll('.article-list article');
  articles.forEach(article => {
    const title = article.dataset.title;
    const coords = JSON.parse(article.dataset.coordinates);
    const popupContent = `
      <div class="article-popup">
        <h3>${article.querySelector('h2').textContent}</h3>
        <small>${article.querySelector('small').textContent}</small>
        <div class="popup-content">${article.querySelector('p').textContent}</div>
      </div>`;
    const marker = L.marker(coords, { icon: L.divIcon({ className: 'article-marker', html: '<div class="marker-inner"><i class="fas fa-info-circle"></i></div>', iconSize: [40,40], iconAnchor: [20,40], popupAnchor: [0,-40] }) })
      
      .addTo(articlesLayerGroup);
    markers[title] = marker;
  });

  // "Auf der Karte zeigen" Buttons
  document.querySelectorAll('.show-on-map-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const marker = markers[this.dataset.title];
      if (marker) {
        map.flyTo(marker.getLatLng(), 14);
        
        if (window.innerWidth <= 768) document.querySelector('.map-container').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Kartenhöhe anpassen
  function updateMapHeight() { map.invalidateSize(); }
  updateMapHeight();
  window.addEventListener('resize', updateMapHeight);

  // =============================================================================
  // Scroll-to-Map via IntersectionObserver
  // =============================================================================
  function centerMapOnArticle(coords, articleEl, titleKey) {
    map.setView(coords, 12);
    markers[titleKey]?.openPopup();
    document.querySelectorAll('.article-list article').forEach(a => a.classList.remove('active'));
    articleEl.classList.add('active');
  }

  function onIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.1) {
        const el = entry.target;
        centerMapOnArticle(JSON.parse(el.dataset.coordinates), el, el.dataset.title);
      }
    });
  }

  const observer = new IntersectionObserver(onIntersection, { threshold: 0.5 });
  document.querySelectorAll('.article-list article').forEach(a => observer.observe(a));
});
