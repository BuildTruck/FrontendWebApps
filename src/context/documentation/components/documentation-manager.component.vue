<script>
import AppButton from '../../../core/components/AppButton.vue'
import AppCard from '../../../core/components/AppCard.vue'
import AppInput from '../../../core/components/AppInput.vue'
import ExportModal from "../../../core/exports/components/ExportModal.vue";
import { documentationService } from '../services/documentation-api.service'
import { Documentation } from '../models/documentation.entity'

export default {
  name: 'DocumentationManagerComponent',
  components: {
    AppButton,
    AppCard,
    AppInput,
    ExportModal
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
      showExportModal: false,
      error: null,
      refreshing: false,
      stats: null
    }
  },
  async mounted() {
    await this.loadDocuments()
    await this.loadStats()
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
    hasDocuments() {
      return this.documents.length > 0
    },

    // Datos formateados para el componente de exportación
    exportData() {
      return this.documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        date: doc.date,
        imagePath: doc.imagePath,
        hasImage: !!doc.imagePath,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        projectId: this.projectId,
        // Campos adicionales para filtros
        status: 'active', // Si tienes estado en tus documentos
        department: doc.department || 'general',
        category: doc.category || 'documentation'
      }))
    },

    // Filtros personalizados para documentación
    customFilters() {
      return [
        {
          key: 'category',
          type: 'select',
          label: 'Categoría',
          options: this.getCategoryOptions()
        },
        {
          key: 'hasImage',
          type: 'select',
          label: 'Con imágenes',
          options: [
            { value: '', label: 'Todos' },
            { value: true, label: 'Con imágenes' },
            { value: false, label: 'Sin imágenes' }
          ]
        }
      ]
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

        // Usar el servicio actualizado
        this.documents = await documentationService.getByProjectId(this.projectId)

        console.log(`✅ Cargados ${this.documents.length} documentos`)

        // Verificar que todos los documentos pertenecen al proyecto
        const invalidDocs = this.documents.filter(doc => !doc.belongsToProject(this.projectId))
        if (invalidDocs.length > 0) {
          console.warn(`⚠️ Encontrados ${invalidDocs.length} documentos que no pertenecen al proyecto`)
        }

      } catch (error) {
        console.error('❌ Error al cargar documentos:', error)

        // Manejar diferentes tipos de errores
        if (error.message.includes('Network') || error.message.includes('fetch')) {
          this.error = 'Error de conexión. Verifica tu internet y vuelve a intentar.'
        } else if (error.message.includes('403') || error.message.includes('401')) {
          this.error = 'No tienes permisos para ver esta documentación.'
        } else if (error.message.includes('404')) {
          this.error = 'Proyecto no encontrado.'
        } else {
          this.error = 'Error al cargar la documentación. Por favor, intenta de nuevo.'
        }

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

    formatDate(dateString) {
      return documentationService.formatDate(dateString)
    },

    handleDocumentClick(document) {
      // Verificar que el documento pertenece al proyecto actual
      if (!document.belongsToProject(this.projectId)) {
        console.warn('⚠️ Intento de acceder a documento de otro proyecto')
        return
      }

      // Emitir evento para que el componente padre maneje la navegación
      this.$emit('document-selected', document)
      console.log('📄 Click en documento:', document.getSummary())
    },

    async refreshDocuments() {
      if (this.refreshing) return

      try {
        this.refreshing = true
        await this.loadDocuments()
        await this.loadStats()

        // Mostrar mensaje de éxito brevemente
        if (!this.error) {
          console.log('✅ Documentos actualizados')
        }

      } catch (error) {
        console.error('❌ Error al actualizar:', error)
      } finally {
        this.refreshing = false
      }
    },

    // Método para abrir el modal de exportación
    openExportModal() {
      if (!this.hasDocuments) {
        alert('No hay documentos para exportar')
        return
      }
      this.showExportModal = true
    },

    // Manejar exportación completada
    handleExportComplete(result) {
      console.log('✅ Exportación completada:', result)

      // Mostrar notificación de éxito
      this.$toast?.add({
        severity: 'success',
        summary: 'Exportación completada',
        detail: `${result.records} documentos exportados en formato ${result.format.toUpperCase()}`,
        life: 5000
      })

      // Registrar estadística de exportación
      this.logExportEvent(result)
    },

    // Manejar errores de exportación
    handleExportError(error) {
      console.error('❌ Error en exportación:', error)

      this.$toast?.add({
        severity: 'error',
        summary: 'Error en exportación',
        detail: error.message || 'No se pudo completar la exportación',
        life: 8000
      })
    },

    // Registrar evento de exportación para analytics
    logExportEvent(result) {
      try {
        // Si tienes analytics configurado
        if (window.gtag) {
          window.gtag('event', 'documentation_export', {
            event_category: 'Documentation',
            event_label: result.format,
            value: result.records,
            custom_parameters: {
              project_id: this.projectId,
              export_format: result.format,
              document_count: result.records
            }
          })
        }
      } catch (error) {
        console.warn('No se pudo registrar evento de analytics:', error)
      }
    },

    // Obtener opciones de categorías dinámicamente
    getCategoryOptions() {
      const categories = [...new Set(this.documents
          .map(doc => doc.category)
          .filter(Boolean))]

      return [
        { value: '', label: 'Todas las categorías' },
        ...categories.map(cat => ({ value: cat, label: cat }))
      ]
    },

    // Método para manejar errores de imágenes
    handleImageError(event, document) {
      console.warn(`⚠️ Error cargando imagen del documento ${document.id}`)
      event.target.src = '/path/to/placeholder-image.png'
    },

    // Método para obtener URL optimizada de Cloudinary si es necesario
    getOptimizedImageUrl(imageUrl, width = 400, height = 300) {
      if (imageUrl && imageUrl.includes('cloudinary.com')) {
        return imageUrl.replace('/upload/', `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`)
      }
      return imageUrl
    },

    // Método para vista detallada del documento
    openDocumentDetail(document) {
      console.log('Abriendo vista detallada para:', document.title)
      this.$emit('open-document-detail', document)
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
            :loading="refreshing"
        />

        <!-- Nuevo botón de exportar que abre el modal -->
        <app-button
            :label="$t('documentation.export')"
            variant="primary"
            @click="openExportModal"
            icon="pi pi-download"
            :disabled="!hasDocuments"
        />
      </div>
    </div>

    <!-- Modal de exportación avanzado -->
    <ExportModal
        v-model:visible="showExportModal"
        :data="exportData"
        type="documentation"
        :title="$t('documentation.exportDocumentation')"
        :custom-filters="customFilters"
        @export-complete="handleExportComplete"
        @export-error="handleExportError"
    />

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
          :image="getOptimizedImageUrl(doc.imagePath)"
          :description="doc.description"
          variant="post"
          :footer="{
            extra: formatDate(doc.date)
          }"
          @click="handleDocumentClick(doc)"
          @image-error="handleImageError($event, doc)"
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
  border-bottom: 1px solid #e0e0e0;
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
  border-radius: 8px;
  border-left: 3px solid #FF5F01;
  transition: all 0.2s ease;
}

.stat-item:hover {
  background-color: #f0f0f0;
  transform: translateY(-1px);
}

.stat-item.recent {
  background-color: #e8f5e8;
  color: #2d5a2d;
  border-left-color: #4caf50;
}

.stat-item i {
  color: #FF5F01;
  font-size: 1rem;
}

.stat-item.recent i {
  color: #4caf50;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.documentation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.loading-icon {
  font-size: 2.5rem;
  color: #FF5F01;
  margin-bottom: 1rem;
}

.loading-container p {
  color: #666;
  font-size: 1rem;
  margin: 0;
}

.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  padding: 2rem;
}

.error-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
  background-color: #fff5f5;
  border-radius: 12px;
  border: 1px solid #fed7d7;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.error-icon {
  font-size: 2.5rem;
  color: #e53e3e;
  margin-bottom: 1rem;
}

.error-content p {
  margin: 0 0 1.5rem;
  color: #c53030;
  line-height: 1.5;
}

.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 2rem;
}

.empty-content {
  text-align: center;
  max-width: 500px;
  padding: 3rem 2rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.empty-icon {
  font-size: 4rem;
  color: #ccc;
  margin-bottom: 1.5rem;
}

.empty-content h3 {
  margin: 0 0 1rem;
  color: #555;
  font-weight: 500;
  font-size: 1.25rem;
}

.empty-content p {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.empty-note {
  margin-top: 1rem !important;
  font-size: 0.875rem;
  color: #888;
  font-style: italic;
}

/* Animaciones */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.documentation-grid {
  animation: fadeInUp 0.5s ease-out;
}

/* Media Queries */
@media (max-width: 1200px) {
  .documentation-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .documentation-manager {
    padding: 1rem;
  }

  .documentation-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .project-stats {
    flex-wrap: wrap;
    width: 100%;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .documentation-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  .empty-content,
  .error-content {
    padding: 2rem 1.5rem;
  }
}

@media (max-width: 480px) {
  .documentation-grid {
    grid-template-columns: 1fr;
  }

  .stat-item {
    font-size: 0.8rem;
    padding: 0.4rem 0.6rem;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .loading-container,
  .error-container,
  .empty-container {
    min-height: 250px;
    padding: 1rem;
  }
}

/* Estados hover para las cards */
.documentation-grid :deep(.app-card) {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.documentation-grid :deep(.app-card:hover) {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}
</style>