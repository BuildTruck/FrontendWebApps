<script>
import AppButton from "../components/AppButton.vue";

export default {
  name: 'ProjectManagerLayout',
  components: {
    AppButton
  },
  props: {
    projectName: {
      type: String,
      default: 'Obra'
    },
    projectId: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      tabs: [
        { id: 'documentacion', label: 'Documentación', route: 'documentacion', active: false, count: null },
        { id: 'personal', label: 'Personal', route: 'personal', active: true, count: 1 },
        { id: 'inventario', label: 'Inventario', route: 'inventario', active: false, count: 9 },
        { id: 'incidentes', label: 'Incidentes', route: 'incidentes', active: false, count: 214 },
        { id: 'maquinaria', label: 'Maquinaria', route: 'maquinaria', active: false, count: null },
        { id: 'configuracion', label: 'Configuración de la obra', route: 'configuracion', active: false, count: null }
      ],
      activeTab: 'personal',
      searchQuery: ''
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
    },
    handleSearch() {
      // Implementar lógica de búsqueda
      console.log('Buscando:', this.searchQuery);
    }
  }
}
</script>

<template>
  <div class="project-layout">
    <!-- Cabecera de la obra -->
    <header class="project-header">
      <div class="logo-container">
        <div class="logo"></div>
      </div>
      <h1 class="project-title">{{ projectName }}</h1>
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

    <!-- Barra de búsqueda y acciones -->
    <div class="action-bar">
      <div class="search-container">
        <div class="search-input-wrapper">
          <i class="pi pi-search search-icon"></i>
          <input
              type="text"
              v-model="searchQuery"
              placeholder="Buscar"
              class="search-input"
              @keyup.enter="handleSearch"
          />
          <button class="search-dropdown-button">
            <i class="pi pi-chevron-down"></i>
          </button>
        </div>
      </div>
      <div class="action-buttons">
        <AppButton
            label="Filtro"
            icon="pi pi-filter"
            variant="primary"
            size="normal"
            type="filter"
        />
        <AppButton
            icon="pi pi-download"
            variant="primary"
            size="normal"
        />
      </div>
    </div>

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

/* Logo usando background-image */
.logo {
  width: 80px;
  height: 30px;
  background-image: url('../../../assets/buildtruck-logo.svg');
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
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
  border-bottom: 3px solid transparent;
}

.tab-item:hover {
  color: #FF5F01;
}

.tab-item.active {
  color: #FF5F01;
  border-bottom: 3px solid #FF5F01;
}

.tab-counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #FF5F01;
  color: white;
  border-radius: 10px;
  font-size: 0.7rem;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  padding: 12px 20px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eaeaea;
}

.search-container {
  flex: 1;
  max-width: 400px;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.search-icon {
  padding: 0 10px;
  color: #777;
}

.search-input {
  flex: 1;
  border: none;
  padding: 8px 0;
  font-size: 0.9rem;
  outline: none;
}

.search-dropdown-button {
  background: none;
  border: none;
  border-left: 1px solid #ddd;
  padding: 8px 10px;
  cursor: pointer;
  color: #777;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.project-content {
  padding: 20px;
  height: calc(100vh - 170px);
  overflow-y: auto;
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

  .action-bar {
    flex-direction: column;
    gap: 10px;
  }

  .search-container {
    max-width: 100%;
  }

  .project-content {
    padding: 15px;
    height: calc(100vh - 230px);
  }

  .back-button-container {
    bottom: 20px;
    left: 20px;
  }
}
</style>