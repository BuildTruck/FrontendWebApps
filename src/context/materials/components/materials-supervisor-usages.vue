<script>
import AppTable from '../../../core/components/AppTable.vue';
import MaterialsForm from './materials-form.vue';
import { materialsApiService } from '../services/materials-api.service.js';
import { personnelService } from '../../personnel/services/personnel-api.service.js';

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
      const rawUsages = await materialsApiService.getUsagesByProject(projectId);

      this.usages = rawUsages.map(usage => {
        const material = this.materials.find(m => m.id === usage.materialId);
        const worker = Array.isArray(this.workers)
            ? this.workers.find(w => w.id === usage.worker)
            : null;


        return {
          ...usage,
          materialName: material?.name || 'Desconocido',
          workerName: worker ? `${worker.name} ${worker.lastname}` : 'No asignado'
        };
      });
    },

    handleAdd() {
      this.selectedUsage = null;
      this.isEditingUsage = false;
      this.showForm = true;
    },

    handleRowClick({ data }) {
      const material = this.materials.find(m => m.id === data.materialId);

      this.selectedUsage = {
        usageId: data.id,
        id: material?.id,
        quantity: data.quantity,
        date: data.date,
        area: data.area,
        worker: data.worker,
        usageType: data.usageType,
        description: data.observations,
        status: data.status
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
        const material = this.materials.find(m => m.id === data.id);
        const projectId = materialsApiService.getCurrentProjectIdSync();
        const user = JSON.parse(sessionStorage.getItem('user'));

        if (!material) {
          alert('Material no encontrado.');
          return;
        }

        const usagePayload = {
          id: this.isEditingUsage ? data.usageId : 'u' + Date.now(),
          materialId: material.id,
          projectId,
          quantity: Number(data.quantity),
          date: data.date,
          area: data.area,
          worker: data.worker,
          usageType: data.usageType,
          observations: data.description,
          status: data.status || 'Normal',
          createdBy: user.id
        };

        if (this.isEditingUsage) {
          await materialsApiService.updateUsage(usagePayload.id, usagePayload);
        } else {
          if (Number(material.stock) < usagePayload.quantity) {
            alert('No hay suficiente stock.');
            return;
          }

          await materialsApiService.createUsage(usagePayload);

          const updatedStock = Number(material.stock) - usagePayload.quantity;
          await materialsApiService.updateMaterial(material.id, {
            ...material,
            stock: updatedStock
          });
        }

        this.showForm = false;
        this.isEditingUsage = false;
        await this.loadUsages();
        this.$emit('updated', 'Uso guardado correctamente');
      } catch (error) {
        console.error('Error al guardar uso:', error);
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
