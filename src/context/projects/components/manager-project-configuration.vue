<script>
import AppInput from '../../../core/components/AppInput.vue'
import AppButton from '../../../core/components/AppButton.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import LocationInput from '../../../core/components/LocationInput.vue'
import { projectService } from '../services/projects-api.service.js'
import { Projects } from '../models/projects.entity.js'

export default {
  name: 'manager-project-configuration',
  props: ['projectId'],
  components: {
    AppInput,
    AppButton,
    AppNotification,
    LocationInput
  },
  data() {
    return {
      form: {
        name: '',
        state: '',
        location: '',
        locationData: null,
        description: '',
        start_date: '',
        supervisorId: ''
      },
      originalData: {},
      currentSupervisor: null,
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
    getStateOptions() {
      return Projects.getStateOptions(this.$t);
    },

    async fetchProject() {
      try {
        console.log('🔍 [fetchProject] Obteniendo proyecto ID:', this.projectId)
        const response = await projectService.getProjectById(this.projectId)
        const project = response.data || response

        console.log('🔍 [fetchProject] Proyecto obtenido:', project)
        console.log('🔍 [fetchProject] SupervisorId del proyecto:', project.supervisorId)

        this.form = {
          name: project.name || '',
          state: project.state || '',
          location: project.location || '',
          locationData: project.coordinates ? { coordinates: project.coordinates } : null,
          description: project.description || '',
          start_date: project.start_date || '',
          supervisorId: project.supervisorId || ''
        }
        this.originalData = { ...this.form }

        // ✅ Obtener datos del supervisor actual
        if (project.supervisorId) {
          console.log('🔍 [fetchProject] Intentando obtener supervisor ID:', project.supervisorId)
          try {
            const supervisorResponse = await projectService.getSupervisorById(project.supervisorId)
            console.log('🔍 [fetchProject] Respuesta del supervisor:', supervisorResponse)
            this.currentSupervisor = supervisorResponse.data
            console.log('🔍 [fetchProject] CurrentSupervisor asignado:', this.currentSupervisor)
          } catch (supervisorErr) {
            console.error('❌ Error al cargar supervisor actual:', supervisorErr)
            this.currentSupervisor = null
          }
        } else {
          console.log('🔍 [fetchProject] El proyecto NO tiene supervisorId asignado')
          this.currentSupervisor = null
        }
      } catch (err) {
        console.error('Error al cargar el proyecto', err)
        this.showNotification('Error al cargar el proyecto', 'error')
      }
    },

    async fetchSupervisors() {
      try {
        const response = await projectService.getAvailableSupervisors()
        this.supervisors = (response.data || []).map(s => ({
          value: s.id,
          label: s.name
        }))
      } catch (err) {
        console.error('Error al cargar supervisores', err)
        this.showNotification('Error al cargar supervisores', 'error')
      }
    },

    handleLocationSelected(locationData) {
      console.log('Ubicación seleccionada:', locationData);
      this.form.locationData = locationData;
    },

    startEdit() {
      this.isEditing = true
    },

    async saveChanges() {
      try {
        const updateData = {
          name: this.form.name,
          state: this.form.state,
          location: this.form.location,
          coordinates: this.form.locationData?.coordinates || null,
          description: this.form.description,
          start_date: this.form.start_date,
          supervisorId: this.form.supervisorId
        }

        await projectService.updateProject(this.projectId, updateData)

        this.originalData = { ...this.form }
        this.showNotification('Los cambios se guardaron correctamente')
        this.isEditing = false
      } catch (err) {
        console.error('Error al guardar:', err)
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
        <AppInput
            v-model="form.name"
            :disabled="!isEditing"
            :label="$t('projects.projectName')"
        />
        <AppInput
            v-model="form.state"
            type="select"
            :disabled="!isEditing"
            :label="$t('projects.projectStatus')"
            :options="getStateOptions()"
        />
      </div>

      <div class="form-row">
        <LocationInput
            v-model="form.location"
            :disabled="!isEditing"
            :label="$t('projects.location')"
            :placeholder="$t('projects.locationPlaceholder')"
            @location-selected="handleLocationSelected"
        />
        <AppInput
            v-model="form.description"
            :disabled="!isEditing"
            :label="$t('projects.description')"
            type="textarea"
        />
      </div>

      <div class="form-row">
        <AppInput
            v-model="form.start_date"
            :disabled="!isEditing"
            :label="$t('projects.estimatedStartDate')"
            type="date"
        />
        <!-- ✅ Mostrar supervisor actual o select de opciones -->
        <AppInput
            v-if="!isEditing"
            :value="currentSupervisor ? currentSupervisor.name : 'Sin supervisor asignado'"
            :disabled="true"
            :label="$t('projects.assignedSupervisor')"
        />
        <AppInput
            v-else
            v-model="form.supervisorId"
            :label="$t('projects.assignedSupervisor')"
            type="select"
            :options="supervisors"
        />
      </div>

      <div class="actions">
        <AppButton
            v-if="!isEditing"
            :label="$t('projects.configure')"
            variant="primary"
            @click="startEdit"
        />
        <template v-else>
          <AppButton
              :label="$t('general.save')"
              variant="primary"
              @click="saveChanges"
          />
          <AppButton
              :label="$t('general.cancel')"
              variant="secondary"
              @click="cancelChanges"
          />
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
  border-radius: 12px;
  border: 1px solid #DCDCDC;
  background: rgba(255, 255, 255, 0.56);
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