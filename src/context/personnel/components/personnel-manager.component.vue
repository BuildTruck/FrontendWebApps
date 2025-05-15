<script>
import AppTable from '../../../core/components/AppTable.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import AppButton from '../../../core/components/AppButton.vue'
import PersonnelForm from "./personnel-form.vue";
import {personnelApiService} from "../services/personnel-api.service.js";

export default {
  name: 'PersonnelManager',
  components: {
    AppTable,
    AppNotification,
    AppButton,
    PersonnelForm
  },
  data() {
    return {
      inventory: [],
      selectedPerson: null,
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
        {field: 'name', header: 'Nombre'},
        {field: 'dni', header: 'DNI'},
        {field: 'rol', header: 'Rol'},
        {field: 'status', header: 'Estado'}
      ]
    },
  },
  async created() {
    await this.loadInventory()
  },
  methods: {
    async loadInventory() {
      try {
        this.loading.inventory = true
        const user = JSON.parse(sessionStorage.getItem('user'))
        this.inventory = await personnelApiService.getInventorySummary(user.projectId)
      } catch (error) {
        console.error('Error al cargar personal:', error)
        this.showNotification = true
        this.notificationMessage = 'Error al cargar personal'
      } finally {
        this.loading.inventory = false
      }
    },

    handleRowClick({ data }) {
      this.selectedPerson = { ...data }
      this.showForm = true
      this.isReadonly = true
    },

    cancelView() {
      this.showForm = false
      this.selectedPerson = null
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
      const fileName = `inventario_personal_${new Date().toISOString().split('T')[0]}`

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
  <div class="personnel-manager">
    <!-- Cabecera con título y acciones -->
    <div class="header-container">
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

    <!-- VISTA DE PERSONAL -->
    <div>
      <!-- Formulario personal -->
      <PersonnelForm
          v-if="showForm"
          :machinery="selectedMachinery || {}"
          :readonly="isReadonly"
          :machinery-list="inventory"
          @cancel="cancelView"
      />

      <!-- Botones en el detalle del personal -->
      <div v-if="showForm && isReadonly" class="personal-detail-actions">
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
          <p>No hay personal registrado.</p>
        </div>
      </div>
    </div>

    <!-- NOTIFICACIÓN -->
  </div>
</template>

<style scoped>
.personnel-manager {
  padding: 1rem;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.personal-detail-actions {
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