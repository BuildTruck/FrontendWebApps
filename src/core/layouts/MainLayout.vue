<script>
export default {
  name: 'MainLayout',
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
        { id: 'estadisticas', label: 'Estadísticas generales', icon: 'pi pi-chart-bar', route: '/estadisticas' },
        { id: 'reportes', label: 'Reportes globales', icon: 'pi pi-file', route: '/reportes' },
        { id: 'configuraciones', label: 'Configuraciones', icon: 'pi pi-cog', route: '/configuraciones' }
      ],
      profileItems: [
        { id: 'perfil', label: 'Mi perfil', icon: 'pi pi-user', route: '/perfil' },
        { id: 'salir', label: 'Salir', icon: 'pi pi-sign-out', route: '/logout' }
      ]
    }
  },
  methods: {
    navigateTo(route) {
      // Simulamos la navegación con una alerta por ahora
      alert(`Navegando a: ${route}`);
      // Cuando tengas el router configurado, descomenta esta línea:
      // this.$router.push(route);
    }
  }
}
</script>

<template>
  <div class="main-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo-container">
        <!-- Usar div con background-image -->
        <div class="logo"></div>
      </div>

      <div class="sidebar-title">
        <h2>Proyectos</h2>
      </div>

      <!-- Menú principal -->
      <nav class="sidebar-menu">
        <ul class="menu-list">
          <li
              v-for="item in menuItems"
              :key="item.id"
              :class="['menu-item', { active: item.active }]"
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
              class="menu-item"
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
      <div class="content-header">
        <h1 class="welcome-message">Bienvenido, {{ userName }}</h1>
      </div>

      <div class="content-container">
        <slot></slot>
      </div>
    </main>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 250px;
  background-color: white;
  border-right: 1px solid #eaeaea;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
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
  height: 80px;
  background-image: url('src/assets/buildtruck-logo.svg');
  background-size: cover; /* Ocupa completamente el div, puede recortar */
  background-repeat: no-repeat;

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

.sidebar-menu,
.sidebar-profile {
  padding: 10px 0;
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
  background-color: #f9f9f9;
  padding: 20px;
  overflow-y: auto;
}

.content-header {
  margin-bottom: 20px;
}

.welcome-message {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.content-container {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

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
  }

  .logo {
    width: 40px;
  }

  .main-content {
    padding: 10px;
  }
}
</style>