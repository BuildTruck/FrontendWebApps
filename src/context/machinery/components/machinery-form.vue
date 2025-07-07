<script>
import AppButton from "../../../core/components/AppButton.vue";
import AppTable from "../../../core/components/AppTable.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import { MachineryEntity } from "../models/machinery.entity.js";
import { MachineryApiService } from "../services/machinery-api.service.js";
import { PersonnelApiService } from "../../personnel/services/personnel-api.service.js";
import ExportButton from '../../../core/exports/components/ExportButton.vue'
export default {
  name: 'MachineryForm',
  components: {
    AppButton,
    AppTable,
    AppNotification,
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
      allMachinery: [],
      selectedMachine: null,
      personnel: [],
      availableOperators: [],
      loading: false,

      // Filtros
      filters: {
        search: '',
        type: 'ALL',
        status: 'ALL',
        assignment: 'ALL'
      },

      // Notificaciones
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',

      // Servicios
      machineryService: new MachineryApiService(),
      personnelService: new PersonnelApiService()
    };
  },

  computed: {
    // Tipos de maquinaria disponibles
    availableTypes() {
      const types = new Set();
      this.allMachinery.forEach(machine => {
        if (machine.machineryType) {
          types.add(machine.machineryType);
        }
      });
      return Array.from(types).sort();
    },

    // Opciones de tipos para select
    machineryTypeOptions() {
      return MachineryEntity.MACHINERY_TYPES.map(type => ({
        value: type.value,
        label: this.$t(`machinery.type${type.value}`, type.label)
      }));
    },

    // Opciones de status para select
    statusOptions() {
      return MachineryEntity.STATUSES.map(status => ({
        value: status.value,
        label: this.$t(`machinery.status${status.value}`, status.label)
      }));
    },

    // Opciones de operadores para select
    operatorOptions() {
      return [
        { value: null, label: this.$t('machinery.noOperator', 'No operator') },
        ...this.availableOperators.map(operator => ({
          value: operator.id,
          label: `${operator.name} ${operator.lastname}`
        }))
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
    machineryTableColumns() {
      return [
        { field: 'name', header: this.$t('machinery.name', 'Name'), sortable: true, style: 'min-width: 200px' },
        { field: 'licensePlate', header: this.$t('machinery.licensePlate', 'License Plate'), sortable: true, style: 'width: 140px' },
        { field: 'machineryTypeLabel', header: this.$t('machinery.machineryType', 'Type'), sortable: true, style: 'min-width: 150px' },
        { field: 'statusDisplay', header: this.$t('machinery.status', 'Status'), sortable: true, style: 'width: 120px' },
        { field: 'provider', header: this.$t('machinery.provider', 'Provider'), sortable: true, style: 'min-width: 150px' },
        { field: 'assignmentDisplay', header: this.$t('machinery.assignedOperator', 'Operator'), sortable: false, style: 'width: 140px; text-align: center;' },
        { field: 'registerDate', header: this.$t('machinery.registerDate', 'Register Date'), sortable: true, style: 'width: 120px' }
      ];
    },

    formattedMachineryData() {
      return this.filteredMachinery.map(machine => ({
        ...machine,
        machineryTypeLabel: this.getMachineryTypeLabel(machine.machineryType),
        statusDisplay: this.formatStatus(machine.status),
        assignmentDisplay: machine.personnelId ? this.$t('machinery.operatorAssigned', 'Operator Assigned') : this.$t('machinery.noOperator', 'No Operator'),
        registerDate: this.formatDate(machine.registerDate)
      }));
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
    },

    // Información del operador asignado
    assignedOperator() {
      if (!this.selectedMachine || !this.selectedMachine.personnelId) {
        return null;
      }
      return this.personnel.find(p => p.id === this.selectedMachine.personnelId);
    },

    // Modificar este computed existente:
    canEdit() {
      return this.allowEditing && !this.readonly && (this.selectedMachine || this.isAddingNew);
    }
  },

  async mounted() {
    await this.loadMachinery();
    await this.loadPersonnel();
    await this.loadAvailableOperators();
    if (this.isAddingNew) {
      this.selectedMachine = new MachineryEntity({ projectId: this.projectId });
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
      this.originalData = { ...this.selectedMachine };

      console.log('Editing mode enabled for:', this.selectedMachine.name);
    },

    detectChanges() {
      if (!this.isEditing || !this.originalData) return;

      const currentData = this.selectedMachine;
      const originalData = this.originalData;

      this.hasChanges = (
          currentData.name !== originalData.name ||
          currentData.licensePlate !== originalData.licensePlate ||
          currentData.provider !== originalData.provider ||
          currentData.description !== originalData.description ||
          currentData.status !== originalData.status ||
          currentData.machineryType !== originalData.machineryType ||
          currentData.personnelId !== originalData.personnelId ||
          currentData.imageFile !== null ||
          currentData.removeImage === true
      );
    },

    async saveChanges() {
      if (!this.hasChanges || this.isSaving) return;

      try {
        this.isSaving = true;

        // Validar datos
        const validation = this.selectedMachine.validate();
        if (!validation.isValid) {
          this.showNotificationMessage(
              `${this.$t('common.validationError', 'Validation Error')}: ${validation.errors.join(', ')}`,
              'error'
          );
          return;
        }

        console.log('Saving changes for machinery:', this.selectedMachine.id);


        let updatedMachine;
        if (this.selectedMachine.id) {
          // Actualizar existente
          updatedMachine = await this.machineryService.update(
              this.selectedMachine.id,
              this.selectedMachine
          );
        } else {
          // Crear nueva
          updatedMachine = await this.machineryService.create(this.selectedMachine);
        }

        // Actualizar en la lista local
        const index = this.allMachinery.findIndex(m => m.id === updatedMachine.id);
        if (index !== -1) {
          this.allMachinery[index] = updatedMachine;
        }

        // Actualizar máquina seleccionada
        this.selectedMachine = updatedMachine;

        // Resetear estado de edición
        this.isEditing = false;
        this.hasChanges = false;
        this.originalData = null;

        const successMessage = this.selectedMachine.id
            ? this.$t('machinery.updatedSuccessfully', 'Machinery updated successfully')
            : this.$t('machinery.createdSuccessfully', 'Machinery created successfully');

        this.showNotificationMessage(successMessage, 'success');

      } catch (error) {
        console.error('💥 Error saving changes:', error);
        this.showNotificationMessage(
            this.$t('machinery.errorSaving', 'Error saving changes'),
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
        Object.assign(this.selectedMachine, this.originalData);
      }

      this.isEditing = false;
      this.hasChanges = false;
      this.originalData = null;

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

      this.selectedMachine[fieldName] = value;
      this.detectChanges();
    },

    // ========== MÉTODOS ORIGINALES ==========

    async loadMachinery() {
      this.loading = true;
      try {
        this.allMachinery = await this.machineryService.getByProject(this.projectId);
      } catch (error) {
        console.error('Error loading machinery:', error);
        this.showNotificationMessage(
            this.$t('machinery.errorLoading', 'Error loading machinery'),
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

    async loadAvailableOperators() {
      try {
        // Usar PersonnelApiService.getByProject() como en la versión anterior
        this.availableOperators = await this.personnelService.getByProject(this.projectId);
        console.log('Available operators loaded:', this.availableOperators);
      } catch (error) {
        console.error('Error loading available operators:', error);
        this.availableOperators = [];
      }
    },

    handleMachineryClick(event) {
      if (event.data && event.data.id) {
        const machine = this.allMachinery.find(m => m.id === event.data.id);
        if (machine) {
          this.selectedMachine = machine;
          this.currentView = 'detail';

          // Resetear estado de edición al cambiar de máquina
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
      this.selectedMachine = null;
      this.isEditing = false;
      this.hasChanges = false;
      this.originalData = null;
    },

    getMachineInitials(machine) {
      const name = machine.name || '';
      const licensePlate = machine.licensePlate || '';
      if (name.length >= 2) {
        return name.substring(0, 2).toUpperCase();
      }
      return licensePlate.substring(0, 2).toUpperCase();
    },

    getMachineryTypeLabel(type) {
      const typeOption = this.machineryTypeOptions.find(option => option.value === type);
      return typeOption ? typeOption.label : type;
    },

    formatStatus(status) {
      const statusOption = this.statusOptions.find(option => option.value === status);
      return statusOption ? statusOption.label : status;
    },

    formatDate(date) {
      if (!date) return '-';
      try {
        return new Date(date).toLocaleDateString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (error) {
        return String(date);
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

    onExportComplete(result) {
      this.showNotificationMessage(
          this.$t('machinery.exportedSuccessfully', 'Exported successfully'),
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
      this.selectedMachine.imageFile = file;

      // Limpiar preview anterior de esta máquina
      if (this.imagePreviewUrls[this.selectedMachine.id]) {
        URL.revokeObjectURL(this.imagePreviewUrls[this.selectedMachine.id]);
      }

      // Crear preview URL específico para esta máquina
      this.imagePreviewUrls[this.selectedMachine.id] = URL.createObjectURL(file);

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
      if (this.selectedMachine) {
        this.selectedMachine.imageFile = null;
        this.selectedMachine.removeImage = true;
        this.selectedMachine.image = null;
      }

      // Si está en modo edición, detectar cambios
      if (this.isEditing) {
        this.detectChanges();
      }
    },

    getMachineImageUrl() {
      // Prioridad: preview específico de esta máquina > imagen existente
      const machineId = this.selectedMachine?.id;
      return this.imagePreviewUrls[machineId] || this.selectedMachine?.image || null;
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
  <div class="machinery-form">
    <!-- Vista de Lista -->
    <div v-if="currentView === 'list'" class="list-view">
      <!-- Header con controles -->
      <div class="manager-header">
        <div class="header-left">

          <p class="page-subtitle">{{ $t('machinery.viewMachineryDetails', 'View machinery details and information') }}</p>
        </div>

        <ExportButton
            :data="filteredMachinery"
            type="machinery"
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
            <div class="stat-label">{{ $t('machinery.totalMachinery', 'Total Machinery') }}</div>
          </div>
          <i class="pi pi-cog stat-icon"></i>
        </div>

        <div class="stat-card active">
          <div class="stat-content">
            <div class="stat-number">{{ stats.active }}</div>
            <div class="stat-label">{{ $t('machinery.activeMachinery', 'Active') }}</div>
          </div>
          <i class="pi pi-check-circle stat-icon"></i>
        </div>

        <div class="stat-card assigned">
          <div class="stat-content">
            <div class="stat-number">{{ stats.assigned }}</div>
            <div class="stat-label">{{ $t('machinery.assignedMachinery', 'Assigned') }}</div>
          </div>
          <i class="pi pi-user stat-icon"></i>
        </div>

        <div class="stat-card available">
          <div class="stat-content">
            <div class="stat-number">{{ stats.available }}</div>
            <div class="stat-label">{{ $t('machinery.availableMachinery', 'Available') }}</div>
          </div>
          <i class="pi pi-circle stat-icon"></i>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filters-section">
        <div class="filter-group">
          <div class="filter-select">
            <label>{{ $t('machinery.filterByType', 'Filter by Type') }}:</label>
            <select v-model="filters.type">
              <option value="ALL">{{ $t('machinery.allTypes', 'All Types') }}</option>
              <option v-for="type in availableTypes" :key="type" :value="type">
                {{ getMachineryTypeLabel(type) }}
              </option>
            </select>
          </div>

          <div class="filter-select">
            <label>{{ $t('machinery.filterByStatus', 'Filter by Status') }}:</label>
            <select v-model="filters.status">
              <option value="ALL">{{ $t('machinery.allStatuses', 'All Statuses') }}</option>
              <option value="ACTIVE">{{ $t('machinery.statusACTIVE', 'Active') }}</option>
              <option value="MAINTENANCE">{{ $t('machinery.statusMAINTENANCE', 'Maintenance') }}</option>
            </select>
          </div>

          <div class="filter-select">
            <label>{{ $t('machinery.filterByAssignment', 'Filter by Assignment') }}:</label>
            <select v-model="filters.assignment">
              <option value="ALL">{{ $t('machinery.showAll', 'Show All') }}</option>
              <option value="ASSIGNED">{{ $t('machinery.showAssigned', 'Assigned') }}</option>
              <option value="AVAILABLE">{{ $t('machinery.available', 'Available') }}</option>
            </select>
          </div>

          <AppButton
              :label="$t('machinery.clearFilters', 'Clear Filters')"
              icon="pi pi-filter-slash"
              variant="secondary"
              @click="clearFilters"
          />
        </div>
      </div>

      <!-- Tabla de maquinaria -->
      <div v-if="!loading && filteredMachinery.length > 0" class="machinery-table-section">
        <AppTable
            :columns="machineryTableColumns"
            :data="formattedMachineryData"
            :loading="loading"
            :paginator="true"
            :rows="15"
            :show-export-button="false"
            :show-filter-button="false"
            data-key="id"
            @row-click="handleMachineryClick"
            class="machinery-table"
            :row-hover="true"
        />
      </div>

      <!-- Estado sin datos -->
      <div v-else-if="!loading && filteredMachinery.length === 0" class="empty-state">
        <i class="pi pi-cog"></i>
        <h3>{{ $t('machinery.noMachineryFound', 'No machinery found') }}</h3>
        <p>{{ $t('machinery.tryAdjustingFilters', 'Try adjusting your filters') }}</p>
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

        <div class="machine-info" v-if="selectedMachine">
          <div class="machine-avatar"
               :class="{ 'clickeable-avatar': canEdit }"
               @click="canEdit ? $refs.imageInput.click() : null"
               :title="canEdit ? $t('machinery.clickToChangeImage', 'Click to change image') : ''">
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
            <img v-if="getMachineImageUrl()"
                 :src="getMachineImageUrl()"
                 :alt="selectedMachine.name"
                 class="avatar-image" />
            <div v-else class="avatar-placeholder">
              {{ getMachineInitials(selectedMachine) }}
            </div>
          </div>


          <!-- Todos los datos de la maquinaria EDITABLES -->
          <div class="machine-details">
            <!-- Nombre de la máquina (EDITABLE) -->
            <div class="machine-title-section">
              <input
                  v-if="isEditing"
                  v-model="selectedMachine.name"
                  @input="handleFieldChange('name', $event.target.value)"
                  @click="handleFieldClick('name')"
                  class="editable-title"
                  :placeholder="$t('machinery.name', 'Name')"
              />
              <span
                  v-else
                  @click="handleFieldClick('name')"
                  :class="['machine-title', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                  {{ selectedMachine.name }}
                </span>
            </div>

            <!-- Grid de información EDITABLE -->
            <div class="machine-meta">
              <!-- License Plate -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('machinery.licensePlate', 'License Plate') }}</span>
                <input
                    v-if="isEditing"
                    v-model="selectedMachine.licensePlate"
                    @input="handleFieldChange('licensePlate', $event.target.value)"
                    @click="handleFieldClick('licensePlate')"
                    class="meta-input"
                    :placeholder="$t('machinery.licensePlate', 'License Plate')"
                />
                <span
                    v-else
                    @click="handleFieldClick('licensePlate')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ selectedMachine.licensePlate }}
                </span>
              </div>

              <!-- Machinery Type -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('machinery.machineryType', 'Type') }}</span>
                <select
                    v-if="isEditing"
                    v-model="selectedMachine.machineryType"
                    @change="handleFieldChange('machineryType', $event.target.value)"
                    @click="handleFieldClick('machineryType')"
                    class="meta-select"
                >
                  <option v-for="option in machineryTypeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <span
                    v-else
                    @click="handleFieldClick('machineryType')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ getMachineryTypeLabel(selectedMachine.machineryType) }}
                </span>
              </div>

              <!-- Status -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('machinery.status', 'Status') }}</span>
                <select
                    v-if="isEditing"
                    v-model="selectedMachine.status"
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
                  {{ formatStatus(selectedMachine.status) }}
                </span>
              </div>

              <!-- Provider -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('machinery.provider', 'Provider') }}</span>
                <input
                    v-if="isEditing"
                    v-model="selectedMachine.provider"
                    @input="handleFieldChange('provider', $event.target.value)"
                    @click="handleFieldClick('provider')"
                    class="meta-input"
                    :placeholder="$t('machinery.provider', 'Provider')"
                />
                <span
                    v-else
                    @click="handleFieldClick('provider')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ selectedMachine.provider || '-' }}
                </span>
              </div>

              <!-- Description -->
              <div class="meta-item full-width">
                <span class="meta-label">{{ $t('machinery.description', 'Description') }}</span>
                <textarea
                    v-if="isEditing"
                    v-model="selectedMachine.description"
                    @input="handleFieldChange('description', $event.target.value)"
                    @click="handleFieldClick('description')"
                    class="meta-textarea"
                    :placeholder="$t('machinery.description', 'Description')"
                    rows="3"
                />
                <span
                    v-else
                    @click="handleFieldClick('description')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ selectedMachine.description || '-' }}
                </span>
              </div>

              <!-- Assigned Operator -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('machinery.assignedOperator', 'Assigned Operator') }}</span>
                <select
                    v-if="isEditing"
                    v-model="selectedMachine.personnelId"
                    @change="handleFieldChange('personnelId', $event.target.value)"
                    @click="handleFieldClick('personnelId')"
                    class="meta-select"
                >
                  <option v-for="option in operatorOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <span
                    v-else
                    @click="handleFieldClick('personnelId')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  <template v-if="assignedOperator">
                    {{ assignedOperator.name }} {{ assignedOperator.lastname }}
                  </template>
                  <template v-else>
                    {{ $t('machinery.noOperator', 'No operator assigned') }}
                  </template>
                </span>
              </div>

              <!-- Register Date (READ ONLY) -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('machinery.registerDate', 'Register Date') }}</span>
                <span class="meta-value readonly">{{ formatDate(selectedMachine.registerDate) }}</span>
              </div>

              <!-- Created At (READ ONLY) -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('machinery.createdAt', 'Created At') }}</span>
                <span class="meta-value readonly">{{ formatDate(selectedMachine.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>



        <!-- Resumen de estado -->
        <div class="machine-summary" v-if="selectedMachine">
          <div class="summary-item">
            <span class="label">{{ $t('machinery.status', 'Status') }}</span>
            <span class="value" :class="selectedMachine.isActive() ? 'active' : 'inactive'">
              {{ formatStatus(selectedMachine.status) }}
            </span>
          </div>
          <div class="summary-item">
            <span class="label">{{ $t('machinery.assignment', 'Assignment') }}</span>
            <span class="value" :class="selectedMachine.isAssigned() ? 'assigned' : 'available'">
              {{ selectedMachine.isAssigned() ? $t('machinery.assigned', 'Assigned') : $t('machinery.available', 'Available') }}
            </span>
          </div>
          <div class="summary-item">
            <span class="label">{{ $t('machinery.provider', 'Provider') }}</span>
            <span class="value provider">{{ selectedMachine.provider || '-' }}</span>
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
.machinery-form {
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

.machinery-table-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
}

.machinery-table {
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

.machine-info {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2rem;
}

/* IMAGEN MÁS GRANDE */
.machine-avatar {
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
.machine-details {
  flex: 1;
}

.machine-title-section {
  margin-bottom: 1.5rem;
}

.machine-title {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.machine-title.editable-field:hover {
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

.machine-meta {
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
  color: #423d3d;
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
  color: #494e49;
}

.edit-icon {
  font-size: 0.875rem;
  margin-left: 0.5rem;
  opacity: 0.6;
  transition: opacity 0.2s ease;
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

.machine-summary {
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
.machine-summary::before {
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
      0 4px 15px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
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
      0 8px 25px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
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
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}

.summary-item:has(.value.active) {
  --item-color: #22c55e;
}

.summary-item:has(.value.inactive) {
  --item-color: #ef4444;
}

.summary-item:has(.value.assigned) {
  --item-color: #f59e0b;
}

.summary-item:has(.value.available) {
  --item-color: #0a6477;
}

.summary-item:has(.value.provider) {
  --item-color: #3b82f6;
}

.value.active {
  color: #22c55e;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.value.inactive {
  color: #ef4444;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.value.assigned {
  color: #f59e0b;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.value.available {
  color: #06b6d4;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.value.provider {
  color: #3b82f6;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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

  .machine-avatar {
    width: 300px;
    height: 400px;
  }

  .machine-meta {
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

  .machine-avatar {
    width: 250px;
    height: 300px;
  }

  .machine-title,
  .editable-title {
    font-size: 2rem;
  }

  .machine-meta {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .machine-summary {
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

  .machinery-table-section {
    padding: 1rem;
    overflow-x: auto;
  }

  .machine-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.5rem;
  }

  .machine-avatar {
    width: 200px;
    height: 250px;
  }

  .machine-details {
    width: 100%;
  }

  .machine-title,
  .editable-title {
    font-size: 1.75rem;
    text-align: center;
  }

  .machine-meta {
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

  .machine-summary {
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

  .machinery-table-section {
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

  .machine-avatar {
    width: 150px;
    height: 200px;
    border-radius: 12px;
  }

  .avatar-placeholder {
    font-size: 2.5rem;
  }

  .machine-title,
  .editable-title {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .machine-meta {
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

  .machine-summary {
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
  .machinery-table-section,
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

  .machine-avatar {
    width: 120px;
    height: 160px;
    border-radius: 8px;
  }

  .avatar-placeholder {
    font-size: 2rem;
  }

  .machine-title,
  .editable-title {
    font-size: 1.25rem;
  }

  .meta-item {
    padding: 0.5rem 0.75rem;
  }

  .machine-summary {
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
:deep(.machinery-table .p-datatable-tbody > tr:hover) {
  background-color: rgba(255, 95, 1, 0.05) !important;
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.machinery-table .p-datatable-tbody > tr) {
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

@media (max-width: 768px) {
  .machine-summary {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    padding: 1.5rem;
  }

  .summary-item {
    padding: 1rem;
  }

  .summary-item .value {
    font-size: 1.75rem;
  }
}

@media (max-width: 480px) {
  .machine-summary {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 1rem;
  }

  .summary-item .value {
    font-size: 1.5rem;
  }
}
</style>