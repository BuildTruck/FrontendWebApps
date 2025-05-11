<script>
export default {
  name: 'ManagerLayout',
  props: {
    userName: {
      type: String,
      default: 'Usuario'
    }
  },
  data() {
    return {
      menuItems: [
        { id: 'proyectos', label: 'Proyectos', icon: 'pi pi-home', route: '/proyectos', active: true },
        { id: 'estadisticas', label: 'Estadísticas generales', icon: 'pi pi-chart-bar', route: '/layout/estadisticas', active: false },
        { id: 'reportes', label: 'Reportes globales', icon: 'pi pi-file', route: '/layout/reportes', active: false },
        { id: 'configuraciones', label: 'Configuraciones', icon: 'pi pi-cog', route: '/layout/configuraciones', active: false }
      ],
      profileItems: [
        { id: 'perfil', label: 'Mi perfil', icon: 'pi pi-user', route: '/layout/perfil', active: false },
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
  methods: {
    navigateTo(route) {
      this.$router.push(route);
    }
  }
}
</script>

<template>
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
      <!-- Router view para el contenido dinámico -->
      <router-view></router-view>
    </main>
  </div>
</template>

<style scoped>
.manager-layout {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background-color: #f9f9f9;
}

.sidebar {
  width: 250px;
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
  width: 100%;
  height: 30px;
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
  margin-left: 250px;
  width: calc(100% - 250px);
  min-height: 100vh;
  position: relative;
}

/* Responsive */
@media (max-width: 992px) {
  .sidebar {
    width: 200px;
  }

  .main-content {
    margin-left: 200px;
    width: calc(100% - 200px);
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
}
</style>