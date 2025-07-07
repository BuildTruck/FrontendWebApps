<script>
import { EXPORT_CONFIGS } from '../configs/export-configs.js'
import { exportService } from '../services/export.service.js'
import AppButton from '../../../core/components/AppButton.vue'
import AppInput from '../../../core/components/AppInput.vue'

export default {
  name: 'ExportModal',
  components: {
    AppButton,
    AppInput
  },

  props: {
    visible: {
      type: Boolean,
      default: false
    },
    data: {
      type: Array,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: ''
    },
    customFilters: {
      type: Array,
      default: () => []
    },
    showDataPreview: {
      type: Boolean,
      default: true
    },
    closeOnOverlay: {
      type: Boolean,
      default: true
    }
  },

  emits: ['update:visible', 'close', 'export-complete', 'export-error'],

  data() {
    return {
      selectedFormat: 'excel',
      exportOptions: {},
      filters: {
        startDate: '',
        endDate: '',
        status: '',
        department: ''
      },
      filteredData: [],
      exporting: false,
      exportStatus: null
    }
  },

  computed: {
    configData() {
      return EXPORT_CONFIGS[this.type] || {}
    },

    availableFormats() {
      return [
        {
          key: 'excel',
          name: 'Excel',
          icon: 'pi pi-file-excel',
          description: 'Archivo Excel con hojas múltiples, formato y gráficos',
          features: ['Múltiples hojas', 'Formato avanzado', 'Gráficos']
        },
        {
          key: 'pdf',
          name: 'PDF',
          icon: 'pi pi-file-pdf',
          description: 'Documento PDF profesional con diseño optimizado',
          features: ['Diseño profesional', 'Imágenes incluidas', 'Listo para imprimir']
        },
        {
          key: 'csv',
          name: 'CSV',
          icon: 'pi pi-file',
          description: 'Archivo CSV compatible con Excel y otras herramientas',
          features: ['Compatible universal', 'Liviano', 'Fácil importación']
        },
        {
          key: 'json',
          name: 'JSON',
          icon: 'pi pi-code',
          description: 'Datos en formato JSON para desarrolladores',
          features: ['Estructura completa', 'APIs', 'Desarrollo']
        }
      ].filter(format =>
          this.configData.formats?.[format.key]?.enabled
      )
    },

    selectedFormatData() {
      return this.availableFormats.find(f => f.key === this.selectedFormat) || this.availableFormats[0]
    },

    formatOptions() {
      const formatConfig = this.configData.formats?.[this.selectedFormat] || {}
      const options = []

      if (this.selectedFormat === 'pdf') {
        if (formatConfig.includeImages !== undefined) {
          options.push({
            key: 'includeImages',
            type: 'checkbox',
            label: 'Incluir imágenes',
            description: 'Agregar imágenes al documento PDF'
          })
        }

        options.push({
          key: 'orientation',
          type: 'select',
          label: 'Orientación',
          options: [
            { value: 'portrait', label: 'Vertical (Portrait)' },
            { value: 'landscape', label: 'Horizontal (Landscape)' }
          ]
        })
      }

      if (this.selectedFormat === 'excel') {
        if (formatConfig.multiSheet) {
          options.push({
            key: 'multiSheet',
            type: 'checkbox',
            label: 'Múltiples hojas',
            description: 'Separar datos en diferentes hojas'
          })
        }

        if (formatConfig.includeCharts) {
          options.push({
            key: 'includeCharts',
            type: 'checkbox',
            label: 'Incluir gráficos',
            description: 'Agregar gráficos y estadísticas'
          })
        }
      }

      return options
    },

    filterOptions() {
      const options = {
        status: [{ value: '', label: 'Todos los estados' }],
        department: [{ value: '', label: 'Todos los departamentos' }]
      }

      // Generar opciones dinámicamente
      const uniqueStatuses = [...new Set(this.data.map(item => item.status).filter(Boolean))]
      const uniqueDepartments = [...new Set(this.data.map(item => item.department).filter(Boolean))]

      options.status.push(...uniqueStatuses.map(status => ({ value: status, label: status })))
      options.department.push(...uniqueDepartments.map(dept => ({ value: dept, label: dept })))

      return options
    },

    previewFields() {
      const allFields = Object.keys(this.configData.fields || {})
      return allFields.slice(0, 5)
    },

    previewData() {
      return this.filteredData.slice(0, 5)
    },

    lastUpdate() {
      return new Date().toLocaleDateString('es-ES')
    }
  },

  watch: {
    visible(newValue) {
      if (newValue) {
        this.initializeFilters()
        this.initializeOptions()
        this.applyFilters()
      }
    },

    data: {
      handler() {
        this.applyFilters()
      },
      immediate: true
    },

    selectedFormat(newFormat) {
      this.exportOptions = {}
      const formatConfig = this.configData.formats?.[newFormat] || {}
      Object.keys(formatConfig).forEach(key => {
        if (typeof formatConfig[key] === 'boolean') {
          this.exportOptions[key] = formatConfig[key]
        }
      })
    }
  },

  methods: {
    closeModal() {
      // ✅ CORRECCIÓN: Emitir el evento correcto
      this.$emit('update:visible', false)
      this.$emit('close')
    },
    handleOverlayClick() {
      if (this.closeOnOverlay && !this.exporting) {
        this.closeModal()
      }
    },

    initializeFilters() {
      if (this.configData.filters?.dateRange && !this.filters.startDate) {
        const today = new Date()
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

        this.filters.endDate = today.toISOString().split('T')[0]
        this.filters.startDate = firstDayOfMonth.toISOString().split('T')[0]
      }
    },

    initializeOptions() {
      if (this.availableFormats.length > 0) {
        this.selectedFormat = this.availableFormats[0].key
      }
    },

    applyFilters() {
      let filtered = [...this.data]

      // Filtro por fecha
      if (this.filters.startDate || this.filters.endDate) {
        const dateField = this.configData.filters?.dateField || 'date'
        filtered = filtered.filter(item => {
          const itemDate = new Date(item[dateField])
          const start = this.filters.startDate ? new Date(this.filters.startDate) : new Date('1900-01-01')
          const end = this.filters.endDate ? new Date(this.filters.endDate) : new Date('2100-12-31')

          return itemDate >= start && itemDate <= end
        })
      }

      // Otros filtros
      if (this.filters.status) {
        filtered = filtered.filter(item => item.status === this.filters.status)
      }

      if (this.filters.department) {
        filtered = filtered.filter(item => item.department === this.filters.department)
      }

      this.filteredData = filtered
    },

    async performExport() {
      if (this.filteredData.length === 0) {
        this.setStatus('error', 'Sin datos', 'No hay datos para exportar con los filtros aplicados')
        return
      }

      try {
        this.exporting = true
        this.setStatus('info', 'Iniciando', 'Preparando la exportación...', 0)

        const options = {
          ...this.exportOptions,
          fileName: this.generateFileName(),
          ...this.filters
        }

        // Simular progreso
        const progressInterval = setInterval(() => {
          if (this.exportStatus && this.exportStatus.progress < 90) {
            this.exportStatus.progress += 10
          }
        }, 200)

        switch (this.selectedFormat) {
          case 'pdf':
            await exportService.exportToPDF(this.filteredData, this.type, options)
            break
          case 'excel':
            await exportService.exportToExcel(this.filteredData, this.type, options)
            break
          case 'csv':
            exportService.exportToCSV(this.filteredData, this.type, options)
            break
          case 'json':
            exportService.exportToJSON(this.filteredData, this.type, options)
            break
        }

        clearInterval(progressInterval)
        this.setStatus('success', '¡Completado!', 'La exportación se ha descargado exitosamente', 100)

        this.$emit('export-complete', {
          format: this.selectedFormat,
          records: this.filteredData.length,
          options
        })

        setTimeout(() => {
          this.closeModal()
        }, 2000)

      } catch (error) {
        this.setStatus('error', 'Error', error.message)
        this.$emit('export-error', error)
      } finally {
        this.exporting = false
      }
    },

    generateFileName() {
      const base = this.configData.name?.toLowerCase().replace(/\s+/g, '_') || this.type
      const timestamp = new Date().toISOString().split('T')[0]

      let fileName = `${base}_${timestamp}`

      if (this.filters.startDate && this.filters.endDate) {
        fileName += `_${this.filters.startDate}_${this.filters.endDate}`
      }

      return fileName
    },

    formatPreviewValue(value, field) {
      if (!value && value !== 0) return ''

      if (field.includes('Date') || field.includes('date')) {
        return new Date(value).toLocaleDateString('es-ES')
      }

      if (field.includes('Amount') || field.includes('amount') || field === 'discount') {
        return new Intl.NumberFormat('es-PE', {
          style: 'currency',
          currency: 'PEN'
        }).format(value)
      }

      return value.toString()
    },

    setStatus(type, title, message, progress = undefined) {
      const icons = {
        info: 'pi pi-spin pi-spinner',
        success: 'pi pi-check-circle',
        error: 'pi pi-exclamation-triangle'
      }

      this.exportStatus = {
        type,
        title,
        message,
        icon: icons[type],
        progress
      }
    }
  }
}
</script>

<template>
  <teleport to="body">
    <div v-if="visible" class="export-modal-overlay" @click="handleOverlayClick">
      <div class="export-modal-container" @click.stop>
        <div class="export-modal-header">
          <h3>
            <i class="pi pi-download"></i>
            {{ $t('exports.export') }} {{ configData.name }}
          </h3>
          <button @click="closeModal" class="export-modal-close">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="export-modal-body">
          <!-- Resumen de datos -->
          <div class="export-section">
            <div class="export-data-summary">
              <div class="summary-item">
                <i class="pi pi-database"></i>
                <div>
                  <span class="summary-label">{{ $t('exports.summary.totalRecords') }}</span>
                  <span class="summary-value">{{ data.length }}</span>
                </div>
              </div>
              <div class="summary-item">
                <i class="pi pi-filter"></i>
                <div>
                  <span class="summary-label">{{ $t('exports.summary.filteredRecords') }}</span>
                  <span class="summary-value">{{ filteredData.length }}</span>
                </div>
              </div>
              <div class="summary-item">
                <i class="pi pi-clock"></i>
                <div>
                  <span class="summary-label">{{ $t('exports.summary.lastUpdate') }}</span>
                  <span class="summary-value">{{ lastUpdate }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Filtros avanzados -->
          <div class="export-section">
            <h4 class="section-title">
              <i class="pi pi-filter"></i>
              {{ $t('exports.filters.filterData') }}
            </h4>

            <div class="filters-container">
              <!-- Filtro por fechas -->
              <div v-if="configData.filters?.dateRange" class="filter-group">
                <label class="filter-label">{{ $t('exports.filters.dateRange') }}</label>
                <div class="date-range">
                  <app-input
                      v-model="filters.startDate"
                      type="date"
                      :label="$t('exports.filters.from')"
                      size="small"
                      @input="applyFilters"
                  />
                  <span class="date-separator">{{ $t('exports.filters.to').toLowerCase() }}</span>
                  <app-input
                      v-model="filters.endDate"
                      type="date"
                      :label="$t('exports.filters.to')"
                      size="small"
                      @input="applyFilters"
                  />
                </div>
              </div>

              <!-- Filtros adicionales -->
              <div class="filter-row">
                <div v-if="configData.filters?.statusFilter" class="filter-group">
                  <app-input
                      v-model="filters.status"
                      type="select"
                      :label="$t('exports.filters.status')"
                      :options="filterOptions.status"
                      size="small"
                      @change="applyFilters"
                  />
                </div>

                <div v-if="configData.filters?.departmentFilter" class="filter-group">
                  <app-input
                      v-model="filters.department"
                      type="select"
                      :label="$t('exports.filters.department')"
                      :options="filterOptions.department"
                      size="small"
                      @change="applyFilters"
                  />
                </div>
              </div>

              <!-- Filtros personalizados -->
              <div v-if="customFilters.length > 0" class="filter-row">
                <div v-for="filter in customFilters" :key="filter.key" class="filter-group">
                  <app-input
                      v-model="filters[filter.key]"
                      :type="filter.type"
                      :label="filter.label"
                      :options="filter.options"
                      size="small"
                      @change="applyFilters"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Selección de formato -->
          <div class="export-section">
            <h4 class="section-title">
              <i class="pi pi-file"></i>
              {{ $t('exports.formats.selectFormat') }}
            </h4>

            <div class="format-grid">
              <div
                  v-for="format in availableFormats"
                  :key="format.key"
                  class="format-card"
                  :class="{ active: selectedFormat === format.key }"
                  @click="selectedFormat = format.key"
              >
                <div class="format-icon">
                  <i :class="format.icon"></i>
                </div>
                <div class="format-content">
                  <h5>{{ $t(`exports.formats.${format.key}`) }}</h5>
                  <p>{{ format.description }}</p>
                  <div class="format-features">
                    <span v-for="feature in format.features" :key="feature" class="feature-tag">
                      {{ feature }}
                    </span>
                  </div>
                </div>
                <div class="format-check">
                  <i class="pi pi-check"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Opciones avanzadas del formato -->
          <div v-if="formatOptions.length > 0" class="export-section">
            <h4 class="section-title">
              <i class="pi pi-cog"></i>
              {{ $t('exports.options.advanced') }} {{ $t(`exports.formats.${selectedFormat}`) }}
            </h4>

            <div class="options-grid">
              <div v-for="option in formatOptions" :key="option.key" class="option-item">
                <label v-if="option.type === 'checkbox'" class="option-checkbox">
                  <input
                      type="checkbox"
                      v-model="exportOptions[option.key]"
                  />
                  <span class="checkmark"></span>
                  <div class="option-info">
                    <strong>{{ $t(`exports.options.${option.key}`) || option.label }}</strong>
                    <small v-if="option.description">{{ option.description }}</small>
                  </div>
                </label>

                <div v-else-if="option.type === 'select'" class="option-select">
                  <label>{{ $t(`exports.options.${option.key}`) || option.label }}</label>
                  <app-input
                      v-model="exportOptions[option.key]"
                      type="select"
                      :options="option.options"
                      size="small"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- ✅ SECCIÓN DE PREVIEW CORREGIDA -->
          <div v-if="showDataPreview && filteredData.length > 0" class="export-section">
            <h4 class="section-title">
              <i class="pi pi-eye"></i>
              {{ $t('exports.preview.dataPreview') }}
              <span class="preview-count">
                ({{ $t('exports.preview.previewFirst') }} {{ Math.min(5, filteredData.length) }} {{ $t('exports.preview.of') }} {{ filteredData.length }} {{ $t('exports.preview.records') }})
              </span>
            </h4>

            <div class="preview-container">
              <div class="preview-table-wrapper">
                <table class="preview-table">
                  <thead>
                  <tr>
                    <th v-for="field in previewFields" :key="field">
                      {{ configData.fields?.[field] || field }}
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="(item, index) in previewData" :key="index">
                    <td v-for="field in previewFields" :key="field">
                      {{ formatPreviewValue(item[field], field) }}
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="filteredData.length > 5" class="preview-more">
                <i class="pi pi-info-circle"></i>
                {{ $t('exports.preview.andMore', { count: filteredData.length - 5 }) }}
              </div>
            </div>
          </div>

          <!-- Estado de la exportación -->
          <div v-if="exportStatus" class="export-status" :class="exportStatus.type">
            <i :class="exportStatus.icon"></i>
            <div class="status-content">
              <strong>{{ exportStatus.title }}</strong>
              <p>{{ exportStatus.message }}</p>
            </div>
            <div v-if="exportStatus.progress !== undefined" class="status-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: exportStatus.progress + '%' }"></div>
              </div>
              <span>{{ exportStatus.progress }}%</span>
            </div>
          </div>
        </div>

        <div class="export-modal-footer">
          <div class="footer-info">
            <i class="pi pi-info-circle"></i>
            <span>
              {{ $t('exports.summary.recordsWillBeExported', { count: filteredData.length }) }}
              {{ $t('exports.summary.inFormat', { format: $t(`exports.formats.${selectedFormat}`) }) }}
            </span>
          </div>

          <div class="footer-actions">
            <app-button
                :label="$t('exports.actions.cancel')"
                variant="secondary"
                @click="closeModal"
                :disabled="exporting"
            />

            <app-button
                :label="exporting ? $t('exports.exporting') : $t('exports.actions.export')"
                variant="primary"
                @click="performExport"
                :loading="exporting"
                :disabled="filteredData.length === 0"
                icon="pi pi-download"
            />
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.export-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 2rem;
}

.export-modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ==================== HEADER ==================== */
.export-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #FF5F01 0%, #ff7a2b 100%);
  color: white;
}

.export-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.export-modal-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.export-modal-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* ==================== BODY ==================== */
.export-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.export-section {
  margin-bottom: 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f0f0f0;
}

.section-title i {
  color: #FF5F01;
}

.preview-count {
  font-size: 0.75rem;
  font-weight: 400;
  color: #666;
  margin-left: auto;
}

/* ==================== RESUMEN ==================== */
.export-data-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #FF5F01;
}

.summary-item i {
  font-size: 1.5rem;
  color: #FF5F01;
}

.summary-label {
  display: block;
  font-size: 0.75rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

/* ==================== FILTROS ==================== */
.filters-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-group {
  flex: 1;
}

.filter-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.date-separator {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

/* ==================== FORMATOS ==================== */
.format-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.format-card {
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  background: white;
}

.format-card:hover {
  border-color: #FF5F01;
  box-shadow: 0 4px 20px rgba(255, 95, 1, 0.1);
  transform: translateY(-2px);
}

.format-card.active {
  border-color: #FF5F01;
  background: linear-gradient(135deg, #fff5f0 0%, #ffffff 100%);
  box-shadow: 0 4px 20px rgba(255, 95, 1, 0.15);
}

.format-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #FF5F01 0%, #ff7a2b 100%);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.format-icon i {
  font-size: 1.75rem;
  color: white;
}

.format-content h5 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
}

.format-content p {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: #666;
  line-height: 1.4;
}

.format-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.feature-tag {
  background: #e3f2fd;
  color: #1565c0;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.format-check {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 24px;
  height: 24px;
  background: #FF5F01;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
}

.format-card.active .format-check {
  opacity: 1;
  transform: scale(1);
}

.format-check i {
  color: white;
  font-size: 0.875rem;
}

/* ==================== OPCIONES ==================== */
.options-grid {
  display: grid;
  gap: 1rem;
}

.option-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-checkbox:hover {
  border-color: #FF5F01;
  background-color: #fff5f0;
}

.option-checkbox input {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 4px;
  position: relative;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-top: 2px;
}
/* Continuación de los estilos desde donde se cortó */
.option-checkbox input:checked + .checkmark {
  background: #FF5F01;
  border-color: #FF5F01;
}

.checkmark::after {
  content: '';
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.option-checkbox input:checked + .checkmark::after {
  display: block;
}

.option-info {
  flex: 1;
}

.option-info strong {
  display: block;
  color: #333;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.option-info small {
  color: #666;
  font-size: 0.75rem;
  line-height: 1.3;
}

.option-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-select label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
}

/* ==================== VISTA PREVIA ==================== */
.preview-container {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.preview-table-wrapper {
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.preview-table th {
  background: #f8f9fa;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.preview-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  color: #555;
}

.preview-table tr:hover {
  background-color: #f8f9fa;
}

.preview-more {
  padding: 1rem;
  background: #f8f9fa;
  color: #666;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-top: 1px solid #e0e0e0;
}

.preview-more i {
  color: #FF5F01;
}

/* ==================== ESTADO DE EXPORTACIÓN ==================== */
.export-status {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  border-left: 4px solid;
}

.export-status.info {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1565c0;
}

.export-status.success {
  background: #e8f5e8;
  border-color: #4caf50;
  color: #2e7d32;
}

.export-status.error {
  background: #ffebee;
  border-color: #f44336;
  color: #c62828;
}

.export-status i {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.status-content {
  flex: 1;
}

.status-content strong {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.status-content p {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.8;
}

.status-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 120px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: currentColor;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.status-progress span {
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 35px;
  text-align: right;
}

/* ==================== FOOTER ==================== */
.export-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
  gap: 1rem;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  font-size: 0.875rem;
}

.footer-info i {
  color: #FF5F01;
}

.footer-actions {
  display: flex;
  gap: 1rem;
}

/* ==================== RESPONSIVE ==================== */
@media (max-width: 768px) {
  .export-modal-overlay {
    padding: 1rem;
  }

  .export-modal-container {
    max-width: 100%;
    max-height: 95vh;
  }

  .export-modal-header {
    padding: 1rem 1.5rem;
  }

  .export-modal-body {
    padding: 1.5rem;
  }

  .export-modal-footer {
    padding: 1rem 1.5rem;
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .footer-info {
    justify-content: center;
    text-align: center;
  }

  .footer-actions {
    justify-content: center;
  }

  .format-grid {
    grid-template-columns: 1fr;
  }

  .export-data-summary {
    grid-template-columns: 1fr;
  }

  .filter-row {
    grid-template-columns: 1fr;
  }

  .date-range {
    flex-direction: column;
    align-items: stretch;
  }

  .date-separator {
    text-align: center;
    padding: 0.5rem 0;
  }

  .preview-table-wrapper {
    max-height: 200px;
  }

  .export-status {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .status-progress {
    min-width: auto;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .export-modal-header h3 {
    font-size: 1.1rem;
  }

  .section-title {
    font-size: 0.9rem;
  }

  .format-card {
    padding: 1rem;
  }

  .format-icon {
    width: 50px;
    height: 50px;
  }

  .format-icon i {
    font-size: 1.5rem;
  }

  .format-content h5 {
    font-size: 1rem;
  }

  .summary-value {
    font-size: 1.1rem;
  }

  .preview-table {
    font-size: 0.8rem;
  }

  .preview-table th,
  .preview-table td {
    padding: 0.5rem;
  }
}

/* ==================== ANIMACIONES ==================== */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.export-modal-container {
  animation: fadeIn 0.3s ease-out;
}

.export-section {
  animation: slideDown 0.4s ease-out;
}

.export-section:nth-child(2) { animation-delay: 0.1s; }
.export-section:nth-child(3) { animation-delay: 0.2s; }
.export-section:nth-child(4) { animation-delay: 0.3s; }
.export-section:nth-child(5) { animation-delay: 0.4s; }

/* ==================== UTILIDADES ==================== */
.text-center {
  text-align: center;
}

.text-muted {
  color: #666;
}

.font-weight-bold {
  font-weight: 600;
}

.mb-0 {
  margin-bottom: 0;
}

.mt-2 {
  margin-top: 0.5rem;
}

.p-2 {
  padding: 0.5rem;
}

/* ==================== ESTADOS DE CARGA ==================== */
.loading-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ==================== SCROLLBAR PERSONALIZADO ==================== */
.export-modal-body::-webkit-scrollbar,
.preview-table-wrapper::-webkit-scrollbar {
  width: 6px;
}

.export-modal-body::-webkit-scrollbar-track,
.preview-table-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.export-modal-body::-webkit-scrollbar-thumb,
.preview-table-wrapper::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.export-modal-body::-webkit-scrollbar-thumb:hover,
.preview-table-wrapper::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* ==================== MODO OSCURO (OPCIONAL) ==================== */
@media (prefers-color-scheme: dark) {
  .export-modal-container {
    background: #2d2d2d;
    color: #e0e0e0;
  }

  .export-modal-header {
    background: linear-gradient(135deg, #FF5F01 0%, #ff7a2b 100%);
  }

  .section-title {
    color: #e0e0e0;
    border-bottom-color: #404040;
  }

  .summary-item {
    background: #3a3a3a;
    border-left-color: #FF5F01;
  }

  .summary-value {
    color: #e0e0e0;
  }

  .format-card {
    background: #3a3a3a;
    border-color: #505050;
  }

  .format-card:hover {
    border-color: #FF5F01;
    background: #404040;
  }

  .format-card.active {
    background: linear-gradient(135deg, #2d1a0f 0%, #3a3a3a 100%);
  }

  .preview-table th {
    background: #3a3a3a;
    color: #e0e0e0;
    border-bottom-color: #505050;
  }

  .preview-table td {
    color: #c0c0c0;
    border-bottom-color: #404040;
  }

  .preview-table tr:hover {
    background-color: #3a3a3a;
  }

  .export-modal-footer {
    background: #3a3a3a;
    border-top-color: #505050;
  }
}
</style>