<script>
import AppButton from '../../../core/components/AppButton.vue'
import AppInput from '../../../core/components/AppInput.vue'
import AppCard from '../../../core/components/AppCard.vue'
import { DocumentationApiService } from '../services/documentation-api.service'

export default {
  name: 'DocumentationSupervisorComponent',
  components: {
    AppButton,
    AppInput,
    AppCard
  },
  props: ['projectId'],
  data() {
    return {
      documents: [],
      loading: false,
      showForm: false,
      currentDocument: {
        id: null,
        projectId: this.projectId,
        title: '',
        description: '',
        imagePath: '',
        date: new Date().toISOString().split('T')[0]
      },
      formError: '',
      selectedImage: null,
      imagePreview: ''
    }
  },
  async mounted() {
    await this.loadDocuments()
  },
  methods: {
    async loadDocuments() {
      try {
        this.loading = true
        const documentationService = new DocumentationApiService()
        this.documents = await documentationService.getByProjectId(this.projectId)
      } catch (error) {
        console.error('Error al cargar fotos de documentación:', error)
      } finally {
        this.loading = false
      }
    },

    openAddForm() {
      this.currentDocument = {
        id: null,
        projectId: this.projectId,
        title: '',
        description: '',
        imagePath: '',
        date: new Date().toISOString().split('T')[0]
      }
      this.showForm = true
      this.selectedImage = null
      this.imagePreview = ''
      this.formError = ''
    },

    closeForm() {
      this.showForm = false
      this.formError = ''
    },

    handleImageChange(event) {
      const file = event.target?.files?.[0]
      if (file) {
        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
          this.formError = 'El archivo debe ser una imagen (jpg, png, etc.)'
          return
        }

        this.selectedImage = file
        this.imagePreview = URL.createObjectURL(file)
      }
    },

    validateForm() {
      if (!this.currentDocument.title) {
        this.formError = 'El título es obligatorio'
        return false
      }

      if (!this.currentDocument.description) {
        this.formError = 'La descripción es obligatoria'
        return false
      }

      if (!this.selectedImage && !this.currentDocument.id) {
        this.formError = 'Debe seleccionar una imagen'
        return false
      }

      return true
    },

    async saveDocument() {
      if (!this.validateForm()) return

      try {
        this.loading = true
        const documentationService = new DocumentationApiService()

        // Subir imagen
        if (this.selectedImage) {
          const uploadResult = await documentationService.uploadImage(this.selectedImage, this.projectId)

          // Actualizar la documentación con la URL de la imagen
          this.currentDocument.imagePath = uploadResult.imagePath
        }

        // Guardar la documentación
        if (!this.currentDocument.id) {
          // Generar ID único para documentación
          const timestamp = Date.now()
          const randomStr = Math.random().toString(36).substring(2, 6)
          this.currentDocument.id = `doc_${timestamp}_${randomStr}`

          await documentationService.create(this.currentDocument)
        } else {
          await documentationService.update(this.currentDocument.id, this.currentDocument)
        }

        // Recargar documentos y cerrar formulario
        await this.loadDocuments()
        this.closeForm()
      } catch (error) {
        console.error('Error al guardar foto de documentación:', error)
        this.formError = 'Error al guardar la foto de documentación'
      } finally {
        this.loading = false
      }
    },

    // Formatea la fecha para mostrarla
    formatDate(dateString) {
      if (!dateString) return ''

      const date = new Date(dateString)
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date)
    }
  }
}
</script>

<template>
  <div class="documentation-supervisor">
    <!-- Vista de galería de documentos -->
    <div v-if="!showForm" class="documentation-gallery">

      <div class="gallery-header">
        <app-button
            :label="$t('documentation.new')"
            variant="primary"
            size="small"
            @click="openAddForm"
            icon="pi pi-plus"
        />
      </div>

      <!-- Pantalla de carga -->
      <div v-if="loading" class="loading-container">
        <i class="pi pi-spin pi-spinner loading-icon"></i>
        <p>{{ $t('general.loading') }}</p>
      </div>

      <!-- Galería de documentos usando AppCard -->
      <div v-else-if="documents.length > 0" class="gallery-grid">
        <app-card
            v-for="doc in documents"
            :key="doc.id"
            variant="post"
            :title="doc.title"
            :image="doc.imagePath"
            :description="doc.description"
            :footer="{
            extra: formatDate(doc.date)
          }"
        />
      </div>

      <!-- Mensaje sin documentos -->
      <div v-else class="empty-gallery">
        <p>{{ $t('documentation.noDocuments') }}</p>
        <app-button
            :label="$t('documentation.add')"
            variant="primary"
            size="small"
            @click="openAddForm"
            icon="pi pi-plus"
        />
      </div>
    </div>

    <!-- Formulario para agregar documentación -->
    <div v-else class="documentation-form">
      <div class="form-wrapper">
        <div class="form-header">
          <h2 class="form-title">{{ $t('documentation.addDocumentation') }}</h2>
          <div>
            <i class="pi pi-file-o file-icon"></i>
          </div>
        </div>

        <div class="form-content">
          <div class="form-group">
            <app-input
                v-model="currentDocument.title"
                :label="$t('documentation.title')"
                :placeholder="$t('documentation.titlePlaceholder')"
                required
                fullWidth
            />
          </div>

          <div class="form-group">
            <app-input
                v-model="currentDocument.description"
                :label="$t('documentation.description')"
                :placeholder="$t('documentation.descriptionPlaceholder')"
                type="textarea"
                required
                fullWidth
            />
          </div>

          <div class="form-group">
            <label class="image-upload-label">{{ $t('documentation.image') }} <span class="required">*</span></label>
            <div class="image-upload-container">
              <div
                  class="image-preview"
                  :class="{ 'has-image': imagePreview }"
                  @click="$refs.imageInput.click()"
              >
                <img v-if="imagePreview" :src="imagePreview" :alt="$t('documentation.preview')" />
                <div v-else class="upload-placeholder">
                  <i class="pi pi-camera"></i>
                  <span>{{ $t('documentation.clickToSelect') }}</span>
                </div>
              </div>
              <input
                  ref="imageInput"
                  type="file"
                  accept="image/*"
                  class="hidden-input"
                  @change="handleImageChange"
              />
            </div>
          </div>

          <div class="form-group">
            <app-input
                v-model="currentDocument.date"
                :label="$t('documentation.date')"
                type="date"
                required
                fullWidth
            />
          </div>

          <!-- Mensaje de error -->
          <div v-if="formError" class="form-error">
            {{ formError }}
          </div>
        </div>

        <div class="form-actions">
          <app-button
              :label="$t('general.cancel')"
              variant="secondary"
              @click="closeForm"
              :disabled="loading"
          />

          <app-button
              :label="$t('general.save')"
              variant="primary"
              @click="saveDocument"
              :loading="loading"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.documentation-supervisor {
  width: 100%;
  height: 100%;
}

.documentation-gallery {
  padding: 1rem;
}

.gallery-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 1.5rem;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.loading-icon {
  font-size: 2rem;
  color: #FF5F01;
  margin-bottom: 1rem;
}

.empty-gallery {
  padding: 2rem;
  text-align: center;
  background-color: #f9f9f9;
  border-radius: 4px;
}

/* Formulario */
.documentation-form {
  display: flex;
  justify-content: center;
  padding: 1rem;
}

.form-wrapper {
  width: 100%;
  max-width: 600px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.form-header {
  display: flex;
  justify-content: flex-end; /* Esto alinea los hijos a la derecha */
  align-items: center;
  margin-bottom: 1.5rem;
}

.form-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.file-icon {
  font-size: 1.5rem;
  color: #FF5F01;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.form-error {
  color: #f44336;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* Image upload */
.image-upload-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #333;
  font-weight: 500;
}

.required {
  color: #FF5F01;
  margin-left: 2px;
}

.image-upload-container {
  width: 100%;
}

.image-preview {
  width: 100%;
  height: 200px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.image-preview:hover {
  border-color: #FF5F01;
}

.image-preview.has-image {
  border-style: solid;
  border-color: #FF5F01;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #777;
}

.upload-placeholder i {
  font-size: 2rem;
}

.hidden-input {
  display: none;
}

/* Media Queries */
@media (max-width: 1024px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .gallery-grid {
    grid-template-columns: 1fr;
  }
}
</style>