<script>
import AppTable from '../../../core/components/AppTable.vue'
import MaterialsForm from './materials-form.vue'
import { materialsApiService } from '../services/materials-api.service.js'

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
        { field: 'worker', header: this.$t('inventory.worker') },
        { field: 'usageType', header: this.$t('inventory.usageType') },
        { field: 'observations', header: this.$t('inventory.observations') }
      ]
    }
  },
  async created() {
    await this.loadMaterials()
    await this.loadUsages()
  },
  methods: {
    async loadMaterials() {
      const user = JSON.parse(sessionStorage.getItem('user'))
      this.materials = await materialsApiService.getByProject(user.projectId)
    },

    async loadUsages() {
      const user = JSON.parse(sessionStorage.getItem('user'))
      const rawUsages = await materialsApiService.getUsagesByProject(user.projectId)

      this.usages = rawUsages.map(usage => {
        const material = this.materials.find(m => m.id === usage.materialId)
        return {
          ...usage,
          materialName: material?.name || 'Desconocido'
        }
      })
    },

    handleAdd() {
      this.selectedUsage = null
      this.isEditingUsage = false
      this.showForm = true
    },

    handleRowClick({ data }) {
      const material = this.materials.find(m => m.id === data.materialId)

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
      }

      this.isEditingUsage = true
      this.showForm = true
    },

    cancelForm() {
      this.showForm = false
      this.isEditingUsage = false
    },

    async handleConfirm(data) {
      try {
        const user = JSON.parse(sessionStorage.getItem('user'))
        const material = this.materials.find(m => m.id === data.id)

        if (!material) {
          alert('Material no encontrado. Por favor selecciona uno.')
          return
        }

        const usagePayload = {
          id: this.isEditingUsage ? data.usageId : 'u' + Date.now(),
          materialId: material.id,
          projectId: user.projectId,
          quantity: Number(data.quantity),
          date: data.date,
          area: data.area,
          worker: data.worker,
          usageType: data.usageType,
          observations: data.description,
          status: data.status || 'Normal',
          createdBy: user.id
        }

        if (this.isEditingUsage) {
          await materialsApiService.updateUsage(usagePayload.id, usagePayload)
        } else {
          await materialsApiService.createUsage(usagePayload)

          const updatedStock = Number(material.stock) - usagePayload.quantity
          await materialsApiService.updateMaterial(material.id, {
            ...material,
            stock: updatedStock
          })
        }

        this.showForm = false
        this.isEditingUsage = false
        await this.loadUsages()
        this.$emit('updated', 'Uso guardado correctamente')
      } catch (error) {
        console.error('Error al guardar uso:', error)
      }
    },

    async handleDelete(selected) {
      const confirmDelete = window.confirm(`¿Eliminar ${selected.length} uso(s)?`)
      if (!confirmDelete) return

      for (const usage of selected) {
        const index = this.usages.findIndex(u => u.id === usage.id)
        if (index !== -1) this.usages.splice(index, 1)
      }

      this.selection = []
    }
  }
}
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
