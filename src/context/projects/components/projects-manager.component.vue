<script>
import AppCard from "../../../core/components/AppCard.vue";
import AppButton from "../../../core/components/AppButton.vue";
import AppInput from "../../../core/components/AppInput.vue";
import { projectService } from '../services/projects-api.service.js'
import { Projects } from '../models/projects.entity.js'
import http from '../../../core/services/http.service'

export default {
  name: 'ProjectsManager',
  components: {
    AppCard,
    AppButton,
    AppInput
  },
  data() {
    return {
      projects: [],
      loading: true,
      managerName: '',
      showModal: false,
      newProject: {
        name: '',
        description: '',
        location: '',
        startDate: '',
        supervisor: '',
        state: 'En estudio',
        image: null
      },
      errors: {
        name: '',
        description: '',
        location: '',
        startDate: '',
        supervisor: '',
        image: ''
      },
      menuItems: [
        { id: 'proyectos', label: 'Proyectos', icon: 'pi pi-home', route: '/proyectos', active: true },
        { id: 'estadisticas', label: 'Estadísticas generales', icon: 'pi pi-chart-bar', route: '/estadisticas', active: false },
        { id: 'reportes', label: 'Reportes globales', icon: 'pi pi-file', route: '/reportes', active: false },
        { id: 'configuraciones', label: 'Configuraciones', icon: 'pi pi-cog', route: '/configuraciones', active: false }
      ],
      profileItems: [
        { id: 'perfil', label: 'Mi perfil', icon: 'pi pi-user', route: '/perfil', active: false },
        { id: 'salir', label: 'Salir', icon: 'pi pi-sign-out', route: '/logout', active: false }
      ]
    }
  },
  computed: {
    activeMenuId() {
      const currentPath = this.$route.path;
      for (const item of [...this.menuItems, ...this.profileItems]) {
        if (currentPath.includes(item.id)) {
          return item.id;
        }
      }
      return 'proyectos'; // Default
    }
  },
  async mounted() {
    await this.loadProjects();
  },
  methods: {
    async loadProjects() {
      this.loading = true;
      try {
        const user = JSON.parse(localStorage.getItem('user')) || { id: 1, name: 'Tomás Rivas' };
        this.managerName = user?.name || 'Tomás Rivas';

        const res = await projectService.getProjectsByManager(user.id);

        // Asegurarse de que res.data es un array
        if (res && res.data) {
          this.projects = Array.isArray(res.data) ? res.data : [];
        } else {
          console.warn('No se recibieron datos de proyectos');
          this.projects = [];
        }

        // Si no hay proyectos en desarrollo, cargar datos de ejemplo
        if (this.projects.length === 0) {
          this.projects = [
            {
              id: "p001",
              name: "Residencial Las Palmeras",
              description: "Proyecto habitacional de 6 torres de departamentos en Lurín. Incluye supervisión de estructuras, acabados y control de materiales en tiempo real.",
              image: "/images/proyecto1.jpg",
              managerId: 1
            },
            {
              id: "p002",
              name: "Edificio Corporativo EcoTower",
              description: "Edificio de oficinas de 10 pisos con sistema de eficiencia energética. Seguimiento detallado de personal técnico, cronograma y gestión de insumos.",
              image: "/images/proyecto2.jpg",
              managerId: 1
            },
            {
              id: "p003",
              name: "Construcción del Edificio Monteverde",
              description: "Edificio de 12 pisos. Supervisión de avance y control de materiales.",
              image: "/images/proyecto3.jpg",
              managerId: 1
            }
          ];
        }
      } catch (error) {
        console.error('Error al obtener proyectos:', error);
        // Datos de respaldo en caso de error
        this.projects = [
          {
            id: "p001",
            name: "Residencial Las Palmeras",
            description: "Proyecto habitacional de 6 torres de departamentos en Lurín. Incluye supervisión de estructuras, acabados y control de materiales en tiempo real.",
            image: "/images/proyecto1.jpg",
            managerId: 1
          },
          {
            id: "p002",
            name: "Edificio Corporativo EcoTower",
            description: "Edificio de oficinas de 10 pisos con sistema de eficiencia energética. Seguimiento detallado de personal técnico, cronograma y gestión de insumos.",
            image: "/images/proyecto2.jpg",
            managerId: 1
          }
        ];
      } finally {
        this.loading = false;
      }
    },
    navigateTo(route) {
      this.$router.push(route);
    },
    openModal() {
      this.showModal = true;
      // Reset form
      this.newProject = {
        name: '',
        description: '',
        location: '',
        startDate: '',
        supervisor: '',
        state: 'En estudio',
        image: null
      };
      this.errors = {
        name: '',
        description: '',
        location: '',
        startDate: '',
        supervisor: '',
        image: ''
      };
    },
    closeModal() {
      this.showModal = false;
    },
    validateForm() {
      let isValid = true;

      if (!this.newProject.name.trim()) {
        this.errors.name = 'El nombre del proyecto es obligatorio';
        isValid = false;
      } else {
        this.errors.name = '';
      }

      if (!this.newProject.description.trim()) {
        this.errors.description = 'La descripción es obligatoria';
        isValid = false;
      } else {
        this.errors.description = '';
      }

      if (!this.newProject.location?.trim()) {
        this.errors.location = 'La ubicación es obligatoria';
        isValid = false;
      } else {
        this.errors.location = '';
      }

      return isValid;
    },
    handleImageChange(file) {
      this.newProject.image = file;
    },
    async createProject() {
      if (!this.validateForm()) {
        return;
      }

      try {
        const user = JSON.parse(localStorage.getItem('user')) || { id: 1 };

        // Procesar la imagen utilizando el método del servicio
        const imageUrl = await projectService.uploadProjectImage(this.newProject.image);

        // Crear un ID único con formato similar a los existentes
        const newId = `p${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`;

        // Crear proyecto usando la entidad Projects mejorada
        const projectData = {
          id: newId,
          name: this.newProject.name,
          description: this.newProject.description,
          image: imageUrl || '/images/proyecto-default.jpg',
          managerId: user.id,
          location: this.newProject.location,
          startDate: this.newProject.startDate,
          supervisorId: this.newProject.supervisor,
          state: this.newProject.state
        };

        // Intentar directamente con http para ver el resultado en db.json
        const response = await http.post('/projects', projectData);
        console.log('Proyecto creado:', response);

        // También mostrar los datos que se enviaron para verificación
        console.log('Datos enviados:', projectData);

        // Recargar la lista de proyectos
        await this.loadProjects();
        this.closeModal();
      } catch (error) {
        console.error('Error al crear el proyecto:', error);

        // Fallback: usar fetch como último recurso
        try {
          const user = JSON.parse(localStorage.getItem('user')) || { id: 1 };
          const newId = `p${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`;

          // Procesar la imagen
          let imageUrl = '/images/proyecto-default.jpg';
          if (this.newProject.image) {
            imageUrl = URL.createObjectURL(this.newProject.image);
          }

          const projectData = {
            id: newId,
            name: this.newProject.name,
            description: this.newProject.description,
            image: imageUrl,
            managerId: user.id,
            location: this.newProject.location,
            startDate: this.newProject.startDate,
            supervisorId: this.newProject.supervisor,
            state: this.newProject.state
          };

          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/projects`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(projectData)
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('Proyecto creado con fetch:', data);

          // Recargar proyectos
          await this.loadProjects();
          this.closeModal();
        } catch (fetchError) {
          console.error('Error con fetch:', fetchError);

          // Como último recurso, simulamos añadir el proyecto localmente
          this.addProjectLocally();
        }
      }
    },
    async addProjectLocally() {
      try {
        const user = JSON.parse(localStorage.getItem('user')) || { id: 1 };

        // Generar URL para la imagen
        let imageUrl = '/images/proyecto-default.jpg';
        if (this.newProject.image) {
          imageUrl = URL.createObjectURL(this.newProject.image);
        }

        // Generar ID único
        const newId = `p${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`;

        // Crear proyecto
        const projectData = {
          id: newId,
          name: this.newProject.name,
          description: this.newProject.description,
          image: imageUrl,
          managerId: user.id,
          location: this.newProject.location,
          startDate: this.newProject.startDate,
          supervisorId: this.newProject.supervisor,
          state: this.newProject.state
        };

        // Añadir a la lista local
        this.projects.push(projectData);

        this.closeModal();

        console.log('Proyecto añadido localmente como fallback');
      } catch (error) {
        console.error('Error incluso al añadir localmente:', error);
        alert('No se pudo crear el proyecto.');
      }
    }
  }
}
</script>

<template>
  <div class="app-container">
    <div class="manager-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="logo-container">
          <!-- Logo con background-image -->
          <div class="logo"></div>
        </div>

        <!-- Menú principal -->
        <nav class="sidebar-menu">
          <ul class="menu-list">
            <li
                v-for="item in menuItems"
                :key="item.id"
                :class="['menu-item', { active: activeMenuId === item.id }]"
                @click="navigateTo(item.route)"
            >
              <i :class="item.icon"></i>
              <span>{{ item.label }}</span>
            </li>
          </ul>
        </nav>

        <!-- Separador -->
        <div class="sidebar-divider"></div>

        <!-- Opciones de perfil -->
        <nav class="sidebar-profile">
          <ul class="menu-list">
            <li
                v-for="item in profileItems"
                :key="item.id"
                :class="['menu-item', { active: activeMenuId === item.id }]"
                @click="navigateTo(item.route)"
            >
              <i :class="item.icon"></i>
              <span>{{ item.label }}</span>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Contenido principal -->
      <main class="main-content">
        <div class="projects-container">
          <h1 class="welcome-message">Bienvenido, {{ managerName }}</h1>

          <div v-if="loading" class="loading-container">
            <i class="pi pi-spin pi-spinner loading-icon"></i>
            <span>Cargando proyectos...</span>
          </div>

          <div v-else>
            <!-- Proyectos -->
            <div class="project-list">
              <div v-for="project in projects" :key="project.id" class="project-card">
                <div class="project-img-container">
                  <img :src="project.image || '/images/proyecto-default.jpg'" alt="Imagen del proyecto" class="project-image" />
                </div>
                <div class="project-info">
                  <h2 class="project-title">{{ project.name }}</h2>
                  <p class="project-description">{{ project.description }}</p>
                  <AppButton
                      label="Ingresar"
                      variant="primary"
                      size="normal"
                      @click="alert(`Próximamente: Acceso al proyecto ${project.name}`)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Botón para añadir nuevo proyecto -->
        <AppButton
            label="Añadir nuevo Proyecto"
            variant="primary"
            size="large"
            @click="openModal"
            class="add-project-button"
        />
      </main>
    </div>

    <!-- Modal para añadir nuevo proyecto -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Nuevo Proyecto</h2>
        </div>

        <div class="modal-body">
          <div class="form-columns">
            <div class="form-column">
              <AppInput
                  v-model="newProject.name"
                  label="Nombre del Proyecto"
                  placeholder="Ingrese el nombre del Proyecto"
                  :error="errors.name"
                  required
                  fullWidth
              />

              <AppInput
                  v-model="newProject.location"
                  label="Ubicación"
                  placeholder="Dirección exacta o distrito/provincia"
                  :error="errors.location"
                  required
                  fullWidth
              />

              <AppInput
                  v-model="newProject.startDate"
                  label="Fecha de inicio estimada"
                  placeholder="Escoja la fecha"
                  type="date"
                  :error="errors.startDate"
                  fullWidth
              />

              <AppInput
                  v-model="newProject.supervisor"
                  label="Supervisor asignado"
                  placeholder="Escoja el supervisor"
                  type="select"
                  :options="[
                  { value: 'supervisor1', label: 'Juan Pérez' },
                  { value: 'supervisor2', label: 'María Torres' },
                  { value: 'supervisor3', label: 'Carlos Mejía' }
                ]"
                  :error="errors.supervisor"
                  fullWidth
              />
            </div>

            <div class="form-column">
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
                  fullWidth
              />

              <!-- Campo para subir imagen del proyecto -->
              <AppInput
                  type="photo"
                  label="Imagen del proyecto"
                  :error="errors.image"
                  @change="handleImageChange"
                  fullWidth
              />

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
        </div>

        <div class="modal-footer">
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
</template>

<style scoped>
/* Estilos generales */
.app-container {
  width: 100%;
  min-height: 100vh;
  background-color: white;
}

/* Estilos del layout */
.manager-layout {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

.sidebar {
  width: 200px;
  background-color: white;
  border-right: 1px solid #eaeaea;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}

.logo-container {
  padding: 20px;
  border-bottom: 1px solid #eaeaea;
  display: flex;
  justify-content: center;
}

/* Logo usando background-image */
.logo {
  width: 140px;
  height: 40px;
  background-image: url('../../../assets/buildtruck-logo.svg');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.sidebar-menu,
.sidebar-profile {
  padding: 10px 0;
}

.sidebar-menu {
  flex-grow: 1;
  overflow-y: auto;
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: #555;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item.active {
  background-color: #FF5F01;
  color: white;
}

.menu-item i {
  margin-right: 12px;
  font-size: 1.1rem;
}

.sidebar-divider {
  height: 1px;
  background-color: #eaeaea;
  margin: 10px 0;
}

.main-content {
  flex-grow: 1;
  margin-left: 200px;
  width: calc(100% - 200px);
  min-height: 100vh;
  position: relative;
  padding-top: 15px;
}

/* Estilos del contenido */
.projects-container {
  padding: 0 20px;
}

.welcome-message {
  font-size: 1.4rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px 0;
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

.project-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 60px;
}

.project-card {
  background-color: white;
  border-radius: 4px;
  border: 1px solid #eaeaea;
  overflow: hidden;
  display: flex;
  margin-bottom: 15px;
}

.project-img-container {
  width: 250px;
  min-width: 250px;
  overflow: hidden;
}

.project-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-info {
  padding: 15px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.project-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 10px 0;
}

.project-description {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 20px 0;
  flex-grow: 1;
}

.add-project-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 10;
}

/* Estilos del modal */
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
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #eaeaea;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.modal-body {
  padding: 24px;
  flex-grow: 1;
}

.form-columns {
  display: flex;
  gap: 30px;
}

.form-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #eaeaea;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Responsive */
@media (max-width: 992px) {
  .form-columns {
    flex-direction: column;
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 60px;
  }

  .menu-item span {
    display: none;
  }

  .menu-item i {
    margin-right: 0;
    font-size: 1.2rem;
  }

  .logo-container {
    padding: 15px 10px;
  }

  .logo {
    width: 40px;
  }

  .main-content {
    margin-left: 60px;
    width: calc(100% - 60px);
  }

  .project-card {
    flex-direction: column;
  }

  .project-img-container {
    width: 100%;
    height: 160px;
  }

  .add-project-button {
    bottom: 20px;
    right: 20px;
  }
}
</style>