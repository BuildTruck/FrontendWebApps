<script>
import AppNotification from '../../../core/components/AppNotification.vue'
import AppButton from '../../../core/components/AppButton.vue'
import IncidentForm from './incident-form.component.vue'
import { IncidentApiService } from "../services/incident-api.service.js";
import { Incident } from "../models/incident.entity.js";

export default {
  name: 'IncidentSupervisor',
  components: {
    IncidentForm,
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
      loading: false,
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',
      incidentService: new IncidentApiService(),

      // Control de formulario para agregar
      showAddForm: false,
      selectedIncident: null,
    }
  },
  computed: {
    currentProjectId() {
      return this.projectId || this.getCurrentProjectIdFromSession();
    }
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

    handleAdd() {
      this.selectedIncident = new Incident({ projectId: this.currentProjectId });
      this.showAddForm = true;
    },

    async handleSave(incident) {
      try {
        console.log('🎯 handleSave called with:', incident);

        this.notificationMessage = incident.id
            ? this.$t('incidents.incidentUpdated')
            : this.$t('incidents.incidentCreated');

        this.showNotification = true;
        this.showAddForm = false;
        this.selectedIncident = null;

        // Forzar recarga del IncidentForm
        await this.$refs.incidentForm?.loadIncidents();

        console.log('✅ Incident operation completed:', incident);
      } catch (error) {
        console.error('❌ Error in handleSave:', error);
        this.notificationMessage = error.message || this.$t('incidents.errorSaving');
        this.notificationType = 'error';
        this.showNotification = true;
      }
    },

    handleCancel() {
      this.showAddForm = false;
      this.selectedIncident = null;
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    }
  }
}
</script>

<template>
  <div class="incident-supervisor">
    <!-- Header con botón Agregar (solo cuando no está en modo agregar) -->
    <div v-if="!showAddForm" class="supervisor-header">
      <div class="header-left">
        <h2 class="page-title">{{ $t('incidents.incidentManagement', 'Gestión de Incidentes') }}</h2>
        <p class="page-subtitle">{{ $t('incidents.manageIncidentsDescription', 'Administra y supervisa todos los incidentes del proyecto') }}</p>
      </div>
      <div class="header-actions">
        <AppButton
            :label="$t('incidents.addNew', 'Agregar Incidente')"
            variant="primary"
            icon="pi pi-plus"
            @click="handleAdd"
        />
      </div>
    </div>

    <!-- Formulario para agregar nuevo incidente -->
    <div v-if="showAddForm" class="add-form-container">
      <IncidentForm
          :project-id="currentProjectId"
          :readonly="false"
          :allow-editing="true"
          :is-adding-new="true"
          :incident="selectedIncident"
          @cancel="handleCancel"
          @save="handleSave"
      />
    </div>

    <!-- Vista general (tabla + detalle + edición) -->
    <div v-if="!showAddForm" class="general-view">
      <IncidentForm
          ref="incidentForm"
          :project-id="currentProjectId"
          :readonly="false"
          :allow-editing="true"
      />
    </div>

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
.incident-supervisor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

/* Header del supervisor */
.supervisor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  margin: 2rem 2rem 0 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #333;
}

.page-subtitle {
  margin: 0;
  color: #666;
  font-size: 1.125rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

/* Contenedor del formulario de agregar */
.add-form-container {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

/* Vista general */
.general-view {
  flex: 1;
  overflow-y: auto;
}

/* Responsive */
@media (max-width: 1200px) {
  .supervisor-header {
    margin: 1.5rem;
    padding: 1.5rem;
  }

  .page-title {
    font-size: 1.75rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }
}

@media (max-width: 992px) {
  .supervisor-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    margin: 1rem;
    padding: 1.5rem;
  }

  .header-left {
    text-align: center;
  }

  .header-actions {
    justify-content: center;
  }

  .add-form-container {
    padding: 1rem;
  }
}

@media (max-width: 768px) {
  .supervisor-header {
    margin: 0.75rem;
    padding: 1rem;
    border-radius: 8px;
  }

  .page-title {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .page-subtitle {
    font-size: 0.875rem;
  }

  .header-actions {
    flex-direction: column;
    gap: 0.5rem;
  }

  .add-form-container {
    padding: 0.75rem;
  }
}

@media (max-width: 480px) {
  .supervisor-header {
    margin: 0.5rem;
    padding: 0.75rem;
    gap: 1rem;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .page-subtitle {
    font-size: 0.75rem;
  }

  .add-form-container {
    padding: 0.5rem;
  }
}

/* Animaciones */
@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.supervisor-header {
  animation: slideInDown 0.4s ease-out;
}

/* Estilos para integración con IncidentForm */
:deep(.incident-form) {
  background-color: transparent;
}

:deep(.manager-header) {
  margin-top: 0;
  margin-bottom: 2rem;
}
</style>