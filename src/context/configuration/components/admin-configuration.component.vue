<script>
import AppInput from "../../../core/components/AppInput.vue";
import AppButton from "../../../core/components/AppButton.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import ThemeSwitcher from "../../../core/components/ThemeSwitcher.vue";
import { AuthService } from "../../../auth/services/auth-api.service.js";
import { configurationService } from "../services/configuration-api.service.js";
import { Configuration } from "../models/configuration.entity.js";
import { useThemeStore } from "../../../core/stores/theme.js";
import NotificationPreferences from "../../../core/notifications/components/NotificationPreferences.vue";
import { useTutorial } from "../../../core/tutorial/composables/useTutorial.js";

export default {
  name: "AdminConfigurationComponent",
  components: {
    NotificationPreferences,
    AppInput,
    AppButton,
    AppNotification,
    ThemeSwitcher
  },
  data() {
    return {
      activeTab: 'general',
      settings: new Configuration(),
      originalSettings: new Configuration(),
      loading: false,
      notification: {
        show: false,
        message: '',
        type: 'success',
        autoClose: true
      }
    };
  },
  setup() {
    const themeStore = useThemeStore()
    const { resetSpecificTutorial, resetUserProgress } = useTutorial()
    return { themeStore, resetSpecificTutorial, resetUserProgress }
  },
  computed: {
    hasChanges() {
      if (this.activeTab !== 'general') return false; // Solo validar cambios en general

      const current = this.settings.toJSON();
      const original = this.originalSettings.toJSON();

      return (
          current.theme !== original.theme ||
          current.notifications_enable !== original.notifications_enable ||
          current.email_notifications !== original.email_notifications
      );
    }
  },
  mounted() {
    // ❌ QUITADO: this.themeStore.initializeTheme();
    this.loadUserSettings();
  },
  methods: {
    async reactivarTutorialLayout() {
      await this.resetSpecificTutorial('admin')
      this.showNotification(this.$t('settings.tutorialReactivated'), 'success')
      setTimeout(() => {
        this.$router.push('/admin/dashboard') // ✅ CORRECTO
      }, 500)
    },

    async resetearTodosLosTutorials() {
      await this.resetUserProgress()
      this.showNotification(this.$t('settings.allTutorialsReset'), 'success')
    },

    switchTab(tab) {
      this.activeTab = tab;
    },

    closeNotifications() {
      this.activeTab = 'general';
    },

    handleNotificationUpdate() {
      this.showNotification('Preferencias de notificaciones actualizadas', 'success', true);
    },

    async loadUserSettings() {
      try {
        const config = await configurationService.loadCurrentUserSettings();
        this.settings = config;
        this.originalSettings = new Configuration(config.toJSON());

        // ✅ Aplicar tema SIN guardarlo
        this.themeStore.currentTheme = config.theme;
        this.themeStore.applyThemeToBody();

      } catch (error) {
        console.error('Error loading user settings:', error);
        this.showNotification(this.$t("settings.loadError"), "error", false);
      }
    },

    async saveConfig() {
      try {
        this.loading = true;
        await configurationService.saveCurrentUserSettings(this.settings);

        // Después del guardado exitoso, aplicar el tema
        this.themeStore.currentTheme = this.settings.theme;
        this.themeStore.applyThemeToBody();

        this.originalSettings = new Configuration(this.settings.toJSON());
        this.showNotification(this.$t("settings.updated"), "success", true);
      } catch (err) {
        console.error("Error updating configuration:", err);
        this.showNotification(this.$t("settings.updateError"), "error", false);
      } finally {
        this.loading = false;
      }
    },

    cancelChanges() {
      this.settings = new Configuration(this.originalSettings.toJSON());
      // ✅ Aplicar tema sin guardar
      this.themeStore.currentTheme = this.originalSettings.theme;
      this.themeStore.applyThemeToBody();
    },

    showNotification(message, type = 'success', autoClose = true) {
      this.notification = {
        show: true,
        message,
        type,
        autoClose
      };
    },

    onThemeChange(newTheme) {
      console.log(`🎨 Tema cambiado a: ${newTheme}`);
      this.settings.theme = newTheme;
      // Solo aplicar visualmente, NO guardar
      this.themeStore.currentTheme = newTheme;
      this.themeStore.applyThemeToBody();
    },
    goToChangePassword() {
      this.$router.push('/admin/configuraciones/change-password');
    }
  }
};
</script>

<template>
  <div class="config-form">

    <!-- Navegación por pestañas -->
    <div class="tabs-navigation">
      <button
          @click="switchTab('general')"
          :class="{ active: activeTab === 'general' }"
          class="tab-button"
      >
        <i class="pi pi-cog"></i>
        {{ $t('settings.general') || 'General' }}
      </button>

      <button
          @click="switchTab('notifications')"
          :class="{ active: activeTab === 'notifications' }"
          class="tab-button"
      >
        <i class="pi pi-bell"></i>
        {{ $t('settings.notifications') || 'Notificaciones' }}
      </button>

      <button
          @click="switchTab('tutorials')"
          :class="{ active: activeTab === 'tutorials' }"
          class="tab-button"
      >
        <i class="pi pi-question-circle"></i>
        {{ $t('settings.tutorials') }}
      </button>
      <button
          @click="goToChangePassword()"
          class="tab-button"
      >
        <i class="pi pi-lock"></i>
        {{ $t('settings.changePassword') || 'Cambiar Contraseña' }}
      </button>
    </div>

    <!-- Contenido de la pestaña General -->
    <div v-if="activeTab === 'general'" class="tab-content">

      <!-- Sección de Apariencia -->
      <div class="config-section">
        <h3 class="config-title">{{ $t('settings.appearance') }}</h3>
        <p class="config-description">{{ $t('settings.appearanceDescription') }}</p>

        <ThemeSwitcher
            v-model="settings.theme"
            @update:model-value="onThemeChange"
        />
      </div>

      <!-- Sección de Notificaciones -->
      <div class="config-section">
        <h3 class="config-title">{{ $t('settings.notificationsSection') }}</h3>
        <p class="config-description">{{ $t('settings.notificationsDescription') }}</p>

        <AppInput
            v-model="settings.notifications_enable"
            type="select"
            :label="$t('settings.notifications')"
            :options="[
              { label: $t('general.yes'), value: 'true' },
              { label: $t('general.no'), value: 'false' }
            ]"
            :placeholder="$t('general.select')"
            fullWidth
        />

        <AppInput
            v-model="settings.email_notifications"
            type="select"
            :label="$t('settings.emailNotifications')"
            :options="[
              { label: $t('general.yes'), value: 'true' },
              { label: $t('general.no'), value: 'false' }
            ]"
            :placeholder="$t('general.select')"
            fullWidth
        />
      </div>

      <!-- Botones de acción para General -->
      <div class="actions">
        <AppButton
            :label="$t('general.cancel')"
            variant="secondary"
            @click="cancelChanges"
            :disabled="!hasChanges || loading"
        />
        <AppButton
            :label="$t('general.save')"
            variant="primary"
            :loading="loading"
            :disabled="!hasChanges"
            @click="saveConfig"
        />
      </div>

      <!-- Indicador de cambios -->
      <div v-if="hasChanges" class="changes-indicator">
        <i class="pi pi-info-circle"></i>
        {{ $t('settings.unsavedChanges') }}
      </div>
    </div>

    <!-- Contenido de la pestaña Notificaciones -->
    <div v-if="activeTab === 'notifications'" class="tab-content">
      <NotificationPreferences
          @close="closeNotifications"
          @updated="handleNotificationUpdate"
      />
    </div>

    <!-- Contenido de la pestaña Tutoriales -->
    <div v-if="activeTab === 'tutorials'" class="tab-content">
      <div class="config-section">
        <h3 class="config-title">{{ $t('settings.tutorials') }}</h3>
        <p class="config-description">{{ $t('settings.tutorialsDescription') }}</p>

        <div class="tutorial-actions">
          <AppButton
              :label="$t('settings.restartAdminTutorial')"
              variant="primary"
              icon="pi pi-refresh"
              @click="reactivarTutorialLayout"
          />

          <AppButton
              :label="$t('settings.restartAllTutorials')"
              variant="primary"
              icon="pi pi-replay"
              @click="resetearTodosLosTutorials"
          />
        </div>
      </div>
    </div>

    <AppNotification
        v-model="notification.show"
        :message="notification.message"
        :type="notification.type"
        :auto-close="notification.autoClose"
        :button-text="$t('general.understood')"
    />
  </div>
</template>

<style scoped>
.config-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.tutorial-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Navegación de tabs */
.tabs-navigation {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid rgba(255, 95, 1, 0.3);
  padding-bottom: 1rem;
  margin-bottom: 2rem;
  position: relative;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: rgba(108, 117, 125, 0.1);
  border: 2px solid rgba(108, 117, 125, 0.3);
  color: #333;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.tab-button:hover {
  background-color: rgba(255, 95, 1, 0.1);
  color: #333;
  border-color: rgba(255, 95, 1, 0.3);
  transform: translateY(-2px);
}

.tab-button.active {
  background-color: #FF5F01;
  color: white;
  border-color: #FF5F01;
  box-shadow: 0 4px 12px rgba(255, 95, 1, 0.3),
  0 2px 4px rgba(255, 95, 1, 0.2);
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
  border-top: 8px solid #FF5F01;
}

/* Contenido de tabs */
.tab-content {
  min-height: 400px;
}

/* Secciones de configuración para General */
.config-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.config-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #FF5F01;
}

.config-description {
  margin: 0 0 1.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.plan-features {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.plan-info {
  color: #666;
  font-style: italic;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.changes-indicator {
  margin-top: 1rem;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  color: #856404;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.changes-indicator i {
  color: #FF5F01;
}

/* Dark mode para el componente principal */
[data-theme="dark"] .config-section {
  background: var(--bg-card) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .config-description {
  color: var(--text-secondary) !important;
}

[data-theme="dark"] .plan-features {
  background: var(--bg-secondary) !important;
}

[data-theme="dark"] .plan-info {
  color: var(--text-secondary) !important;
}

[data-theme="dark"] .changes-indicator {
  background: rgba(255, 193, 7, 0.2) !important;
  border-color: rgba(255, 193, 7, 0.3) !important;
  color: #ffc107 !important;
}

[data-theme="dark"] .tab-button {
  background: var(--bg-secondary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .tab-button:hover {
  background-color: rgba(255, 95, 1, 0.2) !important;
  border-color: rgba(255, 95, 1, 0.5) !important;
  color: white !important;
}
</style>