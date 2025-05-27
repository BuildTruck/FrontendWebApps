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
  components: { AppInput, AppButton, AppNotification, LocationInput },
  data() {
    return {
      form: {
        name: '', state: '', location: '', locationData: null,
        description: '', start_date: '', supervisorId: ''
      },
      originalData: {},
      currentSupervisor: null,
      isEditing: false,
      supervisors: [],
      loading: { project: false, supervisors: false, saving: false },
      notification: { show: false, message: '', type: 'success', autoClose: true }
    }
  },
  computed: {
    supervisorDisplayText() {
      if (this.loading.project) return 'Cargando...'
      if (this.currentSupervisor?.email) return this.currentSupervisor.email
      return 'Sin supervisor asignado'
    },
    supervisorOptionsStyled() {
      return this.supervisors.map(s => ({
        ...s,
        isCurrentSupervisor: s.value && s.value == this.form.supervisorId && s.value !== ''
      }))
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    getStateOptions() {
      return Projects.getStateOptions(this.$t)
    },

    async loadData() {
      this.loading.project = true
      try {
        await this.fetchProject()
        await this.fetchSupervisors()
      } catch (error) {
        this.showNotification('Error al cargar los datos del proyecto', 'error')
      } finally {
        this.loading.project = false
      }
    },

    async fetchProject() {
      const response = await projectService.getProjectById(this.projectId)
      const project = response.data || response

      // Llenar formulario
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

      // Cargar supervisor actual
      if (project.supervisorId) {
        await this.loadCurrentSupervisor(project.supervisorId)
      }
    },

    async loadCurrentSupervisor(supervisorId) {
      if (!supervisorId) {
        this.currentSupervisor = null
        return
      }

      try {
        const response = await projectService.getSupervisorById(supervisorId)
        if (response?.success && response?.data) {
          this.currentSupervisor = response.data
          this.$forceUpdate()
        }
      } catch (error) {
        this.currentSupervisor = null
      }
    },

    async fetchSupervisors() {
      this.loading.supervisors = true
      try {
        const response = await projectService.getAvailableSupervisors()
        let options = (response.data || []).map(s => ({
          value: s.value || s.id,
          label: s.email || s.label || s.name
        }))

        // Incluir supervisor actual si no está en la lista
        if (this.currentSupervisor && this.form.supervisorId) {
          const exists = options.some(s => s.value == this.form.supervisorId)
          if (!exists) {
            options.unshift({
              value: this.currentSupervisor.id,
              label: this.currentSupervisor.email
            })
          }
        }

        // Agregar opción vacía
        options.unshift({ value: '', label: 'Sin supervisor asignado' })
        this.supervisors = options

      } catch (err) {
        this.showNotification('Error al cargar supervisores', 'error')
        this.supervisors = [{ value: '', label: 'Sin supervisor asignado' }]
      } finally {
        this.loading.supervisors = false
      }
    },

    handleLocationSelected(locationData) {
      this.form.locationData = locationData
    },

    startEdit() {
      this.isEditing = true
    },

    async saveChanges() {
      if (this.loading.saving) return

      this.loading.saving = true
      try {
        const updateData = {
          name: this.form.name,
          state: this.form.state,
          location: this.form.location,
          coordinates: this.form.locationData?.coordinates || null,
          description: this.form.description,
          start_date: this.form.start_date,
          supervisorId: this.form.supervisorId || null
        }

        await projectService.updateProject(this.projectId, updateData)

        // Recargar supervisor si cambió
        if (updateData.supervisorId !== this.originalData.supervisorId) {
          await this.loadCurrentSupervisor(updateData.supervisorId)
          await this.fetchSupervisors()
        }

        this.originalData = { ...this.form }
        this.showNotification('Los cambios se guardaron correctamente')
        this.isEditing = false

      } catch (err) {
        this.showNotification('Hubo un error al guardar los cambios', 'error')
      } finally {
        this.loading.saving = false
      }
    },

    cancelChanges() {
      this.form = { ...this.originalData }
      this.isEditing = false
    },

    showNotification(message, type = 'success') {
      this.notification = { show: true, message, type, autoClose: true }
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
            :disabled="!isEditing || loading.project"
            :label="$t('projects.projectName')"
        />
        <AppInput
            v-model="form.state"
            type="select"
            :disabled="!isEditing || loading.project"
            :label="$t('projects.projectStatus')"
            :options="getStateOptions()"
        />
      </div>

      <div class="form-row">
        <LocationInput
            v-model="form.location"
            :disabled="!isEditing || loading.project"
            :label="$t('projects.location')"
            :placeholder="$t('projects.locationPlaceholder')"
            @location-selected="handleLocationSelected"
        />
        <AppInput
            v-model="form.description"
            :disabled="!isEditing || loading.project"
            :label="$t('projects.description')"
            type="textarea"
        />
      </div>

      <div class="form-row">
        <AppInput
            v-model="form.start_date"
            :disabled="!isEditing || loading.project"
            :label="$t('projects.estimatedStartDate')"
            type="date"
        />

        <!-- Campo supervisor -->
        <div class="supervisor-field">
          <!-- Modo vista -->
          <div v-if="!isEditing" class="supervisor-display-container">
            <label class="supervisor-label">{{ $t('projects.assignedSupervisor') }}</label>
            <div class="supervisor-display-value">
              {{ supervisorDisplayText }}
            </div>
          </div>

          <!-- Modo edición -->
          <div v-else class="supervisor-edit-container">
            <label class="supervisor-label">{{ $t('projects.assignedSupervisor') }}</label>
            <select
                v-model="form.supervisorId"
                class="supervisor-select"
                :disabled="loading.supervisors"
            >
              <option
                  v-for="option in supervisorOptionsStyled"
                  :key="option.value"
                  :value="option.value"
                  :class="{ 'current-supervisor': option.isCurrentSupervisor }"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="actions">
        <AppButton
            v-if="!isEditing"
            :label="$t('projects.configure')"
            variant="primary"
            :disabled="loading.project"
            @click="startEdit"
        />
        <template v-else>
          <AppButton
              :label="$t('general.save')"
              variant="primary"
              :disabled="loading.saving"
              @click="saveChanges"
          />
          <AppButton
              :label="$t('general.cancel')"
              variant="secondary"
              :disabled="loading.saving"
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
  min-height: 668px;
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

.supervisor-field {
  flex: 1;
  min-width: 300px;
}

.supervisor-display-container {
  display: flex;
  flex-direction: column;
}

.supervisor-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.supervisor-display-value {
  padding: 12px 16px;
  border: 1px solid #DCDCDC;
  border-radius: 8px;
  background: #f8f9fa;
  font-weight: 500;
  color: #495057;
}

.supervisor-edit-container {
  display: flex;
  flex-direction: column;
}

.supervisor-select {
  padding: 12px 16px;
  border: 1px solid #DCDCDC;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  color: #333;
  transition: border-color 0.2s ease;
}

.supervisor-select:focus {
  outline: none;
  border-color: #ff6b35;
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.1);
}

.supervisor-select option {
  color: #000;
  background: white;
  padding: 8px 12px;
}

.supervisor-select option.current-supervisor {
  background-color: #ff6b35;
  color: #000;
  font-weight: 600;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>