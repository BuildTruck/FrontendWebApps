<script>
import AppCard from "../../../core/components/AppCard.vue";
import AppButton from "../../../core/components/AppButton.vue";
import AppInput from "../../../core/components/AppInput.vue";
import AppNotification from "../../../core/components/AppNotification.vue"; // Importar componente de notificación
import { projectService } from '../services/projects-api.service.js'
import { Projects } from '../models/projects.entity.js'

export default {
  name: 'ProjectsManager',
  components: {
    AppCard,
    AppButton,
    AppInput,
    AppNotification
  },
  data() {
    return {
      projects: [],
      loading: true,
      managerName: '',
      showModal: false,
      supervisors: [],
      newProject: {
        name: '',
        description: '',
        location: '',
        startDate: '',
        supervisorEmail: '',
        state: 'En estudio',
        image: null
      },
      errors: {
        name: '',
        description: '',
        location: '',
        startDate: '',
        supervisorEmail: '',
        image: ''
      },
      // Añadir estado para las notificaciones
      notification: {
        show: false,
        message: '',
        type: 'success',
        autoClose: true
      }
    }
  },
  async mounted() {
    await this.loadProjects();
    await this.loadSupervisors();
  },
  methods: {
    // Método para mostrar notificaciones
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
        const user = JSON.parse(localStorage.getItem('user')) || { id: 1, name: 'So Gerente' };
        this.managerName = user?.name || 'So Gerente';

        // Usar el servicio para obtener proyectos
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
        // Utilizamos un fetch para obtener supervisores disponibles
        const response = await fetch('http://localhost:3500/users?role=supervisor');
        const supervisors = await response.json();

        // Filtramos para obtener solo los que están disponibles (sin proyecto asignado)
        this.supervisors = supervisors
            .filter(supervisor => !supervisor.projectId)
            .map(supervisor => ({
              value: supervisor.id.toString(),
              label: supervisor.name
            }));
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
        startDate: new Date().toISOString().split('T')[0], // Fecha actual como valor predeterminado
        supervisorEmail: '',
        state: 'En estudio',
        image: null
      };
      this.errors = {
        name: '',
        description: '',
        location: '',
        startDate: '',
        supervisorEmail: '',
        image: ''
      };
    },

    closeModal() {
      this.showModal = false;
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
      if (!this.newProject.startDate) {
        this.errors.startDate = 'La fecha de inicio es obligatoria';
        isValid = false;
      } else {
        this.errors.startDate = '';
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
      this.newProject.image = file;
    },

    async createProject() {
      if (!this.validateForm()) {
        this.showNotification('Por favor, complete todos los campos obligatorios correctamente', 'warning');
        return;
      }

      try {
        const user = JSON.parse(localStorage.getItem('user')) || { id: 1 };

        // Validar supervisor por correo electrónico
        let supervisorId = null;
        try {
          // Buscar el supervisor por correo electrónico
          const supervisorResponse = await fetch(`http://localhost:3500/users?email=${encodeURIComponent(this.newProject.supervisorEmail)}&role=supervisor`);
          const supervisors = await supervisorResponse.json();

          if (supervisors.length === 0) {
            this.errors.supervisorEmail = 'No existe un supervisor con este correo';
            this.showNotification(`No existe un supervisor con el correo ${this.newProject.supervisorEmail}`, 'error', false);
            return;
          }

          const supervisor = supervisors[0];
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

        // Subir imagen usando el servicio
        const imageUrl = await projectService.uploadProjectImage(this.newProject.image);

        // Crear una instancia de Projects usando la entidad
        const project = new Projects({
          name: this.newProject.name,
          description: this.newProject.description,
          image: imageUrl,
          managerId: user.id,
          location: this.newProject.location,
          startDate: this.newProject.startDate,
          supervisorId: supervisorId,
          state: this.newProject.state,
          progress: 0 // Agregar progreso explícitamente
        });

        // CAMBIAR ESTA LÍNEA: Usar el nuevo método createFullProject en lugar de createProject
        await projectService.createFullProject(project);

        // Mostrar notificación de éxito
        this.showNotification(`Proyecto "${this.newProject.name}" creado correctamente`, 'success');

        // Recargar proyectos
        await this.loadProjects();

        // Cerrar modal
        this.closeModal();
      } catch (error) {
        console.error('Error al crear el proyecto:', error);

        // Mostrar notificación de error con mensaje personalizado
        let errorMessage = 'Error al crear el proyecto';

        if (error.message.includes('supervisor')) {
          errorMessage = `Error: ${error.message}`;
        }

        this.showNotification(errorMessage, 'error', false);
      }
    }
  }
}
</script>

<template>
  <div class="projects-container">
    <div class="welcome-header">
      <h2 class="welcome-message">Bienvenido, {{ managerName }}</h2>
    </div>

    <div v-if="loading" class="loading-container">
      <i class="pi pi-spin pi-spinner loading-icon"></i>
      <span>Cargando proyectos...</span>
    </div>

    <div v-else class="projects-wrapper">
      <div class="project-list">
        <!-- Usando el componente AppCard para cada proyecto -->
        <div class="add-project-button-container">
          <!-- Botón de añadir proyecto -->
          <AppButton
              label="Añadir nuevo Proyecto"
              variant="primary"
              size="large"
              @click="openModal"
          />
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
                  label="Nombre del Proyecto"
                  placeholder="Ingrese el nombre del Proyecto"
                  :error="errors.name"
                  required
                  fullWidth
              />
            </div>

            <div class="form-group">
              <AppInput
                  v-model="newProject.state"
                  label="Estado del proyecto"
                  type="select"
                  :options="[
                    { value: 'En estudio', label: 'En estudio' },
                    { value: 'Planificado', label: 'Planificado' },
                    { value: 'En ejecución', label: 'En ejecución' },
                    { value: 'Finalizado', label: 'Finalizado' }
                  ]"
                  required
                  fullWidth
              />
            </div>
          </div>

          <!-- Segunda fila: Ubicación y Descripción -->
          <div class="form-row">
            <div class="form-group">
              <AppInput
                  v-model="newProject.location"
                  label="Ubicación"
                  placeholder="Dirección exacta o distrito/provincia"
                  :error="errors.location"
                  required
                  fullWidth
              />
            </div>

            <div class="form-group">
              <AppInput
                  v-model="newProject.description"
                  label="Descripción breve"
                  placeholder="Ingrese la Descripción"
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
                  v-model="newProject.startDate"
                  label="Fecha de inicio estimada"
                  placeholder="Escoja la fecha"
                  type="date"
                  :error="errors.startDate"
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
                  label="Supervisor asignado"
                  placeholder="Ingrese el correo del supervisor"
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
                  type="photo"
                  label="Imagen del proyecto"
                  :error="errors.image"
                  @change="handleImageChange"
                  required
                  fullWidth
              />
            </div>
          </div>

          <!-- Botones de acción -->
          <div class="button-container">
            <AppButton
                label="Cancelar"
                variant="secondary"
                @click="closeModal"
            />
            <AppButton
                label="Crear"
                variant="primary"
                @click="createProject"
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
        button-text="Entendido"
    />
  </div>
</template>

<style scoped>
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
  }

  .welcome-message {
    font-size: 1.5rem;
  }
}
</style>