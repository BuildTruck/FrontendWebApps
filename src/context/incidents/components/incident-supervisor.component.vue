<script>
import AppTable from '../../../core/components/AppTable.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import AppButton from '../../../core/components/AppButton.vue'
import { IncidentApiService } from "../services/incident-api.service.js";
import IncidentFormComponent from "./incident-form.component.vue";

export default {
  name: 'IncidentSupervisor',
  components: {
    IncidentFormComponent,
    AppTable,
    AppNotification,
    AppButton,
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      selectedTab: 'incidents',
      incidents: [],
      selectedIncident: null,
      showForm: false,
      isReadonly: false,
      isEditing: false,
      showAddForm: false,
      loading: false,
      showNotification: false,
      notificationMessage: '',
      incidentService: new IncidentApiService(),
      showConfirmation: false,
      confirmationMessage: '',
      pendingDeleteIncidents: [],
    }
  },
  computed: {
    columns() {
      return [
        { field: 'title', header: this.$t('incidents.title') },
        { field: 'incidentType', header: this.$t('incidents.incidentType') },
        { field: 'severity', header: this.$t('incidents.severity') },
        { field: 'status', header: this.$t('incidents.status') },
        { field: 'location', header: this.$t('incidents.location') },
        { field: 'occurredAt', header: this.$t('incidents.occurredAt'), dataType: 'datetime' },
        { field: 'registerDate', header: this.$t('incidents.registerDate'), dataType: 'date' }
      ];
    },

    currentProjectId() {
      return this.projectId || this.getCurrentProjectIdFromSession();
    }
  },
  async created() {
    await this.loadIncidents()
  },
  methods: {
    getCurrentProjectIdFromSession() {
      try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        return user?.projectId || null;
      } catch (error) {
        console.error('Error getting projectId from session:', error);
        return null;
      }
    },

    async loadIncidents() {
      try {
        this.loading = true;

        if (!this.currentProjectId) {
          throw new Error('No projectId found');
        }

        console.log('Loading incidents for project:', this.currentProjectId);
        const data = await this.incidentService.getByProject(this.currentProjectId);
        this.incidents = Array.isArray(data) ? data : [];

        console.log('Loaded incidents:', this.incidents.length);
      } catch (error) {
        console.error('Error loading incidents:', error);
        this.incidents = [];
        this.notificationMessage = this.$t('incidents.errorLoading');
        this.showNotification = true;
      } finally {
        this.loading = false;
      }
    },

    async handleUpdated(message = '') {
      await this.loadIncidents()
      if (message) {
        this.notificationMessage = message
        this.showNotification = true
      }
    },

    handleAdd() {
      this.selectedIncident = null
      this.showForm = true
      this.isReadonly = false
      this.isEditing = false
      this.showAddForm = true
    },

    async handleConfirm(incident) {
      try {
        if (!this.currentProjectId) {
          throw new Error('No projectId available');
        }

        incident.projectId = this.currentProjectId;

        let savedIncident;
        if (incident.id) {
          savedIncident = await this.incidentService.update(incident.id, incident);
          this.notificationMessage = this.$t('incidents.incidentUpdated');
        } else {
          savedIncident = await this.incidentService.create(incident);
          this.notificationMessage = this.$t('incidents.incidentCreated');
        }

        this.showNotification = true;
        this.showForm = false;
        this.showAddForm = false;
        this.selectedIncident = null;
        await this.loadIncidents();

        console.log('Incident saved:', savedIncident);
      } catch (error) {
        console.error('Error saving incident:', error);
        this.notificationMessage = error.message || this.$t('incidents.errorSaving');
        this.showNotification = true;
      }
    },

    handleRowClick({data}) {
      this.selectedIncident = {...data}
      this.showForm = true
      this.isReadonly = true
      this.isEditing = false
    },

    handleEdit() {
      this.isReadonly = false
      this.isEditing = true
      this.showForm = true
      this.showAddForm = false
    },

    cancelView() {
      this.showForm = false
      this.showAddForm = false
      this.selectedIncident = null
      this.isReadonly = false
      this.isEditing = false
    },

    async handleDelete(selectedIncidents) {
      if (!selectedIncidents || selectedIncidents.length === 0) {
        return;
      }

      try {
        const confirmMessage = selectedIncidents.length === 1
            ? this.$t('incidents.deleteConfirm')
            : this.$t('incidents.deleteMultipleConfirm', { count: selectedIncidents.length });

        // Show confirmation using AppNotification
        this.confirmationMessage = confirmMessage;
        this.showConfirmation = true;
        this.pendingDeleteIncidents = selectedIncidents;
      } catch (error) {
        console.error('Error preparing delete:', error);
        this.showNotificationMessage(error.message || this.$t('incidents.errorDeleting'), 'error');
      }
    },

    async executeDelete() {
      try {
        this.loading = true;
        this.showConfirmation = false;

        if (this.pendingDeleteIncidents.length === 1) {
          await this.incidentService.delete(this.pendingDeleteIncidents[0].id);
        } else {
          const ids = this.pendingDeleteIncidents.map(i => i.id);
          await this.incidentService.deleteMultiple(ids);
        }

        this.showNotificationMessage(this.$t('incidents.incidentDeleted'), 'success');
        await this.loadIncidents();
      } catch (error) {
        console.error('Error deleting incidents:', error);
        this.showNotificationMessage(error.message || this.$t('incidents.errorDeleting'), 'error');
      } finally {
        this.loading = false;
        this.pendingDeleteIncidents = [];
      }
    },

    cancelDelete() {
      this.showConfirmation = false;
      this.pendingDeleteIncidents = [];
    },

    async handleExport({ filteredData, selectedData, allData }) {
      try {
        const dataToExport = selectedData && selectedData.length > 0
            ? selectedData
            : filteredData && filteredData.length > 0
                ? filteredData
                : allData;

        if (!dataToExport || dataToExport.length === 0) {
          this.notificationMessage = this.$t('incidents.noDataAvailable');
          this.showNotification = true;
          return;
        }

        await this.incidentService.exportToExcel(dataToExport, 'incidentes');

        this.notificationMessage = this.$t('incidents.exportedSuccessfully');
        this.showNotification = true;
      } catch (error) {
        console.error('Error exporting incidents:', error);
        this.notificationMessage = error.message || 'Error exporting data';
        this.showNotification = true;
      }
    },

    getSeverityDisplay(severity) {
      const severityMap = {
        'BAJO': { label: this.$t('incidents.severityLow'), class: 'severity-low' },
        'MEDIO': { label: this.$t('incidents.severityMedium'), class: 'severity-medium' },
        'ALTO': { label: this.$t('incidents.severityHigh'), class: 'severity-high' },
        'CRITICO': { label: this.$t('incidents.severityCritical'), class: 'severity-critical' }
      };

      return severityMap[severity] || { label: severity, class: 'severity-default' };
    },

    getStatusDisplay(status) {
      const statusMap = {
        'REPORTADO': { label: this.$t('incidents.statusReported'), class: 'status-reported' },
        'EN_PROGRESO': { label: this.$t('incidents.statusInProgress'), class: 'status-progress' },
        'RESUELTO': { label: this.$t('incidents.statusResolved'), class: 'status-resolved' },
        'CERRADO': { label: this.$t('incidents.statusClosed'), class: 'status-closed' }
      };

      return statusMap[status] || { label: status, class: 'status-default' };
    },

    getIncidentTypeDisplay(type) {
      const typeMap = {
        'ACCIDENTE_LABORAL': this.$t('incidents.typeAccident'),
        'FALLA_EQUIPO': this.$t('incidents.typeEquipmentFailure'),
        'SEGURIDAD': this.$t('incidents.typeSafety'),
        'CALIDAD': this.$t('incidents.typeQuality'),
        'AMBIENTAL': this.$t('incidents.typeEnvironmental'),
        'ROBO_VANDALISMO': this.$t('incidents.typeTheft'),
        'CLIMA': this.$t('incidents.typeWeather'),
        'ESTRUCTURAL': this.$t('incidents.typeStructural'),
        'MATERIALES': this.$t('incidents.typeMaterials'),
        'OTROS': this.$t('incidents.typeOthers')
      };

      return typeMap[type] || type;
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.showNotification = true;
    }
  }
}
</script>

<template>
  <div class="incident-supervisor">
    <!-- TABS -->
    <div v-if="selectedTab === 'incidents'">
      <!-- Formulario para incidentes -->
      <IncidentFormComponent
          v-if="showForm || showAddForm"
          :incident="selectedIncident || {}"
          :project-id="currentProjectId"
          @save="handleConfirm"
          @cancel="cancelView"
      />

      <!-- Botones al ver detalles -->
      <div v-if="showForm && isReadonly" class="detail-actions">
        <AppButton
            :label="$t('general.edit')"
            variant="primary"
            @click="handleEdit"
        />
        <AppButton
            :label="$t('general.close')"
            variant="secondary"
            @click="cancelView"
        />
      </div>

      <!-- Estado vacío -->
      <div v-if="!showForm && !showAddForm && !loading && incidents.length === 0" class="empty-state">
        <i class="pi pi-exclamation-triangle empty-icon"></i>
        <h3>{{ $t('incidents.noDataAvailable') }}</h3>
        <p>{{ $t('incidents.addFirstIncident') }}</p>
        <AppButton
            :label="$t('incidents.addNew')"
            variant="primary"
            icon="pi pi-plus"
            @click="handleAdd"
        />
      </div>

      <!-- Tabla - solo cuando hay datos -->
      <div v-if="!showForm && !showAddForm && (loading || incidents.length > 0)" class="table-container">
        <AppTable
            :columns="columns"
            :data="incidents"
            :loading="loading"
            :showFilterButton="true"
            :showAddButton="true"
            :showExportButton="false"
            :selectable="true"
            @add="handleAdd"
            @row-click="handleRowClick"
            @delete="handleDelete"
        >
          <!-- Custom template for incident type column -->
          <template #body-incidentType="{ data }">
            <span class="incident-type-display">
              {{ getIncidentTypeDisplay(data.incidentType) }}
            </span>
          </template>

          <!-- Custom template for severity column -->
          <template #body-severity="{ data }">
            <div class="severity-container">
              <span
                  class="severity-dot"
                  :class="getSeverityDisplay(data.severity).class"
              ></span>
              <span>{{ getSeverityDisplay(data.severity).label }}</span>
            </div>
          </template>

          <!-- Custom template for status column -->
          <template #body-status="{ data }">
            <div class="status-container">
              <span
                  class="status-dot"
                  :class="getStatusDisplay(data.status).class"
              ></span>
              <span>{{ getStatusDisplay(data.status).label }}</span>
            </div>
          </template>
        </AppTable>
      </div>
    </div>

    <!-- NOTIFICACIÓN -->
    <AppNotification
        v-model="showNotification"
        :message="notificationMessage"
        type="success"
        :autoClose="true"
        :duration="3000"
    />

    <AppNotification
        v-model="showConfirmation"
        :message="confirmationMessage"
        type="warning"
        :auto-close="false"
        :show-buttons="true"
        confirm-label="Eliminar"
        cancel-label="Cancelar"
        @confirm="executeDelete"
        @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.incident-supervisor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 1rem;
}

.table-container {
  flex: 1;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.incident-type-display {
  font-weight: 500;
  color: #333;
}

.severity-container,
.status-container {
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

/* Severity colors */
.severity-dot.severity-low {
  background-color: #22c55e;
}

.severity-dot.severity-medium {
  background-color: #f59e0b;
}

.severity-dot.severity-high {
  background-color: #f97316;
}

.severity-dot.severity-critical {
  background-color: #ef4444;
}

.severity-dot.severity-default {
  background-color: #6b7280;
}

/* Status colors */
.status-dot.status-reported {
  background-color: #3b82f6;
}

.status-dot.status-progress {
  background-color: #f59e0b;
}

.status-dot.status-resolved {
  background-color: #22c55e;
}

.status-dot.status-closed {
  background-color: #6b7280;
}

.status-dot.status-default {
  background-color: #6b7280;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: white;
  border-radius: 12px;
  margin: 2rem;
  min-height: 400px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 4rem;
  color: #9ca3af;
  margin-bottom: 1.5rem;
  opacity: 0.8;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .detail-actions {
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .table-container {
    margin: 0.5rem;
    border-radius: 6px;
  }

  .empty-state {
    padding: 3rem 1.5rem;
    margin: 1rem;
    min-height: 300px;
  }

  .empty-icon {
    font-size: 2.5rem;
  }
}

@media (max-width: 480px) {
  .detail-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .incident-supervisor {
    padding: 0;
  }

  .empty-state {
    padding: 2rem 1rem;
    margin: 0.5rem;
    min-height: 250px;
  }
}
</style>