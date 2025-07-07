<script>
import { AuthService } from '../../../auth/services/auth-api.service.js';
import LanguageSwitcher from "../../../core/components/language-switcher.component.vue";
import { useThemeStore} from "../../../core/stores/theme.js";
import { useLogo} from "../../../core/composables/useLogo.js";
import NotificationBell from "../../../core/notifications/components/NotificationBell.vue";
import TutorialOverlay from "../../../core/tutorial/components/TutorialOverlay.vue";
import { useTutorial } from "../../../core/tutorial/composables/useTutorial.js";
import { managerLayoutSteps } from "../../../core/tutorial/config/manager-layout.js";

export default {
  name: 'ManagerLayout',
  components: {LanguageSwitcher,NotificationBell, TutorialOverlay},
  props: {
    userName: {
      type: String,
      default: 'Gerente'
    }
  },
  setup() {
    const themeStore = useThemeStore()
    const { logoSrc } = useLogo()
    const tutorialComposable = useTutorial()

    return {
      themeStore,
      logoSrc,
      tutorialComposable
    }
  },
  data() {
    return {
      displayName: '',
      menuItems: [
        { id: 'proyectos', label: 'navigation.proyectos', icon: 'pi pi-home', route: '/proyectos', active: true ,tutorialId: 'proyectos' },
        { id: 'estadisticas', label: 'navigation.estadisticas', icon: 'pi pi-chart-bar', route: '/estadisticas', active: false,tutorialId: 'estadisticas'},
        { id: 'configuracion', label: 'navigation.configuracion', icon: 'pi pi-cog', route: '/configuracion', active: false,tutorialId: 'configuracion' }
      ],
      profileItems: [
        { id: 'perfil', label: 'navigation.perfil', icon: 'pi pi-user', route: '/perfil', active: false,tutorialId: 'perfil' },
        { id: 'salir', label: 'navigation.salir', icon: 'pi pi-sign-out', route: '/logout', active: false,tutorialId: 'salir' }
      ]
    }
  },
  async created() {
    const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
    this.displayName = userData.name || this.userName;

    await this.themeStore.initializeTheme();
  },
  async mounted() {
    console.log('🔍 ManagerLayout mounted...')

    setTimeout(async () => {
      try {
        console.log('🎯 [ADMIN] Iniciando tutorial...');

        const { dev, resetUserProgress } = this.tutorialComposable;

        // await resetUserProgress(); // ← COMENTAR esto por ahora

        const result = await dev.forceStart('manager', managerLayoutSteps);
        console.log('✅ [ADMIN] Tutorial iniciado:', result);

      } catch (error) {
        console.error('❌ [ADMIN] Error:', error);
      }
    }, 500);
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
    },
    pageTitle() {
      // Get the current route's matched component name or path
      const currentItem = [...this.menuItems, ...this.profileItems].find(
          item => this.activeMenuId === item.id
      );
      return currentItem ? currentItem.label : 'Proyectos';
    }
  },
  methods: {

    navigateTo(route) {
      // Si es la opción de salir, ejecutar logout
      if (route === '/logout') {
        this.logout();
      } else {
        this.$router.push(route);
      }
    },

    logout() {
      // Llamar al método logout del AuthService
      AuthService.logout();
    }
  }
}
</script>

<template>
  <div class="app-container">
    <!-- Sidebar fijo -->
    <aside class="sidebar">
      <div class="logo-container">
        <img :src="logoSrc" alt="Logo" class="logo" />
      </div>

      <!-- Menú principal -->
      <nav class="sidebar-menu">
        <ul class="menu-list">
          <li
              v-for="item in menuItems"
              :key="item.id"
              :class="['menu-item', { active: activeMenuId === item.id }]"
              :data-tutorial="item.tutorialId"
              @click="navigateTo(item.route)"
          >
            <i :class="item.icon"></i>
            <span>{{ $t(item.label) }}</span>
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
              :data-tutorial="item.tutorialId"
              @click="navigateTo(item.route)"
          >
            <i :class="item.icon"></i>
            <span>{{ $t(item.label) }}</span>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- Contenido principal con header fijo -->
    <div class="main-wrapper">
      <!-- Header bar fijo -->
      <header class="header-bar" data-tutorial="header-bar" >
        <h1 class="page-title">{{ $t(pageTitle) }}</h1>

        <div class="header-actions">
          <NotificationBell data-tutorial="notifications" />
          <language-switcher data-tutorial="language"/>

        </div>

      </header>

      <!-- Área de contenido -->
      <div class="content-area">
        <router-view></router-view>
      </div>
    </div>

  </div>
  <TutorialOverlay />
</template>

<style scoped>
.header-bar {
  justify-content: space-between; /* ← Agregar */
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.app-container {
  display: flex;
  height: 100vh;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  position: relative;
}

.sidebar {
  width: 230px;
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
  padding: 15px;
  border-bottom: 1px solid #eaeaea;
  display: flex;
  justify-content: center;
  height: 150px;
  z-index: 100;
  overflow: hidden;
}

/* Logo usando background-image */
.logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  margin-left: -20px;
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
  padding: 12px 15px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: #555;
  font-size: 0.9rem;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item.active {
  background-color: #FF5F01;
  color: white;
}

.menu-item i {
  margin-right: 10px;
  font-size: 1rem;
}

.sidebar-divider {
  height: 1px;
  background-color: #eaeaea;
  margin: 10px 0;
}

.main-wrapper {
  margin-top: 0;
  margin-left: 230px;
  width: calc(100% - 230px);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.header-bar {
  margin-top: 0;
  height: 60px;
  background-color: white;
  border-bottom: 1px solid #eaeaea;
  display: flex;
  align-items: center;
  padding: 0 20px;
  width: 100%;
  position: sticky;
  top: 0;
  z-index: 200; /* Z-index menor que el sidebar pero aún por encima del contenido */
}

.page-title {
  font-size: 1.4rem;
  font-weight: 500;
  color: #333;
  margin: 0;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background-color: #ffffff;
  height: calc(100vh - 60px); /* Altura total menos la altura del header */
}

.header-bar {
  justify-content: space-between; /* Distribuye los elementos en los extremos */
  padding-right: 20px; /* Asegura espacio suficiente a la derecha */
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

/* Responsive para pantallas pequeñas */
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
    height: 60px;
    width: 60px;
  }

  .logo {
    width: 80px;
  }

  .main-wrapper {
    margin-left: 60px;
    width: calc(100% - 60px);
  }
}

/* Importantes estilos para evitar problemas en diferentes resoluciones */
@media (min-width: 769px) and (max-width: 992px) {
  .sidebar {
    width: 160px;
  }

  .main-wrapper {
    margin-left: 160px;
    width: calc(100% - 160px);
  }
}

/* Para pantallas muy pequeñas, asegurar que todo se mantenga visible */
@media (max-width: 480px) {
  .header-bar {
    padding: 0 10px;
  }

  .page-title {
    font-size: 1rem;
  }
}
</style>