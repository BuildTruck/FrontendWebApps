<script>
export default {
  name: 'SupervisorLayout',
  props: {
    title: {
      type: String,
      default: 'Personal'
    },
    projectId: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      menuItems: [
        { id: 'proyectos', label: 'Proyectos', icon: 'pi pi-home', route: '/proyectos' },
        { id: 'personal', label: 'Personal', icon: 'pi pi-users', route: '/personal', active: true },
        { id: 'inventario', label: 'Inventario', icon: 'pi pi-box', route: '/inventario' },
        { id: 'maquinaria', label: 'Maquinaria', icon: 'pi pi-cog', route: '/maquinaria' },
        { id: 'incidentes', label: 'Incidentes', icon: 'pi pi-exclamation-triangle', route: '/incidentes' },
        { id: 'documentacion', label: 'Documentación', icon: 'pi pi-file', route: '/documentacion' },
        { id: 'salir', label: 'Salir', icon: 'pi pi-sign-out', route: '/logout' }
      ],
      activeMenuItem: 'personal'
    }
  },
  methods: {
    navigateTo(item) {
      this.activeMenuItem = item.id;
      if (this.projectId) {
        this.$router.push(`/supervisor/${this.projectId}${item.route}`);
      } else {
        this.$router.push(`/supervisor${item.route}`);
      }
    }
  }
}
</script>

<template>
  <div class="supervisor-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo-container">
        <img src="../../../assets/buildtruck-logo.svg" alt="BuildTruck" class="logo">
      </div>

      <!-- Menú de navegación -->
      <nav class="sidebar-menu">
        <ul class="menu-list">
          <li
              v-for="item in menuItems"
              :key="item.id"
              :class="['menu-item', { active: activeMenuItem === item.id }]"
              @click="navigateTo(item)"
          >
            <i :class="item.icon"></i>
            <span>{{ item.label }}</span>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- Contenido principal -->
    <div class="content-wrapper">
      <!-- Header con título -->
      <header class="main-header">
        <h1 class="page-title">{{ title }}</h1>
        <div class="header-actions">
          <button class="filter-button">
            <i class="pi pi-filter"></i>
            Filtro
          </button>
          <button class="download-button">
            <i class="pi pi-download"></i>
          </button>
        </div>
      </header>

      <!-- Contenido principal -->
      <main class="main-content">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<style scoped>
.supervisor-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background-color: white;
  border-right: 1px solid #eaeaea;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  z-index: 10;
}

.logo-container {
  padding: 20px;
  border-bottom: 1px solid #eaeaea;
}

.logo {
  max-width: 120px;
  height: auto;
}

.sidebar-menu {
  padding: 10px 0;
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

.content-wrapper {
  flex: 1;
  margin-left: 220px;
  width: calc(100% - 220px);
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: white;
  border-bottom: 1px solid #eaeaea;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 500;
  color: #333;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-button, .download-button {
  padding: 8px 12px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #555;
}

.download-button {
  padding: 8px;
}

.filter-button:hover, .download-button:hover {
  background-color: #f5f5f5;
}

.main-content {
  padding: 20px;
  background-color: #f9f9f9;
  min-height: calc(100vh - 60px);
}

/* Estilos responsivos */
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
    padding: 10px;
    display: flex;
    justify-content: center;
  }

  .logo {
    max-width: 40px;
  }

  .content-wrapper {
    margin-left: 60px;
    width: calc(100% - 60px);
  }

  .main-header {
    padding: 10px 15px;
  }

  .page-title {
    font-size: 1.2rem;
  }

  .main-content {
    padding: 10px;
  }
}
</style>