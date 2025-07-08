<script>
import AppTable from '../../../core/components/AppTable.vue';
import AppButton from '../../../core/components/AppButton.vue';
import AppNotification from '../../../core/components/AppNotification.vue';
import MaterialsForm from './materials-form.vue';
import ExportButton from '../../../core/exports/components/ExportButton.vue';
import { materialsApiService } from '../services/materials-api.service.js';
import { materialUsagesApiService } from '../services/material-usages-api.service.js';
import { personnelService } from '../../personnel/services/personnel-api.service.js';
import { MaterialUsageEntity } from '../models/material-usages.entity.js';

export default {
  name: 'MaterialsSupervisorUsages',
  components: {
    AppTable,
    AppButton,
    AppNotification,
    MaterialsForm,
    ExportButton
  },
  data() {
    return {
      usages: [],
      materials: [],
      workers: [],
      selectedUsage: null,
      showForm: false,
      isEditingUsage: false,
      loading: false,
      selection: [],
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',
      columns: [
        { field: 'date', header: this.$t('inventory.date', 'Date'), sortable: true, style: 'width: 120px' },
        { field: 'materialName', header: this.$t('inventory.material', 'Material'), sortable: true, style: 'min-width: 180px' },
        { field: 'quantity', header: this.$t('inventory.usedQuantity', 'Used Quantity'), sortable: true, style: 'width: 120px' },
        { field: 'area', header: this.$t('inventory.area', 'Area'), sortable: true, style: 'min-width: 130px' },
        { field: 'workerName', header: this.$t('inventory.worker', 'Worker'), sortable: true, style: 'min-width: 150px' },
        { field: 'usageType', header: this.$t('inventory.usageType', 'Usage Type'), sortable: true, style: 'width: 130px' },
        { field: 'observations', header: this.$t('inventory.observations', 'Observations'), sortable: false, style: 'min-width: 150px' }
      ]
    };
  },

  computed: {
    // Estadísticas de usos
    usagesStats() {
      const totalUsages = this.usages.length;
      const totalQuantity = this.usages.reduce((sum, usage) => sum + (usage.quantity || 0), 0);
      const uniqueAreas = new Set(this.usages.map(usage => usage.area).filter(Boolean)).size;
      const activeWorkers = new Set(this.usages.map(usage => usage.workerName).filter(worker =>
          worker && worker !== 'No asignado'
      )).size;

      return {
        total: totalUsages,
        totalQuantity,
        uniqueAreas,
        activeWorkers
      };
    },

    // Datos filtrados para la tabla con mejor formato
    formattedUsages() {
      return this.usages.map(usage => ({
        ...usage,
        date: this.formatDate(usage.date),
        area: usage.area || '-',
        observations: usage.observations || '-'
      }));
    }
  },

  async created() {
    await this.loadMaterials();
    await this.loadWorkers();
    await this.loadUsages();
  },

  methods: {
    async loadMaterials() {
      try {
        const projectId = materialsApiService.getCurrentProjectIdSync();
        this.materials = await materialsApiService.getByProject(projectId);
      } catch (error) {
        console.error('Error loading materials:', error);
        this.showNotificationMessage('Error al cargar materiales', 'error');
      }
    },

    async loadWorkers() {
      try {
        const projectId = materialsApiService.getCurrentProjectIdSync();
        this.workers = await personnelService.getByProject(projectId);
      } catch (error) {
        console.error('Error loading workers:', error);
        this.showNotificationMessage('Error al cargar trabajadores', 'error');
      }
    },

    async loadUsages() {
      try {
        this.loading = true;
        const projectId = materialsApiService.getCurrentProjectIdSync();
        const rawUsages = await materialUsagesApiService.getByProject(projectId);

        this.usages = rawUsages.map(usage => {
          const material = this.materials.find(m => m.id === usage.materialId);

          let workerName = 'No asignado';

          if (usage.worker && usage.worker.trim() !== '') {
            const worker = Array.isArray(this.workers)
                ? this.workers.find(w => `${w.name} ${w.lastname}`.trim() === usage.worker.trim())
                : null;

            if (worker) {
              workerName = `${worker.name} ${worker.lastname}`;
            } else {
              workerName = usage.worker;
            }
          }

          const usageTypeObj = MaterialUsageEntity.USAGE_TYPES.find(type => type.value === usage.usageType);
          const usageTypeLabel = usageTypeObj ? usageTypeObj.label : usage.usageType?.toLowerCase() || '';

          return {
            ...usage,
            materialName: material?.name || 'Desconocido',
            workerName: workerName,
            usageType: usageTypeLabel,
            area: usage.area?.toLowerCase() || ''
          };
        });
      } catch (error) {
        console.error('Error loading usages:', error);
        this.showNotificationMessage('Error al cargar usos', 'error');
      } finally {
        this.loading = false;
      }
    },

    handleAdd() {
      this.selectedUsage = null;
      this.isEditingUsage = false;
      this.showForm = true;
    },

    handleRowClick({ data }) {
      const material = this.materials.find(m => parseInt(m.id) === parseInt(data.materialId));

      let workerId = '';
      if (data.workerName && data.workerName !== 'No asignado') {
        const worker = this.workers.find(w =>
            `${w.name} ${w.lastname}` === data.workerName
        );
        workerId = worker ? worker.id : '';
      }

      this.selectedUsage = {
        usageId: data.id,
        id: parseInt(data.materialId),
        quantity: data.quantity,
        date: data.date,
        area: data.area,
        worker: workerId,
        usageType: data.usageType?.toUpperCase() || 'CONSTRUCCION',
        description: data.observations
      };

      this.isEditingUsage = true;
      this.showForm = true;
    },

    backToList() {
      this.showForm = false;
      this.isEditingUsage = false;
      this.selectedUsage = null;
    },

    async handleConfirm(data) {
      try {
        const projectId = materialsApiService.getCurrentProjectIdSync();

        let workerName = '';
        if (data.worker) {
          const worker = this.workers.find(w => w.id === parseInt(data.worker));
          workerName = worker ? `${worker.name} ${worker.lastname}` : '';
        }

        const materialIdToFind = parseInt(data.id);
        let material = this.materials.find(m => parseInt(m.id) === materialIdToFind);

        if (!material) {
          this.showNotificationMessage('Material no encontrado. Verifica la selección.', 'error');
          return;
        }

        const usagePayload = {
          materialId: parseInt(material.id),
          projectId: parseInt(projectId),
          quantity: Number(data.quantity),
          date: data.date,
          area: data.area || '',
          worker: workerName,
          usageType: data.usageType || 'CONSTRUCCION',
          observations: data.description || ''
        };

        if (this.isEditingUsage && data.usageId) {
          usagePayload.id = data.usageId;
        } else {
          const inventory = await materialsApiService.getInventorySummary(projectId);
          const inventoryItem = inventory.find(item => parseInt(item.materialId) === parseInt(material.id));

          const stockDisponible = inventoryItem ? Number(inventoryItem.stockActual || 0) : 0;
          const cantidadSolicitada = Number(data.quantity);

          if (stockDisponible < cantidadSolicitada) {
            this.showNotificationMessage(
                `Stock insuficiente. Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada}`,
                'error'
            );
            return;
          }
        }

        await materialUsagesApiService.createOrUpdate(usagePayload);

        if (this.isEditingUsage) {
          this.showNotificationMessage('Uso actualizado correctamente', 'success');
        } else {
          this.showNotificationMessage('Uso creado correctamente', 'success');
        }

        this.showForm = false;
        this.isEditingUsage = false;
        await this.loadUsages();
        this.$emit('updated', 'Uso guardado correctamente');

      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
        console.error('Error saving usage:', error);
        this.showNotificationMessage(`Error al guardar uso: ${errorMessage}`, 'error');
      }
    },

    async handleDelete(selected) {
      if (!window.confirm(`¿Eliminar ${selected.length} uso(s)?`)) return;

      try {
        for (const usage of selected) {
          const index = this.usages.findIndex(u => u.id === usage.id);
          if (index !== -1) this.usages.splice(index, 1);
        }

        this.selection = [];
        this.showNotificationMessage('Usos eliminados correctamente', 'success');
      } catch (error) {
        console.error('Error deleting usages:', error);
        this.showNotificationMessage('Error al eliminar usos', 'error');
      }
    },

    onExportComplete(result) {
      this.showNotificationMessage(
          this.$t('inventory.exportedSuccessfully', 'Exported successfully'),
          'success'
      );
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    },

    formatDate(date) {
      if (!date) return '-';
      try {
        return new Date(date).toLocaleDateString('es-PE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (error) {
        return String(date);
      }
    }
  }
};
</script>

<template>
  <div class="usages-supervisor">
    <!-- Vista de Formulario -->
    <div v-if="showForm" class="form-view">
      <div class="form-header">
        <div class="form-back">
          <AppButton
              icon="pi pi-arrow-left"
              :label="isEditingUsage ? $t('common.back', 'Back') : $t('common.cancel', 'Cancel')"
              variant="secondary"
              @click="backToList"
          />
        </div>

        <div class="form-title-section">
          <h2 class="form-title">
            {{ isEditingUsage
              ? $t('inventory.editUsage', 'Edit Material Usage')
              : $t('inventory.newUsage', 'New Material Usage')
            }}
          </h2>
          <p class="form-subtitle">
            {{ isEditingUsage
              ? $t('inventory.editUsageDescription', 'Modify material usage details')
              : $t('inventory.newUsageDescription', 'Record new material usage')
            }}
          </p>
        </div>
      </div>

      <div class="form-content">
        <MaterialsForm
            :material="selectedUsage || {}"
            :readonly="false"
            :mode="'usage'"
            :allow-editing="true"
            :materials-list="materials"
            :workers-list="workers"
            @confirm="handleConfirm"
            @cancel="backToList"
        />
      </div>
    </div>

    <!-- Vista de Lista -->
    <div v-else class="list-view">
      <!-- Header con estadísticas -->
      <div class="usages-header">
        <div class="header-content">
          <div class="usages-title-section">
            <h2 class="usages-title">
              <i class="pi pi-arrow-up"></i>
              {{ $t('inventory.materialUsages', 'Material Usages') }}
            </h2>
            <p class="usages-subtitle">
              {{ $t('inventory.manageUsagesDescription', 'Track and manage material consumption') }}
            </p>
          </div>

          <!-- Controles -->
          <div class="usages-controls">
            <ExportButton
                :data="formattedUsages"
                type="material-usages"
                :formats="['excel', 'pdf', 'csv']"
                :button-label="$t('exports.export', 'Export')"
                variant="secondary"
                @export-complete="onExportComplete"
            />
          </div>
        </div>

        <!-- Estadísticas -->
        <div class="usages-stats">
          <div class="stat-card total">
            <div class="stat-content">
              <div class="stat-number">{{ usagesStats.total }}</div>
              <div class="stat-label">{{ $t('inventory.totalUsages', 'Total Usages') }}</div>
            </div>
            <i class="pi pi-list stat-icon"></i>
          </div>

          <div class="stat-card quantity">
            <div class="stat-content">
              <div class="stat-number">{{ usagesStats.totalQuantity }}</div>
              <div class="stat-label">{{ $t('inventory.totalQuantityUsed', 'Total Quantity') }}</div>
            </div>
            <i class="pi pi-box stat-icon"></i>
          </div>

          <div class="stat-card areas">
            <div class="stat-content">
              <div class="stat-number">{{ usagesStats.uniqueAreas }}</div>
              <div class="stat-label">{{ $t('inventory.activeAreas', 'Active Areas') }}</div>
            </div>
            <i class="pi pi-map stat-icon"></i>
          </div>

          <div class="stat-card workers">
            <div class="stat-content">
              <div class="stat-number">{{ usagesStats.activeWorkers }}</div>
              <div class="stat-label">{{ $t('inventory.activeWorkers', 'Active Workers') }}</div>
            </div>
            <i class="pi pi-users stat-icon"></i>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="usages-table">
        <AppTable
            :columns="columns"
            :data="formattedUsages"
            :loading="loading"
            :showFilterButton="true"
            :showAddButton="true"
            :selectable="true"
            :selection="selection"
            :paginator="true"
            :rows="15"
            @update:selection="val => (selection = val)"
            @row-click="handleRowClick"
            @add="handleAdd"
            @delete="handleDelete"
            class="usages-data-table"
            :row-hover="true"
        />
      </div>
    </div>

    <!-- Notificación -->
    <AppNotification
        v-model="showNotification"
        :message="notificationMessage"
        :type="notificationType"
        :auto-close="true"
        :duration="3000"
    />
  </div>
</template>

<style scoped>
.usages-supervisor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  overflow: hidden;
}

/* ========== VISTA DE FORMULARIO ========== */
.form-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.form-header {
  background: white;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.form-back {
  display: flex;
  align-items: center;
}

.form-title-section {
  text-align: center;
  flex: 1;
  margin-left: 2rem;
}

.form-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.form-subtitle {
  margin: 0;
  color: #666;
  font-size: 1rem;
}

.form-content {
  flex: 1;
  overflow-y: auto;
}

/* ========== VISTA DE LISTA ========== */
.list-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.usages-header {
  background: white;
  padding: 2rem;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.usages-title-section {
  flex: 1;
}

.usages-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.usages-title i {
  font-size: 1.5rem;
  color: #FF5F01;
}

.usages-subtitle {
  margin: 0;
  color: #666;
  font-size: 1rem;
}

.usages-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* ========== ESTADÍSTICAS ========== */
.usages-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
  border-left: 4px solid var(--stat-color, #3b82f6);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.stat-card.total { --stat-color: #3b82f6; }
.stat-card.quantity { --stat-color: #10b981; }
.stat-card.areas { --stat-color: #f59e0b; }
.stat-card.workers { --stat-color: #8b5cf6; }

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.25rem;
  color: var(--stat-color, #333);
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.stat-icon {
  font-size: 2rem;
  color: var(--stat-color, #333);
  opacity: 0.3;
}

/* ========== TABLA ========== */
.usages-table {
  flex: 1;
  overflow: hidden;
  background: white;
  margin: 0 2rem 2rem 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
}

.usages-data-table {
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}

/* ========== HOVER EFFECTS ========== */
:deep(.usages-data-table .p-datatable-tbody > tr:hover) {
  background-color: rgba(255, 95, 1, 0.05) !important;
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.usages-data-table .p-datatable-tbody > tr) {
  transition: all 0.2s ease;
}

/* ========== RESPONSIVE ========== */
@media (max-width: 768px) {
  .usages-header {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    margin-bottom: 1rem;
  }

  .usages-title {
    font-size: 1.5rem;
    text-align: center;
  }

  .usages-subtitle {
    text-align: center;
    font-size: 0.875rem;
  }

  .usages-controls {
    justify-content: center;
  }

  .usages-stats {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  .usages-table {
    margin: 0 1rem 1rem 1rem;
  }

  .form-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    text-align: center;
  }

  .form-title-section {
    margin-left: 0;
  }

  .form-title {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .usages-header {
    padding: 0.75rem;
  }

  .usages-title {
    font-size: 1.25rem;
    flex-direction: column;
    gap: 0.5rem;
  }

  .usages-subtitle {
    font-size: 0.8rem;
  }

  .usages-stats {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .stat-card {
    padding: 0.75rem;
  }

  .stat-number {
    font-size: 1.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
  }

  .stat-icon {
    font-size: 1.5rem;
  }

  .usages-table {
    margin: 0 0.5rem 0.5rem 0.5rem;
  }

  .form-title {
    font-size: 1.25rem;
  }

  .form-subtitle {
    font-size: 0.875rem;
  }
}

/* ========== ANIMATIONS ========== */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-card {
  animation: fadeIn 0.6s ease-out forwards;
}

.stat-card:nth-child(1) { animation-delay: 0.1s; }
.stat-card:nth-child(2) { animation-delay: 0.2s; }
.stat-card:nth-child(3) { animation-delay: 0.3s; }
.stat-card:nth-child(4) { animation-delay: 0.4s; }
</style>