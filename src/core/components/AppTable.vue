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
      default: '400px'
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
    'row-unselect'
  ],
  data() {
    return {
      localSelection: this.selection ? [...this.selection] : [],
      filters: {},
      globalFilterValue: '',
      selectEnabled: false,
      showFilterMenu: false,
      filterMatchMode: 'Match All',
      filterRules: [],
      activeFilterField: null
    };
  },
  created() {
    this.initFilters();
    document.addEventListener('click', this.handleOutsideClick);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
  },
  watch: {
    selection: {
      handler(newValue) {
        this.localSelection = newValue ? [...newValue] : [];
      },
      deep: true
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
    }
  },
  methods: {
    // Inicialización y filtros
    initFilters() {
      this.filters = {
        global: { value: null }
      };
      this.filterRules = [];
    },

    onGlobalFilterChange() {
      this.filters.global.value = this.globalFilterValue;
      this.$emit('filter', this.filters);
    },

    toggleFilterMenu() {
      this.showFilterMenu = !this.showFilterMenu;
    },

    handleOutsideClick(event) {
      const filterMenu = this.$refs.filterMenu;
      if (filterMenu && !filterMenu.contains(event.target) && !event.target.closest('.filter-dropdown-container')) {
        this.showFilterMenu = false;
      }
    },

    addFilterRule() {
      this.filterRules.push({
        mode: 'Starts with',
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
        this.applyFilters();
      }
    },

    applyFilters() {
      const newFilters = {
        global: { value: this.globalFilterValue }
      };

      this.filterRules.forEach(rule => {
        if (rule.value) {
          newFilters[rule.field] = {
            value: rule.value,
            matchMode: rule.mode === 'Match All' ? 'contains' : 'startsWith'
          };
        }
      });

      this.filters = newFilters;
      this.$emit('filter', newFilters);
      this.showFilterMenu = false;
    },

    clearAllFilters() {
      this.filterRules = [];
      this.initFilters();
      this.globalFilterValue = '';
      this.$emit('filter', this.filters);
      this.showFilterMenu = false;
    },

    // Gestión de selección
    // Gestión de selección
    onSelectionChange(selection) {
      this.localSelection = selection;
      this.$emit('update:selection', selection);
    },

    onRowSelect(event) {
      this.$emit('row-select', event);
    },

    onRowUnselect(event) {
      this.$emit('row-unselect', event);
    },

    onRowClick(event) {
      // Si no está en modo selección, emitir el evento row-click
      if (!this.selectEnabled) {
        this.$emit('row-click', event);
      }
    },

    toggleSelectionMode() {
      this.selectEnabled = !this.selectEnabled;

      // Al desactivar el modo de selección, limpiar la selección
      if (!this.selectEnabled) {
        this.localSelection = [];
        this.$emit('update:selection', []);
      }

      this.$emit('toggle-selection', this.selectEnabled);
    },

    // Métodos para la selección personalizada con checkboxes
    isSelected(rowData) {
      if (!this.dataKey || !rowData) return false;

      return this.localSelection.some(
          item => item[this.dataKey] === rowData[this.dataKey]
      );
    },

    toggleRowSelection(rowData) {
      if (!this.dataKey || !rowData || !this.selectEnabled) return;

      if (this.isSelected(rowData)) {
        this.localSelection = this.localSelection.filter(
            item => item[this.dataKey] !== rowData[this.dataKey]
        );
      } else {
        this.localSelection = [...this.localSelection, rowData];
      }

      this.$emit('update:selection', this.localSelection);
    },

    // Acciones
    handleExport() {
      this.$emit('export');
    },

    handleAdd() {
      this.$emit('add');
    },

    handleDelete() {
      this.$emit('delete', this.localSelection);
    },

    // Utilidades
    getStatusClass(status) {
      if (!status) return 'status-default';

      const statusLower = String(status).toLowerCase();

      switch (statusLower) {
        case 'cancelado':
          return 'status-success';
        case 'unqualified':
          return 'status-danger';
        case 'qualified':
          return 'status-success';
        case 'new':
          return 'status-info';
        case 'negotiation':
          return 'status-warning';
        case 'renewal':
          return 'status-primary';
        case 'pendiente':
          return 'status-warning';
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
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },

    formatCurrency(value) {
      if (!value) return '';

      const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;

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
    <!-- Header: Búsqueda y Botones -->
    <div class="table-header mb-3">
      <div class="flex justify-between items-center">
        <div class="search-container">
          <span class="p-input-icon-left">
            <i class="pi pi-search" />
            <AppInput
                v-model="globalFilterValue"
                placeholder="Buscar"
                class="search-input"
                @input="onGlobalFilterChange"
            />
          </span>
        </div>
        <div class="flex gap-2">
          <!-- Botón de Filtro -->
          <div v-if="showFilterButton" class="filter-dropdown-container">
            <AppButton
                type="button"
                icon="pi pi-filter"
                label="Filtro"
                variant="primary"
                size="small"
                @click="toggleFilterMenu"
            />
            <!-- Panel de filtros -->
            <div v-if="showFilterMenu" class="filter-panel" ref="filterMenu">
              <div class="filter-panel-header">
                <span>Filtrar por</span>
                <div class="filter-clear-btn" @click="clearAllFilters">
                  <i class="pi pi-trash"></i> Limpiar filtros
                </div>
              </div>

              <div class="filter-panel-content">
                <!-- Reglas de filtro -->
                <div v-for="(rule, index) in filterRules" :key="index" class="filter-rule">
                  <div class="flex mb-2">
                    <Dropdown
                        v-model="rule.mode"
                        :options="['Match All', 'Starts with']"
                        class="mode-dropdown w-full"
                        @change="updateFilterRule(index, 'mode', rule.mode)"
                    />
                  </div>
                  <div class="flex mb-2">
                    <AppInput
                        v-model="rule.value"
                        :placeholder="'Search by ' + (rule.field || 'value')"
                        class="w-full"
                        @input="updateFilterRule(index, 'value', rule.value)"
                    />
                  </div>
                  <div class="flex justify-end mb-3">
                    <div class="remove-rule" @click="removeFilterRule(index)">
                      <i class="pi pi-trash"></i> Remove Rule
                    </div>
                  </div>
                </div>

                <!-- Botón para agregar regla -->
                <div class="add-rule" @click="addFilterRule">
                  <i class="pi pi-plus"></i> Add Rule
                </div>
              </div>

              <div class="filter-panel-footer">
                <div class="flex gap-2 justify-end">
                  <button class="btn-cancel" @click="showFilterMenu = false">
                    <i class="pi pi-times"></i>
                  </button>
                  <button class="btn-apply" @click="applyFilters">
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
          <AppButton
              v-if="!selectEnabled"
              type="button"
              icon="pi pi-check-square"
              label="Seleccionar"
              variant="secondary"
              size="small"
              @click="toggleSelectionMode"
          />
          <div v-else class="flex gap-2">
            <AppButton
                type="button"
                icon="pi pi-times-circle"
                label="Deseleccionar"
                variant="secondary"
                size="small"
                @click="toggleSelectionMode"
            />
            <AppButton
                v-if="localSelection && localSelection.length > 0"
                type="button"
                icon="pi pi-trash"
                label="Eliminar"
                variant="danger"
                size="small"
                @click="handleDelete"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de Datos -->
    <pv-data-table
        :value="data"
        :loading="loading"
        :paginator="paginator"
        :rows="rows"
        :stripedRows="striped"
        :rowHover="true"
        v-model:selection="localSelection"
        :dataKey="dataKey"
        :metaKeySelection="false"
        :scrollable="scrollable"
        :scrollHeight="scrollHeight"
        v-model:filters="filters"
        :globalFilterFields="effectiveGlobalFilterFields"
        :globalFilter="globalFilterValue"
        :showGridlines="showGridlines"
        @row-select="onRowSelect"
        @row-unselect="onRowUnselect"
        @row-click="onRowClick"
        @update:selection="onSelectionChange"
        class="custom-table"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="{first} - {last} de {totalRecords}"
    >
      <!-- Columna de selección personalizada con checkboxes -->
      <pv-column v-if="selectEnabled" :exportable="false">
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
      <template #empty>No hay datos disponibles</template>
      <template #loading>Cargando datos. Por favor espere...</template>

      <!-- Columnas dinámicas -->
      <template v-for="(col, index) in columns" :key="index">
        <pv-column
            :field="col.field"
            :header="col.header"
            :sortable="true"
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
              label="Añadir"
              variant="primary"
              @click="handleAdd"
          />
        </div>
      </template>
    </pv-data-table>
  </div>
</template>

<style>
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

/* Colores del core */
:root {
  --primary-color: #FF5F01;
  --primary-color-hover: #E04E00;
  --secondary-color: #0D1C3C;
  --success-color: #4caf50;
  --warning-color: #ff9800;
  --danger-color: #f44336;
  --info-color: #2196f3;
}

/* Simplificar estilos de la búsqueda */
.search-container {
  max-width: 320px;
}

.search-input {
  width: 100%;
  border-radius: 4px;
  padding-left: 2.5rem;
}

/* Panel de filtros */
.filter-dropdown-container {
  position: relative;
}

.filter-panel {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  width: 320px;
  z-index: 1000;
  margin-top: 0.5rem;
  overflow: hidden;
}

.filter-panel-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-panel-header span {
  font-weight: 600;
  color: var(--secondary-color);
}

.filter-clear-btn {
  color: var(--danger-color);
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.filter-panel-content {
  padding: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.filter-rule {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 1rem;
}

.remove-rule {
  color: var(--danger-color);
  font-size: 0.75rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.add-rule {
  color: var(--primary-color);
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.filter-panel-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid #f0f0f0;
}

.btn-cancel, .btn-apply {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #666;
}

.btn-apply {
  background-color: #4caf50;
  color: white;
}

/* Estilo de tabla */
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

/* Estilos para los checkboxes personalizados */
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
}

.custom-checkbox-checked {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.custom-table .p-datatable-thead > tr > th {
  background-color: white;
  padding: 0.75rem 1rem;
  border-color: #f0f0f0;
}

/* Paginación */
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

/* Eliminar el borde negro rectangular alrededor del contenedor de paginación */
.p-datatable-paginator-bottom {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background-color: transparent !important;
}

/* También asegurar que el contenido interno no tenga bordes no deseados */
.p-datatable-paginator-bottom .p-paginator {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Si hay algún hover o focus que esté agregando un borde */
.p-datatable-paginator-bottom:hover,
.p-datatable-paginator-bottom:focus,
.p-datatable-paginator-bottom:active {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Eliminar el borde negro alrededor de la paginación */
.p-paginator .p-paginator-page:focus,
.p-paginator .p-paginator-first:focus,
.p-paginator .p-paginator-prev:focus,
.p-paginator .p-paginator-next:focus,
.p-paginator .p-paginator-last:focus {
  box-shadow: none !important;
  outline: none !important;
  border-color: transparent !important;
}

/* Mejorar el estilo del paginador activo */
.p-paginator .p-paginator-page.p-highlight {
  background-color: var(--primary-color) !important;
  color: white !important;
  border: none !important;
}


/* Highlight para las filas seleccionadas */
.custom-table .p-datatable-tbody > tr.p-highlight {
  background-color: rgba(255, 95, 1, 0.08) !important;
}

.custom-table .p-paginator .p-paginator-current {
  margin-left: 1rem;
}

/* Estilo para el botón activo */
.p-paginator .p-paginator-page.p-paginator-page-selected {
  background-color: var(--primary-color) !important;
  color: white !important;
  border-radius: 50%;
  border: none;
}

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

/* Estilo general para todos los botones de número */
.p-paginator .p-paginator-page {
  width: 32px;
  height: 32px;
  padding: 0;
  margin: 0 4px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

/* Status Dots */
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

/* Responsive */
@media (max-width: 768px) {
  .flex {
    flex-direction: column;
    gap: 0.75rem;
  }

  .p-input-icon-left {
    width: 100%;
  }

  .custom-table .p-paginator {
    flex-wrap: wrap;
  }
}

/* icono de lupa */
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
</style>