<script>
import AppButton from "../../../core/components/AppButton.vue";
import AppInput from "../../../core/components/AppInput.vue";
import {Configuration} from "../models/configuration.entity.js";
import {AuthService} from "../../../auth/services/auth-api.service.js";
import {ManagerService} from "../../manager/services/manager-api.service.js";
import AppNotification from "../../../core/components/AppNotification.vue"

export default {
  name: 'manager-configuration.component',
  components: {
    AppInput,
    AppButton,
    AppNotification
  },
  data() {
    return {
      settings: new Configuration(),
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
      this.settings = new Configuration(user.settings)
    }
  },
  methods: {

    async saveConfig() {
      try {
        this.loading = true
        const user = AuthService.getCurrentUser()
        const managerService = new ManagerService()

        await managerService.update(user.id, {
          ...user,
          settings: this.settings.toJSON()
        })

        // Actualizar en sessionStorage también
        const updatedUser = {
          ...user,
          settings: this.settings.toJSON()
        }
        sessionStorage.setItem('user', JSON.stringify(updatedUser))

        this.showNotification("Configuración actualizada correctamente.", "success", true);
      } catch (err) {
        console.error("Error al actualizar configuración", err)
        // Reemplaza el alert con showNotification
        this.showNotification("Hubo un error al guardar los cambios.", "error", false);
      } finally {
        this.loading = false
      }
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
    <AppNotification
        v-model="notification.show"
        :message="notification.message"
        :type="notification.type"
        :auto-close="notification.autoClose"
        button-text="Entendido"
    />
  </div>
</template>

<style scoped>
.config-form {
  max-width: 600px;
  margin-left: 80px; /* mueve hacia la izquierda */
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