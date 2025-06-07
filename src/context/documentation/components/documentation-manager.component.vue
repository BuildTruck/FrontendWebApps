<script>
import AppButton from '../../../core/components/AppButton.vue'
import AppCard from '../../../core/components/AppCard.vue'
import AppInput from '../../../core/components/AppInput.vue'
import { documentationService } from '../services/documentation-api.service'
import { Documentation } from '../models/documentation.entity'

export default {
  name: 'DocumentationManagerComponent',
  components: {
    AppButton,
    AppCard,
    AppInput
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
      showExportOptions: false,
      exportFormat: 'pdf',
      exportStartDate: '',
      exportEndDate: '',
      exporting: false,
      stats: null,
      error: null
    }
  },
  async mounted() {
    await this.loadDocuments()
    await this.loadStats()
    this.initializeDateRange()
  },
  watch: {
    // Recargar documentos si cambia el projectId
    projectId: {
      handler(newProjectId, oldProjectId) {
        if (newProjectId !== oldProjectId) {
          this.loadDocuments()
          this.loadStats()
        }
      },
      immediate: false
    }
  },
  computed: {
    filteredDocumentsCount() {
      if (!this.exportStartDate && !this.exportEndDate) {
        return this.documents.length
      }
      const filtered = documentationService.filterDocumentsByDateRange(
          this.documents,
          this.exportStartDate,
          this.exportEndDate
      )
      return filtered.length
    },

    hasDocumentsInRange() {
      return this.filteredDocumentsCount > 0
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
        this.error = null

        console.log(`🔄 Cargando documentos para proyecto: ${this.projectId}`)

        // Usar el servicio mejorado que devuelve entidades Documentation
        this.documents = await documentationService.getByProjectId(this.projectId)

        console.log(`✅ Cargados ${this.documents.length} documentos`)

        // Verificar que todos los documentos pertenecen al proyecto
        const invalidDocs = this.documents.filter(doc => !doc.belongsToProject(this.projectId))
        if (invalidDocs.length > 0) {
          console.warn(`⚠️ Encontrados ${invalidDocs.length} documentos que no pertenecen al proyecto`)
        }

      } catch (error) {
        console.error('❌ Error al cargar documentos:', error)
        this.error = 'Error al cargar la documentación. Por favor, intenta de nuevo.'
        this.documents = []
      } finally {
        this.loading = false
      }
    },

    async loadStats() {
      if (!this.projectId) return

      try {
        this.stats = await documentationService.getProjectStats(this.projectId)
      } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error)
        this.stats = null
      }
    },

    initializeDateRange() {
      // Inicializar rango de fechas con el mes actual
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      this.exportEndDate = today.toISOString().split('T')[0]
      this.exportStartDate = firstDayOfMonth.toISOString().split('T')[0]
    },

    toggleExportOptions() {
      this.showExportOptions = !this.showExportOptions
      if (this.showExportOptions && !this.exportStartDate) {
        this.initializeDateRange()
      }
    },

    async exportDocumentation() {
      if (!this.projectId || this.documents.length === 0) {
        alert('No hay documentos para exportar')
        return
      }

      if (!this.hasDocumentsInRange) {
        alert('No hay documentos en el rango de fechas seleccionado')
        return
      }

      try {
        this.exporting = true
        console.log(`📤 Exportando documentación del proyecto ${this.projectId}`)
        console.log(`📅 Rango: ${this.exportStartDate} - ${this.exportEndDate}`)

        if (this.exportFormat === 'pdf') {
          await documentationService.exportToPDF(
              this.projectId,
              this.exportStartDate,
              this.exportEndDate,
              {
                includeImages: true,
                pageSize: 'A4'
              }
          )
        } else {
          // Exportación ZIP (funcionalidad básica)
          const filteredDocs = documentationService.filterDocumentsByDateRange(
              this.documents,
              this.exportStartDate,
              this.exportEndDate
          )

          const exportData = {
            projectId: this.projectId,
            exportDate: new Date().toISOString(),
            dateRange: {
              start: this.exportStartDate,
              end: this.exportEndDate
            },
            documents: filteredDocs.map(doc => doc.getSummary()),
            stats: this.stats
          }

          // Crear y descargar archivo JSON (simulando ZIP)
          const dataStr = JSON.stringify(exportData, null, 2)
          const dataBlob = new Blob([dataStr], { type: 'application/json' })
          const url = URL.createObjectURL(dataBlob)

          const link = document.createElement('a')
          link.href = url
          link.download = `documentacion_${this.projectId}_${this.exportStartDate}_${this.exportEndDate}.json`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }

        // Ocultar opciones de exportación
        this.showExportOptions = false

      } catch (error) {
        console.error('❌ Error al exportar documentación:', error)
        alert(`Error al exportar documentación: ${error.message}`)
      } finally {
        this.exporting = false
      }
    },

    formatDate(dateString) {
      return documentationService.formatDate(dateString)
    },

    handleDocumentClick(document) {
      // Verificar que el documento pertenece al proyecto actual
      if (!document.belongsToProject(this.projectId)) {
        console.warn('⚠️ Intento de acceder a documento de otro proyecto')
        return
      }

      // Aquí podrías implementar navegación a vista detallada del documento
      console.log('📄 Click en documento:', document.getSummary())
    },

    async refreshDocuments() {
      await this.loadDocuments()
      await this.loadStats()
    }
  }
}
</script>

<template>
  <div class="documentation-manager">
    <div class="documentation-header">
      <!-- Información del proyecto y estadísticas -->
      <div v-if="stats" class="project-stats">
        <span class="stat-item">
          <i class="pi pi-file"></i>
          {{ stats.totalDocuments }} {{ documents.length === 1 ? $t('documentation.document') : $t('documentation.documents') }}
        </span>
        <span v-if="stats.recentDocuments > 0" class="stat-item recent">
          <i class="pi pi-clock"></i>
          {{ stats.recentDocuments }} {{ $t('documentation.recent') }}
        </span>
      </div>

      <div class="header-actions">
        <!-- Botón de actualizar -->
        <app-button
            :label="$t('general.refresh')"
            variant="secondary"
            size="small"
            @click="refreshDocuments"
            icon="pi pi-refresh"
            :loading="loading"
        />

        <!-- Botón de exportar -->
        <app-button
            :label="$t('documentation.export')"
            variant="primary"
            @click="toggleExportOptions"
            icon="pi pi-download"
            :disabled="documents.length === 0"
        />

        <!-- Opciones de exportación mejoradas -->
        <div v-if="showExportOptions" class="export-options">
          <div class="export-header">
            <h4>{{ $t('documentation.exportDocumentation') }}</h4>
          </div>

          <!-- Selector de rango de fechas -->
          <div class="date-range-section">
            <label class="section-label">{{ $t('documentation.dateRange') }}</label>
            <div class="date-inputs">
              <app-input
                  v-model="exportStartDate"
                  type="date"
                  :label="$t('documentation.from')"
                  size="small"
                  fullWidth
              />
              <app-input
                  v-model="exportEndDate"
                  type="date"
                  :label="$t('documentation.to')"
                  size="small"
                  fullWidth
              />
            </div>
            <div class="date-info">
              <span class="documents-count">
                {{ filteredDocumentsCount }} {{ $t('documentation.documentsInRange') }}
              </span>
            </div>
          </div>

          <!-- Formato de exportación -->
          <div class="export-format">
            <label class="section-label">{{ $t('documentation.format') }}:</label>
            <div class="format-options">
              <label class="format-option">
                <input type="radio" v-model="exportFormat" value="pdf" />
                <span>
                  <i class="pi pi-file-pdf"></i>
                  {{ $t('documentation.pdfWithImages') }}
                </span>
              </label>
              <label class="format-option">
                <input type="radio" v-model="exportFormat" value="zip" />
                <span>
                  <i class="pi pi-file-export"></i>
                  {{ $t('documentation.zipImages') }}
                </span>
              </label>
            </div>
          </div>

          <!-- Botones de acción -->
          <div class="export-actions">
            <app-button
                :label="$t('general.cancel')"
                variant="secondary"
                size="small"
                @click="toggleExportOptions"
                :disabled="exporting"
            />
            <app-button
                :label="exporting ? $t('documentation.exporting') : $t('documentation.export')"
                variant="primary"
                size="small"
                @click="exportDocumentation"
                :disabled="!hasDocumentsInRange || exporting"
                :loading="exporting"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Mensaje de error -->
    <div v-if="error" class="error-container">
      <div class="error-content">
        <i class="pi pi-exclamation-triangle error-icon"></i>
        <p>{{ error }}</p>
        <app-button
            :label="$t('documentation.retry')"
            variant="primary"
            size="small"
            @click="refreshDocuments"
            icon="pi pi-refresh"
        />
      </div>
    </div>

    <!-- Pantalla de carga -->
    <div v-else-if="loading" class="loading-container">
      <i class="pi pi-spin pi-spinner loading-icon"></i>
      <p>{{ $t('general.loading') }}</p>
    </div>

    <!-- Galería de documentos usando AppCard -->
    <div v-else-if="documents.length > 0" class="documentation-grid">
      <app-card
          v-for="doc in documents"
          :key="doc.id"
          :title="doc.title"
          :image="doc.imagePath"
          :description="doc.description"
          variant="post"
          :footer="{
            extra: formatDate(doc.date)
          }"
          @click="handleDocumentClick(doc)"
      />
    </div>

    <!-- Mensaje sin documentos -->
    <div v-else class="empty-container">
      <div class="empty-content">
        <i class="pi pi-images empty-icon"></i>
        <h3>{{ $t('documentation.noDocumentationAvailable') }}</h3>
        <p>{{ $t('documentation.noDocuments') }}</p>
        <p class="empty-note">{{ $t('documentation.addedBySupervisors') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.documentation-manager {
  padding: 1.5rem;
}

.documentation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
}

.project-stats {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #666;
  background-color: #f5f5f5;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
}

.stat-item.recent {
  background-color: #e8f5e8;
  color: #2d5a2d;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  position: relative;
}

.export-container {
  position: relative;
}

.export-options {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 1.5rem;
  z-index: 10;
  min-width: 350px;
  border: 1px solid #e0e0e0;
}

.export-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.export-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.date-range-section {
  margin-bottom: 1.5rem;
}

.section-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
}

.date-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.date-info {
  text-align: center;
  margin-top: 0.5rem;
}

.documents-count {
  font-size: 0.75rem;
  color: #666;
  background-color: #f0f0f0;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  display: inline-block;
}

.export-format {
  margin-bottom: 1.5rem;
}

.format-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.format-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.format-option:hover {
  background-color: #f8f8f8;
}

.format-option input {
  cursor: pointer;
}

.format-option span {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.format-option i {
  color: #FF5F01;
}

.export-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.documentation-grid {
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

.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.error-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
  background-color: #fff5f5;
  border-radius: 8px;
  border: 1px solid #fed7d7;
}

.error-icon {
  font-size: 2rem;
  color: #e53e3e;
  margin-bottom: 1rem;
}

.error-content p {
  margin: 0 0 1rem;
  color: #c53030;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.empty-content {
  text-align: center;
  max-width: 500px;
  padding: 3rem;
  background-color: #f8f8f8;
  border-radius: 8px;
}

.empty-icon {
  font-size: 3rem;
  color: #ccc;
  margin-bottom: 1rem;
}

.empty-content h3 {
  margin: 0 0 1rem;
  color: #555;
  font-weight: 500;
}

.empty-content p {
  margin: 0;
  color: #666;
}

.empty-note {
  margin-top: 0.5rem !important;
  font-size: 0.875rem;
  color: #888;
  font-style: italic;
}

/* Media Queries */
@media (max-width: 1024px) {
  .documentation-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .export-options {
    min-width: 300px;
  }
}

@media (max-width: 768px) {
  .documentation-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .export-options {
    position: static;
    margin-top: 1rem;
    min-width: auto;
    width: 100%;
  }

  .project-stats {
    flex-wrap: wrap;
  }

  .date-inputs {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .documentation-grid {
    grid-template-columns: 1fr;
  }

  .documentation-manager {
    padding: 1rem;
  }
}
</style>