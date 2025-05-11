<script>
export default {
  name: 'SupervisorLayout',
  props: {
    projectId: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      menuItems: [
        { id: 'proyecto', label: 'Proyecto', icon: 'pi pi-home', route: '/proyecto', active: true },
        { id: 'timeline', label: 'Timeline', icon: 'pi pi-calendar', route: '/timeline' },
        { id: 'incidencias', label: 'Incidencias', icon: 'pi pi-exclamation-triangle', route: '/incidencias' },
        { id: 'documentacion', label: 'Documentación', icon: 'pi pi-file', route: '/documentacion' },
        { id: 'salir', label: 'Salir', icon: 'pi pi-sign-out', route: '/logout' }
      ]
    }
  },
  methods: {
    navigateTo(route) {
      if (this.projectId) {
        this.$router.push(`/supervisor/${this.projectId}${route}`);
      } else {
        this.$router.push(`/supervisor${route}`);
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

      <div class="sidebar-title">
        <h2>Proyecto</h2>
      </div>

      <!-- Menú de navegación -->
      <nav class="sidebar-menu">
        <ul class="menu-list">
          <li
              v-for="item in menuItems"
              :key="item.id"
              :class="['menu-item', { active: $route.path.includes(item.route) }]"
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
      <slot></slot>
    </main>
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
  flex-shrink: 0;
}

.logo-container {
  padding: 20px;
  border-bottom: 1px solid #eaeaea;
}

.logo {
  max-width: 120px;
  height: auto;
}

.sidebar-title {
  padding: 15px 20px;
  border-bottom: 1px solid #eaeaea;
}

.sidebar-title h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: #333;
}

.sidebar-menu {
  padding: 10px 0;
  flex-grow: 1;
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

.main-content {
  flex-grow: 1;
  background-color: #f9f9f9;
  padding: 20px;
  overflow-y: auto;
}

/* Estilos responsivos */
@media (max-width: 768px) {
  .sidebar {
    width: 60px;
  }

  .sidebar-title {
    display: none;
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

  .main-content {
    padding: 10px;
  }
}
</style>