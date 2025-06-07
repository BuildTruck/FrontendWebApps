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
    }
  },
  emits: ['save', 'cancel'],
  data() {
    return {
      loading: false,
      localPersonnel: new Personnel(),
      banks: [],
      departments: [],
      currentProjectId: null,
      showCustomDepartmentInput: false,
      customDepartmentValue: '',

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
    isEditing() {
      return this.personnel && this.personnel.id;
    },

    personnelTypeOptions() {
      return [
        { value: 'TECHNICAL', label: this.$t('personnel.typeTechnical') },
        { value: 'SPECIALIST', label: this.$t('personnel.typeSpecialist') },
        { value: 'ADMINISTRATIVE', label: this.$t('personnel.typeAdministrative') },
        { value: 'RENTED_OPERATOR', label: this.$t('personnel.typeRentedOperator') },
        { value: 'LABORER', label: this.$t('personnel.typeLaborer') }
      ];
    },

    statusOptions() {
      return [
        { value: 'ACTIVE', label: this.$t('personnel.statusActive') },
        { value: 'INACTIVE', label: this.$t('personnel.statusInactive') },
        { value: 'PENDING', label: this.$t('personnel.statusPending') },
        { value: 'SUSPENDED', label: this.$t('personnel.statusSuspended') },
        { value: 'FINISHED', label: this.$t('personnel.statusFinished') }
      ];
    },

    bankOptions() {
      return this.personnelService.getBanks();
    },

    departmentOptions() {
      const options = this.departments.map(department => ({
        value: department,
        label: department
      }));

      // Agregar opcion de "Nuevo departamento"
      options.push({
        value: '__custom__',
        label: '+ Agregar nuevo departamento'
      });

      return options;
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
  },
  methods: {
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

        if (this.isEditing && this.personnel) {
          this.localPersonnel = new Personnel({ ...this.personnel });
          this.localPersonnel.projectId = this.currentProjectId;

          if (this.personnel.avatar) {
            this.localPersonnel.avatar = this.personnel.avatar;
          }
          console.log('Editing personnel with avatar:', this.personnel.avatar ? 'Yes' : 'No');
          console.log('Local personnel avatar:', this.localPersonnel.avatar ? 'Yes' : 'No');
        } else {
          this.localPersonnel = new Personnel({
            projectId: this.currentProjectId
          });
          console.log('Nuevo personal para proyecto:', this.currentProjectId);
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
        console.log('Departamentos cargados para proyecto', this.currentProjectId, ':', this.departments);
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

      if (!this.isEditing && this.localPersonnel.email) {
        try {
          const projectPersonnel = await this.personnelService.getByProject(this.currentProjectId);
          const emailExists = projectPersonnel.some(p =>
              p.email && p.email.toLowerCase() === this.localPersonnel.email.toLowerCase()
          );

          if (emailExists) {
            this.errors.email = this.$t('personnel.emailAlreadyExists');
            validation.isValid = false;
          }
        } catch (error) {
          console.error('Error validating email:', error);
        }
      }

      if (this.localPersonnel.documentNumber) {
        const documentExists = await this.personnelService.validateDocumentNumber(
            this.localPersonnel.documentNumber,
            this.currentProjectId,
            this.isEditing ? this.localPersonnel.id : null
        );

        if (documentExists) {
          this.errors.documentNumber = this.$t('personnel.documentExists');
          validation.isValid = false;
        }
      }

      return validation.isValid;
    },

    async processAvatar() {
      if (this.localPersonnel.avatar && this.localPersonnel.avatar instanceof File) {
        try {
          console.log('Procesando avatar...');
          const compressedAvatar = await this.personnelService.uploadAvatar(
              this.localPersonnel.avatar,
              this.currentProjectId
          );
          this.localPersonnel.avatar = compressedAvatar;
          console.log('Avatar comprimido y listo');
        } catch (error) {
          console.error('Error procesando avatar:', error);
          this.showNotificationMessage('Error procesando la imagen: ' + error.message, 'error');
          return false;
        }
      }
      return true;
    },

    async handleSave() {
      this.loading = true;

      try {
        const avatarProcessed = await this.processAvatar();
        if (!avatarProcessed) {
          return;
        }

        const isValid = await this.validateForm();

        if (!isValid) {
          this.showNotificationMessage(this.$t('personnel.validationErrors'), 'error');
          return;
        }

        let savedPersonnel;

        if (this.isEditing) {
          savedPersonnel = await this.personnelService.update(this.localPersonnel.id, this.localPersonnel);
          this.showNotificationMessage(this.$t('personnel.personnelUpdated'), 'success');
        } else {
          savedPersonnel = await this.personnelService.create(this.localPersonnel);
          this.showNotificationMessage(this.$t('personnel.personnelCreated'), 'success');
        }

        if (this.localPersonnel.department && this.localPersonnel.department.trim()) {
          await this.personnelService.addDepartmentToProject(this.currentProjectId, this.localPersonnel.department.trim());
        }

        this.$emit('save', savedPersonnel);

      } catch (error) {
        console.error('Error saving personnel:', error);

        if (error.response?.status === 409) {
          this.showNotificationMessage(this.$t('personnel.emailDuplicated'), 'error');
        } else {
          this.showNotificationMessage(
              error.message || this.$t('personnel.errorSaving'),
              'error'
          );
        }
      } finally {
        this.loading = false;
      }
    },

    handleCancel() {
      this.errors = {};
      this.$emit('cancel');
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    },

    onDepartmentChange(value) {
      if (value === '__custom__') {
        this.showCustomDepartmentInput = true;
        this.customDepartmentValue = '';
        this.localPersonnel.department = '';
      } else {
        this.showCustomDepartmentInput = false;
        this.localPersonnel.department = value;
      }
      console.log('Departamento seleccionado:', value);
    },

    onCustomDepartmentInput(value) {
      this.customDepartmentValue = value;
      this.localPersonnel.department = value;
      console.log('Departamento personalizado:', value);
    },

    onCustomDepartmentBlur() {
      if (this.customDepartmentValue && this.customDepartmentValue.trim()) {
        this.localPersonnel.department = this.customDepartmentValue.trim();
        this.showCustomDepartmentInput = false;
      }
    },

    getDepartmentsForSelect() {
      return this.departments.map(department => ({
        value: department,
        label: department
      }));
    }
  }
};
</script>

<template>
  <div class="personnel-form-page">
    <!-- Header -->
    <div class="form-header">
      <div class="header-content">
        <AppButton
            icon="pi pi-arrow-left"
            variant="secondary"
            size="small"
            @click="handleCancel"
            :disabled="loading"
        />
        <div class="header-title">
          <h1>{{ isEditing ? $t('personnel.editPersonnel') : $t('personnel.addNew') }}</h1>
          <p class="header-subtitle">
            {{ isEditing ? $t('personnel.basicInfo') : $t('personnel.personnelDetails') }}
          </p>
        </div>
      </div>

      <div class="header-actions">
        <AppButton
            :label="$t('general.cancel')"
            variant="secondary"
            @click="handleCancel"
            :disabled="loading"
        />
        <AppButton
            :label="isEditing ? $t('personnel.confirmChanges') : $t('personnel.create')"
            variant="primary"
            :loading="loading"
            @click="handleSave"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="form-content">
      <div class="form-container">
        <!-- Basic Information -->
        <div class="form-section">
          <h2 class="form-section-title">{{ $t('personnel.basicInfo') }}</h2>
          <div class="form-grid">
            <AppInput
                v-model="localPersonnel.name"
                :label="$t('personnel.name')"
                :placeholder="$t('personnel.namePlaceholder')"
                :error="errors.name"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localPersonnel.lastname"
                :label="$t('personnel.lastname')"
                :placeholder="$t('personnel.lastnamePlaceholder')"
                :error="errors.lastname"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localPersonnel.documentNumber"
                :label="$t('personnel.documentNumber')"
                :placeholder="$t('personnel.documentPlaceholder')"
                :error="errors.documentNumber"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localPersonnel.position"
                :label="$t('personnel.position')"
                :placeholder="$t('personnel.positionPlaceholder')"
                :error="errors.position"
                :disabled="loading"
                required
            />

            <!-- Department field corregido -->
            <div v-if="!showCustomDepartmentInput">
              <AppInput
                  v-model="localPersonnel.department"
                  :label="$t('personnel.department')"
                  type="select"
                  :placeholder="$t('personnel.selectDepartment')"
                  :options="departmentOptions"
                  :error="errors.department"
                  :disabled="loading"
                  @update:modelValue="onDepartmentChange"
                  required
              />
            </div>

            <div v-else>
              <AppInput
                  v-model="customDepartmentValue"
                  :label="$t('personnel.department')"
                  type="text"
                  placeholder="Escriba el nombre del nuevo departamento"
                  :error="errors.department"
                  :disabled="loading"
                  @input="onCustomDepartmentInput"
                  @blur="onCustomDepartmentBlur"
                  @keyup.enter="onCustomDepartmentBlur"
                  required
                  autofocus
              />
            </div>

            <AppInput
                v-model="localPersonnel.personnelType"
                :label="$t('personnel.personnelType')"
                type="select"
                :placeholder="$t('personnel.selectType')"
                :options="personnelTypeOptions"
                :error="errors.personnelType"
                :disabled="loading"
                required
            />
          </div>
        </div>

        <!-- Contract Information -->
        <div class="form-section">
          <h2 class="form-section-title">{{ $t('personnel.contractInfo') }}</h2>
          <div class="form-grid">
            <AppInput
                v-model="localPersonnel.startDate"
                :label="$t('personnel.startDate')"
                type="date"
                :error="errors.startDate"
                :disabled="loading"
            />

            <AppInput
                v-model="localPersonnel.endDate"
                :label="$t('personnel.endDate')"
                type="date"
                :error="errors.endDate"
                :disabled="loading"
            />

            <AppInput
                v-model="localPersonnel.status"
                :label="$t('personnel.status')"
                type="select"
                :placeholder="$t('personnel.selectStatus')"
                :options="statusOptions"
                :error="errors.status"
                :disabled="loading"
                required
            />
          </div>
        </div>

        <!-- Financial Information -->
        <div class="form-section">
          <h2 class="form-section-title">{{ $t('personnel.financialInfo') }}</h2>
          <div class="form-grid">
            <AppInput
                v-model="localPersonnel.monthlyAmount"
                :label="$t('personnel.monthlyAmount')"
                type="number"
                :placeholder="$t('personnel.amountPlaceholder')"
                :error="errors.monthlyAmount"
                :disabled="loading"
                step="0.01"
                min="0"
            />

            <AppInput
                v-model="localPersonnel.discount"
                :label="$t('personnel.discount')"
                type="number"
                :placeholder="$t('personnel.discountPlaceholder')"
                :error="errors.discount"
                :disabled="loading"
                step="0.01"
                min="0"
            />

            <AppInput
                v-model="localPersonnel.bank"
                :label="$t('personnel.bank')"
                type="select"
                :placeholder="$t('personnel.selectBank')"
                :options="bankOptions"
                :error="errors.bank"
                :disabled="loading"
            />

            <AppInput
                v-model="localPersonnel.accountNumber"
                :label="$t('personnel.accountNumber')"
                :placeholder="$t('personnel.accountPlaceholder')"
                :error="errors.accountNumber"
                :disabled="loading"
            />
          </div>
        </div>

        <!-- Contact Information -->
        <div class="form-section">
          <h2 class="form-section-title">{{ $t('personnel.contactInfo') }}</h2>
          <div class="form-grid">
            <AppInput
                v-model="localPersonnel.phone"
                :label="$t('personnel.phone')"
                :placeholder="$t('personnel.phonePlaceholder')"
                :error="errors.phone"
                :disabled="loading"
            />

            <AppInput
                v-model="localPersonnel.email"
                :label="$t('personnel.email')"
                type="email"
                :placeholder="$t('personnel.emailPlaceholder')"
                :error="errors.email"
                :disabled="loading"
            />

            <AppInput
                v-model="localPersonnel.avatar"
                :label="$t('personnel.avatar')"
                type="photo"
                :error="errors.avatar"
                :disabled="loading"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications -->
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
.personnel-form-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

.form-header {
  background: white;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-title h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.header-subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: #666;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.form-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.form-container {
  max-width: 1200px;
  margin: 0 auto;
}

.form-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-section-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #FF5F01;
  border-bottom: 2px solid #FF5F01;
  padding-bottom: 0.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.input-group {
  position: relative;
}

@media (max-width: 768px) {
  .form-header {
    padding: 1rem;
    flex-direction: column;
    align-items: stretch;
  }

  .header-content {
    justify-content: center;
  }

  .header-actions {
    justify-content: center;
  }

  .form-content {
    padding: 1rem;
  }

  .form-section {
    padding: 1.5rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .form-header {
    padding: 0.75rem;
  }

  .header-title h1 {
    font-size: 1.25rem;
  }

  .form-content {
    padding: 0.75rem;
  }

  .form-section {
    padding: 1rem;
  }
}

.form-section {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.form-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.form-section {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>