<script>
import AppInput from "../../../core/components/AppInput.vue";
import AppButton from "../../../core/components/AppButton.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import { AuthService } from "../../../auth/services/auth-api.service.js";
import { configurationService } from "../services/configuration-api.service.js";
import { Configuration } from "../models/configuration.entity.js";

export default {
  name: "SupervisorConfigurationComponent",
  components: {
    AppInput,
    AppButton,
    AppNotification
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
  mounted() {
    this.loadUserSettings();
  },
  methods: {
    async loadUserSettings() {
      const user = AuthService.getCurrentUser();
      if (user?.settings) {
        const config = new Configuration(user.settings);
        this.settings = config;
        this.originalSettings = new Configuration(config.toJSON());
        this.isDarkMode = config.theme === 'dark';
        this.updateBodyClass();
      }
    },
    updateBodyClass() {
      document.body.className = this.isDarkMode ? 'dark-mode' : 'light-mode';
    },
    async saveConfig() {
      try {
        this.loading = true;
        const user = AuthService.getCurrentUser();
        if (!user || !user.id) {
          throw new Error('User not found or invalid user ID');
        }
        const { theme, notifications_enable, email_notifications } = this.settings;
        const settings = {
          user_id: user.id,
          theme,
          notifications_enable,
          email_notifications
        };
        await configurationService.updateSettings(user.id, settings);

        const updatedUser = {
          ...user,
          settings: this.settings.toJSON(),
        };
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        this.showNotification(this.$t("settings.updated"), "success", true);
      } catch (err) {
        console.error("Error updating configuration", err);
        this.showNotification(this.$t("settings.updateError"), "error", false);
      } finally {
        this.loading = false;
      }
    },
    cancelChanges() {
      this.settings = new Configuration(this.originalSettings.toJSON());
    },
    showNotification(message, type = 'success', autoClose = true) {
      this.notification = {
        show: true,
        message,
        type,
        autoClose
      };
    }
  }
};
</script>

<template>
  <div class="config-form">
    <AppInput
        v-model="settings.theme"
        type="select"
        :label="$t('settings.theme')"
        :options="[
        { label: $t('settings.themes.light'), value: 'light' },
        { label: $t('settings.themes.dark'), value: 'dark' }
      ]"
        :placeholder="$t('general.select')"
        fullWidth
    />

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

    <div class="actions">
      <AppButton
          :label="$t('general.save')"
          variant="primary"
          :loading="loading"
          @click="saveConfig"
      />
      <AppButton
          :label="$t('general.cancel')"
          variant="primary"
          @click="cancelChanges"
      />
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
  max-width: 600px;
  margin-left: 80px;
  margin-top: 60px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>