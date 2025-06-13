<script>
import AppButton from "../../../core/components/AppButton.vue";
import AppTable from "../../../core/components/AppTable.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import AppInput from "../../../core/components/AppInput.vue";
import IncidentFormComponent from "./incident-form.component.vue";
import { Incident } from "../models/incident.entity.js";
import { incidentApiService } from "../services/incident-api.service.js";

export default {
  name: 'IncidentsManager',
  components: {
    AppButton,
    AppTable,
    AppNotification,
    AppInput,
    IncidentFormComponent
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
      allIncidents: [],
      loading: false,

      // Incidente seleccionado para detalle
      selectedIncident: null,

      // Filtros
      filters: {
        search: '',
        type: 'ALL',
        severity: 'ALL',
        status: 'ALL',
        assignment: 'ALL' // ALL, ASSIGNED, UNASSIGNED
      },

      // Notificaciones
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',

      // Performance optimizations
      debounceTimer: null
    };
  },
  computed: {
    // Tipos de incidentes disponibles
    availableTypes() {
      const types = new Set();
      this.allIncidents.forEach(incident => {
        if (incident.incidentType) {
          types.add(incident.incidentType);
        }
      });
      return Array.from(types).sort();
    },

    // Opciones de filtro
    typeFilterOptions() {
      return [
        { value: 'ALL', label: this.$t('incidents.allTypes') },
        ...this.availableTypes.map(type => ({
          value: type,
          label: this.getTypeDisplayName(type)
        }))
      ];
    },

    severityFilterOptions() {
      return [
        { value: 'ALL', label: this.$t('incidents.allSeverities') },
        { value: 'CRITICO', label: this.$t('incidents.severityCritical') },
        { value: 'ALTO', label: this.$t('incidents.severityHigh') },
        { value: 'MEDIO', label: this.$t('incidents.severityMedium') },
        { value: 'BAJO', label: this.$t('incidents.severityLow') }
      ];
    },

    statusFilterOptions() {
      return [
        { value: 'ALL', label: this.$t('incidents.allStatuses') },
        { value: 'REPORTADO', label: this.$t('incidents.statusReported') },
        { value: 'EN_PROGRESO', label: this.$t('incidents.statusInProgress') },
        { value: 'RESUELTO', label: this.$t('incidents.statusResolved') },
        { value: 'CERRADO', label: this.$t('incidents.statusClosed') }
      ];
    },

    assignmentFilterOptions() {
      return [
        { value: 'ALL', label: this.$t('incidents.showAll') },
        { value: 'ASSIGNED', label: this.$t('incidents.showAssigned') },
        { value: 'UNASSIGNED', label: this.$t('incidents.showUnassigned') }
      ];
    },

    // Datos filtrados
    filteredIncidents() {
      return this.allIncidents.filter(incident => {
        // Filtro de búsqueda
        if (this.filters.search) {
          const searchTerm = this.filters.search.toLowerCase();
          const searchMatch =
              incident.title.toLowerCase().includes(searchTerm) ||
              incident.description.toLowerCase().includes(searchTerm) ||
              incident.location.toLowerCase().includes(searchTerm) ||
              incident.incidentType.toLowerCase().includes(searchTerm) ||
              incident.notes.toLowerCase().includes(searchTerm);

          if (!searchMatch) return false;
        }

        // Filtro de tipo
        if (this.filters.type !== 'ALL' && incident.incidentType !== this.filters.type) {
          return false;
        }

        // Filtro de severidad
        if (this.filters.severity !== 'ALL' && incident.severity !== this.filters.severity) {
          return false;
        }

        // Filtro de estado
        if (this.filters.status !== 'ALL' && incident.status !== this.filters.status) {
          return false;
        }

        // Filtro de asignación
        if (this.filters.assignment === 'ASSIGNED' && !incident.isAssigned()) {
          return false;
        }
        if (this.filters.assignment === 'UNASSIGNED' && incident.isAssigned()) {
          return false;
        }

        return true;
      });
    },

    // Columnas de la tabla
    tableColumns() {
      return [
        {
          field: 'title',
          header: this.$t('incidents.title'),
          sortable: true,
          style: 'min-width: 200px'
        },
        {
          field: 'incidentTypeLabel',
          header: this.$t('incidents.incidentType'),
          sortable: true,
          style: 'min-width: 150px'
        },
        {
          field: 'severityDisplay',
          header: this.$t('incidents.severity'),
          sortable: true,
          style: 'width: 120px'
        },
        {
          field: 'statusDisplay',
          header: this.$t('incidents.status'),
          sortable: true,
          style: 'width: 120px'
        },
        {
          field: 'location',
          header: this.$t('incidents.location'),
          sortable: true,
          style: 'min-width: 150px'
        },
        {
          field: 'assignmentDisplay',
          header: this.$t('incidents.assignment'),
          sortable: false,
          style: 'width: 140px; text-align: center;'
        },
        {
          field: 'daysOpen',
          header: this.$t('incidents.daysOpen'),
          sortable: true,
          style: 'width: 100px; text-align: center;'
        },
        {
          field: 'occurredAt',
          header: this.$t('incidents.occurredAt'),
          sortable: true,
          dataType: 'datetime',
          style: 'width: 140px'
        }
      ];
    },

    // Estadísticas
    stats() {
      return {
        total: this.allIncidents.length,
        open: this.allIncidents.filter(i => i.isOpen()).length,
        critical: this.allIncidents.filter(i => i.isCritical()).length,
        resolved: this.allIncidents.filter(i => i.isResolved()).length,
        assigned: this.allIncidents.filter(i => i.isAssigned()).length
      };
    }
  },
  watch: {
    'filters.search'() {
      this.debounceSearch();
    }
  },
  async mounted() {
    await this.loadIncidents();
  },
  beforeUnmount() {
    clearTimeout(this.debounceTimer);
  },
  methods: {
    async loadIncidents() {
      this.loading = true;
      try {
        this.allIncidents = await incidentApiService.getByProject(this.projectId);
      } catch (error) {
        console.error('Error loading incidents:', error);
        this.showNotificationMessage(this.$t('incidents.errorLoading'), 'error');
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
        const originalIncident = this.allIncidents.find(i => i.id === event.data.id);
        if (originalIncident) {
          this.selectedIncident = originalIncident.clone();
          this.currentView = 'detail';
        }
      }
    },

    handleBackToSummary() {
      this.currentView = 'summary';
      this.selectedIncident = null;
    },

    handleAddNew() {
      this.selectedIncident = new Incident({ projectId: this.projectId });
      this.currentView = 'detail';
    },

    onIncidentSaved(savedIncident) {
      if (this.selectedIncident && this.selectedIncident.id) {
        // Actualización existente
        const index = this.allIncidents.findIndex(i => i.id === savedIncident.id);
        if (index !== -1) {
          this.allIncidents[index] = savedIncident;
        }
      } else {
        // Nuevo incidente
        this.allIncidents.push(savedIncident);
      }

      this.currentView = 'summary';
      this.selectedIncident = null;
    },

    onFormCancelled() {
      this.currentView = 'summary';
      this.selectedIncident = null;
    },

    async handleExportAll() {
      try {
        const fileName = this.$t('incidents.incidentsManagerReport');
        await incidentApiService.exportToExcel(this.filteredIncidents, fileName);
        this.showNotificationMessage(this.$t('incidents.exportedSuccessfully'), 'success');
      } catch (error) {
        console.error('Error exporting:', error);
        this.showNotificationMessage(this.$t('incidents.errorSaving'), 'error');
      }
    },

    clearFilters() {
      this.filters = {
        search: '',
        type: 'ALL',
        severity: 'ALL',
        status: 'ALL',
        assignment: 'ALL'
      };
    },

    formatIncidentsForTable(incidentsList) {
      return incidentsList.map(incident => ({
        ...incident,
        incidentTypeLabel: incident.getIncidentTypeLabel(),
        severityDisplay: this.getSeverityDisplay(incident.severity),
        statusDisplay: this.getStatusDisplay(incident.status),
        assignmentDisplay: incident.isAssigned() ? this.$t('incidents.assigned') : this.$t('incidents.unassigned'),
        daysOpen: incident.getDaysOpen(),
        occurredAt: this.formatDateTime(incident.occurredAt)
      }));
    },

    getSeverityDisplay(severity) {
      const severityLabels = {
        'CRITICO': this.$t('incidents.severityCritical'),
        'ALTO': this.$t('incidents.severityHigh'),
        'MEDIO': this.$t('incidents.severityMedium'),
        'BAJO': this.$t('incidents.severityLow')
      };
      return severityLabels[severity] || severity;
    },

    getStatusDisplay(status) {
      const statusLabels = {
        'REPORTADO': this.$t('incidents.statusReported'),
        'EN_PROGRESO': this.$t('incidents.statusInProgress'),
        'RESUELTO': this.$t('incidents.statusResolved'),
        'CERRADO': this.$t('incidents.statusClosed')
      };
      return statusLabels[status] || status;
    },

    getTypeDisplayName(type) {
      const incident = new Incident({ incidentType: type });
      return incident.getIncidentTypeLabel();
    },

    formatDateTime(date) {
      if (!date) return '';
      return new Date(date).toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    getSeverityIcon(severity) {
      const iconMap = {
        'CRITICO': 'pi pi-exclamation-circle',
        'ALTO': 'pi pi-exclamation-triangle',
        'MEDIO': 'pi pi-info-circle',
        'BAJO': 'pi pi-check-circle'
      };
      return iconMap[severity] || 'pi pi-circle';
    },

    getStatusIcon(status) {
      const iconMap = {
        'REPORTADO': 'pi pi-flag',
        'EN_PROGRESO': 'pi pi-clock',
        'RESUELTO': 'pi pi-check',
        'CERRADO': 'pi pi-lock'
      };
      return iconMap[status] || 'pi pi-circle';
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
  <div class="incidents-manager">
    <!-- Vista de Resumen -->
    <div v-if="currentView === 'summary'" class="summary-view">

      <!-- Estadísticas -->
      <div class="stats-container">
        <div class="stat-card total">
          <div class="stat-content">
            <div class="stat-number">{{ stats.total }}</div>
            <div class="stat-label">{{ $t('incidents.totalIncidents') }}</div>
          </div>
          <i class="pi pi-exclamation-triangle stat-icon"></i>
        </div>

        <div class="stat-card open">
          <div class="stat-content">
            <div class="stat-number">{{ stats.open }}</div>
            <div class="stat-label">{{ $t('incidents.openIncidents') }}</div>
          </div>
          <i class="pi pi-flag stat-icon"></i>
        </div>

        <div class="stat-card critical">
          <div class="stat-content">
            <div class="stat-number">{{ stats.critical }}</div>
            <div class="stat-label">{{ $t('incidents.criticalIncidents') }}</div>
          </div>
          <i class="pi pi-exclamation-circle stat-icon"></i>
        </div>

        <div class="stat-card resolved">
          <div class="stat-content">
            <div class="stat-number">{{ stats.resolved }}</div>
            <div class="stat-label">{{ $t('incidents.resolvedIncidents') }}</div>
          </div>
          <i class="pi pi-check-circle stat-icon"></i>
        </div>
      </div>

      <!-- Filtros y Controles -->
      <div class="controls-section">
        <div class="filters-row">


          <!-- Filtro por Tipo -->
          <div class="filter-dropdown">
            <select v-model="filters.type" class="filter-select">
              <option value="ALL">{{ $t('incidents.allTypes') }}</option>
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

          <!-- Filtro por Severidad -->
          <div class="filter-dropdown">
            <select v-model="filters.severity" class="filter-select">
              <option value="ALL">{{ $t('incidents.allSeverities') }}</option>
              <option value="CRITICO">{{ $t('incidents.severityCritical') }}</option>
              <option value="ALTO">{{ $t('incidents.severityHigh') }}</option>
              <option value="MEDIO">{{ $t('incidents.severityMedium') }}</option>
              <option value="BAJO">{{ $t('incidents.severityLow') }}</option>
            </select>
            <i class="pi pi-chevron-down filter-icon"></i>
          </div>

          <!-- Filtro por Estado -->
          <div class="filter-dropdown">
            <select v-model="filters.status" class="filter-select">
              <option value="ALL">{{ $t('incidents.allStatuses') }}</option>
              <option value="REPORTADO">{{ $t('incidents.statusReported') }}</option>
              <option value="EN_PROGRESO">{{ $t('incidents.statusInProgress') }}</option>
              <option value="RESUELTO">{{ $t('incidents.statusResolved') }}</option>
              <option value="CERRADO">{{ $t('incidents.statusClosed') }}</option>
            </select>
            <i class="pi pi-chevron-down filter-icon"></i>
          </div>

          <!-- Filtro por Asignación -->
          <div class="filter-dropdown">
            <select v-model="filters.assignment" class="filter-select">
              <option value="ALL">{{ $t('incidents.showAll') }}</option>
              <option value="ASSIGNED">{{ $t('incidents.showAssigned') }}</option>
              <option value="UNASSIGNED">{{ $t('incidents.showUnassigned') }}</option>
            </select>
            <i class="pi pi-chevron-down filter-icon"></i>
          </div>

          <!-- Limpiar Filtros -->
          <AppButton
              :label="$t('incidents.clearFilters')"
              icon="pi pi-filter-slash"
              variant="secondary"
              size="small"
              @click="clearFilters"
          />
        </div>

        <!-- Controles de Acción -->
        <div class="action-controls">
          <AppButton
              :label="$t('incidents.exportAll')"
              icon="pi pi-download"
              variant="secondary"
              @click="handleExportAll"
              :disabled="filteredIncidents.length === 0"
          />
        </div>
      </div>

      <!-- Tabla de Incidentes -->
      <div class="table-section">
        <AppTable
            :columns="tableColumns"
            :data="formatIncidentsForTable(filteredIncidents)"
            :loading="loading"
            :paginator="true"
            :rows="15"
            :showExportButton="false"
            :showFilterButton="false"
            :showAddButton="false"
            :selectable="true"
            :show-search="false"
            data-key="id"
            @row-click="handleRowClick"
            class="incidents-table"
            :row-hover="true"
        >
          <!-- Template para severidad -->
          <template #body-severityDisplay="{ data }">
            <div class="severity-display">
              <span
                  :class="`severity-dot severity-${data.severity.toLowerCase()}`"
              ></span>
              {{ getSeverityDisplay(data.severity) }}
            </div>
          </template>

          <!-- Template para estado -->
          <template #body-statusDisplay="{ data }">
            <div class="status-display">
              <span
                  :class="`status-dot status-${data.status.toLowerCase().replace('_', '-')}`"
              ></span>
              {{ getStatusDisplay(data.status) }}
            </div>
          </template>

          <!-- Template para días abiertos -->
          <template #body-daysOpen="{ data }">
            <span :class="`days-badge ${data.daysOpen > 7 ? 'days-warning' : data.daysOpen > 14 ? 'days-danger' : 'days-normal'}`">
              {{ data.daysOpen }}
            </span>
          </template>
        </AppTable>

        <!-- Estado vacío -->
        <div v-if="!loading && filteredIncidents.length === 0" class="empty-state">
          <i class="pi pi-exclamation-triangle empty-icon"></i>
          <h3>{{ $t('incidents.noDataAvailable') }}</h3>
          <p v-if="allIncidents.length === 0">{{ $t('incidents.addFirstIncident') }}</p>
          <p v-else>{{ $t('incidents.noIncidentsMatchFilter') }}</p>
          <div class="empty-actions">
            <AppButton
                v-if="allIncidents.length === 0"
                :label="$t('incidents.addNew')"
                icon="pi pi-plus"
                variant="primary"
                @click="handleAddNew"
            />
            <AppButton
                v-else
                :label="$t('incidents.clearFilters')"
                icon="pi pi-filter-slash"
                variant="secondary"
                @click="clearFilters"
            />
          </div>
        </div>
      </div>

      <!-- Estado de carga -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <p>{{ $t('incidents.loadingData') }}</p>
      </div>
    </div>

    <!-- Vista de Detalle -->
    <div v-if="currentView === 'detail'" class="detail-view">
      <IncidentFormComponent
          :incident="selectedIncident"
          :project-id="projectId"
          @save="onIncidentSaved"
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
.incidents-manager {
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
.stat-card.open { --stat-color: #f59e0b; }
.stat-card.critical { --stat-color: #ef4444; }
.stat-card.resolved { --stat-color: #10b981; }

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

.incidents-table {
  border-radius: 8px;
  overflow: hidden;
}

/* Displays personalizados */
.severity-display,
.status-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.severity-dot,
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

/* Colores de severidad */
.severity-dot.severity-critico { background-color: #ef4444; }
.severity-dot.severity-alto { background-color: #f97316; }
.severity-dot.severity-medio { background-color: #f59e0b; }
.severity-dot.severity-bajo { background-color: #22c55e; }

/* Colores de estado */
.status-dot.status-reportado { background-color: #3b82f6; }
.status-dot.status-en-progreso { background-color: #f59e0b; }
.status-dot.status-resuelto { background-color: #22c55e; }
.status-dot.status-cerrado { background-color: #6b7280; }

/* Badge para días abiertos */
.days-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.75rem;
}

.days-normal {
  background-color: #e0f2fe;
  color: #0369a1;
}

.days-warning {
  background-color: #fef3c7;
  color: #d97706;
}

.days-danger {
  background-color: #fee2e2;
  color: #dc2626;
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

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
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
:deep(.incident-form-page) {
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
:deep(.incidents-table .p-datatable-tbody > tr) {
  transition: all 0.2s ease;
  cursor: pointer;
}

:deep(.incidents-table .p-datatable-tbody > tr:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
/* Agregar al final del <style scoped> del IncidentsManager */

/* Dark mode para formulario integrado - CORREGIDO */
[data-theme="dark"] .detail-view {
  background-color: var(--bg-primary) !important;
}

/* Estilos específicos para el formulario dentro del manager */
[data-theme="dark"] .incidents-manager .detail-view :deep(.incident-form-page) {
  background-color: var(--bg-primary) !important;
}

[data-theme="dark"] .incidents-manager .detail-view :deep(.form-header) {
  background: var(--bg-card) !important;
  border-bottom: 1px solid var(--border-color) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

[data-theme="dark"] .incidents-manager .detail-view :deep(.form-content) {
  background-color: var(--bg-primary) !important;
}

[data-theme="dark"] .incidents-manager .detail-view :deep(.form-section) {
  background: var(--bg-card) !important;
  border: 1px solid var(--border-color) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
}

[data-theme="dark"] .incidents-manager .detail-view :deep(.form-section-title) {
  color: #FF5F01 !important;
  border-bottom: 2px solid #FF5F01 !important;
}

[data-theme="dark"] .incidents-manager .detail-view :deep(.header-title h1) {
  color: var(--text-primary) !important;
}

[data-theme="dark"] .incidents-manager .detail-view :deep(.header-subtitle) {
  color: var(--text-secondary) !important;
}
</style>