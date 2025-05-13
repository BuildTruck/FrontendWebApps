<script>
import AppInput from "../../../core/components/AppInput.vue"
import AppButton from "../../../core/components/AppButton.vue"
import { AuthService } from "../../../auth/services/auth-api.service.js"
import { Configuration } from "../models/configuration.entity.js"
import { ConfigurationService } from "../services/configuration-api.service.js"

export default {
  name: "SupervisorConfigurationComponent",
  components: {
    AppInput,
    AppButton
  },
  data() {
    return {
      settings: new Configuration(),
      originalSettings: new Configuration(),
      loading: false
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

        alert("Configuración actualizada correctamente.")
      } catch (err) {
        console.error("Error al actualizar configuración", err)
        alert("Hubo un error al guardar los cambios.")
      } finally {
        this.loading = false
      }
    },
    cancelChanges() {
      this.settings = new Configuration(this.originalSettings.toJSON())
    }
  }
}
</script>

<template>
  <div class="config-form">
    <AppInput
        v-model="settings.language"
        type="select"
        label="Idioma"
        :options="[
        { label: 'Español', value: 'es' },
        { label: 'Inglés', value: 'en' }
      ]"
        placeholder="Selecciona un idioma"
        fullWidth
    />

    <AppInput
        v-model="settings.theme"
        type="select"
        label="Modo de vista"
        :options="[
        { label: 'Claro', value: 'light' },
        { label: 'Oscuro', value: 'dark' }
      ]"
        placeholder="Selecciona un tema"
        fullWidth
    />

    <AppInput
        v-model="settings.plan"
        type="select"
        label="Plan"
        :options="[
        { label: 'Básico', value: 'basic' },
        { label: 'Empresarial', value: 'empresarial' }
      ]"
        placeholder="Selecciona un plan"
        fullWidth
    />

    <div class="actions">
      <AppButton
          label="Guardar"
          variant="primary"
          :loading="loading"
          @click="saveConfig"
      />
      <AppButton
          label="Cancelar"
          variant="primary"
          @click="cancelChanges"
      />
    </div>
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