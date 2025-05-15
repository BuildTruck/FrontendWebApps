<script>
import AppInput from "../../../core/components/AppInput.vue"
import AppButton from "../../../core/components/AppButton.vue"
import { AuthService } from "../../../auth/services/auth-api.service.js"
import { Configuration } from "../models/configuration.entity.js"
import { ConfigurationService } from "../services/configuration-api.service.js"
import AppNotification from "../../../core/components/AppNotification.vue"

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
    }
  },
  mounted() {
    const user = AuthService.getCurrentUser()
    if (user?.settings) {
      const config = new Configuration(user.settings)
      this.settings = config
      this.originalSettings = new Configuration(config.toJSON())
    }
  },
  methods: {
    async saveConfig() {
      try {
        this.loading = true
        const user = AuthService.getCurrentUser()

        await ConfigurationService.updateSettings(user.id, this.settings)

        // Actualizar sessionStorage
        const updatedUser = {
          ...user,
          settings: this.settings.toJSON()
        }
        sessionStorage.setItem("user", JSON.stringify(updatedUser))

        this.showNotification("Configuración actualizada correctamente.", "success", true);
      } catch (err) {
        console.error("Error al actualizar configuración", err)
        // Reemplaza el alert con showNotification
        this.showNotification("Hubo un error al guardar los cambios.", "error", false);
      } finally {
        this.loading = false
      }
    },
    cancelChanges() {
      this.settings = new Configuration(this.originalSettings.toJSON())
    },
    showNotification(message, type = 'success', autoClose = true) {
      this.notification = {
        show: true,
        message,
        type,
        autoClose
      }
    },
  }
}
</script>

<template>
  <div class="config-form">
    <AppInput
        v-model="settings.language"
        type="select"
        :label="$t('settings.language')"
        :options="[
        { label: $t('settings.languages.spanish'), value: 'es' },
        { label: $t('settings.languages.english'), value: 'en' }
      ]"
        :placeholder="$t('settings.selectLanguage')"
        fullWidth
    />

    <AppInput
        v-model="settings.theme"
        type="select"
        :label="$t('settings.theme')"
        :options="[
        { label: $t('settings.themes.light'), value: 'light' },
        { label: $t('settings.themes.dark'), value: 'dark' }
      ]"
        :placeholder="$t('settings.selectTheme')"
        fullWidth
    />

    <AppInput
        v-model="settings.plan"
        type="select"
        :label="$t('settings.plan')"
        :options="[
        { label: $t('settings.plans.basic'), value: 'basic' },
        { label: $t('settings.plans.business'), value: 'empresarial' }
      ]"
        :placeholder="$t('settings.selectPlan')"
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
  justify-content: flex-start;
  gap: 1rem;
  margin-top: 1rem;
}
</style>