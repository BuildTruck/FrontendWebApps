<script>
import { EXPORT_CONFIGS } from '../configs/export-configs.js'
import { exportService } from '../services/export.service.js'
import AppButton from '../../../core/components/AppButton.vue'
import AppInput from '../../../core/components/AppInput.vue'

export default {
  name: 'ExportButton',
  components: {
    AppButton,
    AppInput
  },

  props: {
    data: {
      type: Array,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    formats: {
      type: Array,
      default: () => null
    },
    dateFilters: {
      type: Boolean,
      default: true
    },
    additionalFilters: {
      type: Boolean,
      default: true
    },
    buttonLabel: {
      type: String,
      default: 'Exportar'
    },
    variant: {
      type: String,
      default: 'primary'
    },
    size: {
      type: String,
      default: 'small'
    },
    icon: {
      type: String,
      default: 'pi pi-download'
    },
    modal: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    showPreview: {
      type: Boolean,
      default: true
    }
  },

  data() {
    return {
      showOptions: false,
      exporting: false,
      startDate: '',
      endDate: '',
      selectedStatus: '',
      selectedDepartment: '',
      selectedFormat: 'excel',
      exportOptions: {},
      exportStatus: null,
      filteredData: []
    }
  },

  computed: {
    configData() {
      return EXPORT_CONFIGS[this.type] || {}
    },

    availableFormats() {
      const allFormats = [
        {
          key: 'excel',
          name: 'Excel',
          icon: 'pi pi-file-excel',
          description: 'Archivo Excel con múltiples hojas y formato'
        },
        {
          key: 'pdf',
          name: 'PDF',
          icon: 'pi pi-file-pdf',
          description: 'Documento PDF con diseño profesional'
        },
        {
          key: 'csv',
          name: 'CSV',
          icon: 'pi pi-file',
          description: 'Archivo CSV compatible con Excel'
        },
        {
          key: 'json',
          name: 'JSON',
          icon: 'pi pi-code',
          description: 'Datos en formato JSON'
        }
      ]

      const enabledFormats = this.formats ||
          Object.keys(this.configData.formats || {}).filter(format =>
              this.configData.formats[format]?.enabled
          )

      return allFormats.filter(format => enabledFormats.includes(format.key))
    },

    selectedFormatData() {
      return this.availableFormats.find(f => f.key === this.selectedFormat) || {}
    },

    formatOptions() {
      const formatConfig = this.configData.formats?.[this.selectedFormat] || {}
      const options = []

      if (this.selectedFormat === 'pdf') {
        if (formatConfig.includeImages !== undefined) {
          options.push({
            key: 'includeImages',
            type: 'checkbox',
            label: 'Incluir imágenes'
          })
        }

        if (formatConfig.orientation) {
          options.push({
            key: 'orientation',
            type: 'select',
            label: 'Orientación',
            options: [
              { value: 'portrait', label: 'Vertical' },
              { value: 'landscape', label: 'Horizontal' }
            ]
          })
        }
      }

      if (this.selectedFormat === 'excel') {
        if (formatConfig.multiSheet) {
          options.push({
            key: 'multiSheet',
            type: 'checkbox',
            label: 'Múltiples hojas'
          })
        }

        if (formatConfig.includeCharts) {
          options.push({
            key: 'includeCharts',
            type: 'checkbox',
            label: 'Incluir gráficos'
          })
        }
      }

      return options
    },

    statusOptions() {
      const uniqueStatuses = [...new Set(this.data.map(item => item.status).filter(Boolean))]
      return [
        { value: '', label: 'Todos los estados' },
        ...uniqueStatuses.map(status => ({ value: status, label: status }))
      ]
    },

    departmentOptions() {
      const uniqueDepartments = [...new Set(this.data.map(item => item.department).filter(Boolean))]
      return [
        { value: '', label: 'Todos los departamentos' },
        ...uniqueDepartments.map(dept => ({ value: dept, label: dept }))
      ]
    },

    previewFields() {
      const allFields = Object.keys(this.configData.fields || {})
      return allFields.slice(0, 4)
    },

    previewData() {
      return this.filteredData.slice(0, 5)
    }
  },

  watch: {
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
    toggleExportOptions() {
      this.showOptions = !this.showOptions
      if (this.showOptions) {
        this.initializeFilters()
        this.initializeOptions()
      }
    },

    closeOptions() {
      this.showOptions = false
      this.clearStatus()
    },

    initializeFilters() {
      if (this.configData.filters?.dateRange && !this.startDate) {
        const today = new Date()
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

        this.endDate = today.toISOString().split('T')[0]
        this.startDate = firstDayOfMonth.toISOString().split('T')[0]
      }
    },

    initializeOptions() {
      if (this.availableFormats.length > 0) {
        this.selectedFormat = this.availableFormats[0].key
      }
    },

    applyFilters() {
      let filtered = [...this.data]

      if (this.startDate || this.endDate) {
        const dateField = this.configData.filters?.dateField || 'date'
        filtered = filtered.filter(item => {
          const itemDate = new Date(item[dateField])
          const start = this.startDate ? new Date(this.startDate) : new Date('1900-01-01')
          const end = this.endDate ? new Date(this.endDate) : new Date('2100-12-31')

          return itemDate >= start && itemDate <= end
        })
      }

      if (this.selectedStatus) {
        filtered = filtered.filter(item => item.status === this.selectedStatus)
      }

      if (this.selectedDepartment) {
        filtered = filtered.filter(item => item.department === this.selectedDepartment)
      }

      this.filteredData = filtered
    },

    async performExport() {
      if (this.filteredData.length === 0) {
        this.setStatus('error', 'No hay datos para exportar')
        return
      }

      try {
        this.exporting = true
        this.setStatus('info', 'Iniciando exportación...')

        const options = {
          ...this.exportOptions,
          fileName: this.generateFileName(),
          startDate: this.startDate,
          endDate: this.endDate
        }

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
          default:
            throw new Error('Formato no soportado')
        }

        this.setStatus('success', '¡Exportación completada!')

        setTimeout(() => {
          this.closeOptions()
        }, 2000)

        this.$emit('export-complete', {
          format: this.selectedFormat,
          records: this.filteredData.length,
          options
        })

      } catch (error) {
        console.error('Error en exportación:', error)
        this.setStatus('error', `Error: ${error.message}`)
      } finally {
        this.exporting = false
      }
    },

    generateFileName() {
      const base = this.configData.name?.toLowerCase().replace(/\s+/g, '_') || this.type
      const timestamp = new Date().toISOString().split('T')[0]

      let fileName = `${base}_${timestamp}`

      if (this.startDate && this.endDate) {
        fileName += `_${this.startDate}_${this.endDate}`
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

    setStatus(type, message) {
      const icons = {
        info: 'pi pi-info-circle',
        success: 'pi pi-check-circle',
        error: 'pi pi-exclamation-triangle'
      }

      this.exportStatus = {
        type,
        message,
        icon: icons[type]
      }
    },

    clearStatus() {
      this.exportStatus = null
    }
  }
}
</script>
<template>
  <div class="export-container">
    <!-- Botón principal -->
    <app-button
        :label="buttonLabel"
        :variant="variant"
        :size="size"
        :icon="icon"
        :disabled="disabled || exporting"
        @click="toggleExportOptions"
    />

    <!-- Modal/Dropdown de opciones -->
    <div v-if="showOptions" class="export-modal" :class="{ 'dropdown': !modal, 'modal': modal }">
      <div class="export-content">
        <!-- Header -->
        <div class="export-header">
          <h4>{{ title || $t('exports.exportData') }} {{ configData.name }}</h4>
          <button v-if="modal" @click="closeOptions" class="close-btn">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <!-- Información de datos -->
        <div class="export-info">
          <div class="data-summary">
            <i class="pi pi-info-circle"></i>
            <span>{{ filteredData.length }} {{ $t('exports.preview.of') }} {{ data.length }} {{ $t('exports.preview.records') }}</span>
          </div>
        </div>

        <!-- Filtros de fecha -->
        <div v-if="configData.filters?.dateRange && dateFilters" class="date-filters">
          <h5>{{ $t('exports.filters.dateRange') }}</h5>
          <div class="date-inputs">
            <app-input
                v-model="startDate"
                type="date"
                :label="$t('exports.filters.from')"
                size="small"
                @input="applyFilters"
            />
            <app-input
                v-model="endDate"
                type="date"
                :label="$t('exports.filters.to')"
                size="small"
                @input="applyFilters"
            />
          </div>
        </div>

        <!-- Filtros adicionales -->
        <div v-if="configData.filters?.groupBy && additionalFilters" class="additional-filters">
          <h5>{{ $t('exports.filters.filterData') }}</h5>
          <div class="filter-grid">
            <div v-if="configData.filters.statusFilter" class="filter-item">
              <app-input
                  v-model="selectedStatus"
                  type="select"
                  :label="$t('exports.filters.status')"
                  :options="statusOptions"
                  size="small"
                  @change="applyFilters"
              />
            </div>
            <div v-if="configData.filters.departmentFilter" class="filter-item">
              <app-input
                  v-model="selectedDepartment"
                  type="select"
                  :label="$t('exports.filters.department')"
                  :options="departmentOptions"
                  size="small"
                  @change="applyFilters"
              />
            </div>
          </div>
        </div>

        <!-- Selector de formato -->
        <div class="format-selector">
          <h5>{{ $t('exports.formats.selectFormat') }}</h5>
          <div class="format-options">
            <label v-for="format in availableFormats" :key="format.key" class="format-option">
              <input
                  type="radio"
                  :value="format.key"
                  v-model="selectedFormat"
                  name="exportFormat"
              />
              <div class="format-info">
                <i :class="format.icon"></i>
                <div class="format-details">
                  <span class="format-name">{{ $t(`exports.formats.${format.key}`) }}</span>
                  <small class="format-description">{{ format.description }}</small>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Opciones específicas del formato -->
        <div v-if="formatOptions.length > 0" class="format-specific-options">
          <h5>{{ $t('exports.options.advanced') }} {{ $t(`exports.formats.${selectedFormat}`) }}</h5>
          <div class="options-grid">
            <div v-for="option in formatOptions" :key="option.key" class="option-item">
              <label v-if="option.type === 'checkbox'" class="checkbox-option">
                <input
                    type="checkbox"
                    v-model="exportOptions[option.key]"
                />
                <span>{{ $t(`exports.options.${option.key}`) || option.label }}</span>
              </label>

              <app-input
                  v-else-if="option.type === 'select'"
                  v-model="exportOptions[option.key]"
                  :type="option.type"
                  :label="$t(`exports.options.${option.key}`) || option.label"
                  :options="option.options"
                  size="small"
              />
            </div>
          </div>
        </div>

        <!-- Preview de datos -->
        <div v-if="showPreview && filteredData.length > 0" class="data-preview">
          <h5>{{ $t('exports.preview.dataPreview') }}</h5>
          <div class="preview-table">
            <table>
              <thead>
              <tr>
                <th v-for="field in previewFields" :key="field">
                  {{ configData.fields[field] || field }}
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
            <div v-if="filteredData.length > 5" class="preview-note">
              {{ $t('exports.preview.andMore', { count: filteredData.length - 5 }) }}
            </div>
          </div>
        </div>

        <!-- Estado de exportación -->
        <div v-if="exportStatus" class="export-status" :class="exportStatus.type">
          <i :class="exportStatus.icon"></i>
          <span>{{ exportStatus.message }}</span>
        </div>

        <!-- Botones de acción -->
        <div class="export-actions">
          <app-button
              :label="$t('exports.actions.cancel')"
              variant="secondary"
              size="small"
              @click="closeOptions"
              :disabled="exporting"
          />

          <app-button
              :label="exporting ? $t('exports.exporting') : $t('exports.actions.export')"
              variant="primary"
              size="small"
              @click="performExport"
              :loading="exporting"
              :disabled="filteredData.length === 0"
          />
        </div>
      </div>
    </div>

    <!-- Overlay para modal -->
    <div v-if="showOptions && modal" class="export-overlay" @click="closeOptions"></div>
  </div>
</template>
<style scoped>
.export-container {
  position: relative;
  display: inline-block;
}

.export-modal.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1000;
  min-width: 400px;
  max-width: 500px;
}

.export-modal.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1050;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.export-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1040;
}

.export-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid #e0e0e0;
  padding: 1.5rem;
}

.export-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.export-header h4 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #666;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: #f5f5f5;
  color: #333;
}

.export-info {
  margin-bottom: 1.5rem;
}

.data-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #666;
}

.data-summary i {
  color: #FF5F01;
}

.date-filters,
.additional-filters {
  margin-bottom: 1.5rem;
}

.date-filters h5,
.additional-filters h5,
.format-selector h5,
.format-specific-options h5,
.data-preview h5 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.format-selector {
  margin-bottom: 1.5rem;
}

.format-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.format-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.format-option:hover {
  border-color: #FF5F01;
  background-color: #fff5f0;
}

.format-option:has(input:checked) {
  border-color: #FF5F01;
  background-color: #fff5f0;
}

.format-option input {
  margin-top: 0.25rem;
}

.format-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex: 1;
}

.format-info i {
  font-size: 1.5rem;
  color: #FF5F01;
  margin-top: 0.125rem;
}

.format-details {
  flex: 1;
}

.format-name {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
}

.format-description {
  color: #666;
  font-size: 0.75rem;
  line-height: 1.4;
}

.format-specific-options {
  margin-bottom: 1.5rem;
}

.options-grid {
  display: grid;
  gap: 0.75rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.checkbox-option:hover {
  background-color: #f8f9fa;
}

.checkbox-option input {
  margin: 0;
}

.data-preview {
  margin-bottom: 1.5rem;
}

.preview-table {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.preview-table table {
  width: 100%;
  border-collapse: collapse;
}

.preview-table th,
.preview-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
  font-size: 0.75rem;
}

.preview-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.preview-table td {
  color: #666;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-note {
  padding: 0.5rem;
  background-color: #f8f9fa;
  font-size: 0.75rem;
  color: #666;
  text-align: center;
  font-style: italic;
}

.export-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.export-status.info {
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #bbdefb;
}

.export-status.success {
  background-color: #e8f5e8;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.export-status.error {
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

.export-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

@media (max-width: 768px) {
  .export-modal.dropdown {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: none;
    max-height: 90vh;
    overflow-y: auto;
  }

  .format-options,
  .filter-grid,
  .date-inputs {
    grid-template-columns: 1fr;
  }

  .export-actions {
    flex-direction: column-reverse;
  }
}

@media (max-width: 480px) {
  .export-content {
    padding: 1rem;
  }

  .export-header h4 {
    font-size: 1.125rem;
  }
}
</style>