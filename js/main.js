document.addEventListener('DOMContentLoaded', function() {
  // Initialisierung der Leaflet-Karte
  const map = L.map('map', {
    minZoom: 6,
    maxZoom: 18,
  }).setView([51.57, 6.9285], 11.3);

  // OpenStreetMap Tile Layer hinzufügen
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors | Powered by GitHub pages | Developed by Benjamin Bleske | published by ©2025 CDU Bottrop',
    maxZoom: 18
  }).addTo(map);

  // Variable für den Such-Container
  let searchContainerControl = null;

  // Feature Group für Standort-Markierungen
  const locationLayerGroup = L.featureGroup().addTo(map);

  // Funktion zur Anzeige der Wahlbezirk-Info
  const wahlbezirkInfoDiv = document.getElementById('wahlbezirk-info');
  function addWahlbezirkInfo(text) {
    if (text) {
      wahlbezirkInfoDiv.innerHTML = text + '<br><button id="close-info">Schließen</button>';
      document.getElementById('close-info').addEventListener('click', function() {
        addWahlbezirkInfo('');
      });
      wahlbezirkInfoDiv.style.display = 'block';
    } else {
      wahlbezirkInfoDiv.innerHTML = "";
      wahlbezirkInfoDiv.style.display = 'none';
    }
  }

  // Funktion zum Laden der GeoJSON-Daten
// Funktion zum Laden der GeoJSON-Daten aus der lokalen Datei
function loadGeoJSON() {
  fetch('editStadtbezirke.geojson')
    .then(response => response.json())
    .then(data => {
      L.geoJSON(data, {
        style: function () {
          return {
            fillColor: 'blue',
            weight: 1.5,
            opacity: 1,
            color: 'black',
            fillOpacity: 0
          };
        },
        onEachFeature: function (feature, layer) {
          const bezirkName = feature.properties.Bezirk || "Bezirk unbekannt";
          const bezirkNummer = feature.properties.Bezirk_Nr || "Nummer unbekannt";
          const kandidat = feature.properties.Kandidat || "Nicht angegeben";
          const alter = feature.properties.Alter !== null ? feature.properties.Alter : "Nicht angegeben";
          const hauptinteresse = feature.properties.Hauptinteresse || "Nicht angegeben";
          const beruf = feature.properties.Beruf || "Nicht angegeben";
          const link = feature.properties.Link || "";
          const bildUrl = feature.properties.Bild || "";

          let bezirkInfo = `
            <h3>${bezirkName} (Nr. ${bezirkNummer})</h3>
            <ul>
              <li><strong>Kandidat:</strong> ${kandidat}</li>
              <li><strong>Alter:</strong> ${alter}</li>
              <li><strong>Hauptinteresse:</strong> ${hauptinteresse}</li>
              <li><strong>Beruf:</strong> ${beruf}</li>
              ${link ? `<li><strong>Link:</strong> <a href="${link}" target="_blank">Weitere Informationen</a></li>` : ""}
              ${bildUrl ? `<li><img src="${bildUrl}" alt="Bild des Wahlbezirks" width="200" onerror="this.style.display='none';"/></li>` : ""}
            </ul>
          `;

          // Klick-Event, um die Info-Box zu aktualisieren
          layer.on('click', function () {
            addWahlbezirkInfo(bezirkInfo);
          });
        }
      }).addTo(map);
    })
    .catch(error => {
      console.error('Fehler beim Laden der GeoJSON-Daten:', error);
    });
}


  // Prüft, ob das Gerät mobil ist
  function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Vollbildmodus umschalten
  function toggleFullscreen() {
    if (!document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.mozFullScreenElement &&
        !document.msFullscreenElement) {
      if (map.getContainer().requestFullscreen) {
        map.getContainer().requestFullscreen();
      } else if (map.getContainer().webkitRequestFullscreen) {
        map.getContainer().webkitRequestFullscreen();
      } else if (map.getContainer().mozRequestFullScreen) {
        map.getContainer().mozRequestFullScreen();
      } else if (map.getContainer().msRequestFullscreen) {
        map.getContainer().msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  // Aktualisiert das Icon des Vollbild-Buttons
  function updateFullscreenIcon() {
    var fullscreenButton = document.querySelector('.fullscreen-button a i');
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
      fullscreenButton.classList.remove('fa-expand');
      fullscreenButton.classList.add('fa-compress');
    } else {
      fullscreenButton.classList.remove('fa-compress');
      fullscreenButton.classList.add('fa-expand');
    }
  }

  document.addEventListener('fullscreenchange', updateFullscreenIcon);
  document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
  document.addEventListener('mozfullscreenchange', updateFullscreenIcon);
  document.addEventListener('MSFullscreenChange', updateFullscreenIcon);

  // Such-Button-Steuerung
  var customSearchControl = L.Control.extend({
    options: {
      position: "topleft",
      className: "leaflet-control search-button leaflet-bar",
      html: '<a href="#" class="leaflet-bar-part leaflet-bar-part-single" title="Adresse suchen"><i class="fas fa-search"></i></a>',
    },
    onAdd: function (map) {
      var container = L.DomUtil.create("div", this.options.className);
      container.innerHTML = this.options.html;
      L.DomEvent.disableClickPropagation(container);

      L.DomEvent.on(container.querySelector('a'), "click", function(e) {
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
    },
  });

  // Suchcontainer-Control
  var SearchContainerControl = L.Control.extend({
    options: {
      position: 'topleft',
      className: 'leaflet-control search-container-control'
    },
    onAdd: function(map) {
      var container = L.DomUtil.create('div', this.options.className);
      container.innerHTML = `
        <div class="search-container">
          <input type="text" id="search-input" placeholder="Straße und Hausnummer..." />
          <button id="search-submit"><i class="fas fa-search"></i></button>
        </div>
      `;
      L.DomEvent.disableClickPropagation(container);
      return container;
    }
  });

  // Debounce-Timer für die Suche
  let debounceTimer;

  function addSearchEventListeners() {
    document.getElementById('search-submit').addEventListener('click', function() {
      clearTimeout(debounceTimer);
      var query = document.getElementById('search-input').value;
      if (query && query.length >= 3) {
        geocodeAddress(query);
      }
    });

    document.getElementById('search-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        var query = e.target.value;
        if (query && query.length >= 3) {
          geocodeAddress(query);
        }
      }
    });

    document.getElementById('search-input').addEventListener('input', function(e) {
      const query = e.target.value;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (query && query.length >= 3) {
          geocodeAddress(query);
        }
      }, 2500);
    });
  }

  // Funktion zur Geocodierung und Kartenfokussierung
  function geocodeAddress(query) {
    console.log("geocodeAddress aufgerufen mit Query:", query);
    if (query.length < 3) return;

    var url = "https://nominatim.openstreetmap.org/search?format=json&q=" 
      + encodeURIComponent(query)
      + "&viewbox=6.80,51.65,7.00,51.45&bounded=1&accept-language=de";

    console.log("Sende Anfrage an:", url);

    fetch(url)
      .then(response => {
        console.log("Response-Status:", response.status);
        return response.json();
      })
      .then(results => {
        console.log("Erhaltene Ergebnisse:", results);
        if (results && results.length > 0) {
          var result = results[0];
          console.log("Gefundene Koordinaten:", [result.lat, result.lon]);

          map.flyTo([parseFloat(result.lat), parseFloat(result.lon)], 16);

          if (window.searchMarker) {
            map.removeLayer(window.searchMarker);
          }

          window.searchMarker = L.marker([parseFloat(result.lat), parseFloat(result.lon)]).addTo(map)
            .bindPopup(result.display_name)
            .openPopup();

          if (searchContainerControl) {
            map.removeControl(searchContainerControl);
            searchContainerControl = null;
          }

          var searchInput = document.getElementById('search-input');
          if (searchInput) {
            searchInput.blur();
          }
        } else {
          console.log("Keine Ergebnisse gefunden für:", query);
          alert("Adresse nicht gefunden.");
        }
      })
      .catch(err => {
        console.error("Fehler beim Abrufen der Adresse:", err);
        alert("Fehler beim Abrufen der Adresse. Bitte versuche es später erneut.");
      });
  }

  // Standort-Button-Steuerung
var customLocateControl = L.Control.extend({
  options: {
    position: "topleft",
    className: "leaflet-control locate-button leaflet-bar",
    html: '<a href="#" class="leaflet-bar-part leaflet-bar-part-single" title="Standort bestimmen"><i class="fas fa-location-arrow"></i></a>',
  },
  onAdd: function (map) {
    this._map = map;
    var container = L.DomUtil.create("div", this.options.className);
    container.innerHTML = this.options.html;
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(container.querySelector('a'), "click", this._clicked, this);
    return container;
  },
  _clicked: function (e) {
    L.DomEvent.stopPropagation(e);
    L.DomEvent.preventDefault(e);
    this._checkLocate();
    return;
  },
  _checkLocate: function () {
    return this._locateMap();
  },
  _locateMap: function () {
    var locateActive = document.querySelector(".locate-button a");
    var isActive = locateActive.classList.contains("locate-active");
    locateActive.classList[isActive ? "remove" : "add"]("locate-active");

    if (isActive) {
      this._map.stopLocate();
      return;
    }

    this._map.on("locationfound", this.onLocationFound, this);
    this._map.on("locationerror", this.onLocationError, this);
    this._map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
  },
  onLocationFound: function (e) {
    console.log("Location found:", e); 
    locationLayerGroup.clearLayers();
    var radius = Math.max(e.accuracy / 2, 50);
    var circle = L.circle(e.latlng, {
      radius: radius,
      className: "circle-test",
      weight: 3,
      stroke: true,
      color: "#0000ff",
      fillColor: "#52b7c1",
      fillOpacity: 0.5,
    });
    var marker = L.marker(e.latlng, {
      icon: L.divIcon({
        className: "located-animation",
        html: '<div style="background:#52b7c1; border: 2px solid #0000ff; border-radius:50%; width:30px; height:30px;"></div>',
        iconSize: [30, 30],
        popupAnchor: [0, -15],
      }),
    }).bindPopup("Du bist hier :)");

    locationLayerGroup.addLayer(circle);
    locationLayerGroup.addLayer(marker);
    this._map.setView(e.latlng, 16);
  },
  onLocationError: function (e) {
    console.log("Location found:", e);
    alert("Standort konnte nicht ermittelt werden.");
    var locateActive = document.querySelector(".locate-button a");
    locateActive.classList.remove("locate-active");
  }
});

// Vollbild-Button-Steuerung (unverändert)
var customFullscreenControl = L.Control.extend({
  options: {
    position: "topleft",
    className: "leaflet-control fullscreen-button leaflet-bar",
    html: '<a href="#" class="leaflet-bar-part leaflet-bar-part-single" title="Zur Wahlkampfkarte"><i class="fas fa-expand"></i></a>',
  },
  onAdd: function (map) {
    var container = L.DomUtil.create("div", this.options.className);
    container.innerHTML = this.options.html;
    L.DomEvent.disableClickPropagation(container);

    L.DomEvent.on(container.querySelector('a'), "click", function(e) {
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      // Statt Fullscreen: Link öffnen
      window.top.location.href = 'https://benjaminbleske.github.io/wahlkampfwahlbezirkskarte/';
    });

    return container;
  },
});



  // Karte bei Fenstergrößenänderung anpassen
  window.addEventListener('resize', () => {
    if (window.innerHeight < 500) {
      map.invalidateSize();
    }
  });

  // Controls zur Karte hinzufügen
  map.addControl(new customFullscreenControl());
  map.addControl(new customLocateControl());
  map.addControl(new customSearchControl());

  // GeoJSON-Daten laden
  loadGeoJSON();

  // Kartenhöhe anpassen
  function updateMapHeight() {
    var mapDiv = document.getElementById('map');
    mapDiv.style.height = window.innerHeight + 'px';
  }
  updateMapHeight();
  window.addEventListener('resize', function() {
    updateMapHeight();
    map.invalidateSize();
  });
});
