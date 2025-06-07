<script>
import AppInput from "../../../core/components/AppInput.vue";
import AppButton from "../../../core/components/AppButton.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import ThemeSwitcher from "../../../core/components/ThemeSwitcher.vue";
import { AuthService } from "../../../auth/services/auth-api.service.js";
import { configurationService } from "../services/configuration-api.service.js";
import { Configuration } from "../models/configuration.entity.js";
import { useThemeStore } from "../../../core/stores/theme.js";

export default {
  name: "ManagerConfigurationComponent",
  components: {
    AppInput,
    AppButton,
    AppNotification,
    ThemeSwitcher
  },
  data() {
    return {
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
    return { themeStore }
  },
  computed: {
    hasChanges() {
      const current = this.settings.toJSON();
      const original = this.originalSettings.toJSON();

      return (
          current.theme !== original.theme ||
          current.plan !== original.plan ||
          current.notifications_enable !== original.notifications_enable ||
          current.email_notifications !== original.email_notifications
      );
    },

    planOptions() {
      return [
        { label: this.$t('settings.plans.basic'), value: 'basic' },
        { label: this.$t('settings.plans.business'), value: 'business' },
        { label: this.$t('settings.plans.enterprise'), value: 'enterprise' }
      ];
    }
  },
  mounted() {
    this.themeStore.initializeTheme();
    this.loadUserSettings();
  },
  methods: {
    async loadUserSettings() {
      try {
        const config = await configurationService.loadCurrentUserSettings();
        this.settings = config;
        this.originalSettings = new Configuration(config.toJSON());
        this.themeStore.setTheme(config.theme);
      } catch (error) {
        console.error('Error loading user settings:', error);
        this.showNotification(this.$t("settings.loadError"), "error", false);
      }
    },

    async saveConfig() {
      try {
        this.loading = true;
        this.themeStore.setTheme(this.settings.theme);
        await configurationService.saveCurrentUserSettings(this.settings);
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
      this.themeStore.setTheme(this.originalSettings.theme);
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
      this.themeStore.setTheme(newTheme);
      this.$forceUpdate();
    }
  }
};
</script>

<template>
  <div class="config-form">
    <!-- Sección de Apariencia -->
    <div class="config-section">
      <h3 class="config-title">{{ $t('settings.appearance') }}</h3>
      <p class="config-description">{{ $t('settings.appearanceDescription') }}</p>

      <ThemeSwitcher
          v-model="settings.theme"
          @update:model-value="onThemeChange"
      />
    </div>

    <!-- Sección de Plan (solo para manager) -->
    <div class="config-section">
      <h3 class="config-title">{{ $t('settings.subscription') }}</h3>
      <p class="config-description">{{ $t('settings.subscriptionDescription') }}</p>

      <AppInput
          v-model="settings.plan"
          type="select"
          :label="$t('settings.plan')"
          :options="planOptions"
          :placeholder="$t('general.select')"
          fullWidth
      />

      <div class="plan-features">
        <small class="plan-info">
          {{ $t('settings.planFeatures.' + settings.plan) }}
        </small>
      </div>
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

    <!-- Botones de acción -->
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
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.config-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
}

.config-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.config-description {
  margin: 0 0 1.5rem 0;
  color: #666;
  font-size: 0.875rem;
  line-height: 1.5;
}

.plan-features {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #FF5F01;
}

.plan-info {
  color: #495057;
  font-size: 0.875rem;
  line-height: 1.4;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.changes-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  color: #856404;
  font-size: 0.875rem;
}

.changes-indicator i {
  color: #f39c12;
}

@media (max-width: 768px) {
  .config-form {
    padding: 1rem;
    margin: 1rem;
    max-width: calc(100% - 2rem);
  }

  .config-section {
    padding: 1.5rem;
  }

  .actions {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>