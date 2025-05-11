<script>
import AppButton from '../../../core/components/AppButton.vue';

export default {
  name: 'ManagerLayout',
  components: {
    AppButton
  },
  props: {
    projectName: {
      type: String,
      default: 'Proyecto'
    },
    projectId: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      tabs: [
        { id: 'documentacion', label: 'Documentación', route: 'documentacion', active: true, count: null },
        { id: 'personal', label: 'Personal', route: 'personal', active: false, count: 4 },
        { id: 'inventario', label: 'Inventario', route: 'inventario', active: false, count: 2 },
        { id: 'incidentes', label: 'Incidentes', route: 'incidentes', active: false, count: 200 },
        { id: 'maquinaria', label: 'Maquinaria', route: 'maquinaria', active: false, count: null },
        { id: 'configuracion', label: 'Configuración de la obra', route: 'configuracion', active: false, count: null }
      ],
      activeTab: 'documentacion'
    }
  },
  methods: {
    setActiveTab(tabId) {
      this.activeTab = tabId;
      // Navegar a la ruta correspondiente
      this.$router.push(`/proyecto/${this.projectId}/${tabId}`);
    },
    goBack() {
      this.$router.push('/proyectos');
    }
  }
}
</script>

<template>
  <div class="project-layout">
    <!-- Encabezado del proyecto -->
    <header class="project-header">
      <div class="logo-container">
        <img src="../../../assets/buildtruck-logo.svg" alt="BuildTruck" class="logo">
      </div>
      <h1 class="project-title">Obra {{ projectName }}</h1>
    </header>

    <!-- Navegación por pestañas -->
    <nav class="tabs-navigation">
      <div
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-item', { 'active': activeTab === tab.id }]"
          @click="setActiveTab(tab.id)"
      >
        <span>{{ tab.label }}</span>
        <span v-if="tab.count !== null" class="tab-counter">{{ tab.count }}</span>
      </div>
    </nav>

    <!-- Contenido principal -->
    <main class="project-content">
      <slot></slot>
    </main>

    <!-- Botón de regreso -->
    <div class="back-button-container">
      <AppButton
          variant="back"
          icon="pi pi-arrow-left"
          @click="goBack"
      />
    </div>
  </div>
</template>

<style scoped>
.project-layout {
  min-height: 100vh;
  background-color: #f9f9f9;
  position: relative;
}

.project-header {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background-color: white;
  border-bottom: 1px solid #eaeaea;
}

.logo-container {
  margin-right: 20px;
}

.logo {
  height: 30px;
}

.project-title {
  font-size: 1.1rem;
  font-weight: 500;
  color: #333;
  margin: 0;
}

.tabs-navigation {
  display: flex;
  overflow-x: auto;
  background-color: white;
  border-bottom: 1px solid #eaeaea;
}

.tab-item {
  padding: 12px 16px;
  cursor: pointer;
  white-space: nowrap;
  color: #555;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.tab-item.active {
  color: #FF5F01;
  border-bottom: 2px solid #FF5F01;
}

.tab-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FF5F01;
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  width: 18px;
  height: 18px;
  padding: 2px;
}

.project-content {
  padding: 20px;
}

.back-button-container {
  position: fixed;
  bottom: 30px;
  left: 30px;
  z-index: 100;
}

/* Estilos responsivos */
@media (max-width: 768px) {
  .tabs-navigation {
    padding: 0 10px;
  }

  .tab-item {
    padding: 12px 10px;
    font-size: 0.8rem;
  }

  .project-content {
    padding: 15px;
  }

  .back-button-container {
    bottom: 20px;
    left: 20px;
  }
}
</style>