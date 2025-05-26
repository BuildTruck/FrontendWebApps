<template>
  <div class="location-input-container">
    <label v-if="label" class="location-label" :class="{ 'required': required }">
      {{ label }}
    </label>

    <div class="location-input-wrapper" :class="{ 'has-error': error }">
      <div class="input-with-icon">
        <i class="pi pi-map-marker location-icon"></i>
        <input
            ref="locationInput"
            v-model="searchQuery"
            type="text"
            class="location-input"
            :placeholder="placeholder"
            @input="onInput"
            @focus="onFocus"
            @blur="onBlur"
            @keydown="onKeyDown"
            autocomplete="off"
        />
        <i v-if="loading" class="pi pi-spin pi-spinner loading-spinner"></i>

        <!-- 🗺️ Botón para abrir mapa -->
        <button
            type="button"
            class="map-button"
            @click="openMapModal"
            :title="'Ver en mapa'"
        >
          <i class="pi pi-map"></i>
        </button>
      </div>

      <!-- Dropdown de sugerencias -->
      <div
          v-if="showSuggestions && suggestions.length > 0"
          class="suggestions-dropdown"
      >
        <div
            v-for="(suggestion, index) in suggestions"
            :key="suggestion.id"
            class="suggestion-item"
            :class="{ 'highlighted': index === highlightedIndex }"
            @mousedown="selectSuggestion(suggestion)"
            @mouseenter="highlightedIndex = index"
        >
          <i class="pi pi-map-marker suggestion-icon"></i>
          <div class="suggestion-content">
            <div class="suggestion-main">{{ suggestion.place_name.split(',')[0] }}</div>
            <div class="suggestion-detail">{{ suggestion.place_name.split(',').slice(1).join(',').trim() }}</div>
          </div>
        </div>
      </div>

      <!-- Mensaje de no resultados -->
      <div
          v-if="showSuggestions && suggestions.length === 0 && searchQuery.length > 2 && !loading"
          class="no-results"
      >
        <i class="pi pi-info-circle"></i>
        No se encontraron ubicaciones
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- Ubicación seleccionada con preview -->
    <div v-if="selectedLocation && !showSuggestions" class="selected-location">
      <div class="location-info">
        <i class="pi pi-check-circle success-icon"></i>
        <span>{{ selectedLocation.place_name }}</span>
      </div>
      <div class="location-actions">
        <button type="button" @click="openMapModal" class="preview-map-btn">
          <i class="pi pi-eye"></i> Ver
        </button>
        <button type="button" @click="clearSelection" class="clear-button">
          <i class="pi pi-times"></i>
        </button>
      </div>
    </div>

    <!-- 🗺️ MODAL CON MAPA INTERACTIVO -->
    <div v-if="showMapModal" class="map-modal-overlay" @click="closeMapModal">
      <div class="map-modal" @click.stop>
        <div class="map-modal-header">
          <h3>📍 Seleccionar Ubicación</h3>
          <button class="modal-close-btn" @click="closeMapModal">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="map-modal-body">
          <!-- Buscador dentro del modal -->
          <div class="map-search-container">
            <div class="map-search-wrapper">
              <i class="pi pi-search"></i>
              <input
                  v-model="mapSearchQuery"
                  type="text"
                  class="map-search-input"
                  placeholder="Buscar ubicación en el mapa..."
                  @input="onMapSearch"
              />
            </div>
            <div class="map-instructions">
              💡 <strong>Busca por texto</strong> o <strong>haz click en el mapa</strong> para seleccionar
            </div>
          </div>

          <!-- Contenedor del mapa -->
          <div ref="mapContainer" class="map-container" id="mapbox-map">
            <div class="map-loading" v-if="mapLoading">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Cargando mapa...</span>
            </div>
          </div>

          <!-- Info de ubicación seleccionada en mapa -->
          <div v-if="mapSelectedLocation" class="map-selected-info">
            <div class="selected-info-content">
              <i class="pi pi-map-marker"></i>
              <div>
                <div class="selected-address">{{ mapSelectedLocation.place_name || mapSelectedLocation.address }}</div>
                <div class="selected-coords" v-if="mapSelectedLocation.coordinates">
                  {{ mapSelectedLocation.coordinates.lat.toFixed(6) }}, {{ mapSelectedLocation.coordinates.lng.toFixed(6) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="map-modal-footer">
          <button class="btn-secondary" @click="closeMapModal">
            Cancelar
          </button>
          <button
              class="btn-primary"
              @click="confirmMapSelection"
              :disabled="!mapSelectedLocation"
          >
            📍 Confirmar Ubicación
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LocationInput',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: 'Ingrese una ubicación...'
    },
    required: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    fullWidth: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'location-selected'],
  data() {
    return {
      searchQuery: '',
      suggestions: [],
      selectedLocation: null,
      loading: false,
      showSuggestions: false,
      highlightedIndex: -1,
      searchTimeout: null,

      // 🗺️ Nuevas propiedades para el mapa
      showMapModal: false,
      mapSearchQuery: '',
      mapSelectedLocation: null,
      mapLoading: false,
      map: null,
      marker: null,

      // Token de Mapbox
      MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoidGVzdC11c2VyIiwiYSI6ImNscXZlbm1lYjE5ZHEybG1vN2c2YzE4M3MifQ.mock_token'
    }
  },
  watch: {
    modelValue: {
      handler(newValue) {
        if (newValue !== this.searchQuery) {
          this.searchQuery = newValue;
          this.selectedLocation = null;
        }
      },
      immediate: true
    }
  },
  methods: {
    // ... Métodos existentes del autocompletado ...
    onInput() {
      this.$emit('update:modelValue', this.searchQuery);
      this.selectedLocation = null;
      this.showSuggestions = true;
      this.highlightedIndex = -1;

      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      if (this.searchQuery.length < 2) {
        this.suggestions = [];
        this.showSuggestions = false;
        return;
      }

      this.searchTimeout = setTimeout(() => {
        this.searchLocations();
      }, 300);
    },

    onFocus() {
      if (this.suggestions.length > 0 && this.searchQuery.length >= 2) {
        this.showSuggestions = true;
      }
    },

    onBlur() {
      setTimeout(() => {
        this.showSuggestions = false;
      }, 150);
    },

    onKeyDown(event) {
      if (!this.showSuggestions || this.suggestions.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.suggestions.length - 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
          break;
        case 'Enter':
          event.preventDefault();
          if (this.highlightedIndex >= 0) {
            this.selectSuggestion(this.suggestions[this.highlightedIndex]);
          }
          break;
        case 'Escape':
          this.showSuggestions = false;
          this.highlightedIndex = -1;
          break;
      }
    },

    async searchLocations() {
      if (!this.searchQuery || this.searchQuery.length < 2) {
        this.suggestions = [];
        return;
      }

      this.loading = true;

      try {
        const query = encodeURIComponent(this.searchQuery);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?` +
            `access_token=${this.MAPBOX_TOKEN}&` +
            `country=pe&` +
            `types=address,poi,place&` +
            `limit=5&` +
            `language=es`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.suggestions = data.features || [];

        if (this.suggestions.length === 0) {
          const globalUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?` +
              `access_token=${this.MAPBOX_TOKEN}&` +
              `types=address,poi,place&` +
              `limit=3&` +
              `language=es`;

          const globalResponse = await fetch(globalUrl);
          if (globalResponse.ok) {
            const globalData = await globalResponse.json();
            this.suggestions = globalData.features || [];
          }
        }

      } catch (error) {
        console.error('Error buscando ubicaciones:', error);
        this.suggestions = [];

        if (this.searchQuery.length > 2) {
          this.suggestions = [{
            id: 'manual',
            place_name: `${this.searchQuery} (ingreso manual)`,
            manual: true
          }];
        }
      } finally {
        this.loading = false;
      }
    },

    selectSuggestion(suggestion) {
      this.selectedLocation = suggestion;
      this.searchQuery = suggestion.place_name;
      this.showSuggestions = false;
      this.highlightedIndex = -1;

      this.$emit('update:modelValue', suggestion.place_name);

      const locationData = {
        address: suggestion.place_name,
        coordinates: suggestion.geometry ? {
          lng: suggestion.geometry.coordinates[0],
          lat: suggestion.geometry.coordinates[1]
        } : null,
        isManual: suggestion.manual || false
      };

      this.$emit('location-selected', locationData);

      this.$nextTick(() => {
        this.$refs.locationInput.blur();
      });
    },

    clearSelection() {
      this.selectedLocation = null;
      this.searchQuery = '';
      this.suggestions = [];
      this.showSuggestions = false;
      this.$emit('update:modelValue', '');
      this.$emit('location-selected', null);
      this.$refs.locationInput.focus();
    },

    // 🗺️ NUEVOS MÉTODOS PARA EL MAPA
    async openMapModal() {
      this.showMapModal = true;
      this.mapSearchQuery = this.searchQuery;
      this.mapSelectedLocation = this.selectedLocation ? {
        place_name: this.selectedLocation.place_name,
        coordinates: this.selectedLocation.geometry ? {
          lng: this.selectedLocation.geometry.coordinates[0],
          lat: this.selectedLocation.geometry.coordinates[1]
        } : null
      } : null;

      // Esperar a que el modal se renderice
      await this.$nextTick();
      this.initializeMap();
    },

    closeMapModal() {
      this.showMapModal = false;
      this.mapSearchQuery = '';
      this.mapSelectedLocation = null;

      // Limpiar el mapa
      if (this.map) {
        this.map.remove();
        this.map = null;
        this.marker = null;
      }
    },

    async initializeMap() {
      this.mapLoading = true;

      try {
        // Cargar Mapbox GL JS dinámicamente
        if (!window.mapboxgl) {
          await this.loadMapboxGL();
        }

        window.mapboxgl.accessToken = this.MAPBOX_TOKEN;

        // Coordenadas por defecto (Lima, Perú)
        const defaultCenter = [-77.0428, -12.0464];
        const center = this.mapSelectedLocation?.coordinates ?
            [this.mapSelectedLocation.coordinates.lng, this.mapSelectedLocation.coordinates.lat] :
            defaultCenter;

        // Crear el mapa
        this.map = new window.mapboxgl.Map({
          container: 'mapbox-map',
          style: 'mapbox://styles/mapbox/streets-v12',
          center: center,
          zoom: this.mapSelectedLocation ? 15 : 10
        });

        // Esperar a que el mapa se cargue
        this.map.on('load', () => {
          this.mapLoading = false;

          // Si hay ubicación seleccionada, agregar marker
          if (this.mapSelectedLocation?.coordinates) {
            this.addMapMarker(this.mapSelectedLocation.coordinates);
          }
        });

        // Click en el mapa para seleccionar ubicación
        this.map.on('click', async (e) => {
          const coords = {
            lng: e.lngLat.lng,
            lat: e.lngLat.lat
          };

          // Reverse geocoding para obtener la dirección
          try {
            const address = await this.reverseGeocode(coords);
            this.mapSelectedLocation = {
              address: address,
              place_name: address,
              coordinates: coords
            };

            this.addMapMarker(coords);
          } catch (error) {
            console.error('Error en reverse geocoding:', error);
            this.mapSelectedLocation = {
              address: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
              place_name: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
              coordinates: coords
            };
            this.addMapMarker(coords);
          }
        });

      } catch (error) {
        console.error('Error inicializando mapa:', error);
        this.mapLoading = false;
      }
    },

    async loadMapboxGL() {
      return new Promise((resolve, reject) => {
        // Cargar CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        document.head.appendChild(cssLink);

        // Cargar JS
        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    },

    addMapMarker(coordinates) {
      // Remover marker anterior
      if (this.marker) {
        this.marker.remove();
      }

      // Crear nuevo marker
      this.marker = new window.mapboxgl.Marker({
        color: '#FF5F01',
        draggable: true
      })
          .setLngLat([coordinates.lng, coordinates.lat])
          .addTo(this.map);

      this.marker.on('dragend', async () => {
        const lngLat = this.marker.getLngLat();
        const coords = { lng: lngLat.lng, lat: lngLat.lat };

        try {
          const address = await this.reverseGeocode(coords);
          this.mapSelectedLocation = {
            address: address,
            place_name: address,
            coordinates: coords
          };

          this.mapSearchQuery = address;
        } catch (error) {
          this.mapSelectedLocation = {
            address: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
            place_name: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
            coordinates: coords
          };

          this.mapSearchQuery = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
        }
      });

      // Centrar mapa en el marker
      this.map.flyTo({
        center: [coordinates.lng, coordinates.lat],
        zoom: 15
      });
    },

    async reverseGeocode(coordinates) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?` +
            `access_token=${this.MAPBOX_TOKEN}&language=es`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          return data.features[0].place_name;
        }

        return `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
      } catch (error) {
        return `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
      }
    },

    async onMapSearch() {
      if (this.mapSearchQuery.length < 2) return;

      try {
        const query = encodeURIComponent(this.mapSearchQuery);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?` +
            `access_token=${this.MAPBOX_TOKEN}&` +
            `country=pe&` +
            `limit=1&` +
            `language=es`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const coords = {
            lng: feature.geometry.coordinates[0],
            lat: feature.geometry.coordinates[1]
          };

          this.mapSelectedLocation = {
            place_name: feature.place_name,
            address: feature.place_name,
            coordinates: coords
          };

          this.addMapMarker(coords);
        }
      } catch (error) {
        console.error('Error en búsqueda del mapa:', error);
      }
    },

    confirmMapSelection() {
      if (!this.mapSelectedLocation) return;

      // Actualizar el input principal
      this.selectedLocation = {
        place_name: this.mapSelectedLocation.place_name,
        geometry: {
          coordinates: [
            this.mapSelectedLocation.coordinates.lng,
            this.mapSelectedLocation.coordinates.lat
          ]
        }
      };


      this.searchQuery = this.mapSelectedLocation.place_name;
      this.showSuggestions = false;


      this.$nextTick(() => {
        if (this.$refs.locationInput) {
          this.$refs.locationInput.value = this.mapSelectedLocation.place_name;
        }
      });

      this.$emit('update:modelValue', this.mapSelectedLocation.place_name);

      const locationData = {
        address: this.mapSelectedLocation.place_name,
        coordinates: this.mapSelectedLocation.coordinates,
        isManual: false
      };

      this.$emit('location-selected', locationData);

      // Cerrar modal
      this.closeMapModal();
    }
  }
}
</script>

<style scoped>
/* Estilos existentes + nuevos estilos para el mapa */
.location-input-container {
  width: 100%;
  position: relative;
}

.location-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.location-label.required::after {
  content: ' *';
  color: #ef4444;
}

.location-input-wrapper {
  position: relative;
  width: 100%;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.location-icon {
  position: absolute;
  left: 12px;
  color: #9ca3af;
  font-size: 16px;
  z-index: 2;
}

.location-input {
  width: 100%;
  color: black;
  padding: 12px 80px 12px 40px; /* Más espacio a la derecha para el botón de mapa */
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s ease;
  background-color: white;
}

.location-input:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 3px rgba(255, 95, 1, 0.1);
}

.location-input-wrapper.has-error .location-input {
  border-color: #ef4444;
}

.loading-spinner {
  position: absolute;
  right: 50px;
  color: #FF5F01;
  font-size: 16px;
}

/* 🗺️ BOTÓN DE MAPA */
.map-button {
  position: absolute;
  right: 8px;
  background: #FF5F01;
  color: white;
  border: none;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.map-button:hover {
  background: #e54e00;
  transform: scale(1.05);
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #f3f4f6;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background-color: #f9fafb;
}

.suggestion-icon {
  color: #FF5F01;
  margin-right: 12px;
  font-size: 14px;
  flex-shrink: 0;
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.suggestion-main {
  font-weight: 500;
  color: #111827;
  font-size: 14px;
  margin-bottom: 2px;
}

.suggestion-detail {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-results {
  display: flex;
  align-items: center;
  padding: 12px;
  color: #6b7280;
  font-size: 14px;
}

.no-results .pi {
  margin-right: 8px;
}

.error-message {
  margin-top: 6px;
  color: #ef4444;
  font-size: 14px;
}

.selected-location {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  font-size: 14px;
}

.location-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.success-icon {
  color: #16a34a;
  margin-right: 8px;
  font-size: 14px;
}

.location-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-map-btn {
  background: #FF5F01;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.preview-map-btn:hover {
  background: #e54e00;
}

.clear-button {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s ease;
}

.clear-button:hover {
  color: #374151;
}

/* 🗺️ ESTILOS DEL MODAL CON MAPA */
.map-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.map-modal {
  background: white;
  border-radius: 12px;
  width: 90vw;
  max-width: 900px;
  height: 80vh;
  max-height: 700px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.map-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.map-modal-header h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 600;
}

.modal-close-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  font-size: 18px;
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.map-modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.map-search-container {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.map-search-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.map-search-wrapper .pi-search {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
}

.map-search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.map-search-input:focus {
  outline: none;
  border-color: #FF5F01;
}

.map-instructions {
  font-size: 12px;
  color: #6b7280;
}

.map-container {
  flex: 1;
  position: relative;
  min-height: 400px;
}

.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #6b7280;
  z-index: 10;
}

.map-loading .pi-spinner {
  font-size: 24px;
  color: #FF5F01;
}

.map-selected-info {
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.selected-info-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-info-content .pi-map-marker {
  color: #FF5F01;
  font-size: 16px;
}

.selected-address {
  font-weight: 500;
  color: #111827;
  font-size: 14px;
}

.selected-coords {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.map-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary {
  background: #FF5F01;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #e54e00;
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .map-modal {
    width: 95vw;
    height: 85vh;
    margin: 10px;
  }

  .map-modal-header,
  .map-search-container,
  .map-selected-info,
  .map-modal-footer {
    padding: 16px;
  }

  .location-input {
    font-size: 16px;
  }
}
</style>