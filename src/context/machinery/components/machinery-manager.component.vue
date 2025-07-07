<script>
import AppButton from "../../../core/components/AppButton.vue";
import AppTable from "../../../core/components/AppTable.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import AppInput from "../../../core/components/AppInput.vue";
import MachineryForm from "./machinery-form.vue";
import { MachineryEntity } from "../models/machinery.entity.js";
import { MachineryApiService } from "../services/machinery-api.service.js";

export default {
  name: 'MachineryManager',
  components: {
    AppButton,
    AppTable,
    AppNotification,
    AppInput,
    MachineryForm
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      // Vista activa: 'summary' o 'detail'
      currentView: 'summary',

      // Datos principales
      allMachinery: [],
      loading: false,

      // Maquinaria seleccionada para detalle
      selectedMachinery: null,

      // Filtros
      filters: {
        search: '',
        type: 'ALL',
        status: 'ALL',
        assignment: 'ALL' // ALL, ASSIGNED, AVAILABLE
      },

      // Notificaciones
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',

      // Servicio
      machineryService: new MachineryApiService(),

      // Performance optimizations
      debounceTimer: null
    };
  },
  computed: {
    // Tipos de maquinaria disponibles :333
    availableTypes() {
      const types = new Set();
      this.allMachinery.forEach(machine => {
        if (machine.machineryType) {
          types.add(machine.machineryType);
        }
      });
      return Array.from(types).sort();
    },

    // Opciones de filtro - SIMPLIFICADAS
    typeFilterOptions() {
      return [
        { value: 'ALL', label: this.$t('machinery.allTypes') },
        ...this.availableTypes.map(type => ({
          value: type,
          label: this.getTypeDisplayName(type)
        }))
      ];
    },

    statusFilterOptions() {
      return [
        { value: 'ALL', label: this.$t('machinery.allStatuses') },
        { value: 'ACTIVE', label: this.$t('machinery.statusActive') },
        { value: 'INACTIVE', label: this.$t('machinery.statusInactive') },
        { value: 'DAMAGED', label: this.$t('machinery.statusDamaged') },
        { value: 'MAINTENANCE', label: this.$t('machinery.statusMaintenance') }
      ];
    },

    assignmentFilterOptions() {
      return [
        { value: 'ALL', label: this.$t('machinery.showAll') },
        { value: 'ASSIGNED', label: this.$t('machinery.showAssigned') },
        { value: 'AVAILABLE', label: this.$t('machinery.available') }
      ];
    },

    // Datos filtrados
    filteredMachinery() {
      return this.allMachinery.filter(machine => {
        // Filtro de búsqueda
        if (this.filters.search) {
          const searchTerm = this.filters.search.toLowerCase();
          const searchMatch =
              machine.name.toLowerCase().includes(searchTerm) ||
              machine.licensePlate.toLowerCase().includes(searchTerm) ||
              machine.machineryType.toLowerCase().includes(searchTerm) ||
              machine.provider.toLowerCase().includes(searchTerm) ||
              machine.description.toLowerCase().includes(searchTerm);

          if (!searchMatch) return false;
        }

        // Filtro de tipo
        if (this.filters.type !== 'ALL' && machine.machineryType !== this.filters.type) {
          return false;
        }

        // Filtro de estado
        if (this.filters.status !== 'ALL' && machine.status !== this.filters.status) {
          return false;
        }

        // Filtro de asignación
        if (this.filters.assignment === 'ASSIGNED' && !machine.isAssigned()) {
          return false;
        }
        if (this.filters.assignment === 'AVAILABLE' && !machine.isAvailable()) {
          return false;
        }

        return true;
      });
    },

    // Columnas de la tabla
    tableColumns() {
      return [
        {
          field: 'name',
          header: this.$t('machinery.name'),
          sortable: true,
          style: 'min-width: 200px'
        },
        {
          field: 'licensePlate',
          header: this.$t('machinery.licensePlate'),
          sortable: true,
          style: 'width: 140px'
        },
        {
          field: 'machineryTypeLabel',
          header: this.$t('machinery.machineryType'),
          sortable: true,
          style: 'min-width: 150px'
        },
        {
          field: 'statusDisplay',
          header: this.$t('machinery.status'),
          sortable: true,
          style: 'width: 120px'
        },
        {
          field: 'provider',
          header: this.$t('machinery.provider'),
          sortable: true,
          style: 'min-width: 150px'
        },
        {
          field: 'assignmentDisplay',
          header: this.$t('machinery.assignedOperator'),
          sortable: false,
          style: 'width: 140px; text-align: center;'
        },
        {
          field: 'registerDate',
          header: this.$t('machinery.registerDate'),
          sortable: true,
          dataType: 'date',
          style: 'width: 120px'
        }
      ];
    },

    // Estadísticas
    stats() {
      return {
        total: this.allMachinery.length,
        active: this.allMachinery.filter(m => m.isActive()).length,
        assigned: this.allMachinery.filter(m => m.isAssigned()).length,
        available: this.allMachinery.filter(m => m.isAvailable()).length,
        maintenance: this.allMachinery.filter(m => m.status === 'MAINTENANCE').length
      };
    }
  },
  watch: {
    'filters.search'() {
      this.debounceSearch();
    }
  },
  async mounted() {
    await this.loadMachinery();
  },
  beforeUnmount() {
    clearTimeout(this.debounceTimer);
  },
  methods: {
    async loadMachinery() {
      this.loading = true;
      try {
        this.allMachinery = await this.machineryService.getByProject(this.projectId);
      } catch (error) {
        console.error('Error loading machinery:', error);
        this.showNotificationMessage(this.$t('machinery.errorLoading'), 'error');
      } finally {
        this.loading = false;
      }
    },

    debounceSearch() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.$forceUpdate();
      }, 300);
    },

    handleRowClick(event) {
      if (event.data && event.data.id) {
        const originalMachinery = this.allMachinery.find(m => m.id === event.data.id);
        if (originalMachinery) {
          this.selectedMachinery = originalMachinery.clone();
          this.currentView = 'detail';
        }
      }
    },

    handleBackToSummary() {
      this.currentView = 'summary';
      this.selectedMachinery = null;
    },

    onMachinerySaved(savedMachinery) {
      if (this.selectedMachinery && this.selectedMachinery.id) {
        // Actualización existente
        const index = this.allMachinery.findIndex(m => m.id === savedMachinery.id);
        if (index !== -1) {
          this.allMachinery[index] = savedMachinery;
        }
      } else {
        // Nueva maquinaria
        this.allMachinery.push(savedMachinery);
      }

      this.currentView = 'summary';
      this.selectedMachinery = null;
    },

    onFormCancelled() {
      this.currentView = 'summary';
      this.selectedMachinery = null;
    },

    async handleExportAll() {
      try {
        const fileName = this.$t('machinery.machineryManagerReport');
        await this.machineryService.exportToExcel(this.filteredMachinery, fileName);
        this.showNotificationMessage(this.$t('machinery.exportedSuccessfully'), 'success');
      } catch (error) {
        console.error('Error exporting:', error);
        this.showNotificationMessage(this.$t('machinery.errorSaving'), 'error');
      }
    },

    clearFilters() {
      this.filters = {
        search: '',
        type: 'ALL',
        status: 'ALL',
        assignment: 'ALL'
      };
    },

    formatMachineryForTable(machineryList) {
      return machineryList.map(m => ({
        ...m,
        machineryTypeLabel: m.getMachineryTypeLabel(),
        statusDisplay: this.getStatusLabel(m.status),
        assignmentDisplay: m.personnelId ? 'Operador Asignado' : 'Sin asignar', // Cambiar aquí
        registerDate: this.formatDate(m.registerDate)
      }));
    },

    getStatusLabel(status) {
      const statusLabels = {
        'ACTIVE': this.$t('machinery.statusActive'),
        'INACTIVE': this.$t('machinery.statusInactive'),
        'DAMAGED': this.$t('machinery.statusDamaged'),
        'MAINTENANCE': this.$t('machinery.statusMaintenance')
      };
      return statusLabels[status] || status;
    },

    getTypeDisplayName(type) {
      const entity = new MachineryEntity({ machineryType: type });
      const icon = this.getTypeIcon(type);
      return `${entity.getMachineryTypeLabel()}`;
    },

    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },

    getTypeIcon(type) {
      const iconMap = {
        'EXCAVATOR': 'pi pi-cog',
        'TRACTOR': 'pi pi-wrench',
        'CRANE': 'pi pi-arrow-up',
        'BULLDOZER': 'pi pi-forward',
        'LOADER': 'pi pi-box',
        'DUMP_TRUCK': 'pi pi-truck',
        'COMPACTOR': 'pi pi-circle',
        'MIXER': 'pi pi-refresh',
        'GENERATOR': 'pi pi-bolt',
        'PUMP': 'pi pi-filter'
      };
      return iconMap[type] || 'pi pi-cog';
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    }
  }
};
</script>

<template>
  <div class="machinery-manager">
    <!-- Vista de Resumen -->
    <div v-if="currentView === 'summary'" class="summary-view">

      <!-- Estadísticas -->
      <div class="stats-container">
        <div class="stat-card total">
          <div class="stat-content">
            <div class="stat-number">{{ stats.total }}</div>
            <div class="stat-label">{{ $t('machinery.totalMachinery') }}</div>
          </div>
          <i class="pi pi-cog stat-icon"></i>
        </div>

        <div class="stat-card active">
          <div class="stat-content">
            <div class="stat-number">{{ stats.active }}</div>
            <div class="stat-label">{{ $t('machinery.activeMachinery') }}</div>
          </div>
          <i class="pi pi-check-circle stat-icon"></i>
        </div>

        <div class="stat-card assigned">
          <div class="stat-content">
            <div class="stat-number">{{ stats.assigned }}</div>
            <div class="stat-label">{{ $t('machinery.assignedMachinery') }}</div>
          </div>
          <i class="pi pi-user stat-icon"></i>
        </div>

        <div class="stat-card available">
          <div class="stat-content">
            <div class="stat-number">{{ stats.available }}</div>
            <div class="stat-label">{{ $t('machinery.availableMachinery') }}</div>
          </div>
          <i class="pi pi-circle stat-icon"></i>
        </div>
      </div>

      <!-- Filtros y Controles -->
      <div class="controls-section">
        <div class="filters-row">


          <!-- Filtro por Tipo -->
          <div class="filter-dropdown">
            <select v-model="filters.type" class="filter-select">
              <option value="ALL">{{ $t('machinery.allTypes') }}</option>
              <option
                  v-for="type in availableTypes"
                  :key="type"
                  :value="type"
              >
                {{ getTypeDisplayName(type) }}
              </option>
            </select>
            <i class="pi pi-chevron-down filter-icon"></i>
          </div>

          <!-- Filtro por Estado -->
          <div class="filter-dropdown">
            <select v-model="filters.status" class="filter-select">
              <option value="ALL">{{ $t('machinery.allStatuses') }}</option>
              <option value="ACTIVE">{{ $t('machinery.statusActive') }}</option>
              <option value="INACTIVE">{{ $t('machinery.statusInactive') }}</option>
              <option value="DAMAGED">{{ $t('machinery.statusDamaged') }}</option>
              <option value="MAINTENANCE">{{ $t('machinery.statusMaintenance') }}</option>
            </select>
            <i class="pi pi-chevron-down filter-icon"></i>
          </div>

          <!-- Filtro por Asignación -->
          <div class="filter-dropdown">
            <select v-model="filters.assignment" class="filter-select">
              <option value="ALL">{{ $t('machinery.showAll') }}</option>
              <option value="ASSIGNED">{{ $t('machinery.showAssigned') }}</option>
              <option value="AVAILABLE">{{ $t('machinery.available') }}</option>
            </select>
            <i class="pi pi-chevron-down filter-icon"></i>
          </div>

          <!-- Limpiar Filtros -->
          <AppButton
              :label="$t('machinery.clearFilters')"
              icon="pi pi-filter-slash"
              variant="secondary"
              size="small"
              @click="clearFilters"
          />
        </div>

        <!-- Controles de Acción -->
        <div class="action-controls">
          <AppButton
              :label="$t('machinery.exportAll')"
              icon="pi pi-download"
              variant="primary"
              @click="handleExportAll"
              :disabled="filteredMachinery.length === 0"
          />
        </div>
      </div>

      <!-- Tabla de Maquinaria -->
      <div class="table-section">
        <AppTable
            :columns="tableColumns"
            :data="formatMachineryForTable(filteredMachinery)"
            :loading="loading"
            :paginator="true"
            :rows="15"
            :showExportButton="false"
            :showFilterButton="true"
            :selectable="true"
            :show-search="true"
            data-key="id"
            @row-click="handleRowClick"
            class="machinery-table"
            :row-hover="true"
        />

        <!-- Estado vacío -->
        <div v-if="!loading && filteredMachinery.length === 0" class="empty-state">
          <i class="pi pi-cog empty-icon"></i>
          <h3>{{ $t('machinery.noDataAvailable') }}</h3>
          <p v-if="allMachinery.length === 0">{{ $t('machinery.addFirstMachinery') }}</p>
          <p v-else>No se encontró maquinaria con los filtros aplicados</p>
          <AppButton
              v-if="filters.search || filters.type !== 'ALL' || filters.status !== 'ALL' || filters.assignment !== 'ALL'"
              :label="$t('machinery.clearFilters')"
              icon="pi pi-filter-slash"
              variant="secondary"
              @click="clearFilters"
          />
        </div>
      </div>

      <!-- Estado de carga -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <p>{{ $t('machinery.loadingData') }}</p>
      </div>
    </div>

    <!-- Vista de Detalle -->
    <div v-if="currentView === 'detail'" class="detail-view">
      <MachineryForm
          :machinery="selectedMachinery"
          :project-id="projectId"
          @save="onMachinerySaved"
          @cancel="onFormCancelled"
          class="detail-form-container"
      />
    </div>

    <!-- Notificaciones -->
    <AppNotification
        v-model="showNotification"
        :message="notificationMessage"
        :type="notificationType"
        :auto-close="true"
        :duration="3000"
    />
  </div>
</template>


<style scoped>
.machinery-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

.summary-view {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

/* Estadísticas */
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(45deg, var(--stat-color, #3b82f6), transparent);
}

.stat-card.total { --stat-color: #3b82f6; }
.stat-card.active { --stat-color: #10b981; }
.stat-card.assigned { --stat-color: #f59e0b; }
.stat-card.available { --stat-color: #06b6d4; }

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.5rem;
  color: var(--stat-color, #333);
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.stat-icon {
  font-size: 2.5rem;
  color: var(--stat-color, #333);
  opacity: 0.3;
}

/* Controles */
.controls-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filters-row {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.search-container {
  flex: 1;
  min-width: 300px;
}

.search-input {
  width: 100%;
}

.filter-dropdown {
  position: relative;
  min-width: 180px;
}

.filter-select {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 0.875rem;
  color: #374151;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 3px rgba(255, 95, 1, 0.1);
}

.filter-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
  font-size: 0.75rem;
}

.action-controls {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* Tabla */
.table-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.machinery-table {
  border-radius: 8px;
  overflow: hidden;
}

/* Estado vacío */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  color: #d1d5db;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
}

/* Estados de carga */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #666;
  padding: 4rem;
}

.loading-state i {
  font-size: 3rem;
  color: #FF5F01;
}

.loading-state p {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 500;
}

/* Vista de Detalle */
.detail-view {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background-color: #f8f9fa;
}

.detail-form-container {
  width: 100%;
  height: 100%;
}

/* Integración con el formulario */
:deep(.machinery-form-page) {
  height: auto !important;
  width: 100% !important;
  background-color: transparent !important;
}

:deep(.form-header) {
  background: white !important;
  padding: 1.5rem 2rem !important;
  border-bottom: 1px solid #e0e0e0 !important;
  border-radius: 8px 8px 0 0 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  margin-bottom: 0 !important;
}

:deep(.form-content) {
  flex: none !important;
  padding: 0 !important;
  overflow-y: visible !important;
  background-color: transparent !important;
}

:deep(.form-container) {
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
}

:deep(.form-section) {
  background: white !important;
  border-radius: 8px !important;
  padding: 2rem !important;
  margin-bottom: 1.5rem !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  width: 100% !important;
}

:deep(.form-section:first-child) {
  border-radius: 0 0 8px 8px !important;
  margin-top: 0 !important;
}

:deep(.form-grid) {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
  gap: 1.5rem !important;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-container {
    grid-template-columns: repeat(2, 1fr);
  }

  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-container {
    min-width: auto;
  }

  .filter-dropdown {
    min-width: auto;
  }
}

@media (max-width: 768px) {
  .summary-view {
    padding: 1rem;
  }

  .stats-container {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .stat-card {
    padding: 1.5rem;
  }

  .stat-number {
    font-size: 2rem;
  }

  .controls-section {
    padding: 1rem;
  }

  .table-section {
    padding: 1rem;
  }

  .detail-view {
    padding: 1rem;
  }
}

/* Animaciones */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-card {
  animation: slideInUp 0.6s ease-out forwards;
}

.stat-card:nth-child(1) { animation-delay: 0.1s; }
.stat-card:nth-child(2) { animation-delay: 0.2s; }
.stat-card:nth-child(3) { animation-delay: 0.3s; }
.stat-card:nth-child(4) { animation-delay: 0.4s; }

/* Hover effects */
:deep(.machinery-table .p-datatable-tbody > tr) {
  transition: all 0.2s ease;
  cursor: pointer;
}

:deep(.machinery-table .p-datatable-tbody > tr:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

</style>