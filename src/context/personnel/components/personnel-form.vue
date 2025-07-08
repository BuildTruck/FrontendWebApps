<script>
import AppButton from '../../../core/components/AppButton.vue';
import AppInput from '../../../core/components/AppInput.vue';
import AppNotification from '../../../core/components/AppNotification.vue';
import { Personnel } from '../models/personnel.entity.js';
import { PersonnelApiService } from '../services/personnel-api.service.js';

export default {
  name: 'PersonnelForm',
  components: {
    AppButton,
    AppInput,
    AppNotification
  },
  props: {
    personnel: {
      type: Object,
      default: null
    },
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
      default: true
    },
    isAddingNew: {
      type: Boolean,
      default: false
    }
  },
  emits: ['save', 'cancel'],
  data() {
    return {
      // Estado de edición
      isEditing: false,
      hasChanges: false,
      originalData: null,
      loading: false,

      // Manejo de imágenes
      imagePreviewUrls: {},

      // Datos
      localPersonnel: new Personnel(),
      banks: [],
      departments: [],
      currentProjectId: null,

      // Notifications
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',

      // Validations
      errors: {},

      // Service
      personnelService: new PersonnelApiService()
    };
  },
  computed: {
    isEditingRecord() {
      return this.personnel && this.personnel.id;
    },

    personnelTypeOptions() {
      return [
        { value: 'TECHNICAL', label: this.$t('personnel.typeTechnical', 'Technical') },
        { value: 'SPECIALIST', label: this.$t('personnel.typeSpecialist', 'Specialist') },
        { value: 'ADMINISTRATIVE', label: this.$t('personnel.typeAdministrative', 'Administrative') },
        { value: 'RENTED_OPERATOR', label: this.$t('personnel.typeRentedOperator', 'Rented Operator') },
        { value: 'LABORER', label: this.$t('personnel.typeLaborer', 'Laborer') }
      ];
    },

    statusOptions() {
      return [
        { value: 'ACTIVE', label: this.$t('personnel.statusActive', 'Active') },
        { value: 'INACTIVE', label: this.$t('personnel.statusInactive', 'Inactive') },
        { value: 'PENDING', label: this.$t('personnel.statusPending', 'Pending') },
        { value: 'SUSPENDED', label: this.$t('personnel.statusSuspended', 'Suspended') },
        { value: 'FINISHED', label: this.$t('personnel.statusFinished', 'Finished') }
      ];
    },

    bankOptions() {
      return this.personnelService.getBanks();
    },

    canEdit() {
      return this.allowEditing && !this.readonly;
    }
  },
  watch: {
    personnel: {
      handler(newData) {
        this.initializeForm();
      },
      immediate: true,
      deep: true
    }
  },
  async mounted() {
    await this.initializeForm();
    if (this.isAddingNew) {
      this.startEditing();
    }
  },
  methods: {
    // ========== MÉTODOS DE EDICIÓN ==========
    startEditing() {
      if (!this.canEdit || this.isEditing) return;

      this.isEditing = true;
      this.hasChanges = false;
      this.originalData = { ...this.localPersonnel };

      console.log('Editing mode enabled for:', this.localPersonnel.name);
    },

    detectChanges() {
      if (!this.isEditing || !this.originalData) return;

      const currentData = this.localPersonnel;
      const originalData = this.originalData;

      this.hasChanges = (
          currentData.name !== originalData.name ||
          currentData.lastname !== originalData.lastname ||
          currentData.documentNumber !== originalData.documentNumber ||
          currentData.position !== originalData.position ||
          currentData.department !== originalData.department ||
          currentData.personnelType !== originalData.personnelType ||
          currentData.status !== originalData.status ||
          currentData.phone !== originalData.phone ||
          currentData.email !== originalData.email ||
          currentData.monthlyAmount !== originalData.monthlyAmount ||
          currentData.discount !== originalData.discount ||
          currentData.bank !== originalData.bank ||
          currentData.accountNumber !== originalData.accountNumber ||
          currentData.startDate !== originalData.startDate ||
          currentData.endDate !== originalData.endDate ||
          currentData.avatar !== originalData.avatar
      );
    },

    async saveChanges() {
      if (!this.hasChanges || this.loading) return;

      try {
        this.loading = true;

        // Validar datos
        const validation = await this.validateForm();
        if (!validation) {
          this.showNotificationMessage(this.$t('personnel.validationErrors', 'Validation errors'), 'error');
          return;
        }

        console.log('Saving changes for personnel:', this.localPersonnel.id);

        // Preparar datos con imagen
        const personnelData = { ...this.localPersonnel };
        if (this.localPersonnel.avatar && this.localPersonnel.avatar instanceof File) {
          personnelData.imageFile = this.localPersonnel.avatar;
        }

        let savedPersonnel;
        if (this.localPersonnel.id) {
          // Actualizar existente
          savedPersonnel = await this.personnelService.update(this.localPersonnel.id, personnelData);
        } else {
          // Crear nuevo
          savedPersonnel = await this.personnelService.create(personnelData);
        }

        // Actualizar personal local
        this.localPersonnel = new Personnel(savedPersonnel);

        // Resetear estado de edición
        this.isEditing = false;
        this.hasChanges = false;
        this.originalData = null;

        const successMessage = this.localPersonnel.id
            ? this.$t('personnel.updatedSuccessfully', 'Personnel updated successfully')
            : this.$t('personnel.createdSuccessfully', 'Personnel created successfully');

        this.showNotificationMessage(successMessage, 'success');

        // Emitir evento
        this.$emit('save', savedPersonnel);

      } catch (error) {
        console.error('💥 Error saving changes:', error);
        this.showNotificationMessage(
            this.$t('personnel.errorSaving', 'Error saving changes'),
            'error'
        );
      } finally {
        this.loading = false;
      }
    },

    cancelChanges() {
      if (!this.isEditing) return;

      if (this.originalData) {
        // Restaurar datos originales
        Object.assign(this.localPersonnel, this.originalData);
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

      this.localPersonnel[fieldName] = value;
      this.detectChanges();
    },

    // ========== MÉTODOS ORIGINALES ==========
    async getCurrentProjectId() {
      if (this.projectId) {
        return this.projectId;
      }

      const projectId = await this.personnelService.getCurrentProjectId();
      if (projectId) {
        return projectId;
      }

      throw new Error('ProjectId es requerido. Debe pasarse como prop o estar disponible en el contexto de la ruta.');
    },

    async initializeForm() {
      this.errors = {};

      try {
        this.currentProjectId = await this.getCurrentProjectId();

        if (this.isEditingRecord && this.personnel) {
          this.localPersonnel = new Personnel({ ...this.personnel });
          this.localPersonnel.projectId = this.currentProjectId;

          // Para edición, conservar avatar existente
          if (this.personnel.avatar) {
            this.localPersonnel.avatar = this.personnel.avatar;
          }
        } else {
          this.localPersonnel = new Personnel({
            projectId: this.currentProjectId
          });
        }

        await this.loadFormData();
      } catch (error) {
        console.error('Error inicializando formulario:', error);
        this.showNotificationMessage(error.message, 'error');
      }
    },

    async loadFormData() {
      try {
        this.banks = this.personnelService.getBanks();
        this.departments = await this.personnelService.getDepartmentsWithStored(this.currentProjectId);
      } catch (error) {
        console.error('Error loading form data:', error);
      }
    },

    async validateForm() {
      if (!this.localPersonnel.projectId) {
        this.localPersonnel.projectId = this.currentProjectId;
      }

      const validation = this.localPersonnel.validate();
      this.errors = {};

      if (!validation.isValid) {
        validation.errors.forEach(error => {
          if (error.includes('Project')) this.errors.projectId = error;
          else if (error.includes('Name')) this.errors.name = error;
          else if (error.includes('Last name')) this.errors.lastname = error;
          else if (error.includes('Document')) this.errors.documentNumber = error;
          else if (error.includes('Position')) this.errors.position = error;
          else if (error.includes('Department')) this.errors.department = error;
          else if (error.includes('Personnel type')) this.errors.personnelType = error;
          else if (error.includes('Status')) this.errors.status = error;
          else if (error.includes('Monthly amount')) this.errors.monthlyAmount = error;
          else if (error.includes('Email')) this.errors.email = error;
          else if (error.includes('Phone')) this.errors.phone = error;
          else if (error.includes('Account')) this.errors.accountNumber = error;
        });
      }

      // Validaciones adicionales...
      if (this.localPersonnel.startDate) {
        const startDate = new Date(this.localPersonnel.startDate);
        const currentYear = new Date().getFullYear();

        if (startDate.getFullYear() > currentYear + 10 || startDate.getFullYear() < 1900) {
          this.errors.startDate = 'Fecha de inicio inválida';
          validation.isValid = false;
        }
      }

      if (this.localPersonnel.endDate && this.localPersonnel.startDate) {
        const endDate = new Date(this.localPersonnel.endDate);
        const startDate = new Date(this.localPersonnel.startDate);

        if (endDate < startDate) {
          this.errors.endDate = 'La fecha de fin debe ser posterior a la fecha de inicio';
          validation.isValid = false;
        }
      }

      return validation.isValid;
    },

    handleCancel() {
      // Si hay cambios pendientes, preguntar antes de salir
      if (this.hasChanges) {
        if (confirm(this.$t('common.unsavedChanges', 'You have unsaved changes. Are you sure you want to leave?'))) {
          this.cancelChanges();
        } else {
          return;
        }
      }

      this.errors = {};
      this.$emit('cancel');
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    },

    // ========== MÉTODOS DE IMÁGENES ==========
    handlePhotoChange(event) {
      const file = event.target.files[0];

      if (file) {
        // Validar tamaño (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          this.errors.avatar = 'La imagen es muy grande. Máximo 5MB';
          return;
        }

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
          this.errors.avatar = 'Solo se permiten archivos de imagen';
          return;
        }

        // Limpiar errores previos
        this.errors.avatar = '';

        // Activar modo de edición si no está activo
        if (!this.isEditing) {
          this.startEditing();
        }

        // Asignar archivo al modelo
        this.localPersonnel.avatar = file;

        // Limpiar preview anterior
        if (this.imagePreviewUrls[this.localPersonnel.id]) {
          URL.revokeObjectURL(this.imagePreviewUrls[this.localPersonnel.id]);
        }

        // Crear preview URL específico
        this.imagePreviewUrls[this.localPersonnel.id] = URL.createObjectURL(file);

        // Detectar cambios
        this.detectChanges();

        console.log('📸 Foto cambiada:', file.name, file.size, 'bytes');
      }
    },

    getImageUrl(file) {
      if (!file) return null;

      // Si es un File object (recién seleccionado)
      if (file instanceof File) {
        return URL.createObjectURL(file);
      }

      // Si es una URL (desde el servidor)
      if (typeof file === 'string') {
        return file;
      }

      return null;
    },

    getPersonnelImageUrl() {
      // Prioridad: preview específico > imagen existente
      const personnelId = this.localPersonnel?.id;
      return this.imagePreviewUrls[personnelId] || this.localPersonnel?.avatar || null;
    },

    getPersonnelInitials(personnel) {
      const firstName = personnel.name || '';
      const lastName = personnel.lastname || '';
      if (firstName.length >= 2) {
        return firstName.substring(0, 2).toUpperCase();
      }
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'PP';
    },

    getPersonnelTypeLabel(type) {
      const typeOption = this.personnelTypeOptions.find(option => option.value === type);
      return typeOption ? typeOption.label : type || '-';
    },

    getStatusLabel(status) {
      const statusOption = this.statusOptions.find(option => option.value === status);
      return statusOption ? statusOption.label : status || '-';
    },

    formatCurrency(amount) {
      if (!amount && amount !== 0) return '-';
      try {
        return new Intl.NumberFormat('es-PE', {
          style: 'currency',
          currency: 'PEN'
        }).format(amount);
      } catch (error) {
        return `S/. ${amount}`;
      }
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
    }
  }
};
</script>

<template>
  <div class="personnel-form">
    <!-- Vista de Formulario -->
    <div class="form-view">
      <div class="form-header">
        <div class="header-back">
          <AppButton
              icon="pi pi-arrow-left"
              :label="isAddingNew ? $t('common.cancel', 'Cancel') : $t('common.back', 'Back')"
              variant="secondary"
              @click="handleCancel"
              :disabled="loading"
          />

          <!-- Botones de Guardar/Cancelar (solo aparecen si hay cambios) -->
          <div v-if="hasChanges && isEditing" class="edit-actions">
            <AppButton
                :label="$t('common.save', 'Save')"
                icon="pi pi-check"
                variant="primary"
                @click="saveChanges"
                :loading="loading"
                :disabled="!hasChanges"
            />
            <AppButton
                :label="$t('common.cancel', 'Cancel')"
                icon="pi pi-times"
                variant="secondary"
                @click="cancelChanges"
                :disabled="loading"
            />
          </div>
        </div>

        <div class="personnel-info">
          <div class="personnel-avatar"
               :class="{ 'clickeable-avatar': canEdit }"
               @click="canEdit ? $refs.photoInput.click() : null"
               :title="canEdit ? $t('personnel.clickToChangePhoto', 'Click to change photo') : ''">
            <!-- Input file oculto -->
            <input
                v-if="canEdit"
                ref="photoInput"
                type="file"
                accept="image/*"
                @change="handlePhotoChange"
                :disabled="loading"
                style="display: none;"
            />

            <!-- Mostrar imagen actual o preview -->
            <img v-if="getPersonnelImageUrl()"
                 :src="getPersonnelImageUrl()"
                 :alt="localPersonnel.name"
                 class="avatar-image" />
            <div v-else class="avatar-placeholder">
              {{ getPersonnelInitials(localPersonnel) }}
            </div>
          </div>

          <!-- Todos los datos del personal EDITABLES -->
          <div class="personnel-details">
            <!-- Nombre completo (TÍTULO) -->
            <div class="personnel-title-section">
              <h2 class="personnel-title">
                {{ `${localPersonnel.name || ''} ${localPersonnel.lastname || ''}`.trim() || $t('personnel.newPersonnel', 'New Personnel') }}
              </h2>
            </div>

            <!-- Grid de información EDITABLE -->
            <div class="personnel-meta">
              <!-- Nombre -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.name', 'Name') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.name"
                    @input="handleFieldChange('name', $event.target.value)"
                    @click="handleFieldClick('name')"
                    class="meta-input"
                    :placeholder="$t('personnel.namePlaceholder', 'Enter name')"
                />
                <span
                    v-else
                    @click="handleFieldClick('name')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ localPersonnel.name || '-' }}
                </span>
              </div>

              <!-- Apellido -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.lastname', 'Last Name') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.lastname"
                    @input="handleFieldChange('lastname', $event.target.value)"
                    @click="handleFieldClick('lastname')"
                    class="meta-input"
                    :placeholder="$t('personnel.lastnamePlaceholder', 'Enter last name')"
                />
                <span
                    v-else
                    @click="handleFieldClick('lastname')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ localPersonnel.lastname || '-' }}
                </span>
              </div>

              <!-- Número de Documento -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.documentNumber', 'Document Number') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.documentNumber"
                    @input="handleFieldChange('documentNumber', $event.target.value)"
                    @click="handleFieldClick('documentNumber')"
                    class="meta-input"
                    :placeholder="$t('personnel.documentPlaceholder', 'Enter document number')"
                />
                <span
                    v-else
                    @click="handleFieldClick('documentNumber')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ localPersonnel.documentNumber || '-' }}
                </span>
              </div>

              <!-- Posición -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.position', 'Position') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.position"
                    @input="handleFieldChange('position', $event.target.value)"
                    @click="handleFieldClick('position')"
                    class="meta-input"
                    :placeholder="$t('personnel.positionPlaceholder', 'Enter position')"
                />
                <span
                    v-else
                    @click="handleFieldClick('position')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ localPersonnel.position || '-' }}
                </span>
              </div>

              <!-- Departamento -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.department', 'Department') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.department"
                    @input="handleFieldChange('department', $event.target.value)"
                    @click="handleFieldClick('department')"
                    class="meta-input"
                    :placeholder="$t('personnel.departmentPlaceholder', 'Enter department')"
                />
                <span
                    v-else
                    @click="handleFieldClick('department')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ localPersonnel.department || '-' }}
                </span>
              </div>

              <!-- Tipo de Personal -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.personnelType', 'Personnel Type') }}</span>
                <select
                    v-if="isEditing"
                    v-model="localPersonnel.personnelType"
                    @change="handleFieldChange('personnelType', $event.target.value)"
                    @click="handleFieldClick('personnelType')"
                    class="meta-select"
                >
                  <option v-for="option in personnelTypeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <span
                    v-else
                    @click="handleFieldClick('personnelType')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ getPersonnelTypeLabel(localPersonnel.personnelType) }}
                </span>
              </div>

              <!-- Estado -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.status', 'Status') }}</span>
                <select
                    v-if="isEditing"
                    v-model="localPersonnel.status"
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
                  {{ getStatusLabel(localPersonnel.status) }}
                </span>
              </div>

              <!-- Teléfono -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.phone', 'Phone') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.phone"
                    @input="handleFieldChange('phone', $event.target.value)"
                    @click="handleFieldClick('phone')"
                    class="meta-input"
                    :placeholder="$t('personnel.phonePlaceholder', 'Enter phone number')"
                />
                <span
                    v-else
                    @click="handleFieldClick('phone')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ localPersonnel.phone || '-' }}
                </span>
              </div>

              <!-- Email -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.email', 'Email') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.email"
                    @input="handleFieldChange('email', $event.target.value)"
                    @click="handleFieldClick('email')"
                    type="email"
                    class="meta-input"
                    :placeholder="$t('personnel.emailPlaceholder', 'Enter email address')"
                />
                <span
                    v-else
                    @click="handleFieldClick('email')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ localPersonnel.email || '-' }}
                </span>
              </div>

              <!-- Monto Mensual -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.monthlyAmount', 'Monthly Amount') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.monthlyAmount"
                    @input="handleFieldChange('monthlyAmount', $event.target.value)"
                    @click="handleFieldClick('monthlyAmount')"
                    type="number"
                    step="0.01"
                    min="0"
                    class="meta-input"
                    :placeholder="$t('personnel.amountPlaceholder', 'Enter amount')"
                />
                <span
                    v-else
                    @click="handleFieldClick('monthlyAmount')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ formatCurrency(localPersonnel.monthlyAmount) }}
                </span>
              </div>

              <!-- Descuento -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.discount', 'Discount') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.discount"
                    @input="handleFieldChange('discount', $event.target.value)"
                    @click="handleFieldClick('discount')"
                    type="number"
                    step="0.01"
                    min="0"
                    class="meta-input"
                    :placeholder="$t('personnel.discountPlaceholder', 'Enter discount')"
                />
                <span
                    v-else
                    @click="handleFieldClick('discount')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ formatCurrency(localPersonnel.discount) }}
                </span>
              </div>

              <!-- Banco -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.bank', 'Bank') }}</span>
                <select
                    v-if="isEditing"
                    v-model="localPersonnel.bank"
                    @change="handleFieldChange('bank', $event.target.value)"
                    @click="handleFieldClick('bank')"
                    class="meta-select"
                >
                  <option v-for="option in bankOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <span
                    v-else
                    @click="handleFieldClick('bank')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ localPersonnel.bank || '-' }}
                </span>
              </div>

              <!-- Número de Cuenta -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.accountNumber', 'Account Number') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.accountNumber"
                    @input="handleFieldChange('accountNumber', $event.target.value)"
                    @click="handleFieldClick('accountNumber')"
                    class="meta-input"
                    :placeholder="$t('personnel.accountPlaceholder', 'Enter account number')"
                />
                <span
                    v-else
                    @click="handleFieldClick('accountNumber')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ localPersonnel.accountNumber || '-' }}
                </span>
              </div>

              <!-- Fecha de Inicio -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.startDate', 'Start Date') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.startDate"
                    @input="handleFieldChange('startDate', $event.target.value)"
                    @click="handleFieldClick('startDate')"
                    type="date"
                    class="meta-input"
                />
                <span
                    v-else
                    @click="handleFieldClick('startDate')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ formatDate(localPersonnel.startDate) }}
                </span>
              </div>

              <!-- Fecha de Fin -->
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.endDate', 'End Date') }}</span>
                <input
                    v-if="isEditing"
                    v-model="localPersonnel.endDate"
                    @input="handleFieldChange('endDate', $event.target.value)"
                    @click="handleFieldClick('endDate')"
                    type="date"
                    class="meta-input"
                />
                <span
                    v-else
                    @click="handleFieldClick('endDate')"
                    :class="['meta-value', { 'editable-field': canEdit }]"
                    :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
                >
                  {{ formatDate(localPersonnel.endDate) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen de estado -->
        <div class="personnel-summary">
          <div class="summary-item">
            <span class="label">{{ $t('personnel.status', 'Status') }}</span>
            <span class="value" :class="localPersonnel.status === 'ACTIVE' ? 'active' : 'inactive'">
              {{ getStatusLabel(localPersonnel.status) }}
            </span>
          </div>
          <div class="summary-item">
            <span class="label">{{ $t('personnel.personnelType', 'Type') }}</span>
            <span class="value type">
              {{ getPersonnelTypeLabel(localPersonnel.personnelType) }}
            </span>
          </div>
          <div class="summary-item">
            <span class="label">{{ $t('personnel.monthlyAmount', 'Monthly Amount') }}</span>
            <span class="value amount">{{ formatCurrency(localPersonnel.monthlyAmount) }}</span>
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
/* Usando exactamente los mismos estilos que MachineryForm */
.personnel-form {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

/* ========== VISTA DE FORMULARIO ========== */
.form-view {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.form-header {
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

.personnel-info {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2rem;
}

/* IMAGEN MÁS GRANDE */
.personnel-avatar {
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
  cursor: pointer;
  transition: all 0.3s ease;
}

.personnel-avatar:hover {
  transform: scale(1.02);
  box-shadow: 0 12px 30px rgba(255, 95, 1, 0.3);
  border-color: #FF5F01;
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

.personnel-avatar:hover .avatar-placeholder {
  color: #FF5F01;
}

/* DATOS EDITABLES */
.personnel-details {
  flex: 1;
}

.personnel-title-section {
  margin-bottom: 1.5rem;
}

.personnel-title {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.personnel-meta {
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

.personnel-summary {
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

.personnel-summary::before {
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

.summary-item:has(.value.type) {
  --item-color: #f59e0b;
}

.summary-item:has(.value.amount) {
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

.value.type {
  color: #f59e0b;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.value.amount {
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

/* ========== RESPONSIVE ========== */
@media (max-width: 1400px) {
  .form-header {
    padding: 1.5rem;
  }

  .personnel-avatar {
    width: 300px;
    height: 400px;
  }

  .personnel-meta {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

@media (max-width: 1200px) {
  .form-view {
    padding: 1.5rem;
  }

  .form-header {
    padding: 1.5rem;
  }

  .personnel-avatar {
    width: 250px;
    height: 300px;
  }

  .personnel-title {
    font-size: 2rem;
  }

  .personnel-meta {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .personnel-summary {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 992px) {
  .form-view {
    padding: 1rem;
  }

  .form-header {
    padding: 1rem;
  }

  .header-back {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .edit-actions {
    justify-content: space-between;
  }

  .personnel-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.5rem;
  }

  .personnel-avatar {
    width: 200px;
    height: 250px;
  }

  .personnel-details {
    width: 100%;
  }

  .personnel-title {
    font-size: 1.75rem;
    text-align: center;
  }

  .personnel-meta {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .meta-item {
    padding: 1rem;
  }

  .personnel-summary {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    padding: 1.5rem;
  }

  .summary-item .value {
    font-size: 1.75rem;
  }
}

@media (max-width: 768px) {
  .form-view {
    padding: 0.75rem;
  }

  .form-header {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 8px;
  }

  .personnel-avatar {
    width: 150px;
    height: 200px;
    border-radius: 12px;
  }

  .avatar-placeholder {
    font-size: 2.5rem;
  }

  .personnel-title {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .personnel-meta {
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

  .personnel-summary {
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
}

@media (max-width: 480px) {
  .form-view {
    padding: 0.5rem;
  }

  .form-header {
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    border-radius: 6px;
  }

  .personnel-avatar {
    width: 120px;
    height: 160px;
    border-radius: 8px;
  }

  .avatar-placeholder {
    font-size: 2rem;
  }

  .personnel-title {
    font-size: 1.25rem;
  }

  .meta-item {
    padding: 0.5rem 0.75rem;
  }

  .personnel-summary {
    padding: 0.75rem;
  }

  .summary-item {
    padding: 0.75rem;
  }

  .summary-item .value {
    font-size: 1.25rem;
  }
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

.form-header {
  animation: slideInUp 0.6s ease-out forwards;
}

/* ========== EFECTOS DE HOVER ========== */
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

/* ========== LOADING STATES ========== */
.loading-overlay {
  position: relative;
}

.loading-overlay::before {
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

.loading-overlay::after {
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
</style>