<script>
import AppButton from '../../../core/components/AppButton.vue'
import AppInput from '../../../core/components/AppInput.vue'
import AppCard from '../../../core/components/AppCard.vue'
import { documentationService } from '../services/documentation-api.service'
import { Documentation } from '../models/documentation.entity'
import ExportButton from '../../../core/exports/components/ExportButton.vue'

export default {
  name: 'DocumentationSupervisorComponent',
  components: {
    AppButton,
    AppInput,
    AppCard,
    ExportButton
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true,
      validator: (value) => value && value.toString().length > 0
    }
  },
  computed: {
    exportData() {
      return this.documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        date: doc.date,
        imagePath: doc.imagePath,
        hasImage: !!doc.imagePath,
        status: 'active',
        department: 'documentation'
      }))
    }
  },
  data() {
    return {
      documents: [],
      loading: false,
      showForm: false,
      isEditing: false,
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
      processingImage: false,
      saving: false
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
      this.processingImage = false
      this.saving = false
    },

    closeForm() {
      this.showForm = false
      this.isEditing = false
      this.formError = ''
      this.selectedImage = null
      this.imagePreview = ''
      this.processingImage = false
      this.saving = false

      // Limpiar URL de vista previa si existe
      if (this.imagePreview && this.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(this.imagePreview)
      }
    },

    async handleImageChange(event) {
      const file = event.target?.files?.[0]
      if (!file) return

      try {
        // Limpiar errores previos
        this.formError = ''
        this.processingImage = true

        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
          this.formError = this.$t('documentation.fileMustBeImage')
          return
        }

        // Validar tamaño (máximo 5MB como espera el backend)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
          this.formError = this.$t('documentation.imageTooLarge')
          return
        }

        // Validar formatos permitidos (según el backend)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          this.formError = 'Formato de imagen no válido. Solo se permiten JPG, PNG, WebP y GIF.'
          return
        }

        console.log(`📤 Imagen seleccionada: ${file.name} (${Math.round(file.size / 1024)}KB)`)

        // Limpiar vista previa anterior
        if (this.imagePreview && this.imagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(this.imagePreview)
        }

        // Crear vista previa local
        this.selectedImage = file
        this.imagePreview = URL.createObjectURL(file)

        console.log('✅ Vista previa creada')

      } catch (error) {
        console.error('❌ Error procesando imagen:', error)
        this.formError = error.message || 'Error al procesar la imagen'
        this.selectedImage = null
        this.imagePreview = ''
      } finally {
        this.processingImage = false
      }
    },

    validateForm() {
      // Limpiar errores previos
      this.formError = ''

      if (!this.currentDocument.title?.trim()) {
        this.formError = this.$t('documentation.titleRequired')
        return false
      }

      if (this.currentDocument.title.trim().length > 200) {
        this.formError = 'El título no puede exceder 200 caracteres'
        return false
      }

      if (!this.currentDocument.description?.trim()) {
        this.formError = this.$t('documentation.descriptionRequired')
        return false
      }

      if (this.currentDocument.description.trim().length > 1000) {
        this.formError = 'La descripción no puede exceder 1000 caracteres'
        return false
      }

      if (!this.currentDocument.date) {
        this.formError = this.$t('documentation.dateRequired')
        return false
      }

      // Validar imagen: requerida para nuevos documentos, opcional para edición
      if (!this.isEditing && !this.selectedImage) {
        this.formError = this.$t('documentation.imageRequired')
        return false
      }

      // Validar fecha no muy antigua ni futura
      const docDate = new Date(this.currentDocument.date)
      const today = new Date()
      const fiveYearsAgo = new Date()
      fiveYearsAgo.setFullYear(today.getFullYear() - 5)
      const tomorrow = new Date()
      tomorrow.setDate(today.getDate() + 1)

      if (docDate < fiveYearsAgo) {
        this.formError = 'La fecha no puede ser mayor a 5 años en el pasado'
        return false
      }

      if (docDate > tomorrow) {
        this.formError = 'La fecha no puede ser en el futuro'
        return false
      }

      return true
    },

    async saveDocument() {
      if (!this.validateForm()) return

      try {
        this.saving = true
        console.log(`💾 Guardando documento: ${this.currentDocument.title}`)

        // Crear una instancia de Documentation
        const document = new Documentation({
          ...this.currentDocument,
          projectId: this.projectId
        })

        let savedDocument

        if (this.isEditing) {
          // ACTUALIZAR documento existente
          console.log(`📝 Actualizando documento ${document.id}`)

          // Pasar la imagen solo si se seleccionó una nueva
          savedDocument = await documentationService.update(
              document.id,
              document,
              this.selectedImage // null si no hay nueva imagen
          )

          console.log('✅ Documento actualizado exitosamente')
        } else {
          // CREAR nuevo documento
          console.log('📝 Creando nuevo documento')

          // Para crear, la imagen es obligatoria
          if (!this.selectedImage) {
            throw new Error('Imagen es requerida para crear documentación')
          }

          savedDocument = await documentationService.create(document, this.selectedImage)
          console.log('✅ Documento creado exitosamente')
        }

        // Recargar documentos y cerrar formulario
        await this.loadDocuments()
        this.closeForm()

      } catch (error) {
        console.error('❌ Error al guardar documento:', error)

        // Manejar diferentes tipos de errores
        if (error.message.includes('413') || error.message.includes('Payload Too Large')) {
          this.formError = 'La imagen es demasiado grande. Máximo 5MB permitido.'
        } else if (error.message.includes('timeout')) {
          this.formError = 'Tiempo de conexión agotado. Intenta de nuevo.'
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          this.formError = 'Error de conexión. Verifica tu internet.'
        } else if (error.message.includes('400')) {
          this.formError = error.message || 'Datos inválidos. Revisa el formulario.'
        } else if (error.message.includes('401') || error.message.includes('403')) {
          this.formError = 'No tienes permisos para realizar esta acción.'
        } else {
          this.formError = error.message || 'Error al guardar documentación. Intenta de nuevo.'
        }
      } finally {
        this.saving = false
      }
    },

    async deleteDocument(document) {
      if (!confirm(`¿Estás seguro de eliminar el documento "${document.title}"?`)) {
        return
      }

      try {
        console.log(`🗑️ Eliminando documento: ${document.id}`)

        const success = await documentationService.delete(document.id)

        if (success) {
          console.log('✅ Documento eliminado exitosamente')
          await this.loadDocuments() // Recargar lista
        } else {
          throw new Error('No se pudo eliminar el documento')
        }

      } catch (error) {
        console.error('❌ Error al eliminar documento:', error)

        let errorMessage = 'Error al eliminar el documento'
        if (error.message.includes('404')) {
          errorMessage = 'El documento ya no existe'
        } else if (error.message.includes('403')) {
          errorMessage = 'No tienes permisos para eliminar este documento'
        }

        alert(errorMessage)
      }
    },

    // Formatea la fecha para mostrarla
    formatDate(dateString) {
      return documentationService.formatDate(dateString)
    },

    handleDocumentClick(document) {
      // Abrir formulario de edición con los datos del documento
      this.isEditing = true
      this.currentDocument = {
        id: document.id,
        projectId: document.projectId,
        title: document.title,
        description: document.description,
        imagePath: document.imagePath,
        date: document.date
      }

      // Mostrar imagen actual como vista previa
      this.imagePreview = document.imagePath
      this.selectedImage = null // No hay nueva imagen seleccionada

      this.showForm = true
      this.formError = ''
      this.processingImage = false
      this.saving = false
    },

    // Método para manejar el clic derecho o botón de eliminar en las tarjetas
    async handleDocumentAction(document, action) {
      switch (action) {
        case 'edit':
          this.handleDocumentClick(document)
          break
        case 'delete':
          await this.deleteDocument(document)
          break
        default:
          this.handleDocumentClick(document) // Por defecto, editar
      }
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

        <div class="header-actions">
          <!-- Botón exportar -->
          <ExportButton
              v-if="documents.length > 0"
              :data="exportData"
              type="documentation"
              :formats="['pdf', 'json', 'csv']"
              :button-label="$t('exports.export')"
              variant="secondary"
              size="small"
              icon="pi pi-download"
              :modal="false"
          />

          <!-- Botón nuevo -->
          <app-button
              :label="$t('documentation.new')"
              variant="primary"
              size="small"
              @click="openAddForm"
              icon="pi pi-plus"
          />
        </div>
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
                    'uploading': processingImage
                  }"
                  @click="$refs.imageInput.click()"
              >
                <div v-if="processingImage" class="upload-progress">
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
                  :disabled="processingImage"
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
              :disabled="saving || processingImage"
          />

          <app-button
              :label="loading ? $t('documentation.saving') : $t('general.save')"
              variant="primary"
              @click="saveDocument"
              :loading="loading"
              :disabled="processingImage || saving || (!selectedImage && !isEditing)"
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