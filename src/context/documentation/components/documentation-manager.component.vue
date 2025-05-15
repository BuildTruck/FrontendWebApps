<script>
import AppButton from '../../../core/components/AppButton.vue'
import AppCard from '../../../core/components/AppCard.vue'
import { DocumentationApiService } from '../services/documentation-api.service'

export default {
  name: 'DocumentationManagerComponent',
  components: {
    AppButton,
    AppCard
  },
  props: ['projectId'],
  data() {
    return {
      documents: [],
      loading: false,
      showExportOptions: false,
      exportFormat: 'pdf'
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

    toggleExportOptions() {
      this.showExportOptions = !this.showExportOptions
    },

    exportDocumentation() {
      // Simular proceso de exportación
      console.log('Exportando documentación en formato:', this.exportFormat)

      // En un entorno real, aquí implementarías la lógica para generar
      // un PDF o ZIP con las imágenes y descripciones

      // Para esta simulación, mostraremos un alert
      alert(`Documentación exportada en formato ${this.exportFormat.toUpperCase()}`)

      // Ocultar opciones de exportación
      this.showExportOptions = false
    },

    formatDate(dateString) {
      if (!dateString) return ''

      // Convertir la fecha a formato más amigable
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
  <div class="documentation-manager">
    <div class="documentation-header">

      <div class="export-container">
        <app-button
            :label="$t('documentation.export')"
            variant="primary"
            @click="toggleExportOptions"
            icon="pi pi-download"
        />

        <!-- Opciones de exportación -->
        <div v-if="showExportOptions" class="export-options">
          <div class="export-format">
            <label>{{ $t('documentation.format') }}:</label>
            <div class="format-options">
              <label class="format-option">
                <input type="radio" v-model="exportFormat" value="pdf" />
                <span>PDF</span>
              </label>
              <label class="format-option">
                <input type="radio" v-model="exportFormat" value="zip" />
                <span>{{ $t('documentation.zipImages') }}</span>
              </label>
            </div>
          </div>

          <div class="export-actions">
            <app-button
                :label="$t('general.cancel')"
                variant="secondary"
                size="small"
                @click="toggleExportOptions"
            />
            <app-button
                :label="$t('documentation.export')"
                variant="primary"
                size="small"
                @click="exportDocumentation"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Pantalla de carga -->
    <div v-if="loading" class="loading-container">
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
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
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
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  z-index: 10;
  min-width: 250px;
}

.export-format {
  margin-bottom: 1rem;
}

.export-format label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.format-options {
  display: flex;
  gap: 1rem;
}

.format-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.format-option input {
  cursor: pointer;
}

.export-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
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
  }
}

@media (max-width: 640px) {
  .documentation-grid {
    grid-template-columns: 1fr;
  }
}
</style>