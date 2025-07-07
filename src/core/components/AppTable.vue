<script>
import AppButton from './AppButton.vue';
import AppInput from './AppInput.vue';
import Dropdown from 'primevue/dropdown';

export default {
  name: 'AppTable',
  components: {
    AppButton,
    AppInput,
    Dropdown
  },
  props: {
    columns: {
      type: Array,
      required: true
    },
    data: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    striped: {
      type: Boolean,
      default: true
    },
    paginator: {
      type: Boolean,
      default: true
    },
    rows: {
      type: Number,
      default: 15
    },
    selectable: {
      type: Boolean,
      default: false
    },
    selection: {
      type: Array,
      default: () => []
    },
    showGridlines: {
      type: Boolean,
      default: true
    },
    dataKey: {
      type: String,
      default: 'id'
    },
    globalFilterFields: {
      type: Array,
      default: null
    },
    showExportButton: {
      type: Boolean,
      default: false
    },
    showFilterButton: {
      type: Boolean,
      default: false
    },
    showAddButton: {
      type: Boolean,
      default: false
    },
    addButtonPosition: {
      type: String,
      default: 'bottom-right'
    },
    scrollable: {
      type: Boolean,
      default: false
    },
    scrollHeight: {
      type: String,
      default: '500px'
    },
    showRowsPerPageDropdown: {
      type: Boolean,
      default: true
    },
    rowsPerPageOptions: {
      type: Array,
      default: () => [10, 15, 25, 50, 100]
    }
  },
  emits: [
    'update:selection',
    'row-click',
    'filter',
    'export',
    'add',
    'toggle-selection',
    'delete',
    'row-select',
    'row-unselect',
    'update:rows'
  ],
  data() {
    return {
      localSelection: [],
      filters: {},
      globalFilterValue: '',
      selectEnabled: false, // ✅ SIEMPRE inicia en false
      showFilterMenu: false,
      filterMatchMode: 'contains',
      filterRules: [],
      activeFilterField: null,
      localRows: this.rows
    };
  },
  created() {
    this.initFilters();
    this.syncSelection();
    this.localRows = this.rows;
    document.addEventListener('click', this.handleOutsideClick);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
  },
  watch: {
    selection: {
      handler(newValue) {
        this.syncSelection();
      },
      deep: true,
      immediate: true
    },
    // ✅ CORREGIDO: No activar selección automáticamente
    selectable: {
      handler(newValue) {
        // NO cambiar selectEnabled automáticamente
        // Solo limpiar selección si se desactiva
        if (!newValue && this.selectEnabled) {
          this.clearSelection();
          this.selectEnabled = false;
        }
      },
      immediate: false // ✅ Cambiar a false
    },
    rows: {
      handler(newValue) {
        this.localRows = newValue;
      },
      immediate: true
    }
  },
  computed: {
    effectiveGlobalFilterFields() {
      if (this.globalFilterFields) {
        return this.globalFilterFields;
      }
      return this.columns.map(col => col.field);
    },
    filterableColumns() {
      return this.columns.filter(col => col.filterable !== false);
    },
    filteredData() {
      let result = [...this.data];

      // Aplicar filtro global
      if (this.globalFilterValue && this.globalFilterValue.trim()) {
        const searchTerm = this.globalFilterValue.toLowerCase().trim();
        result = result.filter(item => {
          return this.effectiveGlobalFilterFields.some(field => {
            const value = item[field];
            return value && value.toString().toLowerCase().includes(searchTerm);
          });
        });
      }

      // Aplicar filtros específicos
      this.filterRules.forEach(rule => {
        if (rule.value && rule.field) {
          const searchValue = rule.value.toLowerCase();
          result = result.filter(item => {
            const fieldValue = item[rule.field];
            if (!fieldValue) return false;

            const stringValue = fieldValue.toString().toLowerCase();

            if (rule.mode === 'Starts with') {
              return stringValue.startsWith(searchValue);
            } else {
              return stringValue.includes(searchValue);
            }
          });
        }
      });

      return result;
    },
    isAllSelected() {
      return this.filteredData.length > 0 &&
          this.localSelection.length === this.filteredData.length &&
          this.selectEnabled;
    },
    isIndeterminate() {
      return this.localSelection.length > 0 &&
          this.localSelection.length < this.filteredData.length &&
          this.selectEnabled;
    }
  },
  methods: {
    // Inicialización
    initFilters() {
      this.filters = {
        global: { value: null, matchMode: 'contains' }
      };
      this.filterRules = [];
    },

    syncSelection() {
      if (Array.isArray(this.selection)) {
        this.localSelection = [...this.selection];
      } else {
        this.localSelection = [];
      }
    },

    clearSelection() {
      this.localSelection = [];
      this.$emit('update:selection', []);
    },

    // Selección masiva
    toggleSelectAll() {
      if (this.isAllSelected) {
        this.localSelection = [];
      } else {
        this.localSelection = [...this.filteredData];
      }
      this.$emit('update:selection', this.localSelection);
    },

    // Filtros
    onGlobalFilterChange() {
      this.filters.global.value = this.globalFilterValue || null;
      this.$emit('filter', {
        global: this.globalFilterValue,
        rules: this.filterRules
      });
    },

    toggleFilterMenu() {
      this.showFilterMenu = !this.showFilterMenu;
    },

    handleOutsideClick(event) {
      const filterMenu = this.$refs.filterMenu;
      const filterButton = event.target.closest('.filter-dropdown-container');

      if (filterMenu && !filterMenu.contains(event.target) && !filterButton) {
        this.showFilterMenu = false;
      }
    },

    addFilterRule() {
      this.filterRules.push({
        mode: 'Contains',
        value: '',
        field: this.filterableColumns[0]?.field || ''
      });
    },

    removeFilterRule(index) {
      this.filterRules.splice(index, 1);
      this.applyFilters();
    },

    updateFilterRule(index, field, value) {
      if (this.filterRules[index]) {
        this.filterRules[index][field] = value;
      }
    },

    applyFilters() {
      this.$emit('filter', {
        global: this.globalFilterValue,
        rules: this.filterRules
      });
      this.showFilterMenu = false;
    },

    clearAllFilters() {
      this.filterRules = [];
      this.globalFilterValue = '';
      this.initFilters();
      this.$emit('filter', {
        global: '',
        rules: []
      });
      this.showFilterMenu = false;
    },

    // Gestión de selección
    onSelectionChange(selection) {
      this.localSelection = Array.isArray(selection) ? [...selection] : [];
      this.$emit('update:selection', this.localSelection);
    },

    onRowSelect(event) {
      this.$emit('row-select', event);
    },

    onRowUnselect(event) {
      this.$emit('row-unselect', event);
    },

    onRowClick(event) {
      // ✅ CORREGIDO: Permitir click incluso con selección habilitada
      this.$emit('row-click', event);
    },

    toggleSelectionMode() {
      this.selectEnabled = !this.selectEnabled;

      if (!this.selectEnabled) {
        this.clearSelection();
      }

      this.$emit('toggle-selection', this.selectEnabled);
    },

    isSelected(rowData) {
      if (!this.dataKey || !rowData || !this.selectEnabled) return false;

      return this.localSelection.some(
          item => item && item[this.dataKey] === rowData[this.dataKey]
      );
    },

    toggleRowSelection(rowData) {
      if (!this.dataKey || !rowData || !this.selectEnabled) return;

      const isCurrentlySelected = this.isSelected(rowData);

      if (isCurrentlySelected) {
        this.localSelection = this.localSelection.filter(
            item => item && item[this.dataKey] !== rowData[this.dataKey]
        );
      } else {
        this.localSelection = [...this.localSelection, rowData];
      }

      this.$emit('update:selection', this.localSelection);
    },

    // Paginación
    onRowsPerPageChange(event) {
      const newRows = event?.value !== undefined ? event.value : event;
      this.localRows = newRows;
      this.$emit('update:rows', newRows);
    },

    onPageChange(event) {
      console.log('📄 Cambio de página:', event);
    },

    // Acciones
    handleExport() {
      this.$emit('export', {
        filteredData: this.filteredData,
        selectedData: this.localSelection,
        allData: this.data
      });
    },

    handleAdd() {
      this.$emit('add');
    },

    handleDelete() {
      if (this.localSelection && this.localSelection.length > 0) {
        this.$emit('delete', this.localSelection);
      }
    },

    // Utilidades
    getStatusClass(status) {
      if (!status) return 'status-default';

      const statusLower = String(status).toLowerCase();

      switch (statusLower) {
        case 'cancelado':
        case 'qualified':
          return 'status-success';
        case 'unqualified':
        case 'rechazado':
          return 'status-danger';
        case 'new':
          return 'status-info';
        case 'negotiation':
        case 'pendiente':
          return 'status-warning';
        case 'renewal':
          return 'status-primary';
        default:
          if (statusLower.includes('activ') || statusLower.includes('operativ')) {
            return 'status-success';
          } else if (statusLower.includes('inactiv')) {
            return 'status-danger';
          } else if (statusLower.includes('pend') || statusLower.includes('manten')) {
            return 'status-warning';
          }
          return 'status-default';
      }
    },

    formatDate(value) {
      if (!value) return '';

      const date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) return '';

      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },

    formatCurrency(value) {
      if (!value && value !== 0) return '';

      const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
      if (isNaN(numValue)) return '';

      return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
      }).format(numValue);
    }
  }
}
</script>

<template>
  <div class="card">
    <!-- Header: Búsqueda, Selector de filas y Botones -->
    <div class="table-header mb-3">
      <div class="header-row-1">
        <!-- Búsqueda -->
        <div class="search-container">
          <span class="p-input-icon-left">
            <i class="pi pi-search" />
            <AppInput
                v-model="globalFilterValue"
                :placeholder="$t('table.search')"
                class="search-input"
                @input="onGlobalFilterChange"
            />
          </span>
        </div>

        <!-- Selector de filas por página -->
        <div v-if="showRowsPerPageDropdown && paginator" class="rows-selector">
          <label class="rows-label">{{ $t('table.show') }}:</label>
          <Dropdown
              v-model="localRows"
              :options="rowsPerPageOptions"
              class="rows-dropdown"
              @change="onRowsPerPageChange"
          />
          <span class="rows-label">{{ $t('table.rows') }}</span>
        </div>

        <!-- Botones -->
        <div class="buttons-container">
          <!-- Botón de Filtro -->
          <div v-if="showFilterButton" class="filter-dropdown-container">
            <AppButton
                type="button"
                icon="pi pi-filter"
                :label="$t('table.filter')"
                variant="primary"
                size="small"
                @click="toggleFilterMenu"
            />
            <!-- Panel de filtros -->
            <div v-if="showFilterMenu" class="filter-panel" ref="filterMenu">
              <div class="filter-panel-header">
                <span>{{ $t('table.filterBy') }}</span>
                <div class="filter-clear-btn" @click="clearAllFilters">
                  <i class="pi pi-trash"></i> {{ $t('table.clearFilters') }}
                </div>
              </div>

              <div class="filter-panel-content">
                <!-- Reglas de filtro -->
                <div v-for="(rule, index) in filterRules" :key="index" class="filter-rule">
                  <div class="filter-row">
                    <label class="filter-label">{{ $t('table.field') }}:</label>
                    <select
                        v-model="rule.field"
                        class="filter-select"
                        @change="updateFilterRule(index, 'field', $event.target.value)"
                    >
                      <option value="" disabled>{{ $t('table.selectField') }}</option>
                      <option
                          v-for="col in filterableColumns"
                          :key="col.field"
                          :value="col.field"
                      >
                        {{ col.header }}
                      </option>
                    </select>
                  </div>

                  <!-- Dentro del panel de filtros - Modo -->
                  <div class="filter-row">
                    <label class="filter-label">{{ $t('table.mode') }}:</label>
                    <select
                        v-model="rule.mode"
                        class="filter-select"
                        @change="updateFilterRule(index, 'mode', $event.target.value)"
                    >
                      <option value="Contains">{{ $t('table.contains') }}</option>
                      <option value="Starts with">{{ $t('table.startsWith') }}</option>
                    </select>
                  </div>

                  <div class="filter-row">
                    <label class="filter-label">{{ $t('table.value') }}:</label>
                    <AppInput
                        v-model="rule.value"
                        :placeholder="$t('table.searchIn') + ' ' + (filterableColumns.find(col => col.field === rule.field)?.header || $t('table.field').toLowerCase())"
                        class="filter-input"
                        @input="updateFilterRule(index, 'value', $event.target.value)"
                    />
                  </div>

                  <div class="filter-actions">
                    <div class="remove-rule" @click="removeFilterRule(index)">
                      <i class="pi pi-trash"></i> {{ $t('table.removeRule') }}
                    </div>
                  </div>
                </div>

                <!-- Botón para agregar regla -->
                <div class="add-rule" @click="addFilterRule">
                  <i class="pi pi-plus"></i> {{ $t('table.addRule') }}
                </div>
              </div>

              <div class="filter-panel-footer">
                <div class="filter-footer-actions">
                  <button class="btn-cancel" @click="showFilterMenu = false" :title="$t('table.closeWithoutApplying')">
                    <i class="pi pi-times"></i>
                  </button>
                  <button class="btn-apply" @click="applyFilters" :title="$t('table.applyFilters')">
                    <i class="pi pi-check"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Botón de Exportar -->
          <AppButton
              v-if="showExportButton"
              type="button"
              icon="pi pi-download"
              variant="secondary"
              size="small"
              @click="handleExport"
          />

          <!-- Botones de Selección -->
          <template v-if="selectable">
            <AppButton
                v-if="!selectEnabled"
                type="button"
                icon="pi pi-check-square"
                :label="$t('table.select')"
                variant="secondary"
                size="small"
                @click="toggleSelectionMode"
            />
            <div v-else class="selection-controls">
              <AppButton
                  type="button"
                  icon="pi pi-times-circle"
                  :label="$t('table.cancel')"
                  variant="secondary"
                  size="small"
                  @click="toggleSelectionMode"
              />
              <AppButton
                  v-if="localSelection && localSelection.length > 0"
                  type="button"
                  icon="pi pi-trash"
                  :label="`${$t('table.delete')} (${localSelection.length})`"
                  variant="danger"
                  size="small"
                  @click="handleDelete"
              />
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Tabla de Datos -->
    <pv-data-table
        :value="filteredData"
        :loading="loading"
        :paginator="paginator"
        :rows="localRows"
        :stripedRows="striped"
        :rowHover="true"
        v-model:selection="localSelection"
        :dataKey="dataKey"
        :metaKeySelection="false"
        :scrollable="true"
        :scrollHeight="scrollHeight"
        :showGridlines="showGridlines"
        scrollDirection="vertical"
        :frozenWidth="selectEnabled ? '3rem' : '0'"
        @row-select="onRowSelect"
        @row-unselect="onRowUnselect"
        @row-click="onRowClick"
        @update:selection="onSelectionChange"
        @page="onPageChange"
        class="custom-table fixed-header-table"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="{first} - {last} de {totalRecords}"
    >
      <!-- Columna de selección personalizada con checkboxes -->
      <pv-column v-if="selectEnabled" :exportable="false" style="width: 3rem">
        <template #header>
          <div class="select-all-container">
            <div
                class="custom-checkbox select-all-checkbox"
                :class="{
                  'custom-checkbox-checked': isAllSelected,
                  'custom-checkbox-indeterminate': isIndeterminate
                }"
                @click="toggleSelectAll"
                :title="isAllSelected ? $t('table.deselectAll') : $t('table.selectAll')"
            >
              <i v-if="isAllSelected" class="pi pi-check"></i>
              <i v-else-if="isIndeterminate" class="pi pi-minus"></i>
            </div>
          </div>
        </template>
        <template #body="slotProps">
          <div class="custom-checkbox-container">
            <div
                class="custom-checkbox"
                :class="{ 'custom-checkbox-checked': isSelected(slotProps.data) }"
                @click.stop="toggleRowSelection(slotProps.data)"
            >
              <i v-if="isSelected(slotProps.data)" class="pi pi-check"></i>
            </div>
          </div>
        </template>
      </pv-column>

      <!-- Estados vacío y cargando -->
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-info-circle empty-icon"></i>
          <p>{{ $t('table.noDataAvailable') }}</p>
        </div>
      </template>
      <template #loading>
        <div class="loading-state">
          <i class="pi pi-spin pi-spinner loading-icon"></i>
          <p>{{ $t('table.loadingData') }}</p>
        </div>
      </template>

      <!-- Columnas dinámicas -->
      <template v-for="(col, index) in columns" :key="index">
        <pv-column
            :field="col.field"
            :header="col.header"
            :sortable="col.sortable !== false"
            :style="col.style || 'min-width: 10rem'"
            :dataType="col.dataType"
            :showFilterIcon="false"
            :bodyClass="col.bodyClass"
            headerClass="column-header"
        >
          <!-- Contenido de columnas -->
          <template #body="slotProps">
            <!-- Estatus con círculos de colores -->
            <template v-if="col.field === 'status' || col.field === 'estado'">
              <div class="status-container">
                <span class="status-dot" :class="getStatusClass(slotProps.data[col.field])"></span>
                <span>{{ slotProps.data[col.field] }}</span>
              </div>
            </template>

            <!-- País con bandera -->
            <template v-else-if="col.field === 'country' && col.showFlag">
              <div class="flex items-center gap-2">
                <img
                    v-if="slotProps.data.countryCode"
                    :alt="slotProps.data[col.field]"
                    src="https://primefaces.org/cdn/primevue/images/flag/flag_placeholder.png"
                    :class="`flag flag-${slotProps.data.countryCode}`"
                    style="width: 24px"
                />
                <span>{{ slotProps.data[col.field] }}</span>
              </div>
            </template>

            <!-- Agente con avatar -->
            <template v-else-if="col.field === 'representative' || col.field === 'agent'">
              <div class="flex items-center gap-2">
                <img
                    v-if="slotProps.data.representativeImg"
                    :alt="slotProps.data[col.field]"
                    :src="slotProps.data.representativeImg"
                    style="width: 32px; height: 32px; border-radius: 50%"
                />
                <span>{{ slotProps.data[col.field] }}</span>
              </div>
            </template>

            <!-- Fecha -->
            <template v-else-if="col.dataType === 'date' || col.field === 'date' || col.field === 'fecha'">
              {{ formatDate(slotProps.data[col.field]) }}
            </template>

            <!-- Valor monetario -->
            <template v-else-if="col.dataType === 'numeric' || col.field === 'balance' || col.field === 'precio' || col.field === 'total'">
              {{ formatCurrency(slotProps.data[col.field]) }}
            </template>

            <!-- Actividad con barra de progreso -->
            <template v-else-if="col.field === 'activity'">
              <pv-progress-bar
                  :value="slotProps.data[col.field]"
                  :showValue="false"
                  style="height: 6px"
              ></pv-progress-bar>
            </template>

            <!-- Campo booleano / verificado -->
            <template v-else-if="col.dataType === 'boolean' || col.field === 'verified'">
              <i class="pi" :class="{ 'pi-check-circle text-success': slotProps.data[col.field], 'pi-times-circle text-danger': !slotProps.data[col.field] }"></i>
            </template>

            <!-- Valor por defecto -->
            <template v-else>
              {{ slotProps.data[col.field] }}
            </template>
          </template>
        </pv-column>
      </template>

      <!-- Footer con botón de añadir (opcional) -->
      <template #footer v-if="addButtonPosition === 'bottom-right' && showAddButton">
        <div class="flex justify-end">
          <AppButton
              type="button"
              icon="pi pi-plus"
              :label="$t('table.add')"
              variant="primary"
              @click="handleAdd"
          />
        </div>
      </template>
    </pv-data-table>
  </div>
</template>

<style>
/* ========================================
   SELECT NATIVO PERSONALIZADO - FILTROS
   ======================================== */

/* Select personalizado para filtros */
.filter-select {
  width: 100% !important;
  padding: 0.75rem 2.5rem 0.75rem 0.75rem !important;
  border: 1px solid #ddd !important;
  border-radius: 4px !important;
  background-color: white !important;
  color: #333 !important;
  font-size: 0.875rem !important;
  line-height: 1.25rem !important;
  min-height: 2.5rem !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;

  /* Flecha personalizada */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 0.75rem center !important;
  background-size: 12px !important;
}

.filter-select:hover {
  border-color: var(--primary-color) !important;
}

.filter-select:focus {
  outline: none !important;
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.1) !important;
}

/* Opciones del select */
.filter-select option {
  background-color: white !important;
  color: #333 !important;
  padding: 0.5rem !important;
}

/* Select para rows per page */
.rows-select {
  min-width: 80px !important;
  padding: 0.5rem 2rem 0.5rem 0.75rem !important;
  border: 1px solid #ddd !important;
  border-radius: 4px !important;
  background-color: white !important;
  color: #333 !important;
  font-size: 0.875rem !important;
  appearance: none !important;
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;

  /* Flecha personalizada más pequeña */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 0.5rem center !important;
  background-size: 10px !important;
}

.rows-select:hover {
  border-color: var(--primary-color) !important;
}

.rows-select:focus {
  outline: none !important;
  border-color: var(--primary-color) !important;
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.1) !important;
}

.rows-select option {
  background-color: white !important;
  color: #333 !important;
  text-align: center !important;
}

/* ========================================
   APPTABLE COMPONENT STYLES
   ======================================== */

/* Variables CSS */
:root {
  --primary-color: #FF5F01;
  --primary-color-hover: #E04E00;
  --secondary-color: #0D1C3C;
  --success-color: #4caf50;
  --warning-color: #ff9800;
  --danger-color: #f44336;
  --info-color: #2196f3;
}

/* ========================================
   ESTRUCTURA BASE
   ======================================== */

.card {
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  margin-bottom: 1.5rem;
}

/* Utilidades flexbox */
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.items-center { align-items: center; }
.gap-2 { gap: 0.5rem; }
.w-full { width: 100%; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }

/* ========================================
   HEADER Y CONTROLES
   ======================================== */

/* Header principal */
.table-header {
  margin-bottom: 1rem;
}

.header-row-1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Contenedor de búsqueda */
.search-container {
  flex: 1;
  max-width: 320px;
  min-width: 200px;
}

.search-input {
  width: 100%;
  border-radius: 4px;
  padding-left: 2.5rem;
}

/* Icono de lupa */
.p-input-icon-left {
  position: relative;
}

.p-input-icon-left > i {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 0.75rem;
  color: #6c757d;
}

/* Selector de filas por página */
.rows-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.rows-label {
  font-size: 0.875rem;
  color: var(--secondary-color);
  font-weight: 500;
}

/* Contenedor de botones */
.buttons-container {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.selection-controls {
  display: flex;
  gap: 0.5rem;
}

/* ========================================
   PANEL DE FILTROS
   ======================================== */

.filter-dropdown-container {
  position: relative;
}

.filter-panel {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  width: 380px;
  z-index: 1000;
  margin-top: 0.5rem;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

/* Header del panel de filtros */
.filter-panel-header {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fafafa;
}

.filter-panel-header span {
  font-weight: 600;
  color: var(--secondary-color);
  font-size: 1rem;
}

.filter-clear-btn {
  color: var(--danger-color);
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.filter-clear-btn:hover {
  background-color: rgba(244, 67, 54, 0.1);
}

/* Contenido del panel de filtros */
.filter-panel-content {
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.filter-rule {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 1rem;
  background-color: #fafafa;
}

.filter-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.75rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--secondary-color);
  margin-bottom: 0.25rem;
}

.filter-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  color: #333;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.filter-input:hover {
  border-color: var(--primary-color);
}

.filter-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.1);
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.remove-rule {
  color: var(--danger-color);
  font-size: 0.75rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.remove-rule:hover {
  background-color: rgba(244, 67, 54, 0.1);
}

.add-rule {
  color: var(--primary-color);
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 2px dashed var(--primary-color);
  border-radius: 6px;
  text-align: center;
  justify-content: center;
  transition: all 0.2s;
  font-weight: 500;
}

.add-rule:hover {
  background-color: rgba(255, 95, 1, 0.05);
  border-style: solid;
}

/* Footer del panel de filtros */
.filter-panel-footer {
  padding: 1rem;
  border-top: 1px solid #f0f0f0;
  background-color: #fafafa;
}

.filter-footer-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-cancel, .btn-apply {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 2px solid;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-cancel {
  background-color: white;
  border-color: #ddd;
  color: #666;
}

.btn-cancel:hover {
  background-color: #f5f5f5;
  border-color: #bbb;
  transform: scale(1.05);
}

.btn-apply {
  background-color: var(--success-color);
  border-color: var(--success-color);
  color: white;
}

.btn-apply:hover {
  background-color: #45a049;
  border-color: #45a049;
  transform: scale(1.05);
}

/* ========================================
   TABLA - HEADER FIJO
   ======================================== */

.fixed-header-table .p-datatable-scrollable .p-datatable-thead > tr > th {
  position: sticky;
  top: 0;
  background-color: white !important;
  z-index: 10;
  border-bottom: 2px solid #f0f0f0 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.fixed-header-table .p-datatable-scrollable .p-datatable-tbody {
  position: relative;
}

.fixed-header-table .p-datatable-scrollable .p-datatable-wrapper {
  overflow-y: auto;
  max-height: 100%;
}

/* Contenedor scrollable */
.fixed-header-table .p-datatable-scrollable {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.fixed-header-table .p-datatable-scrollable .p-datatable-table {
  border-collapse: separate;
  border-spacing: 0;
}

/* Header mejorado */
.fixed-header-table .column-header {
  color: var(--primary-color) !important;
  font-weight: 600 !important;
  background-color: white !important;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* ========================================
   TABLA - ESTILOS GENERALES
   ======================================== */

.custom-table .p-datatable-header,
.custom-table .p-datatable-footer {
  background-color: white;
  padding: 1rem;
  border: none;
}

.column-header {
  color: var(--primary-color) !important;
  font-weight: 600 !important;
}

.custom-table .p-datatable-tbody > tr {
  background-color: white;
  transition: background-color 0.2s;
  cursor: pointer;
}

.custom-table .p-datatable-tbody > tr:nth-child(even) {
  background-color: #fafafa;
}

.custom-table .p-datatable-tbody > tr > td {
  padding: 0.75rem 1rem;
  border-color: #f0f0f0;
}

.custom-table .p-datatable-tbody > tr:hover {
  background-color: #f5f5f5;
}

.custom-table .p-datatable-thead > tr > th {
  background-color: white;
  padding: 0.75rem 1rem;
  border-color: #f0f0f0;
}

/* Highlight para filas seleccionadas */
.custom-table .p-datatable-tbody > tr.p-highlight {
  background-color: rgba(255, 95, 1, 0.08) !important;
}

/* ========================================
   CHECKBOXES PERSONALIZADOS
   ======================================== */

.select-all-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.select-all-checkbox {
  margin: 0 auto;
}

.custom-checkbox-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 0.25rem;
}

.custom-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid #ddd;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
}

.custom-checkbox:hover {
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.custom-checkbox-checked {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.custom-checkbox-indeterminate {
  background-color: rgba(255, 95, 1, 0.1);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

/* ========================================
   ESTADOS VACÍO Y CARGANDO
   ======================================== */

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 2rem;
  color: #666;
}

.empty-icon,
.loading-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.loading-icon {
  color: var(--primary-color);
}

.empty-state p,
.loading-state p {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
}

/* ========================================
   PAGINACIÓN
   ======================================== */

.custom-table .p-paginator {
  padding: 0.75rem;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none !important;
  outline: none !important;
  border-color: transparent !important;
}

.custom-table .p-paginator .p-paginator-page,
.custom-table .p-paginator .p-paginator-first,
.custom-table .p-paginator .p-paginator-prev,
.custom-table .p-paginator .p-paginator-next,
.custom-table .p-paginator .p-paginator-last {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  margin: 0 0.2rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Eliminar bordes de paginación */
.p-datatable-paginator-bottom {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
}

.p-datatable-paginator-bottom .p-paginator {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

.p-datatable-paginator-bottom:hover,
.p-datatable-paginator-bottom:focus,
.p-datatable-paginator-bottom:active {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

.p-paginator .p-paginator-page:focus,
.p-paginator .p-paginator-first:focus,
.p-paginator .p-paginator-prev:focus,
.p-paginator .p-paginator-next:focus,
.p-paginator .p-paginator-last:focus {
  box-shadow: none !important;
  outline: none !important;
  border-color: transparent !important;
}

/* Estilo del paginador activo */
.p-paginator .p-paginator-page.p-highlight {
  background-color: var(--primary-color) !important;
  color: white !important;
  border: none !important;
}

.p-paginator .p-paginator-page.p-paginator-page-selected {
  background-color: var(--primary-color) !important;
  color: white !important;
  border-radius: 50%;
  border: none;
}

/* Hover en paginación */
.custom-table .p-paginator .p-paginator-page:not(.p-highlight):hover,
.custom-table .p-paginator .p-paginator-first:not(.p-highlight):hover,
.custom-table .p-paginator .p-paginator-prev:not(.p-highlight):hover,
.custom-table .p-paginator .p-paginator-next:not(.p-highlight):hover,
.custom-table .p-paginator .p-paginator-last:not(.p-highlight):hover {
  background-color: #d3d3d3;
  border-radius: 50%;
  color: black;
  cursor: pointer;
  transition: background-color 0.3s;
}

.p-paginator .p-paginator-page {
  width: 32px;
  height: 32px;
  padding: 0;
  margin: 0 4px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.custom-table .p-paginator .p-paginator-current {
  margin-left: 1rem;
}

/* ========================================
   STATUS DOTS Y ELEMENTOS ESPECIALES
   ======================================== */

/* Status con puntos de colores */
.status-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ccc;
}

.status-success { background-color: var(--success-color); }
.status-danger { background-color: var(--danger-color); }
.status-warning { background-color: var(--warning-color); }
.status-info { background-color: var(--info-color); }
.status-primary { background-color: var(--primary-color); }
.status-default { background-color: #ccc; }

/* Texto coloreado */
.text-success { color: var(--success-color); }
.text-danger { color: var(--danger-color); }
.text-info { color: var(--info-color); }
.text-warning { color: var(--warning-color); }

/* Barra de progreso */
.p-progressbar {
  height: 6px;
  background-color: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.p-progressbar-value {
  background-color: var(--primary-color);
  height: 100%;
}

/* ========================================
   RESPONSIVE DESIGN
   ======================================== */

@media (max-width: 768px) {
  .header-row-1 {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .search-container {
    max-width: 100%;
    min-width: auto;
  }

  .rows-selector {
    justify-content: center;
  }

  .buttons-container {
    justify-content: center;
    flex-wrap: wrap;
  }

  .filter-panel {
    width: 320px;
    right: 0;
    left: auto;
  }

  .fixed-header-table .p-datatable-scrollable .p-datatable-thead > tr > th {
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
  }

  .custom-table .p-paginator {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .filter-panel {
    width: 280px;
  }

  .header-row-1 {
    gap: 0.75rem;
  }

  .custom-table .p-datatable-tbody > tr > td {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }
}

/* ========================================
   UTILIDADES ADICIONALES
   ======================================== */

/* Transiciones suaves */
* {
  box-sizing: border-box;
}

/* Mejoras de accesibilidad */
button:focus,
.custom-checkbox:focus,
.filter-select:focus,
.rows-select:focus,
.filter-input:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Animaciones sutiles */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.filter-panel {
  animation: fadeIn 0.2s ease-out;
}

/* Estados de hover mejorados */
.custom-table .p-datatable-tbody > tr:hover {
  background-color: #f5f5f5;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Mejoras visuales para botones */
.btn-cancel:active,
.btn-apply:active {
  transform: scale(0.95);
}

/* Scrollbar personalizado para el panel de filtros */
.filter-panel-content::-webkit-scrollbar {
  width: 6px;
}

.filter-panel-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.filter-panel-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.filter-panel-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>