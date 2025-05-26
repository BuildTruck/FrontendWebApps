<script>
import AppCard from "../../../core/components/AppCard.vue";
import AppButton from "../../../core/components/AppButton.vue";
import AppInput from "../../../core/components/AppInput.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import LocationInput from "../../../core/components/LocationInput.vue";
import { projectService } from '../services/projects-api.service.js'
import { Projects } from '../models/projects.entity.js'
import { AuthService } from "../../../auth/services/auth-api.service.js"

export default {
  name: 'ProjectsManager',
  components: {
    AppCard,
    AppButton,
    AppInput,
    AppNotification,
    LocationInput
  },
  data() {
    return {
      projects: [],
      loading: true,
      creating: false,
      managerName: '',
      showModal: false,
      supervisors: [],
      newProject: {
        name: '',
        description: '',
        location: '',
        locationData: null,
        start_date: '',
        supervisorEmail: '',
        state: 'En estudio',
        image: null
      },
      errors: {
        name: '',
        description: '',
        location: '',
        start_date: '',
        supervisorEmail: '',
        image: ''
      },
      notification: {
        show: false,
        message: '',
        type: 'success',
        autoClose: true
      }
    }
  },
  async mounted() {
    console.log('🔍 [ProjectsManager] ProjectId:', this.projectId)
    console.log('🔍 [ProjectsManager] Props:', this.$props)

    if (this.$route.path !== '/proyectos') {
      console.log('🚫 ProjectsManager no debería ejecutarse en esta ruta')
      return
    }

    await this.loadProjects();
    await this.loadSupervisors();
  },
  methods: {

    getStateOptions() {
      return Projects.getStateOptions(this.$t);
    },
    showNotification(message, type = 'success', autoClose = true) {
      this.notification = {
        show: true,
        message,
        type,
        autoClose
      };
    },

    async loadProjects() {
      this.loading = true;
      try {
        // ✅ Usar AuthService
        const user = AuthService.getCurrentUser();
        if (!user) {
          this.$router.push('/login');
          return;
        }

        this.managerName = user.name;
        const res = await projectService.getProjectsByManager(user.id);
        this.projects = res.data || [];
      } catch (error) {
        console.error('Error al obtener proyectos:', error);
        this.projects = [];
        this.showNotification('Error al cargar proyectos', 'error');
      } finally {
        this.loading = false;
      }
    },

    async loadSupervisors() {
      try {
        const response = await projectService.getAvailableSupervisors();
        this.supervisors = response.data || [];
      } catch (error) {
        console.error('Error al obtener supervisores:', error);
        this.supervisors = [];
        this.showNotification('Error al cargar lista de supervisores', 'error');
      }
    },

    handleProjectClick(project) {
      this.$router.push({
        path: `/proyecto/${project.id}/documentacion`,
        query: { name: project.name }
      });
    },

    openModal() {
      this.showModal = true;
      // Reset form
      this.newProject = {
        name: '',
        description: '',
        location: '',
        locationData: null,
        start_date: new Date().toISOString().split('T')[0],
        supervisorEmail: '',
        state: 'En estudio',
        image: null
      };
      this.errors = {
        name: '',
        description: '',
        location: '',
        start_date: '',
        supervisorEmail: '',
        image: ''
      };
    },

    closeModal() {
      this.showModal = false;
      this.creating = false; // ✅ Reset estado de creación
    },

    validateForm() {
      let isValid = true;

      // Nombre
      if (!this.newProject.name || !this.newProject.name.trim()) {
        this.errors.name = 'El nombre del proyecto es obligatorio';
        isValid = false;
      } else {
        this.errors.name = '';
      }

      // Descripción
      if (!this.newProject.description || !this.newProject.description.trim()) {
        this.errors.description = 'La descripción es obligatoria';
        isValid = false;
      } else {
        this.errors.description = '';
      }

      // Ubicación
      if (!this.newProject.location || !this.newProject.location.trim()) {
        this.errors.location = 'La ubicación es obligatoria';
        isValid = false;
      } else {
        this.errors.location = '';
      }

      // Fecha de inicio
      if (!this.newProject.start_date) {
        this.errors.start_date = 'La fecha de inicio es obligatoria';
        isValid = false;
      } else {
        this.errors.start_date = '';
      }

      // Supervisor (email)
      if (!this.newProject.supervisorEmail || !this.newProject.supervisorEmail.trim()) {
        this.errors.supervisorEmail = 'El correo del supervisor es obligatorio';
        isValid = false;
      } else {
        // Validación del formato de correo electrónico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.newProject.supervisorEmail)) {
          this.errors.supervisorEmail = 'Formato de correo electrónico inválido';
          isValid = false;
        } else {
          this.errors.supervisorEmail = '';
        }
      }

      return isValid;
    },

    handleImageChange(file) {
      console.log("Archivo recibido en handleImageChange:", file);

      // ✅ Validaciones adicionales del lado del cliente
      if (file) {
        // Validar tipo
        if (!file.type.startsWith('image/')) {
          this.errors.image = 'El archivo debe ser una imagen (JPG, PNG, etc.)';
          this.newProject.image = null;
          return;
        }

        // Validar tamaño (10MB máximo)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          this.errors.image = 'La imagen es demasiado grande. Máximo 10MB permitido.';
          this.newProject.image = null;
          return;
        }

        // Limpiar error si todo está bien
        this.errors.image = '';
      }

      this.newProject.image = file;
    },

    handleLocationSelected(locationData) {
      console.log('Ubicación seleccionada:', locationData);
      this.newProject.locationData = locationData;

      if (locationData && locationData.coordinates) {
        console.log('Coordenadas:', locationData.coordinates);
      }
    },

    async createProject() {
      if (!this.validateForm()) {
        this.showNotification('Por favor, complete todos los campos obligatorios correctamente', 'warning');
        return;
      }

      // ✅ Prevenir múltiples clicks
      if (this.creating) {
        return;
      }

      this.creating = true; // ✅ Activar estado de carga

      try {
        const user = AuthService.getCurrentUser();
        if (!user) {
          this.$router.push('/login');
          return;
        }


        let supervisorId = null;
        try {
          const supervisorResponse = await projectService.getSupervisorByEmail(this.newProject.supervisorEmail);

          if (!supervisorResponse.data) {
            this.errors.supervisorEmail = 'No existe un supervisor con este correo';
            this.showNotification(`No existe un supervisor con el correo ${this.newProject.supervisorEmail}`, 'error', false);
            return;
          }

          const supervisor = supervisorResponse.data;
          if (supervisor.projectId) {
            this.errors.supervisorEmail = 'Este supervisor ya está asignado a otro proyecto';
            this.showNotification(`El supervisor ${supervisor.name} ya está asignado a otro proyecto`, 'error', false);
            return;
          }

          supervisorId = supervisor.id;
        } catch (supervisorError) {
          console.error('Error al verificar supervisor:', supervisorError);
          this.errors.supervisorEmail = 'Error al verificar el supervisor';
          this.showNotification('Error al verificar el supervisor', 'error');
          return;
        }

        // ✅ Subir imagen con mejor manejo de errores
        let imageUrl;
        try {
          this.showNotification('Procesando imagen...', 'info', false);
          imageUrl = await projectService.uploadProjectImage(this.newProject.image);
          console.log('Imagen procesada exitosamente');
        } catch (imageError) {
          console.error('Error procesando imagen:', imageError);

          // Mostrar error específico de imagen
          if (imageError.message.includes('demasiado grande')) {
            this.errors.image = 'La imagen es demasiado grande. Prueba con una imagen más pequeña.';
            this.showNotification('La imagen es demasiado grande. Prueba con una imagen más pequeña.', 'error', false);
          } else if (imageError.message.includes('imagen')) {
            this.errors.image = imageError.message;
            this.showNotification(imageError.message, 'error', false);
          } else {
            this.showNotification('Error procesando la imagen. Se usará imagen predeterminada.', 'warning');
            imageUrl = '/images/proyecto-default.jpg';
          }

          if (this.errors.image) {
            return; // Detener si hay error de imagen
          }
        }


        const project = new Projects({
          name: this.newProject.name,
          description: this.newProject.description,
          image: imageUrl,
          managerId: user.id,
          location: this.newProject.location,
          coordinates: this.newProject.locationData?.coordinates || null,
          start_date: this.newProject.start_date,
          supervisorId: supervisorId,
          state: this.newProject.state
        });

        this.showNotification('Creando proyecto...', 'info', false);

        // Crear proyecto usando el servicio
        await projectService.createFullProject(project);

        // Mostrar notificación de éxito
        this.showNotification(`Proyecto "${this.newProject.name}" creado correctamente`, 'success');

        // Recargar proyectos
        await this.loadProjects();

        // Cerrar modal
        this.closeModal();

      } catch (error) {
        console.error('Error al crear el proyecto:', error);

        // ✅ Manejo específico de errores
        let errorMessage = 'Error al crear el proyecto';

        if (error.message) {
          if (error.message.includes('supervisor')) {
            errorMessage = `Error: ${error.message}`;
          } else if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
            errorMessage = 'El proyecto es demasiado grande. Prueba con una imagen más pequeña.';
          } else if (error.message.includes('imagen')) {
            errorMessage = error.message;
          } else {
            errorMessage = error.message;
          }
        }

        this.showNotification(errorMessage, 'error', false);
      } finally {
        this.creating = false; // ✅ Desactivar estado de carga
      }
    }
  }
}
</script>

<template>
  <div class="projects-container">
    <div class="welcome-header">
      <h2 class="welcome-message">{{ $t('projects.welcome') }}, {{ managerName }}</h2>
    </div>

    <div v-if="loading" class="loading-container">
      <i class="pi pi-spin pi-spinner loading-icon"></i>
      <span>{{ $t('general.loading') }}</span>
    </div>

    <div v-else class="projects-wrapper">
      <div class="project-list">
        <div class="add-project-button-container">
          <AppButton
              :label="$t('projects.addNewProject')"
              variant="primary"
              size="large"
              @click="openModal"
          />
        </div>

        <div v-if="projects.length === 0" class="empty-container">
          <div class="empty-content">
            <i class="pi pi-briefcase empty-icon"></i>
            <h3>{{ $t('projects.noProjectsAvailable') }}</h3>
            <p>{{ $t('projects.noProjects') }}</p>
            <p class="empty-note">{{ $t('projects.createFirstProject') }}</p>

            <!-- Botón adicional para crear proyecto -->
            <div class="empty-actions">
              <AppButton
                  :label="$t('projects.createNewProject')"
                  variant="primary"
                  @click="openModal"
                  icon="pi pi-plus"
              />
            </div>
          </div>
        </div>

        <AppCard
            v-for="project in projects"
            :key="project.id"
            :title="project.name"
            :description="project.description"
            :image="project.image || '/images/proyecto-default.jpg'"
            variant="project"
            @click="handleProjectClick(project)"
        />
      </div>
    </div>

    <!-- Modal para añadir nuevo proyecto -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="form-container">
          <!-- Primera fila: Nombre y Estado -->
          <div class="form-row">
            <div class="form-group">
              <AppInput
                  v-model="newProject.name"
                  :label="$t('projects.projectName')"
                  :placeholder="$t('projects.enterProjectName')"
                  :error="errors.name"
                  required
                  fullWidth
              />
            </div>

            <div class="form-group">
              <AppInput
                  v-model="newProject.state"
                  :label="$t('projects.projectStatus')"
                  type="select"
                  :options="getStateOptions()"
                  required
                  fullWidth
              />
            </div>
          </div>

          <!-- Segunda fila: Ubicación y Descripción -->
          <div class="form-row">
            <div class="form-group">
              <LocationInput
                  v-model="newProject.location"
                  :label="$t('projects.location')"
                  :placeholder="$t('projects.locationPlaceholder')"
                  :error="errors.location"
                  required
                  fullWidth
                  @location-selected="handleLocationSelected"
              />
            </div>

            <div class="form-group">
              <AppInput
                  v-model="newProject.description"
                  :label="$t('projects.description')"
                  :placeholder="$t('projects.enterDescription')"
                  type="textarea"
                  :error="errors.description"
                  required
                  fullWidth
              />
            </div>
          </div>

          <!-- Tercera fila: Fecha de inicio -->
          <div class="form-row">
            <div class="form-group">
              <AppInput
                  v-model="newProject.start_date"
                  :label="$t('projects.estimatedStartDate')"
                  :placeholder="$t('projects.selectDate')"
                  type="date"
                  :error="errors.start_date"
                  required
                  fullWidth
              />
            </div>
          </div>

          <!-- Cuarta fila: Supervisor -->
          <div class="form-row">
            <div class="form-group">
              <AppInput
                  v-model="newProject.supervisorEmail"
                  :label="$t('projects.assignedSupervisor')"
                  :placeholder="$t('projects.enterSupervisorEmail')"
                  type="email"
                  :error="errors.supervisorEmail"
                  required
                  fullWidth
              />
            </div>
          </div>

          <!-- Fila para la imagen (opcional) -->
          <div class="form-row">
            <div class="form-group">
              <AppInput
                  v-model="newProject.image"
                  type="photo"
                  :label="$t('projects.projectImage')"
                  :error="errors.image"
                  fullWidth
                  @file-selected="handleImageChange"
              />
            </div>
          </div>

          <!-- Botones de acción -->
          <div class="button-container">
            <AppButton
                :label="$t('general.cancel')"
                variant="secondary"
                @click="closeModal"
                :disabled="creating"
            />
            <AppButton
                :label="creating ? 'Creando...' : $t('projects.create')"
                variant="primary"
                @click="createProject"
                :disabled="creating"
                :loading="creating"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Componente de notificación -->
    <AppNotification
        v-model="notification.show"
        :message="notification.message"
        :type="notification.type"
        :auto-close="notification.autoClose"
        :button-text="$t('general.confirm')"
    />
  </div>
</template>

<style scoped>
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  margin-top: 2rem;
}

.empty-content {
  text-align: center;
  max-width: 500px;
  padding: 3rem 2rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  border: 2px dashed #e0e0e0;
}

.empty-icon {
  font-size: 4rem;
  color: #FF5F01;
  margin-bottom: 1.5rem;
  opacity: 0.7;
}

.empty-content h3 {
  margin: 0 0 1rem;
  color: #333;
  font-weight: 600;
  font-size: 1.5rem;
}

.empty-content p {
  margin: 0 0 0.5rem;
  color: #666;
  line-height: 1.5;
}

.empty-note {
  margin-bottom: 2rem !important;
  font-size: 0.875rem;
  color: #888;
  font-style: italic;
}

.empty-actions {
  margin-top: 1.5rem;
}

.projects-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  padding: 0;
  margin: 0;
  background-color: #ffffff;
}

.welcome-header {
  padding: 20px;
  text-align: left;
}

.welcome-message {
  font-size: 1.9rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #555;
}

.loading-icon {
  font-size: 2rem;
  color: #FF5F01;
  margin-bottom: 10px;
}

.projects-wrapper {
  padding: 0 20px;
  flex: 1;
  overflow-y: auto;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 80px;
}

.add-project-button-container {
  text-align: right;
  margin-top: 10px;
  margin-bottom: 20px;
}

/* Estilos para el modal rediseñado */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 30px;
  max-height: 90vh;
  overflow-y: auto;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-group {
  flex: 1;
}

.button-container {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 16px;
  }

  .modal-content {
    padding: 20px;
    margin: 10px;
  }

  .welcome-message {
    font-size: 1.5rem;
  }
}
</style>