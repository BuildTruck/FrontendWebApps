<script>
import AppTable from '../../../core/components/AppTable.vue'
import MaterialsForm from './materials-form.vue'
import { materialsApiService } from '../services/materials-api.service.js'

export default {
  name: 'MaterialsSupervisorEntries',
  components: {
    AppTable,
    MaterialsForm
  },
  data() {
    return {
      entries: [],
      selectedEntry: null,
      materials: [],
      loading: false,
      showForm: false,
      isEditingEntry: false,
      selection: [],
      columns: [
        { field: 'date', header: this.$t('inventory.date') },
        { field: 'materialName', header: this.$t('inventory.material') },
        { field: 'quantity', header: this.$t('inventory.quantity') },
        {
          field: 'unitCost',
          header: this.$t('inventory.unitPrice'),
          dataType: 'numeric',
          body: row => row.unitCost ? `S/ ${row.unitCost.toFixed(2)}` : '-'
        },
        { field: 'provider', header: this.$t('inventory.provider') },
        { field: 'comprobante', header: this.$t('inventory.documentType') },
        { field: 'comprobanteNumber', header: this.$t('inventory.documentNumber') },
        { field: 'status', header: this.$t('inventory.status') },
        { field: 'ruc', header: this.$t('inventory.ruc') },
        { field: 'payment', header: this.$t('inventory.paymentMethod') },
        { field: 'observations', header: this.$t('inventory.observations') }
      ]
    }
  },
  async created() {
    await this.loadMaterials()
    await this.loadEntries()
  },
  methods: {
    async loadMaterials() {
      const projectId = materialsApiService.getCurrentProjectIdSync()
      this.materials = await materialsApiService.getByProject(projectId)
    },

    async loadEntries() {
      const projectId = materialsApiService.getCurrentProjectIdSync()
      const rawEntries = await materialsApiService.getEntriesByProject(projectId)

      this.entries = rawEntries
          .filter(entry => entry.materialId && entry.quantity > 0)
          .map(entry => {
            const material = this.materials.find(m => m.id === entry.materialId)
            return {
              ...entry,
              materialName: material?.name || 'Desconocido'
            }
          })
    },

    handleAdd() {
      this.selectedEntry = null
      this.isEditingEntry = false
      this.showForm = true
    },

    handleRowClick({ data }) {
      const material = this.materials.find(m => m.id === data.materialId)

      this.selectedEntry = {
        entryId: data.id,
        id: material?.id,
        quantity: data.quantity,
        date: data.date,
        provider: data.provider,
        comprobante: data.comprobante,
        comprobanteNumber: data.comprobanteNumber,
        ruc: data.ruc,
        payment: data.payment,
        price: data.unitCost,
        description: data.observations,
        status: data.status
      }

      this.isEditingEntry = true
      this.showForm = true
    },

    cancelForm() {
      this.showForm = false
      this.isEditingEntry = false
    },

    async handleConfirm(data) {
      try {
        if (!data.date || !data.id || !data.quantity || !data.price) {
          alert('Faltan datos requeridos. Verifica la información antes de guardar.')
          return
        }

        const material = this.materials.find(m => m.id === data.id)

        if (!material) {
          alert('Material no encontrado. Por favor selecciona uno.')
          return
        }

        const projectId = materialsApiService.getCurrentProjectIdSync()

        const entryPayload = {
          id: this.isEditingEntry ? data.entryId : 'e' + Date.now(),
          materialId: material.id,
          projectId,
          date: data.date,
          quantity: Number(data.quantity),
          provider: data.provider,
          comprobante: data.comprobante,
          comprobanteNumber: data.comprobanteNumber,
          ruc: data.ruc,
          payment: data.payment,
          unitCost: Number(data.price),
          totalCost: Number(data.price) * Number(data.quantity),
          observations: data.description,
          status: data.status || 'Normal',
          createdBy: JSON.parse(sessionStorage.getItem('user')).id
        }

        if (this.isEditingEntry) {
          await materialsApiService.updateEntry(entryPayload.id, entryPayload)
        } else {
          await materialsApiService.createEntry(entryPayload)

          const updatedStock = material?.stock
              ? Number(material.stock) + entryPayload.quantity
              : entryPayload.quantity

          await materialsApiService.updateMaterial(material.id, {
            ...material,
            stock: updatedStock
          })
        }

        this.showForm = false
        this.isEditingEntry = false
        await this.loadEntries()
        this.$emit('updated', 'Ingreso guardado correctamente')
      } catch (err) {
        console.error('Error al guardar ingreso:', err)
      }
    },

    async handleDelete(selected) {
      const confirmDelete = window.confirm(`¿Seguro que deseas eliminar ${selected.length} ingreso(s)?`)
      if (!confirmDelete) return

      for (const entry of selected) {
        const index = this.entries.findIndex(e => e.id === entry.id)
        if (index !== -1) this.entries.splice(index, 1)
      }

      this.selection = []
    }
  }
}
</script>

<template>
  <div>
    <MaterialsForm
        v-if="showForm"
        :material="selectedEntry || {}"
        :readonly="false"
        :mode="'entry'"
        :materials-list="materials"
        @confirm="handleConfirm"
        @cancel="cancelForm"
    />

    <div v-else>
      <AppTable
          :columns="columns"
          :data="entries"
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
