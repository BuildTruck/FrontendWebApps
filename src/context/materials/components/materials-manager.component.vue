<script>
import AppTable from '../../../core/components/AppTable.vue'
import { materialsApiService } from '../services/materials-api.service.js'

export default {
  name: 'ManagerMaterials',
  components: { AppTable },
  data() {
    return {
      selectedTab: 'inventory',
      inventory: [],
      entries: [],
      usages: [],
      materials: [],
      workers: [],
      loading: false,
    };
  },
  async created() {
    await this.loadAll()
  },
  methods: {
    async loadAll() {
      this.loading = true
      const projectId = materialsApiService.getCurrentProjectIdSync()
      this.materials = await materialsApiService.getByProject(projectId)
      this.inventory = await materialsApiService.getInventorySummary(projectId)

      const rawEntries = await materialsApiService.getEntriesByProject(projectId)
      const rawUsages = await materialsApiService.getUsagesByProject(projectId)

      this.entries = rawEntries.map(e => {
        const mat = this.materials.find(m => m.id === e.materialId)
        return { ...e, materialName: mat?.name || 'Desconocido' }
      })

      this.usages = rawUsages.map(u => {
        const mat = this.materials.find(m => m.id === u.materialId)
        return { ...u, materialName: mat?.name || 'Desconocido' }
      })

      this.loading = false
    },
    getColumns(type) {
      if (type === 'inventory') {
        return [
          { field: 'name', header: this.$t('inventory.name') },
          { field: 'type', header: this.$t('inventory.type') },
          { field: 'unit', header: this.$t('inventory.unit') },
          { field: 'minimumStock', header: this.$t('inventory.minimumStock') },
          { field: 'stockActual', header: this.$t('inventory.currentStock') },
          { field: 'price', header: this.$t('inventory.unitPrice') },
          { field: 'total', header: this.$t('inventory.total') }
        ]
      }
      if (type === 'entries') {
        return [
          { field: 'date', header: this.$t('inventory.date') },
          { field: 'materialName', header: this.$t('inventory.material') },
          { field: 'quantity', header: this.$t('inventory.quantity') },
          { field: 'provider', header: this.$t('inventory.provider') },
          { field: 'comprobante', header: this.$t('inventory.documentType') },
          { field: 'payment', header: this.$t('inventory.paymentMethod') }
        ]
      }
      if (type === 'usages') {
        return [
          { field: 'date', header: this.$t('inventory.date') },
          { field: 'materialName', header: this.$t('inventory.material') },
          { field: 'quantity', header: this.$t('inventory.usedQuantity') },
          { field: 'area', header: this.$t('inventory.usageArea') },
          { field: 'usageType', header: this.$t('inventory.usageType') },
          { field: 'observations', header: this.$t('inventory.observations') }
        ]
      }
    }
  }
}
</script>

<template>
  <div>
    <!-- Botones de navegación -->
    <div class="tabs-wrapper">
      <button :class="{ active: selectedTab === 'inventory' }" @click="selectedTab = 'inventory'">📦 Inventario</button>
      <button :class="{ active: selectedTab === 'entries' }" @click="selectedTab = 'entries'">📥 Entradas</button>
      <button :class="{ active: selectedTab === 'usages' }" @click="selectedTab = 'usages'">📤 Usos</button>
    </div>

    <!-- Tablas -->
    <AppTable
        :columns="getColumns(selectedTab)"
        :data="selectedTab === 'inventory' ? inventory : selectedTab === 'entries' ? entries : usages"
        :loading="loading"
        :showFilterButton="true"
        :showDownloadButton="true"
    />
  </div>
</template>

<style scoped>
.tabs-wrapper {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
button {
  padding: 0.5rem 1rem;
  border: none;
  background: #eee;
  cursor: pointer;
}
button.active {
  background: #FF5F01;
  color: white;
}
</style>
