<script>
import AppButton from '../../core/components/AppButton.vue';

export default {
  name: 'ProjectLayoutManager',
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
      required: true
    }
  },
  data() {
    return {
      tabs: [
        { id: 'documentacion', label: 'Documentación', count: null },
        { id: 'personal', label: 'Personal', count: 4 },
        { id: 'inventario', label: 'Inventario', count: 9 },
        { id: 'incidentes', label: 'Incidentes', count: 1 },
        { id: 'maquinaria', label: 'Maquinaria', count: null },
        { id: 'configuracion', label: 'Configuración de la obra', count: null }
      ],
      activeTab: ''
    }
  },
  mounted() {
    const currentTab = this.$route.path.split('/').pop()
    this.activeTab = currentTab || 'documentacion'
  },
  methods: {
    setActiveTab(tabId) {
      this.activeTab = tabId
      this.$router.push(`/proyecto/${this.projectId}/${tabId}`)
    },
    goBack() {
      this.$router.push('/proyectos')
    }
  }
}
</script>

<template>
  <div class="project-layout">
    <!-- Header -->
    <header class="project-header">
      <div class="logo"></div>
      <h1 class="project-title">Obra {{ projectName }}</h1>
    </header>

    <!-- Tabs Navigation -->
    <nav class="tabs-nav">
      <div
          v-for="tab in tabs"
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

    <!-- Content -->
    <main class="project-content">
      <slot></slot>
    </main>

    <!-- Back Button -->
    <div class="back-button">
      <AppButton icon="pi pi-arrow-left" variant="back" @click="goBack" />
    </div>
  </div>
</template>

<style scoped>
.project-layout {
  background-color: #f8f8f8;
  min-height: 100vh;
  position: relative;
}

.project-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background-color: #fff;
  border-bottom: 1px solid #eaeaea;
}

.logo {
  width: 100%;
  height: 100%;
  background-image: url('../../assets/buildtruck-logo.svg');
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  margin-left: -20px; /* Mueve ligeramente a la izquierda */
}

.project-title {
  font-size: 1.3rem;
  font-weight: 500;
  margin: 0;
  color: #333;
}

.tabs-nav {
  display: flex;
  border-bottom: 1px solid #eaeaea;
  background-color: white;
  overflow-x: auto;
}

.tab {
  padding: 12px 20px;
  cursor: pointer;
  font-size: 0.95rem;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: 0.2s;
}

.tab.active {
  color: #ff5f01;
  border-bottom: 2px solid #ff5f01;
}

.tab-count {
  display: inline-block;
  min-width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  font-size: 0.75rem;
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

.project-content {
  padding: 24px;
}

.back-button {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 10;
}
</style>
