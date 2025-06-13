<script>
import AppButton from '../../../core/components/AppButton.vue';
import AppInput from '../../../core/components/AppInput.vue';
import AppNotification from '../../../core/components/AppNotification.vue';
import { Incident } from '../models/incident.entity.js';
import { IncidentApiService } from '../services/incident-api.service.js';
import { PersonnelApiService } from '../../personnel/services/personnel-api.service.js';

export default {
  name: 'IncidentForm',
  components: {
    AppButton,
    AppInput,
    AppNotification
  },
  props: {
    incident: {
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
      localIncident: new Incident(),
      personnel: [],
      incidentTypes: [],
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
      incidentService: new IncidentApiService(),
      personnelService: new PersonnelApiService()
    };
  },
  computed: {
    isEditing() {
      return this.incident && this.incident.id;
    },

    severityOptions() {
      return [
        { value: 'BAJO', label: this.$t('incidents.severityLow') },
        { value: 'MEDIO', label: this.$t('incidents.severityMedium') },
        { value: 'ALTO', label: this.$t('incidents.severityHigh') },
        { value: 'CRITICO', label: this.$t('incidents.severityCritical') }
      ];
    },

    statusOptions() {
      return [
        { value: 'REPORTADO', label: this.$t('incidents.statusReported') },
        { value: 'EN_PROGRESO', label: this.$t('incidents.statusInProgress') },
        { value: 'RESUELTO', label: this.$t('incidents.statusResolved') },
        { value: 'CERRADO', label: this.$t('incidents.statusClosed') }
      ];
    },

    incidentTypeOptions() {
      const options = this.incidentTypes.map(type => ({
        value: type.value,
        label: type.label
      }));

      // Add option for custom type
      options.push({
        value: '__custom__',
        label: '+ ' + this.$t('incidents.addNewType')
      });

      return options;
    },

    personnelOptions() {
      const options = this.personnel.map(person => ({
        value: person.id,
        label: `${person.name} ${person.lastname} - ${person.position}`
      }));

      options.unshift({
        value: null,
        label: this.$t('incidents.noPersonnel')
      });

      return options;
    }
  },
  watch: {
    incident: {
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

      const projectId = await this.incidentService.getCurrentProjectId();
      if (projectId) {
        return projectId;
      }

      throw new Error('ProjectId is required');
    },

    async initializeForm() {
      this.errors = {};

      try {
        this.currentProjectId = await this.getCurrentProjectId();

        if (this.isEditing && this.incident) {
          this.localIncident = new Incident({ ...this.incident });
          this.localIncident.projectId = this.currentProjectId;

          // Ensure image is copied correctly
          if (this.incident.image) {
            this.localIncident.image = this.incident.image;
          }
        } else {
          this.localIncident = new Incident({
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
        // Load incident types
        this.incidentTypes = await this.incidentService.getIncidentTypesWithStored(this.currentProjectId);

        // Load project personnel
        this.personnel = await this.personnelService.getByProject(this.currentProjectId);
      } catch (error) {
        console.error('Error loading form data:', error);
      }
    },

    async validateForm() {
      if (!this.localIncident.projectId) {
        this.localIncident.projectId = this.currentProjectId;
      }

      const validation = this.localIncident.validate();
      this.errors = {};

      if (!validation.isValid) {
        validation.errors.forEach(error => {
          if (error.includes('Project')) this.errors.projectId = error;
          else if (error.includes('Title')) this.errors.title = error;
          else if (error.includes('Description')) this.errors.description = error;
          else if (error.includes('Incident type')) this.errors.incidentType = error;
          else if (error.includes('Severity')) this.errors.severity = error;
          else if (error.includes('Status')) this.errors.status = error;
          else if (error.includes('Location')) this.errors.location = error;
          else if (error.includes('Occurrence')) this.errors.occurredAt = error;
        });
      }

      return validation.isValid;
    },

    async processImage() {
      if (this.localIncident.image && this.localIncident.image instanceof File) {
        try {
          const compressedImage = await this.incidentService.uploadImage(
              this.localIncident.image,
              this.currentProjectId
          );
          this.localIncident.image = compressedImage;
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
          this.showNotificationMessage(this.$t('incidents.validationErrors'), 'error');
          return;
        }

        let savedIncident;

        if (this.isEditing) {
          savedIncident = await this.incidentService.update(this.localIncident.id, this.localIncident);
          this.showNotificationMessage(this.$t('incidents.incidentUpdated'), 'success');
        } else {
          savedIncident = await this.incidentService.create(this.localIncident);
          this.showNotificationMessage(this.$t('incidents.incidentCreated'), 'success');
        }

        // Save custom incident type if needed
        if (this.localIncident.incidentType && this.localIncident.incidentType.trim()) {
          await this.incidentService.addIncidentTypeToProject(this.currentProjectId, this.localIncident.incidentType.trim());
        }

        this.$emit('save', savedIncident);

      } catch (error) {
        console.error('Error saving incident:', error);

        if (error.response?.status === 409) {
          this.showNotificationMessage(this.$t('incidents.titleExists'), 'error');
        } else {
          this.showNotificationMessage(
              error.message || this.$t('incidents.errorSaving'),
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

    onIncidentTypeChange(value) {
      if (value === '__custom__') {
        this.showCustomTypeInput = true;
        this.customTypeValue = '';
        this.localIncident.incidentType = '';
      } else {
        this.showCustomTypeInput = false;
        this.localIncident.incidentType = value;
      }
    },

    onCustomTypeInput(value) {
      this.customTypeValue = value;
      this.localIncident.incidentType = value;
    },

    onCustomTypeBlur() {
      if (this.customTypeValue && this.customTypeValue.trim()) {
        this.localIncident.incidentType = this.customTypeValue.trim();
        this.showCustomTypeInput = false;
      }
    }
  }
};
</script>

<template>
  <div class="incident-form-page">
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
          <h1>{{ isEditing ? $t('incidents.editIncident') : $t('incidents.addNew') }}</h1>
          <p class="header-subtitle">
            {{ isEditing ? $t('incidents.basicInfo') : $t('incidents.incidentDetails') }}
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
            :label="isEditing ? $t('incidents.confirmChanges') : $t('incidents.create')"
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
          <h2 class="form-section-title">{{ $t('incidents.basicInfo') }}</h2>
          <div class="form-grid">
            <AppInput
                v-model="localIncident.title"
                :label="$t('incidents.title')"
                :placeholder="$t('incidents.titlePlaceholder')"
                :error="errors.title"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localIncident.location"
                :label="$t('incidents.location')"
                :placeholder="$t('incidents.locationPlaceholder')"
                :error="errors.location"
                :disabled="loading"
                required
            />

            <!-- Incident Type field -->
            <div v-if="!showCustomTypeInput">
              <AppInput
                  v-model="localIncident.incidentType"
                  :label="$t('incidents.incidentType')"
                  type="select"
                  :placeholder="$t('incidents.selectType')"
                  :options="incidentTypeOptions"
                  :error="errors.incidentType"
                  :disabled="loading"
                  @update:modelValue="onIncidentTypeChange"
                  required
              />
            </div>

            <div v-else>
              <AppInput
                  v-model="customTypeValue"
                  :label="$t('incidents.incidentType')"
                  type="text"
                  :placeholder="$t('incidents.customTypePlaceholder')"
                  :error="errors.incidentType"
                  :disabled="loading"
                  @input="onCustomTypeInput"
                  @blur="onCustomTypeBlur"
                  @keyup.enter="onCustomTypeBlur"
                  required
                  autofocus
              />
            </div>

            <AppInput
                v-model="localIncident.severity"
                :label="$t('incidents.severity')"
                type="select"
                :placeholder="$t('incidents.selectSeverity')"
                :options="severityOptions"
                :error="errors.severity"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localIncident.status"
                :label="$t('incidents.status')"
                type="select"
                :placeholder="$t('incidents.selectStatus')"
                :options="statusOptions"
                :error="errors.status"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localIncident.occurredAt"
                :label="$t('incidents.occurredAt')"
                type="datetime-local"
                :error="errors.occurredAt"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localIncident.description"
                :label="$t('incidents.description')"
                type="textarea"
                :placeholder="$t('incidents.descriptionPlaceholder')"
                :error="errors.description"
                :disabled="loading"
                required
            />
          </div>
        </div>

        <!-- Assignment Information -->
        <div class="form-section">
          <h2 class="form-section-title">{{ $t('incidents.assignmentInfo') }}</h2>
          <div class="form-grid">
            <AppInput
                v-model="localIncident.reportedBy"
                :label="$t('incidents.reportedBy')"
                type="select"
                :placeholder="$t('incidents.selectReporter')"
                :options="personnelOptions"
                :error="errors.reportedBy"
                :disabled="loading"
            />

            <AppInput
                v-model="localIncident.assignedTo"
                :label="$t('incidents.assignedTo')"
                type="select"
                :placeholder="$t('incidents.selectAssignee')"
                :options="personnelOptions"
                :error="errors.assignedTo"
                :disabled="loading"
            />

            <AppInput
                v-model="localIncident.resolvedAt"
                :label="$t('incidents.resolvedAt')"
                type="datetime-local"
                :error="errors.resolvedAt"
                :disabled="loading || localIncident.status !== 'RESUELTO'"
            />

            <AppInput
                v-model="localIncident.image"
                :label="$t('incidents.image')"
                type="photo"
                :error="errors.image"
                :disabled="loading"
            />

            <AppInput
                v-model="localIncident.notes"
                :label="$t('incidents.notes')"
                type="textarea"
                :placeholder="$t('incidents.notesPlaceholder')"
                :error="errors.notes"
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
.incident-form-page {
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