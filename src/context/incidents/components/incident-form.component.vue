<script>
import AppButton from "../../../core/components/AppButton.vue";
import AppTable from "../../../core/components/AppTable.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import AppInput from "../../../core/components/AppInput.vue";
import { Incident } from "../models/incident.entity.js";
import { IncidentApiService } from "../services/incident-api.service.js";
import { PersonnelApiService } from "../../personnel/services/personnel-api.service.js";
import ExportButton from '../../../core/exports/components/ExportButton.vue'

export default {
  name: 'IncidentForm',
  components: {
    AppButton,
    AppTable,
    AppNotification,
    AppInput,
    ExportButton,
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    },
    allowEditing: {
      type: Boolean,
      default: false
    },
    isAddingNew: {
      type: Boolean,
      default: false
    },
    incident: {
      type: Object,
      default: null
    }

  },
  data() {
    return {
      // Vistas: 'list' | 'detail'
      currentView: 'list',

      // Estado de edición
      isEditing: false,
      hasChanges: false,
      originalData: null,
      isSaving: false,

      // Manejo de imágenes
      imagePreviewUrls: {},

      // Datos
      allIncidents: [],
      selectedIncident: null,
      personnel: [],
      loading: false,

      // Filtros
      filters: {
        search: '',
        type: 'ALL',
        severity: 'ALL',
        status: 'ALL',
        assignment: 'ALL'
      },

      // Notificaciones
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',

      // Servicios
      incidentService: new IncidentApiService(),
      personnelService: new PersonnelApiService()
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

    // Opciones de tipos para select
    incidentTypeOptions() {
      return Incident.INCIDENT_TYPES.map(type => ({
        value: type.value,
        label: this.$t(`incidents.type${type.value}`, type.label)
      }));
    },

    // Opciones de severidad para select
    severityOptions() {
      return Incident.SEVERITIES.map(severity => ({
        value: severity.value,
        label: this.$t(`incidents.severity${severity.value}`, severity.label)
      }));
    },

    // Opciones de estado para select
    statusOptions() {
      return Incident.STATUSES.map(status => ({
        value: status.value,
        label: this.$t(`incidents.status${status.value}`, status.label)
      }));
    },

    // Opciones de personal para select
    personnelOptions() {
      return [
        { value: null, label: this.$t('incidents.noAssignment', 'No assignment') },
        ...this.personnel.map(person => ({
          value: person.id,
          label: `${person.name} ${person.lastname}`
        }))
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
              (incident.notes && incident.notes.toLowerCase().includes(searchTerm));

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
        if (this.filters.assignment === 'ASSIGNED' && !incident.assignedTo) {
          return false;
        }
        if (this.filters.assignment === 'AVAILABLE' && incident.assignedTo) {
          return false;
        }

        return true;
      });
    },

    // Columnas de la tabla
    incidentTableColumns() {
      return [
        { field: 'title', header: this.$t('incidents.title', 'Title'), sortable: true, style: 'min-width: 200px' },
        { field: 'incidentTypeLabel', header: this.$t('incidents.incidentType', 'Type'), sortable: true, style: 'min-width: 150px' },
        { field: 'severityDisplay', header: this.$t('incidents.severity', 'Severity'), sortable: true, style: 'width: 120px' },
        { field: 'statusDisplay', header: this.$t('incidents.status', 'Status'), sortable: true, style: 'width: 120px' },
        { field: 'location', header: this.$t('incidents.location', 'Location'), sortable: true, style: 'min-width: 150px' },
        { field: 'assignmentDisplay', header: this.$t('incidents.assignment', 'Assignment'), sortable: false, style: 'width: 140px; text-align: center;' },
        { field: 'occurredAt', header: this.$t('incidents.occurredAt', 'Occurred At'), sortable: true, dataType: 'datetime', style: 'width: 140px' }
      ];
    },

    formattedIncidentData() {
      return this.filteredIncidents.map(incident => ({
        ...incident,
        incidentTypeLabel: this.getIncidentTypeLabel(incident.incidentType),
        severityDisplay: this.formatSeverity(incident.severity),
        statusDisplay: this.formatStatus(incident.status),
        assignmentDisplay: incident.assignedTo ? this.$t('incidents.assigned', 'Assigned') : this.$t('incidents.unassigned', 'Unassigned'),
        occurredAt: this.formatDateTime(incident.occurredAt)
      }));
    },

    // Estadísticas
    stats() {
      return {
        total: this.allIncidents.length,
        open: this.allIncidents.filter(i => i.status !== 'RESUELTO' && i.status !== 'CERRADO').length,
        critical: this.allIncidents.filter(i => i.severity === 'CRITICO').length,
        resolved: this.allIncidents.filter(i => i.status === 'RESUELTO').length,
        assigned: this.allIncidents.filter(i => i.assignedTo).length
      };
    },

    // Información del responsable asignado
    assignedPersonnel() {
      if (!this.selectedIncident || !this.selectedIncident.assignedTo) {
        return null;
      }
      return this.personnel.find(p => p.id === this.selectedIncident.assignedTo);
    },

    // Información del reportador
    reportedByPersonnel() {
      if (!this.selectedIncident || !this.selectedIncident.reportedBy) {
        return null;
      }
      return this.personnel.find(p => p.id === this.selectedIncident.reportedBy);
    },

    canEdit() {
      return this.allowEditing && !this.readonly && (this.selectedIncident || this.isAddingNew);
    }
  },

  async mounted() {
    await this.loadIncidents();
    await this.loadPersonnel();
    if (this.isAddingNew) {
      this.selectedIncident = this.incident ? new Incident(this.incident) : new Incident({ projectId: this.projectId });
      this.currentView = 'detail';
      this.startEditing();
    }
  },

  methods: {
    // ========== MÉTODOS DE EDICIÓN ==========

    startEditing() {
      if (!this.canEdit || this.isEditing) return;

      this.isEditing = true;
      this.hasChanges = false;
      this.originalData = { ...this.selectedIncident };

      console.log('Editing mode enabled for:', this.selectedIncident.title);
    },

    detectChanges() {
      if (!this.isEditing || !this.originalData) return;

      const currentData = this.selectedIncident;
      const originalData = this.originalData;

      this.hasChanges = (
          currentData.title !== originalData.title ||
          currentData.description !== originalData.description ||
          currentData.incidentType !== originalData.incidentType ||
          currentData.severity !== originalData.severity ||
          currentData.status !== originalData.status ||
          currentData.location !== originalData.location ||
          currentData.assignedTo !== originalData.assignedTo ||
          currentData.reportedBy !== originalData.reportedBy ||
          currentData.notes !== originalData.notes ||
          currentData.imageFile !== null ||
          currentData.removeImage === true
      );
    },

    async saveChanges() {
      if (!this.hasChanges || this.isSaving) return;

      try {
        this.isSaving = true;

        // Validar datos
        const validation = this.selectedIncident.validate();
        if (!validation.isValid) {
          this.showNotificationMessage(
              `${this.$t('common.validationError', 'Validation Error')}: ${validation.errors.join(', ')}`,
              'error'
          );
          return;
        }

        console.log('Saving changes for incident:', this.selectedIncident.id);

        let updatedIncident;
        if (this.selectedIncident.id) {
          // Actualizar existente
          updatedIncident = await this.incidentService.update(
              this.selectedIncident.id,
              this.selectedIncident
          );
        } else {
          // Crear nuevo
          updatedIncident = await this.incidentService.create(this.selectedIncident);
        }

        // Actualizar en la lista local
        const index = this.allIncidents.findIndex(i => i.id === updatedIncident.id);
        if (index !== -1) {
          this.allIncidents[index] = updatedIncident;
        } else {
          this.allIncidents.push(updatedIncident);
        }

        // Actualizar incidente seleccionado
        this.selectedIncident = updatedIncident;

        // Resetear estado de edición
        this.isEditing = false;
        this.hasChanges = false;
        this.originalData = null;

        const successMessage = this.selectedIncident.id
            ? this.$t('incidents.updatedSuccessfully', 'Incident updated successfully')
            : this.$t('incidents.createdSuccessfully', 'Incident created successfully');

        this.showNotificationMessage(successMessage, 'success');

        // Emitir evento si es creación desde supervisor
        if (this.isAddingNew) {
          this.$emit('save', updatedIncident);
        }

      } catch (error) {
        console.error('💥 Error saving changes:', error);
        this.showNotificationMessage(
            this.$t('incidents.errorSaving', 'Error saving changes'),
            'error'
        );
      } finally {
        this.isSaving = false;
      }
    },

    cancelChanges() {
      if (!this.isEditing) return;

      if (this.originalData) {
        // Restaurar datos originales
        Object.assign(this.selectedIncident, this.originalData);
      }

      this.isEditing = false;
      this.hasChanges = false;
      this.originalData = null;

      // Si es creación nueva, emitir cancel
      if (this.isAddingNew) {
        this.$emit('cancel');
      }

      console.log('Changes cancelled, data restored');
    },

    // ========== HANDLERS DE CAMPOS ==========

    handleFieldClick(fieldName) {
      if (!this.canEdit) return;

      if (!this.isEditing) {
        this.startEditing();
      }
    },

    handleFieldChange(fieldName, value) {
      if (!this.isEditing) return;

      this.selectedIncident[fieldName] = value;
      this.detectChanges();
    },

    // ========== MÉTODOS ORIGINALES ==========

    async loadIncidents() {
      this.loading = true;
      try {
        const rawData = await this.incidentService.getByProject(this.projectId);

        this.allIncidents = rawData.map(data => {
          // Mapear los campos del backend al frontend
          const incidentData = {
            ...data,
            createdAt: data.updatedAt || data.registerDate,
          };

          // AGREGAR ESTAS LÍNEAS PARA DEBUG:
          console.log('🔍 Raw data from backend:', data);
          console.log('🔍 Mapped incidentData:', incidentData);
          console.log('🔍 createdAt:', incidentData.createdAt);
          console.log('🔍 registerDate:', incidentData.registerDate);

          return new Incident(incidentData);
        });
      } catch (error) {
        console.error('Error loading incidents:', error);
        this.showNotificationMessage(
            this.$t('incidents.errorLoading', 'Error loading incidents'),
            'error'
        );
      } finally {
        this.loading = false;
      }
    },

    async loadPersonnel() {
      try {
        this.personnel = await this.personnelService.getByProject(this.projectId);
      } catch (error) {
        console.error('Error loading personnel:', error);
      }
    },

    handleIncidentClick(event) {
      if (event.data && event.data.id) {
        const incident = this.allIncidents.find(i => i.id === event.data.id);
        if (incident) {
          // AGREGAR ESTAS LÍNEAS PARA DEBUG:
          console.log('🔍 Incident from allIncidents:', incident);
          console.log('🔍 incident.registerDate:', incident.registerDate);
          console.log('🔍 incident.createdAt:', incident.createdAt);

          this.selectedIncident = incident;
          this.currentView = 'detail';

          // Resetear estado de edición al cambiar de incidente
          this.isEditing = false;
          this.hasChanges = false;
          this.originalData = null;
        }
      }
    },

    backToList() {
      // Si hay cambios pendientes, preguntar antes de salir
      if (this.hasChanges) {
        if (confirm(this.$t('common.unsavedChanges', 'You have unsaved changes. Are you sure you want to leave?'))) {
          this.cancelChanges();
        } else {
          return;
        }
      }

      this.currentView = 'list';
      this.selectedIncident = null;
      this.isEditing = false;
      this.hasChanges = false;
      this.originalData = null;
    },

    getIncidentInitials(incident) {
      const title = incident.title || '';
      const type = incident.incidentType || '';
      if (title.length >= 2) {
        return title.substring(0, 2).toUpperCase();
      }
      return type.substring(0, 2).toUpperCase();
    },

    getIncidentTypeLabel(type) {
      const typeOption = this.incidentTypeOptions.find(option => option.value === type);
      return typeOption ? typeOption.label : type;
    },

    formatSeverity(severity) {
      const severityOption = this.severityOptions.find(option => option.value === severity);
      return severityOption ? severityOption.label : severity;
    },

    formatStatus(status) {
      const statusOption = this.statusOptions.find(option => option.value === status);
      return statusOption ? statusOption.label : status;
    },

    formatDateTime(date) {
      if (!date) return '-';
      try {
        return new Date(date).toLocaleString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return String(date);
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

    onExportComplete(result) {
      this.showNotificationMessage(
          this.$t('incidents.exportedSuccessfully', 'Exported successfully'),
          'success'
      );
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    },

    // ========== MÉTODOS DE IMÁGENES ==========

    onImageSelected(file) {
      if (!file) return;

      console.log('Image selected:', file.name);

      // Activar modo de edición si no está activo
      if (!this.isEditing) {
        this.startEditing();
      }

      // Guardar el archivo para enviarlo al servidor
      this.selectedIncident.imageFile = file;

      // Limpiar preview anterior de este incidente
      if (this.imagePreviewUrls[this.selectedIncident.id]) {
        URL.revokeObjectURL(this.imagePreviewUrls[this.selectedIncident.id]);
      }

      // Crear preview URL específico para este incidente
      this.imagePreviewUrls[this.selectedIncident.id] = URL.createObjectURL(file);

      // Detectar cambios
      this.detectChanges();
    },

    removeImage() {
      console.log('Removing image');

      // Limpiar preview
      if (this.imagePreviewUrl) {
        URL.revokeObjectURL(this.imagePreviewUrl);
        this.imagePreviewUrl = null;
      }

      // Marcar para eliminar del servidor
      if (this.selectedIncident) {
        this.selectedIncident.imageFile = null;
        this.selectedIncident.removeImage = true;
        this.selectedIncident.image = null;
      }

      // Si está en modo edición, detectar cambios
      if (this.isEditing) {
        this.detectChanges();
      }
    },

    getIncidentImageUrl() {
      // Prioridad: preview específico de este incidente > imagen existente
      const incidentId = this.selectedIncident?.id;
      return this.imagePreviewUrls[incidentId] || this.selectedIncident?.image || null;
    },

    handleImageChange(event) {
      const file = event.target.files[0];
      if (file) {
        this.onImageSelected(file);
      }
    }
  }
};
</script>

<template>
  <div class="incident-form">
    <!-- Vista de Lista -->
    <div v-if="currentView === 'list'" class="list-view">
      <!-- Header con controles -->
      <div class="manager-header">
        <div class="header-left">
          <p class="page-subtitle">{{ $t('incidents.viewIncidentDetails', 'View incident details and information') }}</p>
        </div>

        <ExportButton
            :data="filteredIncidents"
            type="incidents"
            :formats="['excel', 'pdf']"
            :button-label="$t('exports.export', 'Export')"
            variant="primary"
            @export-complete="onExportComplete"
        />
      </div>

      <!-- Estadísticas -->
      <div class="stats-container">
        <div class="stat-card total">
          <div class="stat-content">
            <div class="stat-number">{{ stats.total }}</div>
            <div class="stat-label">{{ $t('incidents.totalIncidents', 'Total Incidents') }}</div>
          </div>
          <i class="pi pi-exclamation-triangle stat-icon"></i>
        </div>

        <div class="stat-card open">
          <div class="stat-content">
            <div class="stat-number">{{ stats.open }}</div>
            <div class="stat-label">{{ $t('incidents.openIncidents', 'Open') }}</div>
          </div>
          <i class="pi pi-flag stat-icon"></i>
        </div>

        <div class="stat-card critical">
          <div class="stat-content">
            <div class="stat-number">{{ stats.critical }}</div>
            <div class="stat-label">{{ $t('incidents.criticalIncidents', 'Critical') }}</div>
          </div>
          <i class="pi pi-exclamation-circle stat-icon"></i>
        </div>

        <div class="stat-card resolved">
          <div class="stat-content">
            <div class="stat-number">{{ stats.resolved }}</div>
            <div class="stat-label">{{ $t('incidents.resolvedIncidents', 'Resolved') }}</div>
          </div>
          <i class="pi pi-check-circle stat-icon"></i>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filters-section">
        <div class="filter-group">
          <div class="filter-select">
            <label>{{ $t('incidents.filterByType', 'Filter by Type') }}:</label>
            <select v-model="filters.type">
              <option value="ALL">{{ $t('incidents.allTypes', 'All Types') }}</option>
              <option v-for="type in availableTypes" :key="type" :value="type">
                {{ getIncidentTypeLabel(type) }}
              </option>
            </select>
          </div>

          <div class="filter-select">
            <label>{{ $t('incidents.filterBySeverity', 'Filter by Severity') }}:</label>
            <select v-model="filters.severity">
              <option value="ALL">{{ $t('incidents.allSeverities', 'All Severities') }}</option>
              <option value="CRITICO">{{ $t('incidents.severityCritical', 'Critical') }}</option>
              <option value="ALTO">{{ $t('incidents.severityHigh', 'High') }}</option>
              <option value="MEDIO">{{ $t('incidents.severityMedium', 'Medium') }}</option>
              <option value="BAJO">{{ $t('incidents.severityLow', 'Low') }}</option>
            </select>
          </div>

          <div class="filter-select">
            <label>{{ $t('incidents.filterByStatus', 'Filter by Status') }}:</label>
            <select v-model="filters.status">
              <option value="ALL">{{ $t('incidents.allStatuses', 'All Statuses') }}</option>
              <option value="REPORTADO">{{ $t('incidents.statusReported', 'Reported') }}</option>
              <option value="EN_PROGRESO">{{ $t('incidents.statusInProgress', 'In Progress') }}</option>
              <option value="RESUELTO">{{ $t('incidents.statusResolved', 'Resolved') }}</option>
              <option value="CERRADO">{{ $t('incidents.statusClosed', 'Closed') }}</option>
            </select>
          </div>

          <div class="filter-select">
            <label>{{ $t('incidents.filterByAssignment', 'Filter by Assignment') }}:</label>
            <select v-model="filters.assignment">
              <option value="ALL">{{ $t('incidents.showAll', 'Show All') }}</option>
              <option value="ASSIGNED">{{ $t('incidents.showAssigned', 'Assigned') }}</option>
              <option value="AVAILABLE">{{ $t('incidents.available', 'Available') }}</option>
            </select>
          </div>

          <AppButton
              :label="$t('incidents.clearFilters', 'Clear Filters')"
              icon="pi pi-filter-slash"
              variant="secondary"
              @click="clearFilters"
          />
        </div>
      </div>

      <!-- Tabla de incidentes -->
      <div v-if="!loading && filteredIncidents.length > 0" class="incident-table-section">
        <AppTable
            :columns="incidentTableColumns"
            :data="formattedIncidentData"
            :loading="loading"
            :paginator="true"
            :rows="15"
            :show-export-button="false"
            :show-filter-button="false"
            data-key="id"
            @row-click="handleIncidentClick"
            class="incident-table"
            :row-hover="true"
        />
      </div>

      <!-- Estado sin datos -->
      <div v-else-if="!loading && filteredIncidents.length === 0" class="empty-state">
        <i class="pi pi-exclamation-triangle"></i>
        <h3>{{ $t('incidents.noIncidentsFound', 'No incidents found') }}</h3>
        <p>{{ $t('incidents.tryAdjustingFilters', 'Try adjusting your filters') }}</p>
      </div>
    </div>

    <!-- Vista de Detalle -->
    <div v-if="currentView === 'detail'" class="detail-view">
      <div class="detail-header">
        <div class="header-back">
          <AppButton
              icon="pi pi-arrow-left"
              :label="isAddingNew ? $t('common.cancel', 'Cancel') : $t('common.back', 'Back')"
              variant="secondary"
              @click="isAddingNew ? $emit('cancel') : backToList()"
              :disabled="isSaving"
          />

          <!-- Botones de Guardar/Cancelar (solo aparecen si hay cambios) -->
          <div v-if="hasChanges && isEditing" class="edit-actions">
            <AppButton
                :label="$t('common.save', 'Save')"
                icon="pi pi-check"
                variant="primary"
                @click="saveChanges"
                :loading="isSaving"
                :disabled="!hasChanges"
            />
            <AppButton
                :label="$t('common.cancel', 'Cancel')"
                icon="pi pi-times"
                variant="secondary"
                @click="cancelChanges"
                :disabled="isSaving"
            />
          </div>
        </div>

        <div class="incident-info" v-if="selectedIncident">
          <div class="incident-avatar"
               :class="{ 'clickeable-avatar': canEdit }"
               @click="canEdit ? $refs.imageInput.click() : null"
               :title="canEdit ? $t('incidents.clickToChangeImage', 'Click to change image') : ''">
            <!-- Input file oculto -->
            <input
                v-if="canEdit"
                ref="imageInput"
                type="file"
                accept="image/*"
                @change="handleImageChange"
                style="display: none;"
            />

            <!-- Mostrar imagen actual o preview -->
            <img v-if="getIncidentImageUrl()"
                 :src="getIncidentImageUrl()"
                 :alt="selectedIncident.title"
                 class="avatar-image" />
            <div v-else class="avatar-placeholder">
              {{ getIncidentInitials(selectedIncident) }}
            </div>
          </div>

          <!-- Todos los datos del incidente EDITABLES -->
          <div class="incident-details">
            <!-- Título del incidente (EDITABLE) -->
            <div class="incident-title-section">
              <input
                  v-if="isEditing"
                  v-model="selectedIncident.title"
                  @input="handleFieldChange('title', $event.target.value)"
                  @click="handleFieldClick('title')"
                  class="editable-title"
                  :placeholder="$t('incidents.title', 'Title')"
              />
              <span
                  v-else
                  @click="handleFieldClick('title')"
                  :class="['incident-title', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                  {{ selectedIncident.title }}
                </span>
            </div>

            <!-- Grid de información EDITABLE -->
            <div class="incident-meta">
              <!-- Tipo de Incidente -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('incidents.incidentType', 'Incident Type') }}</span>
                <select
                    v-if="isEditing"
                    v-model="selectedIncident.incidentType"
                    @change="handleFieldChange('incidentType', $event.target.value)"
                    @click="handleFieldClick('incidentType')"
                    class="meta-select"
                >
                  <option v-for="option in incidentTypeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <span
                    v-else
                    @click="handleFieldClick('incidentType')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ getIncidentTypeLabel(selectedIncident.incidentType) }}
                </span>
              </div>

              <!-- Severidad -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('incidents.severity', 'Severity') }}</span>
                <select
                    v-if="isEditing"
                    v-model="selectedIncident.severity"
                    @change="handleFieldChange('severity', $event.target.value)"
                    @click="handleFieldClick('severity')"
                    class="meta-select"
                >
                  <option v-for="option in severityOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <span
                    v-else
                    @click="handleFieldClick('severity')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ formatSeverity(selectedIncident.severity) }}
                </span>
              </div>

              <!-- Estado -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('incidents.status', 'Status') }}</span>
                <select
                    v-if="isEditing"
                    v-model="selectedIncident.status"
                    @change="handleFieldChange('status', $event.target.value)"
                    @click="handleFieldClick('status')"
                    class="meta-select"
                >
                  <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <span
                    v-else
                    @click="handleFieldClick('status')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ formatStatus(selectedIncident.status) }}
                </span>
              </div>

              <!-- Ubicación -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('incidents.location', 'Location') }}</span>
                <input
                    v-if="isEditing"
                    v-model="selectedIncident.location"
                    @input="handleFieldChange('location', $event.target.value)"
                    @click="handleFieldClick('location')"
                    class="meta-input"
                    :placeholder="$t('incidents.location', 'Location')"
                />
                <span
                    v-else
                    @click="handleFieldClick('location')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ selectedIncident.location || '-' }}
                </span>
              </div>

              <!-- Descripción -->
              <div class="meta-item full-width">
                <span class="meta-label">{{ $t('incidents.description', 'Description') }}</span>
                <textarea
                    v-if="isEditing"
                    v-model="selectedIncident.description"
                    @input="handleFieldChange('description', $event.target.value)"
                    @click="handleFieldClick('description')"
                    class="meta-textarea"
                    :placeholder="$t('incidents.description', 'Description')"
                    rows="3"
                />
                <span
                    v-else
                    @click="handleFieldClick('description')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ selectedIncident.description || '-' }}
                </span>
              </div>

              <!-- Asignado A -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('incidents.assignedTo', 'Assigned To') }}</span>
                <select
                    v-if="isEditing"
                    v-model="selectedIncident.assignedTo"
                    @change="handleFieldChange('assignedTo', $event.target.value)"
                    @click="handleFieldClick('assignedTo')"
                    class="meta-select"
                >
                  <option v-for="option in personnelOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <span
                    v-else
                    @click="handleFieldClick('assignedTo')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  <template v-if="assignedPersonnel">
                    {{ assignedPersonnel.name }} {{ assignedPersonnel.lastname }}
                  </template>
                  <template v-else>
                    {{ $t('incidents.noAssignment', 'No assignment') }}
                  </template>
                </span>
              </div>

              <!-- Reportado Por -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('incidents.reportedBy', 'Reported By') }}</span>
                <select
                    v-if="isEditing"
                    v-model="selectedIncident.reportedBy"
                    @change="handleFieldChange('reportedBy', $event.target.value)"
                    @click="handleFieldClick('reportedBy')"
                    class="meta-select"
                >
                  <option v-for="option in personnelOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <span
                    v-else
                    @click="handleFieldClick('reportedBy')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  <template v-if="reportedByPersonnel">
                    {{ reportedByPersonnel.name }} {{ reportedByPersonnel.lastname }}
                  </template>
                  <template v-else>
                    {{ $t('incidents.noReporter', 'No reporter') }}
                  </template>
                </span>
              </div>

              <!-- Fecha de Ocurrencia (EDITABLE) -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('incidents.occurredAt', 'Occurred At') }}</span>
                <input
                    v-if="isEditing"
                    v-model="selectedIncident.occurredAt"
                    @input="handleFieldChange('occurredAt', $event.target.value)"
                    @click="handleFieldClick('occurredAt')"
                    type="datetime-local"
                    class="meta-input"
                />
                <span
                    v-else
                    @click="handleFieldClick('occurredAt')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ formatDateTime(selectedIncident.occurredAt) }}
                </span>
              </div>

              <!-- Notas -->
              <div class="meta-item full-width">
                <span class="meta-label">{{ $t('incidents.notes', 'Notes') }}</span>
                <textarea
                    v-if="isEditing"
                    v-model="selectedIncident.notes"
                    @input="handleFieldChange('notes', $event.target.value)"
                    @click="handleFieldClick('notes')"
                    class="meta-textarea"
                    :placeholder="$t('incidents.notes', 'Notes')"
                    rows="3"
                />
                <span
                    v-else
                    @click="handleFieldClick('notes')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ selectedIncident.notes || '-' }}
                </span>
              </div>

              <!-- Fecha de Registro (READ ONLY) -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('incidents.registerDate', 'Register Date') }}</span>
                <span class="meta-value readonly">{{ formatDateTime(selectedIncident.registerDate || '2025-07-07T15:06:59.283623') }}</span>
              </div>

              <!-- Creado En (READ ONLY) -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('incidents.createdAt', 'Created At') }}</span>
                <span class="meta-value readonly">{{ formatDateTime(selectedIncident.createdAt || selectedIncident.updatedAt || '2025-07-07T15:55:00.053343') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen de estado -->
        <div class="incident-summary" v-if="selectedIncident">
          <div class="summary-item">
            <span class="label">{{ $t('incidents.severity', 'Severity') }}</span>
            <span class="value" :class="selectedIncident.severity === 'CRITICO' ? 'critical' : 'normal'">
      {{ formatSeverity(selectedIncident.severity) }}
    </span>
          </div>
          <div class="summary-item">
            <span class="label">{{ $t('incidents.status', 'Status') }}</span>
            <span class="value" :class="selectedIncident.status === 'RESUELTO' ? 'resolved' : 'open'">
      {{ formatStatus(selectedIncident.status) }}
    </span>
          </div>
          <div class="summary-item">
            <span class="label">{{ $t('incidents.assignment', 'Assignment') }}</span>
            <span class="value" :class="selectedIncident.assignedTo ? 'assigned' : 'unassigned'">
      {{ selectedIncident.assignedTo ? $t('incidents.assigned', 'Assigned') : $t('incidents.unassigned', 'Unassigned') }}
    </span>
          </div>
        </div>
      </div>
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
.incident-form {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

/* ========== VISTA DE LISTA ========== */
.list-view {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.header-left .page-title {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #333;
}

.header-left .page-subtitle {
  margin: 0;
  color: #666;
  font-size: 1.125rem;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
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

.filters-section {
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.filter-group {
  display: flex;
  gap: 1.5rem;
  align-items: end;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.filter-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-select label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.filter-select select {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.875rem;
  min-width: 150px;
  background: white;
  color: #333;
}

.filter-select select:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.2);
}

.incident-table-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
}

.incident-table {
  border-radius: 8px;
  overflow: hidden;
}

/* ========== VISTA DE DETALLE ========== */
.detail-view {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.detail-header {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
}

.header-back {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.edit-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.incident-info {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2rem;
}

/* IMAGEN MÁS GRANDE */
.incident-avatar {
  width: 350px;
  height: 500px;
  border-radius: 20px;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid #e9ecef;
  flex-shrink: 0;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 3rem;
  font-weight: 600;
  color: #666;
}

/* DATOS EDITABLES */
.incident-details {
  flex: 1;
}

.incident-title-section {
  margin-bottom: 1.5rem;
}

.incident-title {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.incident-title.editable-field:hover {
  color: #FF5F01;
  transform: translateX(5px);
}

.editable-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #333;
  border: 2px solid #FF5F01;
  border-radius: 8px;
  padding: 0.5rem;
  background: #fff;
  width: 100%;
  margin: 0;
}

.editable-title:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 95, 1, 0.2);
}

.incident-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.meta-item {
  background: #f8f9fa;
  padding: 1.25rem 1.5rem;
  border-radius: 10px;
  border-left: 4px solid #FF5F01;
  transition: all 0.2s ease;
}

.meta-item.full-width {
  grid-column: 1 / -1;
}

.meta-item:hover {
  background: #f1f3f4;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.meta-label {
  display: block;
  font-size: 0.75rem;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.meta-value {
  display: block;
  font-size: 1.125rem;
  font-weight: 600;
  color: #302f2f;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.meta-value.editable-field {
  border: 2px dashed transparent;
  padding: 0.25rem;
  border-radius: 4px;
}

.meta-value.editable-field:hover {
  border-color: #FF5F01;
  background: rgba(255, 95, 1, 0.05);
  color: #FF5F01;
}

.meta-value.readonly {
  cursor: default;
  opacity: 0.7;
}

.meta-value.readonly:hover {
  border-color: transparent;
  background: transparent;
  color: #333;
}

/* CAMPOS DE ENTRADA EDITABLES */
.meta-input,
.meta-select,
.meta-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #FF5F01;
  border-radius: 6px;
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  background: white;
  transition: all 0.2s ease;
}

.meta-input:focus,
.meta-select:focus,
.meta-textarea:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 95, 1, 0.2);
  border-color: #FF5F01;
}

.meta-textarea {
  resize: vertical;
  min-height: 80px;
}

.incident-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(26, 32, 44, 0) 0%, rgba(45, 55, 72, 0.01) 100%);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0);
  position: relative;
  overflow: hidden;
}

.incident-summary::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #FF5F01, #ff7a2b, #06b6d4, #22c55e);
  border-radius: 16px 16px 0 0;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(45, 55, 72, 0.02) 0%, rgba(26, 32, 44, 0.01) 100%);
  border-radius: 12px;
  box-shadow:
      0 4px 15px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.summary-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--item-color, #FF5F01);
  border-radius: 12px 12px 0 0;
}

.summary-item:hover {
  transform: translateY(-3px);
  box-shadow:
      0 8px 25px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.01);
  border-color: rgba(255, 255, 255, 0.1);
}

.summary-item .label {
  font-size: 0.875rem;
  color: #a0aec0;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.75rem;
  line-height: 1;
}

.summary-item .value {
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1;
  color: var(--item-color, #e2e8f0);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.summary-item:has(.value.critical) {
  --item-color: #ef4444;
}

.summary-item:has(.value.normal) {
  --item-color: #22c55e;
}

.summary-item:has(.value.resolved) {
  --item-color: #10b981;
}

.summary-item:has(.value.open) {
  --item-color: #f59e0b;
}

.summary-item:has(.value.assigned) {
  --item-color: #3b82f6;
}

.summary-item:has(.value.unassigned) {
  --item-color: #6b7280;
}

.value.critical {
  color: #ef4444;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.value.normal {
  color: #22c55e;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.value.resolved {
  color: #10b981;
  background: linear-gradient(135deg, #10b981, #059669);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.value.open {
  color: #f59e0b;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.value.assigned {
  color: #3b82f6;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.value.unassigned {
  color: #6b7280;
  background: linear-gradient(135deg, #6b7280, #4b5563);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: #666;
  text-align: center;
  background: white;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.empty-state i {
  font-size: 4rem;
  color: #FF5F01;
  margin-bottom: 1.5rem;
  opacity: 0.7;
}

.empty-state h3 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.empty-state p {
  margin: 0;
  color: #666;
  font-size: 1rem;
}

/* ========== RESPONSIVE ========== */
@media (max-width: 1400px) {
  .manager-header {
    padding: 1.5rem;
  }

  .incident-avatar {
    width: 300px;
    height: 400px;
  }

  .incident-meta {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

@media (max-width: 1200px) {
  .list-view, .detail-view {
    padding: 1.5rem;
  }

  .manager-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .header-controls {
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .incident-avatar {
    width: 250px;
    height: 300px;
  }

  .incident-title,
  .editable-title {
    font-size: 2rem;
  }

  .incident-meta {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .incident-summary {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 992px) {
  .list-view, .detail-view {
    padding: 1rem;
  }

  .manager-header {
    padding: 1rem;
  }

  .header-left .page-title {
    font-size: 1.75rem;
  }

  .header-left .page-subtitle {
    font-size: 1rem;
  }

  .header-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .filters-section {
    padding: 1rem;
  }

  .filter-group {
    flex-direction: column;
    gap: 1rem;
  }

  .filter-select {
    width: 100%;
  }

  .filter-select select {
    width: 100%;
    min-width: auto;
  }

  .incident-table-section {
    padding: 1rem;
    overflow-x: auto;
  }

  .incident-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.5rem;
  }

  .incident-avatar {
    width: 200px;
    height: 250px;
  }

  .incident-details {
    width: 100%;
  }

  .incident-title,
  .editable-title {
    font-size: 1.75rem;
    text-align: center;
  }

  .incident-meta {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .meta-item {
    padding: 1rem;
  }

  .meta-value,
  .meta-input,
  .meta-select,
  .meta-textarea {
    font-size: 1rem;
  }

  .incident-summary {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    padding: 1.5rem;
  }

  .summary-item .value {
    font-size: 1.75rem;
  }
}

@media (max-width: 768px) {
  .list-view, .detail-view {
    padding: 0.75rem;
  }

  .manager-header {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 8px;
  }

  .header-left .page-title {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .header-left .page-subtitle {
    font-size: 0.875rem;
  }

  .filters-section {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 8px;
  }

  .incident-table-section {
    border-radius: 8px;
    padding: 0.75rem;
  }

  .detail-header {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 8px;
  }

  .header-back {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .edit-actions {
    justify-content: space-between;
  }

  .incident-avatar {
    width: 150px;
    height: 200px;
    border-radius: 12px;
  }

  .avatar-placeholder {
    font-size: 2.5rem;
  }

  .incident-title,
  .editable-title {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .incident-meta {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .meta-item {
    padding: 0.75rem 1rem;
  }

  .meta-label {
    font-size: 0.625rem;
  }

  .meta-value,
  .meta-input,
  .meta-select,
  .meta-textarea {
    font-size: 0.875rem;
  }

  .incident-summary {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 1rem;
  }

  .summary-item {
    flex-direction: row;
    justify-content: space-between;
    background: white;
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid #FF5F01;
  }

  .summary-item .label {
    font-size: 0.75rem;
    text-align: left;
  }

  .summary-item .value {
    font-size: 1.5rem;
  }

  .empty-state {
    padding: 2rem 1rem;
    border-radius: 8px;
  }

  .empty-state i {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    font-size: 1.25rem;
  }

  .empty-state p {
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .list-view, .detail-view {
    padding: 0.5rem;
  }

  .manager-header,
  .filters-section,
  .incident-table-section,
  .detail-header {
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    border-radius: 6px;
  }

  .header-left .page-title {
    font-size: 1.25rem;
  }

  .header-left .page-subtitle {
    font-size: 0.75rem;
  }

  .incident-avatar {
    width: 120px;
    height: 160px;
    border-radius: 8px;
  }

  .avatar-placeholder {
    font-size: 2rem;
  }

  .incident-title,
  .editable-title {
    font-size: 1.25rem;
  }

  .meta-item {
    padding: 0.5rem 0.75rem;
  }

  .incident-summary {
    padding: 0.75rem;
  }

  .summary-item {
    padding: 0.75rem;
  }

  .summary-item .value {
    font-size: 1.25rem;
  }
}

/* ========== HOVER EFFECTS ========== */
:deep(.incident-table .p-datatable-tbody > tr:hover) {
  background-color: rgba(255, 95, 1, 0.05) !important;
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.incident-table .p-datatable-tbody > tr) {
  transition: all 0.2s ease;
}

/* ========== ANIMACIONES ========== */
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

/* ========== EFECTOS DE EDICIÓN ========== */
.editable-field {
  position: relative;
}

/* Transición suave entre modo edición y visualización */
.meta-value,
.meta-input,
.meta-select,
.meta-textarea {
  transition: all 0.3s ease;
}

/* Indicador de cambios pendientes */
.has-changes {
  border-left: 4px solid #f59e0b !important;
  background: rgba(245, 158, 11, 0.1) !important;
}

/* Loading state para guardar */
.saving-overlay {
  position: relative;
}

.saving-overlay::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  border-radius: inherit;
  z-index: 10;
}

.saving-overlay::after {
  content: 'Guardando...';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1rem;
  font-weight: 600;
  z-index: 11;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.image-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.clickeable-avatar {
  cursor: pointer;
  transition: all 0.3s ease;
}

.clickeable-avatar:hover {
  transform: scale(1.02);
  box-shadow: 0 12px 30px rgba(255, 95, 1, 0.3);
  border-color: #FF5F01;
}

.clickeable-avatar:hover .avatar-placeholder {
  color: #FF5F01;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.summary-item {
  animation: fadeInUp 0.5s ease-out;
}

.summary-item:nth-child(1) { animation-delay: 0.1s; }
.summary-item:nth-child(2) { animation-delay: 0.2s; }
.summary-item:nth-child(3) { animation-delay: 0.3s; }
</style>