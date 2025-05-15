<script>
import AppTable from '../../../core/components/AppTable.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import AppButton from '../../../core/components/AppButton.vue'
import MaterialsForm from './materials-form.vue'
import { materialsApiService } from '../services/materials-api.service.js'

// Script section
export default {
  name: 'MaterialsManager',
  components: {
    AppTable,
    AppNotification,
    AppButton,
    MaterialsForm
  },
  data() {
    return {
      activeView: 'inventory', // 'inventory', 'entries', 'usages'
      inventory: [],
      entries: [],
      usages: [],
      selectedMaterial: null,
      showForm: false,
      isReadonly: true, // Siempre en modo readonly
      prevState: null, // Almacenar el estado previo para volver después de ver ingresos/usos
      loading: {
        inventory: false,
        entries: false,
        usages: false
      },
      showNotification: false,
      notificationMessage: '',
      exportOptions: false,
      selectedItems: [] // Para el manejo de selección múltiple
    }
  },
  computed: {
    inventoryColumns() {
      return [
        { field: 'name', header: this.$t('inventory.name') },
        { field: 'type', header: this.$t('inventory.type') },
        { field: 'unit', header: this.$t('inventory.unit') },
        { field: 'minimumStock', header: this.$t('inventory.minimumStock') },
        { field: 'provider', header: this.$t('inventory.provider') },
        { field: 'totalEntries', header: this.$t('inventory.totalEntries') },
        { field: 'totalUsages', header: this.$t('inventory.totalUsages') },
        { field: 'stockActual', header: this.$t('inventory.currentStock') },
        {
          field: 'price',
          header: this.$t('inventory.unitPrice'),
          dataType: 'numeric',
          body: row => row.price && row.price > 0 ? `S/ ${row.price.toFixed(2)}` : '-'
        },
        {
          field: 'total',
          header: this.$t('inventory.total'),
          dataType: 'numeric',
          body: row => row.total && row.total > 0 ? `S/ ${row.total.toFixed(2)}` : '-'
        }
      ]
    },

// Para entriesColumns
    entriesColumns() {
      return [
        { field: 'date', header: this.$t('inventory.date') },
        { field: 'materialName', header: this.$t('inventory.material') },
        { field: 'quantity', header: this.$t('inventory.quantity') },
        {
          field: 'unitCost',
          header: this.$t('inventory.unitPrice'),
          dataType: 'numeric',
          body: row => row.unitCost ? `S/ ${row.unitCost.toFixed(2)}` : '-'
        },
        {
          field: 'totalCost',
          header: this.$t('inventory.total'),
          dataType: 'numeric',
          body: row => row.totalCost ? `S/ ${row.totalCost.toFixed(2)}` : '-'
        },
        { field: 'provider', header: this.$t('inventory.provider') },
        { field: 'comprobante', header: this.$t('inventory.documentType') },
        { field: 'comprobanteNumber', header: this.$t('inventory.documentNumber') },
        { field: 'status', header: this.$t('inventory.status') },
        { field: 'observations', header: this.$t('inventory.observations') }
      ]
    },

// Para usagesColumns
    usagesColumns() {
      return [
        { field: 'date', header: this.$t('inventory.date') },
        { field: 'materialName', header: this.$t('inventory.material') },
        { field: 'quantity', header: this.$t('inventory.usedQuantity') },
        { field: 'area', header: this.$t('inventory.area') },
        { field: 'worker', header: this.$t('inventory.worker') },
        { field: 'usageType', header: this.$t('inventory.usageType') },
        { field: 'observations', header: this.$t('inventory.observations') }
      ]
    },
    filteredEntries() {
      if (!this.selectedMaterial) return this.entries
      return this.entries.filter(entry => entry.materialId === this.selectedMaterial.id)
    },
    filteredUsages() {
      if (!this.selectedMaterial) return this.usages
      return this.usages.filter(usage => usage.materialId === this.selectedMaterial.id)
    },
    viewTitle() {
      if (this.activeView === 'inventory') return 'Inventario de Materiales'
      if (this.activeView === 'entries') {
        return this.selectedMaterial
            ? `Historial de Ingresos - ${this.selectedMaterial.name}`
            : 'Todos los Ingresos'
      }
      if (this.activeView === 'usages') {
        return this.selectedMaterial
            ? `Historial de Usos - ${this.selectedMaterial.name}`
            : 'Todos los Usos'
      }
      return ''
    }
  },
  async created() {
    await this.loadInventory()
    await this.loadAllEntries()
    await this.loadAllUsages()
  },
  methods: {
    async loadInventory() {
      try {
        this.loading.inventory = true
        const user = JSON.parse(sessionStorage.getItem('user'))
        this.inventory = await materialsApiService.getInventorySummary(user.projectId)
      } catch (error) {
        console.error('Error al cargar inventario:', error)
        this.showNotification = true
        this.notificationMessage = 'Error al cargar inventario'
      } finally {
        this.loading.inventory = false
      }
    },

    async loadAllEntries() {
      try {
        this.loading.entries = true
        const user = JSON.parse(sessionStorage.getItem('user'))
        const rawEntries = await materialsApiService.getEntriesByProject(user.projectId)

        // Enriquecemos cada entrada con el nombre del material
        this.entries = rawEntries.map(entry => {
          const material = this.inventory.find(m => m.id === entry.materialId)
          return {
            ...entry,
            materialName: material?.name || 'Desconocido'
          }
        })
      } catch (error) {
        console.error('Error al cargar ingresos:', error)
      } finally {
        this.loading.entries = false
      }
    },

    async loadAllUsages() {
      try {
        this.loading.usages = true
        const user = JSON.parse(sessionStorage.getItem('user'))
        const rawUsages = await materialsApiService.getUsagesByProject(user.projectId)

        // Enriquecemos cada uso con el nombre del material
        this.usages = rawUsages.map(usage => {
          const material = this.inventory.find(m => m.id === usage.materialId)
          return {
            ...usage,
            materialName: material?.name || 'Desconocido'
          }
        })
      } catch (error) {
        console.error('Error al cargar usos:', error)
      } finally {
        this.loading.usages = false
      }
    },

    handleRowClick({ data }) {
      this.selectedMaterial = { ...data }
      this.showForm = true
      this.isReadonly = true // Siempre en modo lectura
    },

    navigateToEntries(material = null) {
      // Guardar el estado actual para poder volver al mismo
      this.saveCurrentState()

      this.selectedMaterial = material
      this.activeView = 'entries'
      this.showForm = false
    },

    navigateToUsages(material = null) {
      // Guardar el estado actual para poder volver al mismo
      this.saveCurrentState()

      this.selectedMaterial = material
      this.activeView = 'usages'
      this.showForm = false
    },

    // Guardar el estado actual antes de navegar
    saveCurrentState() {
      this.prevState = {
        activeView: this.activeView,
        selectedMaterial: this.selectedMaterial ? { ...this.selectedMaterial } : null,
        showForm: this.showForm,
        isReadonly: this.isReadonly
      }
    },

    // Restaurar el estado previo al volver
    restorePreviousState() {
      if (this.prevState) {
        this.activeView = this.prevState.activeView
        this.selectedMaterial = this.prevState.selectedMaterial
        this.showForm = this.prevState.showForm
        this.isReadonly = this.prevState.isReadonly
        this.prevState = null // Limpiar el estado guardado
      } else {
        // Si no hay estado previo, volver al inventario
        this.activeView = 'inventory'
        this.selectedMaterial = null
        this.showForm = false
        this.isReadonly = true
      }
    },

    navigateToInventory() {
      if (this.prevState) {
        this.restorePreviousState()
      } else {
        this.activeView = 'inventory'
        this.selectedMaterial = null
        this.showForm = false
      }
    },

    cancelView() {
      if (this.activeView !== 'inventory') {
        this.navigateToInventory()
      } else {
        this.showForm = false
        this.selectedMaterial = null
        this.isReadonly = true
      }
    },

    async handleUpdated(message = '') {
      await this.loadInventory()
      await this.loadAllEntries()
      await this.loadAllUsages()

      if (message) {
        this.notificationMessage = message
        this.showNotification = true
      }
    },

    // Manejar la selección de elementos en la tabla
    handleSelectionChange(selection) {
      this.selectedItems = selection
    },

    toggleExportOptions() {
      this.exportOptions = !this.exportOptions
    },

    exportData(format) {
      // Elegir qué datos exportar según la vista activa
      let data
      let columns
      let fileName

      if (this.activeView === 'inventory') {
        data = this.inventory
        columns = this.inventoryColumns.filter(col => col.field !== 'actions')
        fileName = `inventario_${new Date().toISOString().split('T')[0]}`
      } else if (this.activeView === 'entries') {
        data = this.filteredEntries
        columns = this.entriesColumns
        fileName = `ingresos_${this.selectedMaterial ? this.selectedMaterial.name + '_' : ''}${new Date().toISOString().split('T')[0]}`
      } else if (this.activeView === 'usages') {
        data = this.filteredUsages
        columns = this.usagesColumns
        fileName = `usos_${this.selectedMaterial ? this.selectedMaterial.name + '_' : ''}${new Date().toISOString().split('T')[0]}`
      }

      if (!data || data.length === 0) {
        return
      }

      if (format === 'csv') {
        this.exportToCSV(data, columns, fileName)
      } else if (format === 'excel') {
        // Simplemente realiza la exportación a Excel (placeholder)
        console.log('Exportación a Excel solicitada')
      } else if (format === 'pdf') {
        // Simplemente realiza la exportación a PDF (placeholder)
        console.log('Exportación a PDF solicitada')
      }

      this.exportOptions = false
    },

    exportToCSV(data, columns, fileName) {
      // Obtener encabezados
      const headers = columns.map(col => col.header).join(',')

      // Obtener filas
      const rows = data.map(item =>
          columns.map(col => {
            let val = item[col.field]

            // Si hay un formatter en la columna, usarlo
            if (col.body && typeof col.body === 'function') {
              val = col.body(item).replace('S/ ', '')
            }

            // Formatear números si es necesario
            if (col.dataType === 'numeric' && val) {
              val = typeof val === 'number' ? val.toFixed(2) : val
            }

            // Si contiene comas, envolverlo en comillas
            if (val === null || val === undefined) val = ''

            return typeof val === 'string' && val.includes(',')
                ? `"${val}"`
                : val
          }).join(',')
      ).join('\n')

      const csvContent = `${headers}\n${rows}`
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${fileName}.csv`
      link.click()
    }
  }
}
</script>

<template>
  <div class="materials-manager">
    <!-- Cabecera con título y acciones -->
    <div class="header-container">
      <div class="flex items-center">
        <!-- Botón de regreso (cuando no estamos en inventario) -->
        <AppButton
            v-if="activeView !== 'inventory'"
            variant="back"
            icon="pi pi-arrow-left"
            @click="navigateToInventory"
            size="small"
        />

        <h2 class="section-title">{{ $t(`inventory.${activeView}`) }}</h2>
      </div>

      <div class="export-container">
        <AppButton
            :label="$t('general.export')"
            icon="pi pi-download"
            variant="secondary"
            @click="toggleExportOptions"
        />
        <div v-if="exportOptions" class="export-menu">
          <div class="export-option" @click="exportData('csv')">
            <i class="pi pi-file"></i> {{ $t('general.exportToCSV') }}
          </div>
          <div class="export-option" @click="exportData('excel')">
            <i class="pi pi-file-excel"></i> {{ $t('general.exportToExcel') }}
          </div>
          <div class="export-option" @click="exportData('pdf')">
            <i class="pi pi-file-pdf"></i> {{ $t('general.exportToPDF') }}
          </div>
        </div>
      </div>
    </div>

    <!-- VISTA DE INVENTARIO -->
    <div v-if="activeView === 'inventory'">
      <!-- Formulario modo material -->
      <MaterialsForm
          v-if="showForm"
          :material="selectedMaterial || {}"
          :readonly="isReadonly"
          :mode="'material'"
          @cancel="cancelView"
      />

      <!-- Botones adicionales en el detalle del material -->
      <div v-if="showForm && isReadonly" class="material-detail-actions">
        <div class="flex justify-between items-center">
          <div class="action-buttons">
            <AppButton
                :label="$t('inventory.viewEntries')"
                icon="pi pi-arrow-down"
                variant="primary"
                @click="navigateToEntries(selectedMaterial)"
            />
            <AppButton
                :label="$t('inventory.viewUsages')"
                icon="pi pi-arrow-up"
                variant="primary"
                @click="navigateToUsages(selectedMaterial)"
                class="ml-2"
            />
          </div>

          <div class="control-buttons">
            <AppButton
                :label="$t('general.close')"
                variant="secondary"
                @click="cancelView"
            />
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div v-if="!showForm">
        <AppTable
            :columns="inventoryColumns"
            :data="inventory"
            :loading="loading.inventory"
            :showFilterButton="true"
            :showAddButton="false"
            :selectable="true"
            @row-click="handleRowClick"
            @update:selection="handleSelectionChange"
        />
      </div>
    </div>

    <!-- VISTA DE INGRESOS -->
    <div v-else-if="activeView === 'entries'">
      <!-- Información del material (si hay uno seleccionado) -->
      <div v-if="selectedMaterial" class="material-info-banner">
        <div class="material-info-content">
          <div class="material-info-item">
            <span class="label">{{ $t('inventory.material') }}:</span>
            <span class="value">{{ selectedMaterial.name }}</span>
          </div>
          <div class="material-info-item">
            <span class="label">{{ $t('inventory.type') }}:</span>
            <span class="value">{{ selectedMaterial.type }}</span>
          </div>
          <div class="material-info-item">
            <span class="label">{{ $t('inventory.unit') }}:</span>
            <span class="value">{{ selectedMaterial.unit }}</span>
          </div>
          <div class="material-info-item">
            <span class="label">{{ $t('inventory.currentStock') }}:</span>
            <span class="value">{{ selectedMaterial.stockActual }}</span>
          </div>
        </div>
      </div>

      <!-- Tabla de ingresos -->
      <AppTable
          :columns="entriesColumns"
          :data="filteredEntries"
          :loading="loading.entries"
          :showFilterButton="true"
          :showAddButton="false"
          :selectable="false"
      />

      <!-- Estado vacío -->
      <div v-if="filteredEntries.length === 0 && !loading.entries" class="empty-state">
        <p>{{ $t('inventory.noEntries', { material: selectedMaterial ? $t('inventory.forThisMaterial') : '' }) }}</p>
      </div>
    </div>

    <!-- VISTA DE USOS -->
    <div v-else-if="activeView === 'usages'">
      <!-- Información del material (si hay uno seleccionado) -->
      <div v-if="selectedMaterial" class="material-info-banner">
        <div class="material-info-content">
          <div class="material-info-item">
            <span class="label">{{ $t('inventory.material') }}:</span>
            <span class="value">{{ selectedMaterial.name }}</span>
          </div>
          <div class="material-info-item">
            <span class="label">{{ $t('inventory.type') }}:</span>
            <span class="value">{{ selectedMaterial.type }}</span>
          </div>
          <div class="material-info-item">
            <span class="label">{{ $t('inventory.unit') }}:</span>
            <span class="value">{{ selectedMaterial.unit }}</span>
          </div>
          <div class="material-info-item">
            <span class="label">{{ $t('inventory.currentStock') }}:</span>
            <span class="value">{{ selectedMaterial.stockActual }}</span>
          </div>
        </div>
      </div>

      <!-- Tabla de usos -->
      <AppTable
          :columns="usagesColumns"
          :data="filteredUsages"
          :loading="loading.usages"
          :showFilterButton="true"
          :showAddButton="false"
          :selectable="false"
      />

      <!-- Estado vacío -->
      <div v-if="filteredUsages.length === 0 && !loading.usages" class="empty-state">
        <p>{{ $t('inventory.noUsages', { material: selectedMaterial ? $t('inventory.forThisMaterial') : '' }) }}</p>
      </div>
    </div>

    <!-- NOTIFICACIÓN -->
    <AppNotification
        v-model="showNotification"
        :message="notificationMessage"
        type="success"
        :autoClose="true"
        :duration="2000"
    />
  </div>
</template>

<style scoped>
/* Estilos base del módulo */
.materials-manager {
  padding: 1rem;
}

/* Cabecera con título y acciones */
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: #333;
  margin-left: 0.5rem;
}

/* Material info banner */
.material-info-banner {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  border-left: 4px solid #FF5F01;
}

.material-info-content {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.material-info-item {
  display: flex;
  flex-direction: column;
  min-width: 150px;
}

.label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.value {
  font-weight: 600;
  color: #333;
}

/* Material detail actions */
.material-detail-actions {
  margin: 1rem 0;
  padding: 1rem;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

/* Mejora en los botones de acción */
.action-buttons, .control-buttons {
  display: flex;
  gap: 0.5rem;
}

/* Utilidades flexbox */
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.items-center { align-items: center; }
.gap-2 { gap: 0.5rem; }
.ml-2 { margin-left: 0.5rem; }

/* Estilos para el menú de exportación */
.export-container {
  position: relative;
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 200px;
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 0.5rem;
}

.export-option {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.export-option:hover {
  background-color: #f5f5f5;
}

/* Estado vacío */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-top: 1rem;
}

/* Responsive media queries */
@media (max-width: 768px) {
  .material-info-content {
    flex-direction: column;
    gap: 0.5rem;
  }

  .material-detail-actions .flex {
    flex-direction: column;
    gap: 1rem;
  }

  .action-buttons, .control-buttons {
    flex-direction: column;
    width: 100%;
  }

  .action-buttons .ml-2,
  .control-buttons .ml-2 {
    margin-left: 0;
    margin-top: 0.5rem;
  }
}
</style>