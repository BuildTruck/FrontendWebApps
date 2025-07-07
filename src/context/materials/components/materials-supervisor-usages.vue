<script>
import AppTable from '../../../core/components/AppTable.vue';
import MaterialsForm from './materials-form.vue';
import { materialsApiService } from '../services/materials-api.service.js';
import { materialUsagesApiService } from '../services/material-usages-api.service.js';
import { personnelService } from '../../personnel/services/personnel-api.service.js';
import { MaterialUsageEntity } from '../models/material-usages.entity.js';

export default {
  name: 'MaterialsSupervisorUsages',
  components: {
    AppTable,
    MaterialsForm
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
      columns: [
        { field: 'date', header: this.$t('inventory.date') },
        { field: 'materialName', header: this.$t('inventory.material') },
        { field: 'quantity', header: this.$t('inventory.usedQuantity') },
        { field: 'area', header: this.$t('inventory.area') },
        { field: 'workerName', header: this.$t('inventory.worker') },
        { field: 'usageType', header: this.$t('inventory.usageType') },
        { field: 'observations', header: this.$t('inventory.observations') }
      ]
    };
  },
  async created() {
    await this.loadMaterials();
    await this.loadWorkers();
    await this.loadUsages();
  },
  methods: {
    async loadMaterials() {
      const projectId = materialsApiService.getCurrentProjectIdSync();
      this.materials = await materialsApiService.getByProject(projectId);
    },

    async loadWorkers() {
      const projectId = materialsApiService.getCurrentProjectIdSync();
      this.workers = await personnelService.getByProject(projectId);
    },

    async loadUsages() {
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

    cancelForm() {
      this.showForm = false;
      this.isEditingUsage = false;
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
          alert('Material no encontrado. Verifica la selección.');
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
            alert(`Stock insuficiente. Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada}`);
            return;
          }
        }

        await materialUsagesApiService.createOrUpdate(usagePayload);

        this.showForm = false;
        this.isEditingUsage = false;
        await this.loadUsages();
        this.$emit('updated', 'Uso guardado correctamente');

      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
        alert(`Error al guardar uso: ${errorMessage}`);
      }
    },

    async handleDelete(selected) {
      if (!window.confirm(`¿Eliminar ${selected.length} uso(s)?`)) return;

      for (const usage of selected) {
        const index = this.usages.findIndex(u => u.id === usage.id);
        if (index !== -1) this.usages.splice(index, 1);
      }

      this.selection = [];
    }
  }
};
</script>

<template>
  <div>
    <!-- FORMULARIO DE USO -->
    <MaterialsForm
        v-if="showForm"
        :material="selectedUsage || {}"
        :readonly="false"
        :mode="'usage'"
        :materials-list="materials"
        :workers-list="workers"
        @confirm="handleConfirm"
        @cancel="cancelForm"
    />

    <!-- TABLA DE USOS -->
    <div v-else>
      <AppTable
          :columns="columns"
          :data="usages"
          :loading="loading"
          :showFilterButton="true"
          :showAddButton="true"
          :selectable="true"
          :selection="selection"
          @update:selection="val => (selection = val)"
          @row-click="handleRowClick"
          @add="handleAdd"
          @delete="handleDelete"
      />
    </div>
  </div>
</template>