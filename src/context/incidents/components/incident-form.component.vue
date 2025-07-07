<script>
import AppButton from '../../../core/components/AppButton.vue';
import AppInput from '../../../core/components/AppInput.vue';
import AppNotification from '../../../core/components/AppNotification.vue';
import { Incident } from '../models/incident.entity.js';
import { incidentApiService } from '../services/incident-api.service.js';
import { personnelService } from '../../personnel/services/personnel-api.service.js';

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

      // Notifications
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',

      // Validations
      errors: {}
    };
  },
  computed: {
    isEditing() {
      return this.incident && this.incident.id;
    },

    severityOptions() {
      return Incident.SEVERITIES.map(s => ({
        value: s.value,
        label: s.label
      }));
    },

    statusOptions() {
      return Incident.STATUSES.map(s => ({
        value: s.value,
        label: s.label
      }));
    },

    incidentTypeOptions() {
      return Incident.INCIDENT_TYPES.map(t => ({
        value: t.value,
        label: t.label
      }));
    },

    personnelOptions() {
      const options = this.personnel.map(person => ({
        value: person.id,
        label: `${person.name} ${person.lastname} - ${person.position}`
      }));

      options.unshift({
        value: null,
        label: 'Sin asignar'
      });

      return options;
    }
  },
  watch: {
    incident: {
      handler() {
        this.initializeForm();
      },
      immediate: true
    }
  },
  async mounted() {
    await this.loadPersonnel();
  },
  methods: {
    async initializeForm() {
      this.errors = {};

      if (this.isEditing && this.incident) {
        this.localIncident = new Incident({
          ...this.incident,
          projectId: this.projectId
        });
      } else {
        this.localIncident = new Incident({
          projectId: this.projectId
        });
      }
    },

    async loadPersonnel() {
      try {
        this.personnel = await personnelService.getByProject(this.projectId);
      } catch (error) {
        console.error('Error loading personnel:', error);
      }
    },

    validateForm() {
      const validation = this.localIncident.validate();
      this.errors = {};

      if (!validation.isValid) {
        validation.errors.forEach(error => {
          if (error.includes('Project')) this.errors.projectId = error;
          else if (error.includes('Title')) this.errors.title = error;
          else if (error.includes('Description')) this.errors.description = error;
          else if (error.includes('Incident type')) this.errors.incidentType = error;
          else if (error.includes('Location')) this.errors.location = error;
          else if (error.includes('Occurrence')) this.errors.occurredAt = error;
        });
      }

      return validation.isValid;
    },

    async processImage() {
      if (this.localIncident.imageFile && this.localIncident.imageFile instanceof File) {
        try {
          const validatedFile = await incidentApiService.processImage(this.localIncident.imageFile);
          this.localIncident.imageFile = validatedFile;
          return true;
        } catch (error) {
          console.error('Error validating image:', error);
          this.showNotificationMessage('Error validating image: ' + error.message, 'error');
          return false;
        }
      }
      return true;
    },

    async handleSave() {
      this.loading = true;

      try {
        const imageProcessed = await this.processImage();
        if (!imageProcessed) return;

        const isValid = this.validateForm();
        if (!isValid) {
          this.showNotificationMessage('Por favor corrige los errores', 'error');
          return;
        }

        let savedIncident;

        if (this.isEditing) {
          savedIncident = await incidentApiService.update(this.localIncident.id, this.localIncident);
          this.showNotificationMessage('Incidente actualizado correctamente', 'success');
        } else {
          savedIncident = await incidentApiService.create(this.localIncident);
          this.showNotificationMessage('Incidente creado correctamente', 'success');
        }

        this.$emit('save', savedIncident);

      } catch (error) {
        console.error('Error saving incident:', error);
        this.showNotificationMessage(error.message || 'Error al guardar el incidente', 'error');
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

    onImageChange(file) {
      if (file) {
        this.localIncident.setImageFile(file);
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
          <h1>{{ isEditing ? 'Editar Incidente' : 'Nuevo Incidente' }}</h1>
          <p class="header-subtitle">
            {{ isEditing ? 'Información básica' : 'Detalles del incidente' }}
          </p>
        </div>
      </div>

      <div class="header-actions">
        <AppButton
            label="Cancelar"
            variant="secondary"
            @click="handleCancel"
            :disabled="loading"
        />
        <AppButton
            :label="isEditing ? 'Guardar Cambios' : 'Crear Incidente'"
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
          <h2 class="form-section-title">Información Básica</h2>
          <div class="form-grid">
            <AppInput
                v-model="localIncident.title"
                label="Título"
                placeholder="Ingrese el título del incidente"
                :error="errors.title"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localIncident.location"
                label="Ubicación"
                placeholder="Ingrese la ubicación"
                :error="errors.location"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localIncident.incidentType"
                label="Tipo de Incidente"
                type="select"
                placeholder="Seleccione el tipo"
                :options="incidentTypeOptions"
                :error="errors.incidentType"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localIncident.severity"
                label="Severidad"
                type="select"
                placeholder="Seleccione la severidad"
                :options="severityOptions"
                :error="errors.severity"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localIncident.status"
                label="Estado"
                type="select"
                placeholder="Seleccione el estado"
                :options="statusOptions"
                :error="errors.status"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localIncident.occurredAt"
                label="Fecha de Ocurrencia"
                type="datetime-local"
                :error="errors.occurredAt"
                :disabled="loading"
                required
            />

            <AppInput
                v-model="localIncident.description"
                label="Descripción"
                type="textarea"
                placeholder="Describa el incidente"
                :error="errors.description"
                :disabled="loading"
                required
            />
          </div>
        </div>

        <!-- Assignment Information -->
        <div class="form-section">
          <h2 class="form-section-title">Asignación</h2>
          <div class="form-grid">
            <AppInput
                v-model="localIncident.reportedBy"
                label="Reportado Por"
                type="select"
                placeholder="Seleccione quien reporta"
                :options="personnelOptions"
                :disabled="loading"
            />

            <AppInput
                v-model="localIncident.assignedTo"
                label="Asignado A"
                type="select"
                placeholder="Seleccione a quien asignar"
                :options="personnelOptions"
                :disabled="loading"
            />

            <AppInput
                v-model="localIncident.resolvedAt"
                label="Fecha de Resolución"
                type="datetime-local"
                :disabled="loading || localIncident.status !== 'RESUELTO'"
            />

            <AppInput
                v-model="localIncident.imageFile"
                label="Imagen"
                type="file"
                accept="image/*"
                :disabled="loading"
                @change="onImageChange"
            />

            <AppInput
                v-model="localIncident.notes"
                label="Notas"
                type="textarea"
                placeholder="Notas adicionales"
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