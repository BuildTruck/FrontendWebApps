<script>
import PersonnelInformationSupervisor from "./personnel-information-supervisor.vue";
import PersonnelAttendanceSupervisor from "./personnel-attendance-supervisor.vue";
import PersonnelForm from "./personnel-form.vue";

export default {
  name: 'PersonnelSupervisor',
  components: {
    PersonnelInformationSupervisor,
    PersonnelAttendanceSupervisor,
    PersonnelForm
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      currentView: 'list', // 'list', 'attendance', 'form'
      personnel: [],

      // Datos del formulario
      editingPersonnel: null,
      showForm: false
    };
  },
  computed: {
    // Mover las pestañas a computed para que se actualicen con el idioma
    tabs() {
      return [
        {
          key: 'list',
          label: this.$t('personnel.tabPersonnel'),
          icon: 'pi pi-users'
        },
        {
          key: 'attendance',
          label: this.$t('personnel.tabAttendance'),
          icon: 'pi pi-calendar'
        }
      ];
    },

    currentTab() {
      return this.tabs.find(tab => tab.key === this.currentView);
    },

    showTabs() {
      return this.currentView === 'list' || this.currentView === 'attendance';
    }
  },
  methods: {
    setActiveView(viewKey) {
      if (viewKey === 'list' || viewKey === 'attendance') {
        this.currentView = viewKey;
        this.showForm = false;
      }
    },

    onPersonnelUpdated(updatedPersonnel) {
      this.personnel = updatedPersonnel;
    },

    onAttendanceUpdated(updatedPersonnel) {
      this.personnel = updatedPersonnel;
    },

    onAddPersonnel() {
      this.editingPersonnel = null;
      this.showForm = true;
      this.currentView = 'form';
    },

    onEditPersonnel(personnel) {
      this.editingPersonnel = personnel;
      this.showForm = true;
      this.currentView = 'form';
    },

    onPersonnelSaved(savedPersonnel) {
      // Volver a la lista y actualizar datos
      this.currentView = 'list';
      this.editingPersonnel = null;
      this.showForm = false;

      // El componente de lista se actualizará automáticamente
      console.log('✅ Personal guardado exitosamente:', savedPersonnel);
    },

    onFormClosed() {
      // Volver a la lista
      this.currentView = 'list';
      this.editingPersonnel = null;
      this.showForm = false;
    }
  }
};
</script>

<template>
  <div class="personnel-supervisor">
    <!-- Header con título y navegación -->
    <div class="supervisor-header" v-if="showTabs">
      <div class="header-content">
        <p class="supervisor-subtitle">
          {{ $t('personnel.subtitle') }}
        </p>
      </div>

      <!-- Navegación de pestañas -->
      <nav class="tabs-navigation">
        <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-button"
            :class="{ 'active': currentView === tab.key }"
            @click="setActiveView(tab.key)"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </div>

    <!-- Contenido de las vistas -->
    <div class="view-content">
      <!-- Vista de Lista de Personal -->
      <PersonnelInformationSupervisor
          v-if="currentView === 'list'"
          :project-id="projectId"
          @personnel-updated="onPersonnelUpdated"
          @add-personnel="onAddPersonnel"
          @edit-personnel="onEditPersonnel"
          class="view-panel"
      />

      <!-- Vista de Asistencia -->
      <PersonnelAttendanceSupervisor
          v-if="currentView === 'attendance'"
          :project-id="projectId"
          :personnel="personnel"
          @attendance-updated="onAttendanceUpdated"
          class="view-panel"
      />

      <!-- Vista de Formulario -->
      <PersonnelForm
          v-if="currentView === 'form'"
          :personnel="editingPersonnel"
          :project-id="projectId"
          :visible="showForm"
          @save="onPersonnelSaved"
          @cancel="onFormClosed"
          class="view-panel"
      />
    </div>
  </div>
</template>


<style scoped>
.personnel-supervisor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

/* Header */
.supervisor-header {
  background: linear-gradient(135deg, #FF5F01 0%, #E04E00 100%);
  color: white;
  padding: 2rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.header-content {
  margin-bottom: 1.5rem;
}

.supervisor-title {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.supervisor-title i {
  font-size: 1.75rem;
}

.supervisor-subtitle {
  margin: 0;
  font-size: 1.125rem;
  opacity: 0.9;
  font-weight: 400;
}

/* Navegación de pestañas */
.tabs-navigation {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 1rem;
  position: relative;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.tab-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-2px);
}

.tab-button.active {
  background-color: white;
  color: #FF5F01;
  border-color: white;
  box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.15),
      0 2px 4px rgba(0, 0, 0, 0.1);
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1.125rem;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}

.tab-button i {
  font-size: 1.125rem;
}

/* Contenido de pestañas */
.tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.tab-panel {
  height: 100%;
  background-color: #f8f9fa;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  animation: fadeIn 0.3s ease-out;
}

/* Responsive */
@media (max-width: 768px) {
  .supervisor-header {
    padding: 1.5rem 1rem;
  }

  .supervisor-title {
    font-size: 1.5rem;
  }

  .supervisor-subtitle {
    font-size: 1rem;
  }

  .tabs-navigation {
    flex-direction: column;
    gap: 0.25rem;
  }

  .tab-button {
    justify-content: center;
    padding: 0.75rem 1rem;
  }

  .tab-button.active::after {
    display: none;
  }
}

@media (max-width: 480px) {
  .supervisor-header {
    padding: 1rem;
  }

  .supervisor-title {
    font-size: 1.25rem;
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }

  .supervisor-subtitle {
    font-size: 0.875rem;
    text-align: center;
  }

  .tab-button {
    font-size: 0.875rem;
  }

  .tab-button i {
    font-size: 1rem;
  }
}

/* Animaciones de transición */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mejoras visuales adicionales */
.supervisor-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.05) 50%, transparent 70%);
  pointer-events: none;
}

/* Estados de carga y transiciones suaves */
.tab-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.tab-button:hover::before {
  left: 100%;
}

/* Indicador de pestaña activa mejorado */
.tabs-navigation::after {
  content: '';
  position: absolute;
  bottom: -2px;
  height: 2px;
  background-color: white;
  transition: all 0.3s ease;
  opacity: 0;
}

/* Accesibilidad mejorada */
.tab-button:focus {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

/* Sombras y profundidad */
.supervisor-header {
  box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.1),
      0 2px 4px rgba(0, 0, 0, 0.06);
}
</style>