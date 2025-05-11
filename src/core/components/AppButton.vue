<script>
export default {
  name: 'AppButton',
  props: {
    label: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    variant: {
      type: String,
      default: 'primary',
      validator: (value) => ['primary', 'secondary', 'text', 'back'].includes(value)
    },
    size: {
      type: String,
      default: 'normal',
      validator: (value) => ['small', 'normal', 'large'].includes(value)
    },
    fullWidth: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'button',
      validator: (value) => ['button', 'filter'].includes(value)
    },
    filterOptions: {
      type: Array,
      default: () => []
    },
    filterValue: {
      type: Array,
      default: () => []
    }
  },
  emits: ['click', 'update:filterValue', 'filter-apply'],
  data() {
    return {
      isDropdownOpen: false,
      selectedFilters: [...this.filterValue]
    }
  },
  watch: {
    filterValue(newVal) {
      this.selectedFilters = [...newVal];
    }
  },
  mounted() {
    if (this.type === 'filter') {
      document.addEventListener('click', this.handleOutsideClick);
    }
  },
  beforeUnmount() {
    if (this.type === 'filter') {
      document.removeEventListener('click', this.handleOutsideClick);
    }
  },
  methods: {
    handleClick(event) {
      if (this.type === 'filter') {
        this.toggleDropdown();
      } else {
        this.$emit('click', event);
      }
    },
    toggleDropdown() {
      if (!this.disabled && !this.loading) {
        this.isDropdownOpen = !this.isDropdownOpen;
      }
    },
    handleOutsideClick(event) {
      const buttonEl = this.$el;
      const dropdownEl = this.$refs.dropdown;

      if (this.isDropdownOpen &&
          buttonEl &&
          dropdownEl &&
          !buttonEl.contains(event.target) &&
          !dropdownEl.contains(event.target)) {
        this.isDropdownOpen = false;
      }
    },
    toggleFilterOption(option) {
      const index = this.selectedFilters.findIndex(item => item.value === option.value);

      if (index === -1) {
        // Añadir opción
        this.selectedFilters.push(option);
      } else {
        // Eliminar opción
        this.selectedFilters.splice(index, 1);
      }

      this.$emit('update:filterValue', [...this.selectedFilters]);
    },
    isFilterSelected(option) {
      return this.selectedFilters.some(item => item.value === option.value);
    },
    clearFilters() {
      this.selectedFilters = [];
      this.$emit('update:filterValue', []);
    },
    applyFilters() {
      this.isDropdownOpen = false;
      this.$emit('filter-apply', [...this.selectedFilters]);
    }
  }
}
</script>

<template>
  <div :class="{ 'app-button-container': type === 'filter', 'app-button-filter-active': type === 'filter' && selectedFilters.length > 0 }">
    <!-- Usamos el pv-button de PrimeVue pero con clases personalizadas para mantener el estilo nativo -->
    <pv-button
        :label="label"
        :icon="icon"
        :loading="loading"
        :disabled="disabled"
        :class="[
        'app-button',
        `app-button--${variant}`,
        `app-button--${size}`,
        {
          'app-button--full-width': fullWidth,
          'app-button--loading': loading,
          'app-button--active': type === 'filter' && selectedFilters.length > 0
        }
      ]"
        @click="handleClick"
    >
      <template #loading>
        <i class="pi pi-spin pi-spinner loading-icon"></i>
      </template>
      <slot></slot>
    </pv-button>

    <!-- Dropdown para filtros -->
    <div
        v-if="type === 'filter' && isDropdownOpen"
        ref="dropdown"
        class="app-button-dropdown"
    >
      <div class="app-button-dropdown-header">
        <h4 class="app-button-dropdown-title">Filtros</h4>
        <button
            class="app-button-dropdown-clear"
            @click.stop="clearFilters"
            type="button"
        >
          Limpiar
        </button>
      </div>

      <div class="app-button-dropdown-content">
        <div
            v-for="option in filterOptions"
            :key="option.value"
            class="app-button-filter-option"
            :class="{ 'selected': isFilterSelected(option) }"
            @click.stop="toggleFilterOption(option)"
        >
          <div class="app-button-filter-checkbox">
            <i v-if="isFilterSelected(option)" class="pi pi-check"></i>
          </div>
          <span>{{ option.label }}</span>
        </div>

        <div v-if="filterOptions.length === 0" class="app-button-filter-no-options">
          No hay filtros disponibles
        </div>
      </div>

      <div class="app-button-dropdown-footer">
        <button
            class="app-button app-button--primary app-button--small"
            @click.stop="applyFilters"
        >
          Aplicar
        </button>
      </div>
    </div>
  </div>
</template>

<style>
/* Reset y estilos base para PrimeVue */
.app-button.p-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
  border: none;
  font-family: inherit;
  gap: 0.5rem;
  margin: 0;
}

/* Variantes */
.app-button--primary.p-button {
  background-color: #FF5F01 !important;
  border-color: #FF5F01 !important;
  color: #FFFFFF !important;
}

.app-button--primary.p-button:hover:not(:disabled):not(.p-disabled) {
  background-color: #e55600 !important;
  border-color: #e55600 !important;
}

.app-button--secondary.p-button {
  background-color: transparent !important;
  border: 1px solid #FF5F01 !important;
  color: #FF5F01 !important;
}

.app-button--secondary.p-button:hover:not(:disabled):not(.p-disabled) {
  background-color: rgba(255, 95, 1, 0.1) !important;
}

.app-button--text.p-button {
  background-color: transparent !important;
  border-color: transparent !important;
  color: #FF5F01 !important;
  padding: 0.25rem 0.5rem !important;
}

.app-button--text.p-button:hover:not(:disabled):not(.p-disabled) {
  background-color: rgba(255, 95, 1, 0.1) !important;
}

.app-button--back.p-button {
  background-color: #FF5F01 !important;
  border-color: #FF5F01 !important;
  color: white !important;
  padding: 0.5rem !important;
  border-radius: 4px !important;
}

/* Tamaños */
.app-button--small.p-button {
  font-size: 0.875rem !important;
  padding: 0.25rem 0.75rem !important;
}

.app-button--normal.p-button {
  font-size: 1rem !important;
  padding: 0.5rem 1rem !important;
}

.app-button--large.p-button {
  font-size: 1.125rem !important;
  padding: 0.75rem 1.5rem !important;
}

/* Estados */
.app-button.p-button:disabled,
.app-button.p-button.p-disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
}

.app-button--loading.p-button .p-button-label {
  visibility: hidden !important;
}

.app-button--loading.p-button .loading-icon {
  position: absolute !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
}

.app-button--full-width.p-button {
  width: 100% !important;
  display: flex !important;
}

/* Ícono */
.app-button.p-button .p-button-icon {
  font-size: inherit !important;
  width: auto !important;
  height: auto !important;
}

.app-button.p-button .p-button-icon:only-child {
  margin: 0 !important;
}

/* Estilos específicos para el botón de filtro */
.app-button-container {
  position: relative;
  display: inline-flex;
}

.app-button--active.p-button {
  background-color: #e55600 !important;
}

.app-button-dropdown {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  background: white;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  max-width: 300px;
  z-index: 1000;
  overflow: hidden;
  animation: fadeIn 0.2s ease-out;
}

.app-button-dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}

.app-button-dropdown-title {
  margin: 0;
  font-size: 1rem;
  color: #333;
  font-weight: 500;
}

.app-button-dropdown-clear {
  background: none;
  border: none;
  color: #FF5F01;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
}

.app-button-dropdown-content {
  max-height: 250px;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.app-button-filter-option {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  color: #333; /* Color explícito para el texto */
}

.app-button-filter-option:hover {
  background-color: #f5f5f5;
}

.app-button-filter-option.selected {
  background-color: rgba(255, 95, 1, 0.1);
}

.app-button-filter-checkbox {
  width: 18px;
  height: 18px;
  border: 1px solid #ddd;
  border-radius: 3px;
  margin-right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-button-filter-option.selected .app-button-filter-checkbox {
  background-color: #FF5F01;
  border-color: #FF5F01;
  color: white;
}

.app-button-filter-option span {
  color: #333;
}

.app-button-filter-option.selected span {
  color: #333;
  font-weight: 500;
}

.app-button-filter-no-options {
  padding: 0.75rem 1rem;
  color: #666;
  font-style: italic;
  text-align: center;
}

.app-button-dropdown-footer {
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #eee;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Correcciones para asegurar que los estilos de PrimeVue no interfieran */
.app-button.p-button .p-button-label {
  margin: 0 !important;
  font-weight: 500 !important;
}

/* Arreglos para el espacio entre texto e icono */
.app-button.p-button .p-button-icon-left {
  margin-right: 0.5rem !important;
}

.app-button.p-button .p-button-icon-right {
  margin-left: 0.5rem !important;
}

.app-button.p-button:focus,
.app-button.p-button:active {
  outline: none !important;
  box-shadow: none !important;
}


.app-button.p-button:focus {
  /* Opción 1: Un sutil brillo */
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.2) !important;

  /* Opción 2: Un borde personalizado */
  /* border: 2px solid rgba(255, 95, 1, 0.5) !important; */
}

/* Para el efecto específico al presionar (active state) */
.app-button.p-button:active {
  /* Un efecto sutil de "hundimiento" */
  transform: translateY(1px);
}

/* Para botones secundarios y text que necesitan un estilo específico en foco */
.app-button--secondary.p-button:focus,
.app-button--text.p-button:focus {
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.15) !important;
}

</style>