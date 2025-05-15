<script>
import AppTable from '../../../core/components/AppTable.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import AppButton from '../../../core/components/AppButton.vue'
import MachineryForm from './machinery-form.vue'
import { machineryApiService } from '../services/machinery-api.service.js'

export default {
  name: 'MachineryManager',
  components: {
    AppTable,
    AppNotification,
    AppButton,
    MachineryForm
  },
  data() {
    return {
      inventory: [],
      selectedMachinery: null,
      showForm: false,
      isReadonly: true,
      loading: {
        inventory: false // Changed from `loading: false`
      },
      showNotification: false,
      notificationMessage: '',
      exportOptions: false,
      selectedItems: []
    }
  },
  computed: {
    inventoryColumns() {
      return [
        { field: 'name', header: 'Nombre Maquinaria' },
        { field: 'licensePlate', header: 'Código/Placa' },
        { field: 'registerDate', header: 'Fecha Registro' },
        { field: 'status', header: 'Estado' },
        { field: 'provider', header: 'Proveedor' }
      ]
    },
    viewTitle() {
      return 'Inventario de Maquinaria'
    }
  },
  async created() {
    await this.loadInventory()
  },
  methods: {
    async loadInventory() {
      try {
        this.loading.inventory = true
        const user = JSON.parse(sessionStorage.getItem('user'))
        this.inventory = await machineryApiService.getInventorySummary(user.projectId)
      } catch (error) {
        console.error('Error al cargar maquinaria:', error)
        this.showNotification = true
        this.notificationMessage = 'Error al cargar maquinaria'
      } finally {
        this.loading.inventory = false
      }
    },

    handleRowClick({ data }) {
      this.selectedMachinery = { ...data }
      this.showForm = true
      this.isReadonly = true
    },

    cancelView() {
      this.showForm = false
      this.selectedMachinery = null
      this.isReadonly = true
    },

    async handleUpdated(message = '') {
      await this.loadInventory()
      if (message) {
        this.notificationMessage = message
        this.showNotification = true
      }
    },

    handleSelectionChange(selection) {
      this.selectedItems = selection
    },

    toggleExportOptions() {
      this.exportOptions = !this.exportOptions
    },

    exportData(format) {
      const data = this.inventory
      const columns = this.inventoryColumns
      const fileName = `inventario_maquinaria_${new Date().toISOString().split('T')[0]}`

      if (!data || data.length === 0) {
        this.notificationMessage = 'No hay datos para exportar'
        this.showNotification = true
        return
      }

      if (format === 'csv') {
        this.exportToCSV(data, columns, fileName)
      } else if (format === 'excel') {
        console.log('Exportación a Excel solicitada')
      } else if (format === 'pdf') {
        console.log('Exportación a PDF solicitada')
      }

      this.exportOptions = false
    },

    exportToCSV(data, columns, fileName) {
      const headers = columns.map(col => col.header).join(',')
      const rows = data
          .map(item =>
              columns
                  .map(col => {
                    let val = item[col.field]
                    if (val === null || val === undefined) val = ''
                    return typeof val === 'string' && val.includes(',')
                        ? `"${val}"`
                        : val
                  })
                  .join(',')
          )
          .join('\n')

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
  <div class="machinery-manager">
    <!-- Cabecera con título y acciones -->
    <div class="header-container">
      <h2 class="section-title">{{ viewTitle }}</h2>
      <div class="export-container">
        <AppButton
            label="Exportar"
            icon="pi pi-download"
            variant="secondary"
            @click="toggleExportOptions"
        />
        <div v-if="exportOptions" class="export-menu">
          <div class="export-option" @click="exportData('csv')">
            <i class="pi pi-file"></i> Exportar a CSV
          </div>
          <div class="export-option" @click="exportData('excel')">
            <i class="pi pi-file-excel"></i> Exportar a Excel
          </div>
          <div class="export-option" @click="exportData('pdf')">
            <i class="pi pi-file-pdf"></i> Exportar a PDF
          </div>
        </div>
      </div>
    </div>

    <!-- VISTA DE INVENTARIO -->
    <div>
      <!-- Formulario modo maquinaria -->
      <MachineryForm
          v-if="showForm"
          :machinery="selectedMachinery || {}"
          :readonly="isReadonly"
          :machinery-list="inventory"
          @cancel="cancelView"
      />

      <!-- Botones en el detalle de la maquinaria -->
      <div v-if="showForm && isReadonly" class="machinery-detail-actions">
        <div class="flex justify-end">
          <AppButton label="Cerrar" variant="secondary" @click="cancelView" />
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
        <div v-if="!loading.inventory && inventory.length === 0" class="empty-state">
          <p>No hay maquinaria registrada.</p>
        </div>
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
.machinery-manager {
  padding: 1rem;
}

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
}

.machinery-detail-actions {
  margin: 1rem 0;
  padding: 1rem;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

.flex {
  display: flex;
}
.justify-end {
  justify-content: flex-end;
}
.items-center {
  align-items: center;
}
.gap-2 {
  gap: 0.5rem;
}

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

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .header-container {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
}
</style>