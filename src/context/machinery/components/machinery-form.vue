<script>
import AppButton from '../../../core/components/AppButton.vue';
import AppInput from '../../../core/components/AppInput.vue';
import AppNotification from '../../../core/components/AppNotification.vue';
import { MachineryEntity } from '../models/machinery.entity.js';
import { MachineryApiService } from '../services/machinery-api.service.js';
import { PersonnelApiService } from '../../personnel/services/personnel-api.service.js';

export default {
  name: 'MachineryForm',
  components: {
    AppButton,
    AppInput,
    AppNotification
  },
  props: {
    machinery: {
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
      localMachinery: new MachineryEntity(),
      personnel: [],
      machineryTypes: [],
      currentProjectId: null,
      showCustomTypeInput: false,
      customTypeValue: '',

      // Notifications
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',

      // Validations
      errors: {},

      // Services
      machineryService: new MachineryApiService(),
      personnelService: new PersonnelApiService()
    };
  },
  computed: {
    isEditing() {
      return this.machinery && this.machinery.id;
    },

    statusOptions() {
      return [
        { value: 'ACTIVE', label: this.$t('machinery.statusActive') },
        { value: 'INACTIVE', label: this.$t('machinery.statusInactive') },
        { value: 'DAMAGED', label: this.$t('machinery.statusDamaged') },
        { value: 'MAINTENANCE', label: this.$t('machinery.statusMaintenance') }
      ];
    },

    machineryTypeOptions() {
      const options = this.machineryTypes.map(type => ({
        value: type.value,
        label: type.label
      }));

      // Add option for custom type
      options.push({
        value: '__custom__',
        label: '+ ' + this.$t('machinery.addNewType')
      });

      return options;
    },

    operatorOptions() {
      const options = this.personnel.map(operator => ({
        value: operator.id,
        label: `${operator.name} ${operator.lastname} - ${operator.position}`
      }));

      options.unshift({
        value: null,
        label: this.$t('machinery.noOperator')
      });

      return options;
    }
  },
  watch: {
    machinery: {
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

      const projectId = await this.machineryService.getCurrentProjectId();
      if (projectId) {
        return projectId;
      }

      throw new Error('ProjectId is required');
    },

    async initializeForm() {
      this.errors = {};

      try {
        this.currentProjectId = await this.getCurrentProjectId();

        if (this.isEditing && this.machinery) {
          this.localMachinery = new MachineryEntity({ ...this.machinery });
          this.localMachinery.projectId = this.currentProjectId;

          // Asegurar que la imagen se copie correctamente
          if (this.machinery.image) {
            this.localMachinery.image = this.machinery.image;
          }
        } else {
          this.localMachinery = new MachineryEntity({
            projectId: this.currentProjectId
          });
        }

        await this.loadFormData();
      } catch (error) {
        console.error('Error initializing form:', error);
        this.showNotificationMessage(error.message, 'error');
      }
    },

    async loadFormData() {
      try {
        // Cargar tipos de maquinaria
        this.machineryTypes = await this.machineryService.getMachineryTypesWithStored(this.currentProjectId);

        // Cargar personal del proyecto
        this.personnel = await this.personnelService.getByProject(this.currentProjectId);
      } catch (error) {
        console.error('Error loading form data:', error);
      }
    },

    async validateForm() {
      if (!this.localMachinery.projectId) {
        this.localMachinery.projectId = this.currentProjectId;
      }

      const validation = this.localMachinery.validate();
      this.errors = {};

      if (!validation.isValid) {
        validation.errors.forEach(error => {
          if (error.includes('Project')) this.errors.projectId = error;
          else if (error.includes('Name')) this.errors.name = error;
          else if (error.includes('License plate')) this.errors.licensePlate = error;
          else if (error.includes('Machinery type')) this.errors.machineryType = error;
          else if (error.includes('Status')) this.errors.status = error;
        });
      }

      return validation.isValid;
    },

    async processImage() {
      if (this.localMachinery.image && this.localMachinery.image instanceof File) {
        try {
          const compressedImage = await this.machineryService.uploadImage(
              this.localMachinery.image,
              this.currentProjectId
          );
          this.localMachinery.image = compressedImage;
        } catch (error) {
          console.error('Error processing image:', error);
          this.showNotificationMessage('Error processing image: ' + error.message, 'error');
          return false;
        }
      }
      return true;
    },

    async handleSave() {
      this.loading = true;

      try {
        const imageProcessed = await this.processImage();
        if (!imageProcessed) {
          return;
        }

        const isValid = await this.validateForm();

        if (!isValid) {
          this.showNotificationMessage(this.$t('machinery.validationErrors'), 'error');
          return;
        }

        let savedMachinery;

        if (this.isEditing) {
          savedMachinery = await this.machineryService.update(this.localMachinery.id, this.localMachinery);
          this.showNotificationMessage(this.$t('machinery.machineryUpdated'), 'success');
        } else {
          savedMachinery = await this.machineryService.create(this.localMachinery);
          this.showNotificationMessage(this.$t('machinery.machineryCreated'), 'success');
        }

        // Save custom machinery type if needed
        if (this.localMachinery.machineryType && this.localMachinery.machineryType.trim()) {
          await this.machineryService.addMachineryTypeToProject(this.currentProjectId, this.localMachinery.machineryType.trim());
        }

        this.$emit('save', savedMachinery);

      } catch (error) {
        console.error('Error saving machinery:', error);

        if (error.response?.status === 409) {
          this.showNotificationMessage(this.$t('machinery.licensePlateExists'), 'error');
        } else {
          this.showNotificationMessage(
              error.message || this.$t('machinery.errorSaving'),
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

    onMachineryTypeChange(value) {
      if (value === '__custom__') {
        this.showCustomTypeInput = true;
        this.customTypeValue = '';
        this.localMachinery.machineryType = '';
      } else {
        this.showCustomTypeInput = false;
        this.localMachinery.machineryType = value;
      }
    },

    onCustomTypeInput(value) {
      this.customTypeValue = value;
      this.localMachinery.machineryType = value;
    },

    onCustomTypeBlur() {
      if (this.customTypeValue && this.customTypeValue.trim()) {
        this.localMachinery.machineryType = this.customTypeValue.trim();
        this.showCustomTypeInput = false;
      }
    }
  }
};
</script>

<template>
  <div class="machinery-form-page">
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
          <h1>{{ isEditing ? $t('machinery.editMachinery') : $t('machinery.addNew') }}</h1>
          <p class="header-subtitle">
            {{ isEditing ? $t('machinery.basicInfo') : $t('machinery.machineryDetails') }}
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
            :label="isEditing ? $t('machinery.confirmChanges') : $t('machinery.create')"
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
          <h2 class="form-section-title">{{ $t('machinery.basicInfo') }}</h2>
          <div class="form-grid">
            <AppInput
                v-model="localMachinery.name"
                :label="$t('machinery.name')"
                :placeholder="$t('machinery.namePlaceholder')"
                :error="errors.name"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localMachinery.licensePlate"
                :label="$t('machinery.licensePlate')"
                :placeholder="$t('machinery.licensePlatePlaceholder')"
                :error="errors.licensePlate"
                :disabled="loading"
                required
            />

            <!-- Machinery Type field -->
            <div v-if="!showCustomTypeInput">
              <AppInput
                  v-model="localMachinery.machineryType"
                  :label="$t('machinery.machineryType')"
                  type="select"
                  :placeholder="$t('machinery.selectType')"
                  :options="machineryTypeOptions"
                  :error="errors.machineryType"
                  :disabled="loading"
                  @update:modelValue="onMachineryTypeChange"
                  required
              />
            </div>

            <div v-else>
              <AppInput
                  v-model="customTypeValue"
                  :label="$t('machinery.machineryType')"
                  type="text"
                  :placeholder="$t('machinery.customTypePlaceholder')"
                  :error="errors.machineryType"
                  :disabled="loading"
                  @input="onCustomTypeInput"
                  @blur="onCustomTypeBlur"
                  @keyup.enter="onCustomTypeBlur"
                  required
                  autofocus
              />
            </div>

            <AppInput
                v-model="localMachinery.status"
                :label="$t('machinery.status')"
                type="select"
                :placeholder="$t('machinery.selectStatus')"
                :options="statusOptions"
                :error="errors.status"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localMachinery.provider"
                :label="$t('machinery.provider')"
                :placeholder="$t('machinery.providerPlaceholder')"
                :error="errors.provider"
                :disabled="loading"
            />

            <AppInput
                v-model="localMachinery.description"
                :label="$t('machinery.description')"
                type="textarea"
                :placeholder="$t('machinery.descriptionPlaceholder')"
                :error="errors.description"
                :disabled="loading"
            />
          </div>
        </div>

        <!-- Assignment Information -->
        <div class="form-section">
          <h2 class="form-section-title">{{ $t('machinery.assignmentInfo') }}</h2>
          <div class="form-grid">
            <AppInput
                v-model="localMachinery.personnelId"
                :label="$t('machinery.assignedOperator')"
                type="select"
                :placeholder="$t('machinery.selectOperator')"
                :options="operatorOptions"
                :error="errors.personnelId"
                :disabled="loading"
            />

            <AppInput
                v-model="localMachinery.image"
                :label="$t('machinery.image')"
                type="photo"
                :error="errors.image"
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
.machinery-form-page {
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
</style>