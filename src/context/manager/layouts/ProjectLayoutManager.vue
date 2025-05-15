<script>
import AppButton from '../../../core/components/AppButton.vue';
import LanguageSwitcher from "../../../core/components/language-switcher.component.vue";

export default {
  name: 'ProjectLayoutManager',
  components: {
    AppButton,
    LanguageSwitcher
  },
  props: {
    projectName: {
      type: String,
      default: 'Proyecto'
    },
    projectId: {
      type: String,
      required: true
    },
    // Nuevas props para recibir los contadores de forma dinámica
    tabCounters: {
      type: Object,
      default: () => ({
        documentacion: null,
        personal: null,
        inventario: null,
        incidentes: null,
        maquinaria: null,
        configuracion: null
      })
    }
  },
  data() {
    return {
      // Configuración básica de pestañas sin contadores estáticos
      tabs: [
        { id: 'documentacion', label: 'Documentación' },
        { id: 'personal', label: 'Personal' },
        { id: 'inventario', label: 'Inventario' },
        { id: 'incidentes', label: 'Incidentes' },
        { id: 'maquinaria', label: 'Maquinaria' },
        { id: 'configuracion', label: 'Configuración de la obra' }
      ],
      activeTab: ''
    }
  },
  computed: {
    // Computar las pestañas con sus contadores dinámicos
    tabsWithCounters() {
      return this.tabs.map(tab => ({
        ...tab,
        count: this.tabCounters[tab.id] // Tomar el contador de las props
      }));
    }
  },
  mounted() {
    // Determinar la pestaña activa basada en la ruta actual
    const currentPath = this.$route.path;
    const pathParts = currentPath.split('/');
    const lastPart = pathParts[pathParts.length - 1];

    // Si estamos en una ruta específica (documentacion, personal, etc.), activamos esa pestaña
    if (this.tabs.some(tab => tab.id === lastPart)) {
      this.activeTab = lastPart;
    } else {
      // Redirigir a la pestaña documentación por defecto
      this.activeTab = 'documentacion';
      this.$router.replace(`/proyecto/${this.projectId}/documentacion`);
    }
  },
  methods: {
    setActiveTab(tabId) {
      this.activeTab = tabId;
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
    <!-- Barra lateral izquierda para logo y botón -->
    <aside class="sidebar">
      <div class="logo-container">
        <div class="logo"></div>
      </div>

      <!-- Botón atrás alineado en la misma columna -->
      <div class="back-button">
        <AppButton
            icon="pi pi-arrow-left"
            variant="back"
            @click="goBack"
            class="large-back-button"
        />
      </div>
    </aside>

    <!-- Contenido principal que ocupa todo el resto del ancho -->
    <div class="main-content">
      <!-- Header -->
      <header class="project-header">
        <h1 class="project-title">Obra {{ projectName }}</h1>
        <language-switcher/>
      </header>

      <!-- Tabs Navigation con contadores dinámicos -->
      <nav class="tabs-nav">
        <div
            v-for="tab in tabsWithCounters"
            :key="tab.id"
            :class="['tab', { active: activeTab === tab.id }]"
            @click="setActiveTab(tab.id)"
        >
          {{ tab.label }}
          <span
              v-if="tab.count !== null"
              :class="['tab-count', tab.count > 0 ? 'highlight' : 'neutral']"
          >{{ tab.count }}</span>
        </div>
      </nav>

      <!-- Content - Donde se renderizarán los componentes hijos -->
      <main class="project-content">
        <router-view :projectId="projectId" :projectName="projectName"></router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* El CSS permanece igual al anterior */
/* Layout principal con barra lateral */
.project-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  background-color: #f8f8f8;
  overflow: hidden;
}

/* Barra lateral izquierda */
.sidebar {
  width: 200px; /* Ancho fijo para la barra lateral */
  background-color: #ffffff;
  border-right: 1px solid #eaeaea;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between; /* Logo arriba, botón abajo */
  padding: 16px 0;
  box-sizing: border-box;
  z-index: 10;
}

/* Contenedor del logo en la barra lateral */
.logo-container {
  width: 200px;
  height: 150px;
  margin-top: 10px;
}

.logo {
  width: 100%;
  height: 100%;
  margin-left: -20px;
  background-image: url('../../../assets/buildtruck-logo.svg');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

/* Botón de retorno en la barra lateral */
.back-button {
  margin-bottom: 20px;
}

/* Área de contenido principal - ocupa todo el resto del ancho */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Header sin el logo */
.project-header {
  padding: 16px 20px;
  background-color: #fff;
  border-bottom: 1px solid #eaeaea;
  display: flex; /* Añade esta línea */
  align-items: center; /* Añade esta línea */
  justify-content: space-between; /* Añade esta línea */
}

.project-title {
  font-size: 1.4rem;
  font-weight: 500;
  margin: 0;
  color: #333;
}

/* Navegación de pestañas */
.tabs-nav {
  display: flex;
  border-bottom: 1px solid #eaeaea;
  background-color: white;
  overflow-x: auto;
  width: 100%;
  padding: 0;
}

.tab {
  padding: 15px 25px;
  cursor: pointer;
  font-size: 1rem;
  color: #555;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  transition: 0.2s;
}

.tab.active {
  color: #ff5f01;
  border-bottom: 3px solid #ff5f01;
  font-weight: 500;
}

.tab-count {
  display: inline-block;
  min-width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  font-size: 0.8rem;
  border-radius: 50%;
}

.highlight {
  background-color: #ff5f01;
  color: white;
}

.neutral {
  background-color: #ccc;
  color: white;
}

/* Contenido principal */
.project-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box;
}

/* Estilos para hacer el botón naranja y redondo */
:deep(.large-back-button) {
  width: 55px !important;
  height: 55px !important;
  border-radius: 10% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background-color: #ff5f01 !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
  border: none !important;
}

:deep(.large-back-button .pi) {
  font-size: 24px !important;
  color: white !important;
}


.language-switcher {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 210; /* Por encima del header-bar */
}


@media (max-width: 768px) {
  .language-switcher {
    right: 15px;
  }
}

@media (max-width: 480px) {
  .language-switcher {
    right: 10px;
  }
}

/* Estilos responsivos */
@media (max-width: 768px) {
  .sidebar {
    width: 80px; /* Barra lateral más estrecha en móviles */
  }

  .logo-container {
    width: 80px;
    height: 80px;
  }

  .project-header {
    padding: 12px 15px;
  }

  .project-title {
    font-size: 1.2rem;
  }

  .tab {
    padding: 12px 18px;
    font-size: 0.9rem;
  }

  .tabs-nav {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */
  }

  .tabs-nav::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Edge */
  }

  :deep(.large-back-button) {
    width: 45px !important;
    height: 45px !important;
  }

  :deep(.large-back-button .pi) {
    font-size: 20px !important;
  }
}
</style>