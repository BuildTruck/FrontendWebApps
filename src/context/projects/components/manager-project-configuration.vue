<script>
import AppInput from '../../../core/components/AppInput.vue'
import AppButton from '../../../core/components/AppButton.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import { projectService } from '../services/projects-api.service.js'

export default {
  name: 'manager-project-configuration',
  props: ['projectId'],
  components: {
    AppInput,
    AppButton,
    AppNotification
  },
  data() {
    return {
      form: {
        name: '',
        state: '',
        location: '',
        description: '',
        startDate: '',
        supervisorId: ''
      },
      originalData: {},
      isEditing: false,
      supervisors: [],
      notification: {
        show: false,
        message: '',
        type: 'success',
        autoClose: true
      }
    }
  },
  async mounted() {
    await this.fetchProject()
    await this.fetchSupervisors()
  },
  methods: {
    async fetchProject() {
      try {
        const project = await projectService.getProjectById(this.projectId)
        this.form = { ...project }
        this.originalData = { ...project }
      } catch (err) {
        console.error('Error al cargar el proyecto', err)
      }
    },
    async fetchSupervisors() {
      try {
        const response = await fetch('http://localhost:3500/users?role=supervisor')
        const result = await response.json()
        this.supervisors = result.map(s => ({ value: s.id, label: s.name }))
      } catch (err) {
        console.error('Error al cargar supervisores', err)
      }
    },
    startEdit() {
      this.isEditing = true
    },
    async saveChanges() {
      try {
        await projectService.updateProject(this.projectId, {
          name: this.form.name,
          state: this.form.state,
          location: this.form.location,
          description: this.form.description,
          startDate: this.form.startDate,
          supervisorId: this.form.supervisorId
        })
        this.showNotification('Los cambios se guardaron correctamente')
        this.isEditing = false
      } catch (err) {
        this.showNotification('Hubo un error al guardar los cambios', 'error')
      }
    },
    cancelChanges() {
      this.form = { ...this.originalData }
      this.isEditing = false
    },
    showNotification(message, type = 'success') {
      this.notification = {
        show: true,
        message,
        type,
        autoClose: true
      }
    }
  }
}
</script>

<template>
  <div class="config-container">
    <div class="form-box">
      <div class="form-row">
        <AppInput v-model="form.name" :disabled="!isEditing" :label="$t('projects.projectName')" />
        <AppInput
            v-model="form.state"
            type="select"
            :disabled="!isEditing"
            :label="$t('projects.projectStatus')"
            :options="[
            { value: 'En estudio', label: $t('projects.status.inStudy') },
            { value: 'Planificado', label: $t('projects.status.planned') },
            { value: 'En ejecución', label: $t('projects.status.inProgress') },
            { value: 'Finalizado', label: $t('projects.status.completed') }
          ]"
        />
      </div>

      <div class="form-row">
        <AppInput v-model="form.location" :disabled="!isEditing" :label="$t('projects.location')" />
        <AppInput v-model="form.description" :disabled="!isEditing" :label="$t('projects.description')" type="textarea" />
      </div>

      <div class="form-row">
        <AppInput v-model="form.startDate" :disabled="!isEditing" :label="$t('projects.estimatedStartDate')" type="date" />
        <AppInput
            v-model="form.supervisorId"
            :disabled="!isEditing"
            :label="$t('projects.assignedSupervisor')"
            type="select"
            :options="supervisors"
        />
      </div>

      <div class="actions">
        <AppButton v-if="!isEditing" :label="$t('projects.configure')" variant="primary" @click="startEdit" />
        <template v-else>
          <AppButton :label="$t('general.save')" variant="primary" @click="saveChanges" />
          <AppButton :label="$t('general.cancel')" variant="secondary" @click="cancelChanges" />
        </template>
      </div>
    </div>

    <AppNotification
        v-model="notification.show"
        :message="notification.message"
        :type="notification.type"
        :auto-close="notification.autoClose"
        :button-text="$t('general.confirm')"
    />
  </div>
</template>

<style scoped>
.config-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px;
}

.form-box {
  width: 1114px;
  height: 668px;
  flex-shrink: 0;
  border-radius: 12px; /* Ejemplo: var(--sds-size-radius-200) ~ 12px */
  border: 1px solid #DCDCDC; /* Ejemplo: color borde neutro */
  background: rgba(255, 255, 255, 0.56); /* Ejemplo: fondo blanco neutro */

  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.form-row > * {
  flex: 1;
  min-width: 300px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>

