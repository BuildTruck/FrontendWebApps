<script>
import AppButton from '../../../core/components/AppButton.vue'
import AppInput from '../../../core/components/AppInput.vue'
import AppCard from '../../../core/components/AppCard.vue'
import { documentationService } from '../services/documentation-api.service'
import { Documentation } from '../models/documentation.entity'

export default {
  name: 'DocumentationSupervisorComponent',
  components: {
    AppButton,
    AppInput,
    AppCard
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true,
      validator: (value) => value && value.toString().length > 0
    }
  },
  data() {
    return {
      documents: [],
      loading: false,
      showForm: false,
      isEditing: false, // Nueva bandera para distinguir crear vs editar
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
      imagePreview: '',
      uploadingImage: false
    }
  },
  async mounted() {
    await this.loadDocuments()
  },
  watch: {
    projectId: {
      handler(newProjectId, oldProjectId) {
        if (newProjectId !== oldProjectId) {
          this.currentDocument.projectId = newProjectId
          this.loadDocuments()
        }
      },
      immediate: false
    }
  },
  methods: {
    async loadDocuments() {
      if (!this.projectId) {
        console.warn('⚠️ No se puede cargar documentos sin projectId')
        return
      }

      try {
        this.loading = true
        console.log(`🔄 Cargando documentos para proyecto: ${this.projectId}`)

        // Usar el servicio mejorado
        this.documents = await documentationService.getByProjectId(this.projectId)

        console.log(`✅ Cargados ${this.documents.length} documentos`)

      } catch (error) {
        console.error('❌ Error al cargar documentos:', error)
        this.documents = []
      } finally {
        this.loading = false
      }
    },

    openAddForm() {
      this.isEditing = false
      this.currentDocument = {
        id: null,
        projectId: this.projectId,
        title: '',
        description: '',
        imagePath: '',
        date: new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" })
      }
      this.showForm = true
      this.selectedImage = null
      this.imagePreview = ''
      this.formError = ''
      this.uploadingImage = false
    },

    closeForm() {
      this.showForm = false
      this.isEditing = false
      this.formError = ''
      this.selectedImage = null
      this.imagePreview = ''
      this.uploadingImage = false
    },

    async handleImageChange(event) {
      const file = event.target?.files?.[0]
      if (!file) return

      try {
        // Limpiar errores previos
        this.formError = ''
        this.uploadingImage = true

        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
          this.formError = this.$t('documentation.fileMustBeImage')
          return
        }

        // Validar tamaño original (máximo 10MB)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
          this.formError = this.$t('documentation.imageTooLarge')
          return
        }

        console.log(`📤 Procesando imagen: ${file.name} (${Math.round(file.size / 1024)}KB)`)

        // Usar el servicio de compresión
        const imageResult = await documentationService.uploadImage(file, this.projectId)

        // Actualizar la vista previa y datos
        this.selectedImage = file
        this.imagePreview = imageResult.imagePath
        this.currentDocument.imagePath = imageResult.imagePath

        console.log(`✅ Imagen procesada: ${imageResult.compressedSizeKB}KB`)

      } catch (error) {
        console.error('❌ Error procesando imagen:', error)
        this.formError = error.message || this.$t('documentation.errorSavingDocumentation')
        this.selectedImage = null
        this.imagePreview = ''
        this.currentDocument.imagePath = ''
      } finally {
        this.uploadingImage = false
      }
    },

    validateForm() {
      // Limpiar errores previos
      this.formError = ''

      if (!this.currentDocument.title?.trim()) {
        this.formError = this.$t('documentation.titleRequired')
        return false
      }

      if (this.currentDocument.title.trim().length > 100) {
        this.formError = this.$t('errors.maxLength', { max: 100 })
        return false
      }

      if (!this.currentDocument.description?.trim()) {
        this.formError = this.$t('documentation.descriptionRequired')
        return false
      }

      if (this.currentDocument.description.trim().length > 500) {
        this.formError = this.$t('errors.maxLength', { max: 500 })
        return false
      }

      if (!this.currentDocument.imagePath && !this.currentDocument.id) {
        this.formError = this.$t('documentation.imageRequired')
        return false
      }

      if (!this.currentDocument.date) {
        this.formError = this.$t('documentation.dateRequired')
        return false
      }

      return true
    },

    async saveDocument() {
      if (!this.validateForm()) return

      try {
        this.loading = true
        console.log(`💾 Guardando documento: ${this.currentDocument.title}`)

        // Crear una instancia de Documentation
        const document = new Documentation({
          ...this.currentDocument,
          projectId: this.projectId
        })

        // Guardar usando el servicio mejorado
        if (!document.id) {
          // Crear nuevo documento
          await documentationService.create(document)
          console.log('✅ Documento creado exitosamente')
        } else {
          // Actualizar documento existente
          await documentationService.update(document.id, document, this.projectId)
          console.log('✅ Documento actualizado exitosamente')
        }

        // Recargar documentos y cerrar formulario
        await this.loadDocuments()
        this.closeForm()

      } catch (error) {
        console.error('❌ Error al guardar documento:', error)

        // Manejar diferentes tipos de errores
        if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
          this.formError = this.$t('documentation.imageTooLarge')
        } else if (error.message.includes('timeout')) {
          this.formError = this.$t('documentation.connectionTimeout')
        } else if (error.message.includes('Network')) {
          this.formError = this.$t('documentation.connectionError')
        } else {
          this.formError = error.message || this.$t('documentation.errorSavingDocumentation')
        }
      } finally {
        this.loading = false
      }
    },

    // Formatea la fecha para mostrarla
    formatDate(dateString) {
      return documentationService.formatDate(dateString)
    },

    handleDocumentClick(document) {
      // Abrir formulario de edición con los datos del documento
      this.currentDocument = {
        id: document.id,
        projectId: document.projectId,
        title: document.title,
        description: document.description,
        imagePath: document.imagePath,
        date: document.date
      }

      this.imagePreview = document.imagePath
      this.showForm = true
      this.formError = ''
      this.uploadingImage = false
    }
  }
}
</script>

<template>
  <div class="documentation-supervisor">
    <!-- Vista de galería de documentos -->
    <div v-if="!showForm" class="documentation-gallery">

      <div class="gallery-header">
        <div class="header-info">
          <span v-if="documents.length > 0" class="document-count">
            {{ documents.length }} {{ documents.length === 1 ? $t('documentation.document') : $t('documentation.documents') }}
          </span>
        </div>

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
            @click="handleDocumentClick(doc)"
        />
      </div>

      <!-- Mensaje sin documentos mejorado -->
      <div v-else class="empty-gallery">
        <div class="empty-content">
          <div class="empty-icon-container">
            <i class="pi pi-images empty-icon"></i>
          </div>
          <h3 class="empty-title">{{ $t('documentation.startDocumenting') }}</h3>
          <p class="empty-description">
            {{ $t('documentation.documentationDescription') }}
          </p>
          <div class="empty-features">
            <div class="feature-item">
              <i class="pi pi-camera feature-icon"></i>
              <span>{{ $t('documentation.uploadImages') }}</span>
            </div>
            <div class="feature-item">
              <i class="pi pi-file-edit feature-icon"></i>
              <span>{{ $t('documentation.addTitlesDescriptions') }}</span>
            </div>
            <div class="feature-item">
              <i class="pi pi-calendar feature-icon"></i>
              <span>{{ $t('documentation.recordImportantDates') }}</span>
            </div>
          </div>
          <app-button
              :label="$t('documentation.add')"
              variant="primary"
              @click="openAddForm"
              icon="pi pi-plus"
              size="large"
          />
        </div>
      </div>
    </div>

    <!-- Formulario para agregar documentación -->
    <div v-else class="documentation-form">
      <div class="form-wrapper">
        <div class="form-header">
          <h2 class="form-title">{{ currentDocument.id ? $t('documentation.editDocumentation') : $t('documentation.addDocumentation') }}</h2>
          <div class="form-header-icon">
            <i class="pi pi-file-o file-icon"></i>
          </div>
        </div>

        <div class="form-content">
          <div class="form-group">
            <app-input
                v-model="currentDocument.title"
                :label="$t('documentation.title')"
                :placeholder="$t('documentation.titlePlaceholder')"
                :error="formError && formError.includes('título') ? formError : ''"
                required
                fullWidth
                maxlength="100"
            />
            <div class="char-counter">
              {{ (currentDocument.title || '').length }}/100 {{ $t('documentation.characters') }}
            </div>
          </div>

          <div class="form-group">
            <app-input
                v-model="currentDocument.description"
                :label="$t('documentation.description')"
                :placeholder="$t('documentation.descriptionPlaceholder')"
                type="textarea"
                :error="formError && formError.includes('descripción') ? formError : ''"
                required
                fullWidth
                maxlength="500"
            />
            <div class="char-counter">
              {{ (currentDocument.description || '').length }}/500 {{ $t('documentation.characters') }}
            </div>
          </div>

          <div class="form-group">
            <label class="image-upload-label">
              {{ $t('documentation.image') }} <span class="required">{{ $t('documentation.required') }}</span>
            </label>
            <div class="image-upload-container">
              <div
                  class="image-preview"
                  :class="{
                    'has-image': imagePreview,
                    'uploading': uploadingImage
                  }"
                  @click="$refs.imageInput.click()"
              >
                <div v-if="uploadingImage" class="upload-progress">
                  <i class="pi pi-spin pi-spinner"></i>
                  <span>{{ $t('documentation.processingImage') }}</span>
                </div>
                <img v-else-if="imagePreview" :src="imagePreview" :alt="$t('documentation.preview')" />
                <div v-else class="upload-placeholder">
                  <i class="pi pi-camera"></i>
                  <span>{{ $t('documentation.clickToSelect') }}</span>
                  <small>{{ $t('documentation.maxFileSize') }}</small>
                </div>
              </div>
              <input
                  ref="imageInput"
                  type="file"
                  accept="image/*"
                  class="hidden-input"
                  @change="handleImageChange"
                  :disabled="uploadingImage"
              />
            </div>
            <div v-if="formError && formError.includes('imagen')" class="image-error">
              {{ formError }}
            </div>
          </div>

          <div class="form-group">
            <app-input
                v-model="currentDocument.date"
                :label="$t('documentation.date')"
                type="date"
                :error="formError && formError.includes('fecha') ? formError : ''"
                required
                fullWidth
            />
          </div>

          <!-- Mensaje de error general -->
          <div v-if="formError && !formError.includes('título') && !formError.includes('descripción') && !formError.includes('imagen') && !formError.includes('fecha')" class="form-error">
            <i class="pi pi-exclamation-triangle"></i>
            {{ formError }}
          </div>
        </div>

        <div class="form-actions">
          <app-button
              :label="$t('general.cancel')"
              variant="secondary"
              @click="closeForm"
              :disabled="loading || uploadingImage"
          />

          <app-button
              :label="loading ? $t('documentation.saving') : $t('general.save')"
              variant="primary"
              @click="saveDocument"
              :loading="loading"
              :disabled="uploadingImage || !currentDocument.imagePath"
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
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.gallery-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.document-count {
  font-size: 0.875rem;
  color: #666;
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

/* Vista vacía mejorada */
.empty-gallery {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
  padding: 2rem;
}

.empty-content {
  text-align: center;
  max-width: 600px;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.empty-icon-container {
  margin-bottom: 1.5rem;
}

.empty-icon {
  font-size: 4rem;
  color: #FF5F01;
  opacity: 0.8;
}

.empty-title {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.empty-description {
  margin: 0 0 2rem;
  color: #666;
  line-height: 1.6;
  font-size: 1rem;
}

.empty-features {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #555;
}

.feature-icon {
  font-size: 1.5rem;
  color: #FF5F01;
  margin-bottom: 0.25rem;
}

.feature-item span {
  font-size: 0.875rem;
  text-align: center;
  max-width: 100px;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
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
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.form-group {
  width: 100%;
}

.char-counter {
  font-size: 0.75rem;
  color: #888;
  text-align: right;
  margin-top: 0.25rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.form-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #e53e3e;
  font-size: 0.875rem;
  background-color: #fed7d7;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #feb2b2;
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
  position: relative;
}

.image-preview:hover {
  border-color: #FF5F01;
  background-color: #fafafa;
}

.image-preview.has-image {
  border-style: solid;
  border-color: #FF5F01;
}

.image-preview.uploading {
  border-color: #FF5F01;
  background-color: #fff5f0;
  cursor: not-allowed;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #FF5F01;
}

.upload-progress i {
  font-size: 1.5rem;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #777;
  text-align: center;
}

.upload-placeholder i {
  font-size: 2rem;
}

.upload-placeholder small {
  font-size: 0.75rem;
  color: #999;
}

.image-error {
  color: #e53e3e;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.hidden-input {
  display: none;
}

/* Media Queries */
@media (max-width: 1024px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .empty-features {
    flex-direction: column;
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .gallery-grid {
    grid-template-columns: 1fr;
  }

  .gallery-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .empty-content {
    padding: 2rem 1rem;
  }

  .form-wrapper {
    margin: 0 0.5rem;
  }

  .form-actions {
    flex-direction: column;
    gap: 0.75rem;
  }

  .form-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
  }
}
</style>