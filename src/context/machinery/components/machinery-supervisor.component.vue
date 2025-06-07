<script>
import AppTable from '../../../core/components/AppTable.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import AppButton from '../../../core/components/AppButton.vue'
import { MachineryApiService } from "../services/machinery-api.service.js";
import MachineryForm from "./machinery-form.vue";

export default {
  name: 'MachinerySupervisor',
  components: {
    MachineryForm,
    AppTable,
    AppNotification,
    AppButton,
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      selectedTab: 'machinery',
      machinery: [],
      selectedMachine: null,
      showForm: false,
      isReadonly: false,
      isEditing: false,
      showAddForm: false,
      loading: false,
      showNotification: false,
      notificationMessage: '',
      machineryService: new MachineryApiService(),
      showConfirmation: false,
      confirmationMessage: '',
      pendingDeleteMachinery: [],
    }
  },
  computed: {
    columns() {
      return [
        { field: 'name', header: this.$t('machinery.name') },
        { field: 'licensePlate', header: this.$t('machinery.licensePlate') },
        { field: 'machineryType', header: this.$t('machinery.machineryType') },
        { field: 'status', header: this.$t('machinery.status') },
        { field: 'provider', header: this.$t('machinery.provider') },
        { field: 'registerDate', header: this.$t('machinery.registerDate'), dataType: 'date' }
      ];
    },

    currentProjectId() {
      return this.projectId || this.getCurrentProjectIdFromSession();
    }
  },
  async created() {
    await this.loadMachinery()
  },
  methods: {
    getCurrentProjectIdFromSession() {
      try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        return user?.projectId || null;
      } catch (error) {
        console.error('Error getting projectId from session:', error);
        return null;
      }
    },

    async loadMachinery() {
      try {
        this.loading = true;

        if (!this.currentProjectId) {
          throw new Error('No projectId found');
        }

        console.log('Loading machinery for project:', this.currentProjectId);
        const data = await this.machineryService.getByProject(this.currentProjectId);
        this.machinery = Array.isArray(data) ? data : [];

        console.log('Loaded machinery:', this.machinery.length);
      } catch (error) {
        console.error('Error loading machinery:', error);
        this.machinery = [];
        this.notificationMessage = this.$t('machinery.errorLoading');
        this.showNotification = true;
      } finally {
        this.loading = false;
      }
    },

    async handleUpdated(message = '') {
      await this.loadMachinery()
      if (message) {
        this.notificationMessage = message
        this.showNotification = true
      }
    },

    handleAdd() {
      this.selectedMachine = null
      this.showForm = true
      this.isReadonly = false
      this.isEditing = false
      this.showAddForm = true
    },

    async handleConfirm(machinery) {
      try {
        if (!this.currentProjectId) {
          throw new Error('No projectId available');
        }

        machinery.projectId = this.currentProjectId;

        let savedMachinery;
        if (machinery.id) {
          savedMachinery = await this.machineryService.update(machinery.id, machinery);
          this.notificationMessage = this.$t('machinery.machineryUpdated');
        } else {
          savedMachinery = await this.machineryService.create(machinery);
          this.notificationMessage = this.$t('machinery.machineryCreated');
        }

        this.showNotification = true;
        this.showForm = false;
        this.showAddForm = false;
        this.selectedMachine = null;
        await this.loadMachinery();

        console.log('Machinery saved:', savedMachinery);
      } catch (error) {
        console.error('Error saving machinery:', error);
        this.notificationMessage = error.message || this.$t('machinery.errorSaving');
        this.showNotification = true;
      }
    },

    handleRowClick({data}) {
      this.selectedMachine = {...data}
      this.showForm = true
      this.isReadonly = true
      this.isEditing = false
    },

    handleEdit() {
      this.isReadonly = false
      this.isEditing = true
      this.showForm = true
      this.showAddForm = false
    },

    cancelView() {
      this.showForm = false
      this.showAddForm = false
      this.selectedMachine = null
      this.isReadonly = false
      this.isEditing = false
    },

    async handleDelete(selectedMachinery) {
      if (!selectedMachinery || selectedMachinery.length === 0) {
        return;
      }

      try {
        const confirmMessage = selectedMachinery.length === 1
            ? this.$t('machinery.deleteConfirm')
            : this.$t('machinery.deleteMultipleConfirm', { count: selectedMachinery.length });

        // Mostrar confirmación usando AppNotification
        this.confirmationMessage = confirmMessage;
        this.showConfirmation = true;
        this.pendingDeleteMachinery = selectedMachinery;
      } catch (error) {
        console.error('Error preparing delete:', error);
        this.showNotificationMessage(error.message || this.$t('machinery.errorDeleting'), 'error');
      }
    },

    async executeDelete() {
      try {
        this.loading = true;
        this.showConfirmation = false;

        if (this.pendingDeleteMachinery.length === 1) {
          await this.machineryService.delete(this.pendingDeleteMachinery[0].id);
        } else {
          const ids = this.pendingDeleteMachinery.map(m => m.id);
          await this.machineryService.deleteMultiple(ids);
        }

        this.showNotificationMessage(this.$t('machinery.machineryDeleted'), 'success');
        await this.loadMachinery();
      } catch (error) {
        console.error('Error deleting machinery:', error);
        this.showNotificationMessage(error.message || this.$t('machinery.errorDeleting'), 'error');
      } finally {
        this.loading = false;
        this.pendingDeleteMachinery = [];
      }
    },

    cancelDelete() {
      this.showConfirmation = false;
      this.pendingDeleteMachinery = [];
    },

    async handleExport({ filteredData, selectedData, allData }) {
      try {
        const dataToExport = selectedData && selectedData.length > 0
            ? selectedData
            : filteredData && filteredData.length > 0
                ? filteredData
                : allData;

        if (!dataToExport || dataToExport.length === 0) {
          this.notificationMessage = this.$t('machinery.noDataAvailable');
          this.showNotification = true;
          return;
        }

        await this.machineryService.exportToExcel(dataToExport, 'machinery');

        this.notificationMessage = this.$t('machinery.exportedSuccessfully');
        this.showNotification = true;
      } catch (error) {
        console.error('Error exporting machinery:', error);
        this.notificationMessage = error.message || 'Error exporting data';
        this.showNotification = true;
      }
    },

    getStatusDisplay(status) {
      const statusMap = {
        'ACTIVE': { label: this.$t('machinery.statusActive'), class: 'status-success' },
        'INACTIVE': { label: this.$t('machinery.statusInactive'), class: 'status-info' },
        'DAMAGED': { label: this.$t('machinery.statusDamaged'), class: 'status-danger' },
        'MAINTENANCE': { label: this.$t('machinery.statusMaintenance'), class: 'status-warning' }
      };

      return statusMap[status] || { label: status, class: 'status-default' };
    },

    getMachineryTypeDisplay(type) {
      const typeMap = {
        'EXCAVATOR': this.$t('machinery.typeExcavator'),
        'TRACTOR': this.$t('machinery.typeTractor'),
        'CRANE': this.$t('machinery.typeCrane'),
        'BULLDOZER': this.$t('machinery.typeBulldozer'),
        'LOADER': this.$t('machinery.typeLoader'),
        'DUMP_TRUCK': this.$t('machinery.typeDumpTruck'),
        'COMPACTOR': this.$t('machinery.typeCompactor'),
        'MIXER': this.$t('machinery.typeMixer'),
        'GENERATOR': this.$t('machinery.typeGenerator'),
        'PUMP': this.$t('machinery.typePump')
      };

      return typeMap[type] || type;
    }
  }
}
</script>

<template>
  <div class="machinery-supervisor">
    <!-- TABS -->
    <div v-if="selectedTab === 'machinery'">
      <!-- Formulario para maquinaria -->
      <machinery-form
          v-if="showForm || showAddForm"
          :machinery="selectedMachine || {}"
          :project-id="currentProjectId"
          @save="handleConfirm"
          @cancel="cancelView"
      />

      <!-- Botones al ver detalles -->
      <div v-if="showForm && isReadonly" class="detail-actions">
        <AppButton
            :label="$t('general.edit')"
            variant="primary"
            @click="handleEdit"
        />
        <AppButton
            :label="$t('general.close')"
            variant="secondary"
            @click="cancelView"
        />
      </div>

      <!-- Estado vacío -->
      <div v-if="!showForm && !showAddForm && !loading && machinery.length === 0" class="empty-state">
        <i class="pi pi-wrench empty-icon"></i>
        <h3>{{ $t('machinery.noDataAvailable') }}</h3>
        <p>{{ $t('machinery.addFirstMachinery') }}</p>
        <AppButton
            :label="$t('machinery.addNew')"
            variant="primary"
            icon="pi pi-plus"
            @click="handleAdd"
        />
      </div>

      <!-- Tabla - solo cuando hay datos -->
      <div v-if="!showForm && !showAddForm && (loading || machinery.length > 0)" class="table-container">
        <AppTable
            :columns="columns"
            :data="machinery"
            :loading="loading"
            :showFilterButton="true"
            :showAddButton="true"
            :showExportButton="false"
            :selectable="true"
            @add="handleAdd"
            @row-click="handleRowClick"
            @delete="handleDelete"
        >
          <!-- Custom template for machinery type column -->
          <template #body-machineryType="{ data }">
            <span class="machinery-type-display">
              {{ getMachineryTypeDisplay(data.machineryType) }}
            </span>
          </template>

          <!-- Custom template for status column -->
          <template #body-status="{ data }">
            <div class="status-container">
              <span
                  class="status-dot"
                  :class="getStatusDisplay(data.status).class"
              ></span>
              <span>{{ getStatusDisplay(data.status).label }}</span>
            </div>
          </template>
        </AppTable>
      </div>
    </div>

    <!-- NOTIFICACIÓN -->
    <AppNotification
        v-model="showNotification"
        :message="notificationMessage"
        type="success"
        :autoClose="true"
        :duration="3000"
    />
    
    <AppNotification
        v-model="showConfirmation"
        :message="confirmationMessage"
        type="warning"
        :auto-close="false"
        :show-buttons="true"
        confirm-label="Eliminar"
        cancel-label="Cancelar"
        @confirm="executeDelete"
        @cancel="cancelDelete"
    />
  </div>
</template>

<style scoped>
.machinery-supervisor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 1rem;
}

.table-container {
  flex: 1;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.machinery-type-display {
  font-weight: 500;
  color: #333;
}

.status-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.status-success {
  background-color: #22c55e;
}

.status-dot.status-danger {
  background-color: #ef4444;
}

.status-dot.status-warning {
  background-color: #f97316;
}

.status-dot.status-info {
  background-color: #3b82f6;
}

.status-dot.status-default {
  background-color: #6b7280;
}

/* Estilos para columna de personal asignado */
.personnel-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.personnel-icon {
  font-size: 0.875rem;
  color: #22c55e;
}

.personnel-icon.unassigned {
  color: #9ca3af;
}

.unassigned-text {
  color: #9ca3af;
  font-style: italic;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  background: white;
  border-radius: 12px;
  margin: 2rem;
  min-height: 400px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  font-size: 4rem;
  color: #9ca3af;
  margin-bottom: 1.5rem;
  opacity: 0.8;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .detail-actions {
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .table-container {
    margin: 0.5rem;
    border-radius: 6px;
  }

  .empty-state {
    padding: 3rem 1.5rem;
    margin: 1rem;
    min-height: 300px;
  }

  .empty-icon {
    font-size: 2.5rem;
  }
}

@media (max-width: 480px) {
  .detail-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .machinery-supervisor {
    padding: 0;
  }

  .empty-state {
    padding: 2rem 1rem;
    margin: 0.5rem;
    min-height: 250px;
  }
}
</style>