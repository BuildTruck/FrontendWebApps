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
        description: '', start_date: '', supervisorId: '', image: null
      },
      imagePreviewUrl: null,
      originalData: {},
      currentSupervisor: null,
      isEditing: false,
      supervisors: [],
      loading: { project: false, supervisors: false, saving: false, deleting: false },
      notification: { show: false, message: '', type: 'success', autoClose: true },
      showDeleteConfirm: false,
      projectData: null
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
    },
    projectImageUrl() {
      if (this.imagePreviewUrl) {
        return this.imagePreviewUrl
      }

      if (this.projectData) {
        let imageUrl = this.projectData.imageUrl ||
            this.projectData.thumbnailUrl ||
            this.projectData.image

        // ✅ CORRECCIÓN CLOUDINARY: Optimizar URL para alta calidad
        if (imageUrl && imageUrl.includes('cloudinary.com')) {
          // Remover transformaciones automáticas de baja calidad
          imageUrl = imageUrl.replace(/\/c_thumb[^/]*/, '') // Quitar c_thumb
          imageUrl = imageUrl.replace(/\/w_\d+/, '') // Quitar limitaciones de width
          imageUrl = imageUrl.replace(/\/h_\d+/, '') // Quitar limitaciones de height
          imageUrl = imageUrl.replace(/\/q_auto[^/]*/, '') // Quitar calidad automática

          // ✅ Agregar parámetros de alta calidad
          const baseUrl = imageUrl.split('/upload/')[0] + '/upload/'
          const imagePath = imageUrl.split('/upload/')[1]

          // Configurar para alta calidad: sin compresión, escala optimizada
          imageUrl = `${baseUrl}f_auto,q_100,c_limit,w_800/${imagePath}`
        }

        if (imageUrl) {
          return imageUrl
        }
      }

      return '/images/proyecto-default.jpg'
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
    formatDateForInput(dateString) {
      if (!dateString) return ''

      try {
        const date = new Date(dateString)
        return date.toISOString().split('T')[0]
      } catch (error) {
        return ''
      }
    },
    async getSupervisorIdByName(supervisorName) {
      if (!supervisorName) return ''

      try {
        const response = await projectService.getSupervisorByName(supervisorName)
        return response.data ? response.data.id.toString() : ''
      } catch (error) {
        return ''
      }
    },
    async loadSupervisorByName(supervisorName) {
      if (!supervisorName) {
        this.currentSupervisor = null
        return
      }

      try {
        const response = await projectService.getSupervisorByName(supervisorName)
        if (response.data) {
          this.currentSupervisor = response.data
        } else {
          this.currentSupervisor = {
            name: supervisorName,
            email: supervisorName
          }
        }
      } catch (error) {
        this.currentSupervisor = {
          name: supervisorName,
          email: supervisorName
        }
      }
    },
    async fetchProject() {
      try {
        const response = await projectService.getProjectById(this.projectId)
        const project = response.data || response

        this.projectData = project
        this.imagePreviewUrl = null

        // Mapeo usando campos correctos del backend
        this.form = {
          name: project.name || '',
          state: project.state || '',
          location: project.shortLocation || '',
          locationData: project.coordinates ? { coordinates: project.coordinates } : null,
          description: project.descriptionSummary || '',
          start_date: this.formatDateForInput(project.startDate),
          supervisorId: await this.getSupervisorIdByName(project.supervisorName),
          image: null
        }

        this.originalData = { ...this.form }

        if (project.supervisorName) {
          await this.loadSupervisorByName(project.supervisorName)
        } else {
          this.currentSupervisor = null
        }

        this.$nextTick(() => {
          this.$forceUpdate()
        })

      } catch (error) {
        console.error('Error fetching project:', error)
        throw error
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
        }
      } catch (error) {
        this.currentSupervisor = null
      }
    },

    async fetchSupervisors() {
      this.loading.supervisors = true
      try {
        // ✅ CORRECCIÓN: Solo obtener supervisores disponibles (ya filtrados por rol en el servicio)
        const response = await projectService.getAvailableSupervisors()
        let options = (response.data || []).map(s => ({
          value: s.value || s.id,
          label: s.email || s.label || s.name
        }))

        // ✅ Si hay un supervisor actual asignado, agregarlo a las opciones
        if (this.currentSupervisor && this.form.supervisorId) {
          const exists = options.some(s => s.value == this.form.supervisorId)
          if (!exists) {
            // Agregar el supervisor actual aunque no esté "disponible"
            options.unshift({
              value: this.currentSupervisor.id,
              label: `${this.currentSupervisor.email} (Asignado)`
            })
          }
        }

        // ✅ Agregar opción "Sin supervisor" al inicio
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

    handleImageChange(file) {
      this.form.image = file
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          this.imagePreviewUrl = e.target.result
        }
        reader.readAsDataURL(file)
      } else {
        this.imagePreviewUrl = null
      }
    },

    startEdit() {
      this.isEditing = true
    },

    triggerImageUpload() {
      this.$refs.imageInput.click()
    },

    handleImageUpload(event) {
      const file = event.target.files[0]
      if (file) {
        this.handleImageChange(file)
      }
    },

    async saveChanges() {
      if (this.loading.saving) return

      this.loading.saving = true
      try {
        const updateData = {
          name: this.form.name,
          state: this.form.state,
          hasStateChanged: this.form.state !== this.originalData.state,
          location: this.form.location,
          coordinates: this.form.locationData?.coordinates || null,
          description: this.form.description,
          start_date: this.form.start_date,
          supervisorId: this.form.supervisorId || null
        }

        await projectService.updateProject(this.projectId, updateData, this.form.image)

        // ✅ Si cambió el supervisor, actualizar datos
        if (updateData.supervisorId !== this.originalData.supervisorId) {
          await this.loadCurrentSupervisor(updateData.supervisorId)
          await this.fetchSupervisors()
        }

        await this.fetchProject()
        this.showNotification('Los cambios se guardaron correctamente')
        this.isEditing = false

      } catch (err) {
        this.showNotification('Hubo un error al guardar los cambios', 'error')
      } finally {
        this.loading.saving = false
      }
    },

    cancelChanges() {
      this.form = { ...this.originalData, image: null }
      this.isEditing = false
      this.imagePreviewUrl = null
    },

    confirmDelete() {
      this.showDeleteConfirm = true
    },

    cancelDelete() {
      this.showDeleteConfirm = false
    },

    async deleteProject() {
      if (this.loading.deleting) return

      this.loading.deleting = true
      try {
        await projectService.deleteProject(this.projectId, true, 'Eliminado por el manager')
        this.showNotification('Proyecto eliminado correctamente', 'success')

        setTimeout(() => {
          this.$router.push('/proyectos')
        }, 2000)

      } catch (error) {
        this.showNotification('Error al eliminar el proyecto', 'error')
      } finally {
        this.loading.deleting = false
        this.showDeleteConfirm = false
      }
    },

    showNotification(message, type = 'success') {
      this.notification = { show: true, message, type, autoClose: true }
    }
  }
}
</script>

<template>
  <div class="config-container">
    <div class="content-wrapper">
      <!-- Imagen del proyecto como fondo -->
      <div class="image-section">
        <div
            class="image-background"
            :style="{ backgroundImage: `url(${projectImageUrl})` }"
        >
          <div class="image-overlay">
            <h1 class="project-title">{{ form.name || 'Proyecto' }}</h1>
            <div v-if="isEditing" class="image-edit-section">
              <AppButton
                  :label="$t('projects.changeImage')"
                  variant="secondary"
                  icon="pi pi-camera"
                  @click="triggerImageUpload"
                  size="small"
              />
              <input
                  ref="imageInput"
                  type="file"
                  accept="image/*"
                  @change="handleImageUpload"
                  style="display: none"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Formulario -->
      <div class="form-section">
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
              <div v-if="!isEditing" class="supervisor-display-container">
                <label class="supervisor-label">{{ $t('projects.assignedSupervisor') }}</label>
                <div class="supervisor-display-value">
                  {{ supervisorDisplayText }}
                </div>
              </div>

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
            <div class="main-actions">
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

            <div class="danger-actions">
              <AppButton
                  :label="$t('projects.deleteProject')"
                  variant="secondary"
                  :disabled="loading.project || isEditing"
                  @click="confirmDelete"
                  icon="pi pi-trash"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación de eliminación -->
    <div v-if="showDeleteConfirm" class="modal-overlay">
      <div class="modal-content delete-modal">
        <div class="delete-icon">
          <i class="pi pi-exclamation-triangle"></i>
        </div>
        <p>{{ $t('projects.deleteWarning') }}</p>
        <p class="project-name">"{{ form.name }}"</p>

        <div class="modal-actions">
          <AppButton
              :label="$t('general.cancel')"
              variant="secondary"
              @click="cancelDelete"
              :disabled="loading.deleting"
          />
          <AppButton
              :label="loading.deleting ? $t('general.deleting') : $t('general.delete')"
              variant="secondary"
              @click="deleteProject"
              :disabled="loading.deleting"
              :loading="loading.deleting"
          />
        </div>
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
  padding: 20px;
  height: 100%;
  overflow: hidden
}

.content-wrapper {
  display: flex;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
}

.image-section {
  flex: 0 0 400px;
}

.image-background {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  position: relative;
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  padding: 30px 20px 20px;
  color: white;
}

.project-title {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0 0 15px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.image-edit-section {
  display: flex;
  gap: 10px;
  align-items: center;
}

.form-section {
  flex: 1;
  overflow-y: auto;
  height: 100%;
}

.form-box {
  border-radius: 12px;
  border: 1px solid #DCDCDC;
  background: rgba(255, 255, 255, 0.56);
  padding: 40px;
  height: 100%;
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
  justify-content: space-between;
  align-items: center;
}

.main-actions {
  display: flex;
  gap: 12px;
}

.danger-actions {
  border: transparent;
  display: flex;
  gap: 12px;
}

/* Modal de confirmación */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-height: 90vh;
  overflow-y: auto;
}

.delete-modal {
  width: 90%;
  max-width: 450px;
  padding: 30px;
  text-align: center;
}

.delete-icon {
  margin-bottom: 20px;
}

.delete-icon i {
  font-size: 3rem;
  color: #dc3545;
}

.delete-modal h3 {
  margin: 0 0 15px;
  color: #333;
  font-size: 1.5rem;
}

.delete-modal p {
  margin: 0 0 10px;
  color: #666;
  line-height: 1.5;
}

.project-name {
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
  margin-bottom: 25px !important;
}

.modal-actions {
  display: flex;
  justify-content: center;
  gap: 15px;
}

/* Responsive */
@media (max-width: 1024px) {
  .content-wrapper {
    flex-direction: column;
  }

  .image-section {
    flex: none;
  }

  .image-container {
    height: 300px;
  }
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 16px;
  }

  .actions {
    flex-direction: column;
    gap: 20px;
  }

  .main-actions,
  .danger-actions {
    width: 100%;
    justify-content: center;
  }
}
/* Responsive */
@media (max-width: 1024px) {
  .content-wrapper {
    flex-direction: column;
  }

  .image-section {
    flex: none;
    height: 300px;
  }

  .image-background {
    height: 300px;
  }
}

@media (max-width: 768px) {
  .config-container {
    padding: 10px;
  }

  .form-box {
    padding: 20px;
  }

  .form-row {
    flex-direction: column;
    gap: 16px;
  }

  .form-row > * {
    min-width: auto;
  }

  .supervisor-field {
    min-width: auto;
  }

  .actions {
    flex-direction: column;
    gap: 20px;
  }

  .main-actions,
  .danger-actions {
    width: 100%;
    justify-content: center;
  }

  .project-title {
    font-size: 1.5rem;
  }

  .image-overlay {
    padding: 20px 15px 15px;
  }

  .delete-modal {
    width: 95%;
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .form-box {
    padding: 15px;
  }

  .supervisor-select {
    font-size: 16px; /* Evita zoom en iOS */
  }

  .project-title {
    font-size: 1.3rem;
  }
}
</style>