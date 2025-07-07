<script>
import AppTable from '../../../core/components/AppTable.vue'
import {materialsApiService} from '../services/materials-api.service.js'
import 'primeicons/primeicons.css'


export default {
  name: 'ManagerMaterials',
  components: {AppTable},
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

  computed: {
    tabs() {
      return [
        {key: 'inventory', label: this.$t('inventory.inventory'), icon: 'pi pi-box'},
        {key: 'entries', label: this.$t('inventory.entries'), icon: 'pi pi-download'},
        {key: 'usages', label: this.$t('inventory.usages'), icon: 'pi pi-upload'}
      ];
    }
  },

  async created() {
    await this.loadAll()
  },

  methods: {
    async loadAll() {
      this.loading = true
      const projectId = materialsApiService.getCurrentProjectIdSync()

      // ✅ CAMBIAR: Ahora SÍ usar getInventorySummary (ya funciona)
      this.materials = await materialsApiService.getByProject(projectId)
      this.inventory = await materialsApiService.getInventorySummary(projectId) // ✅ AHORA FUNCIONA

      const rawEntries = await materialsApiService.getEntriesByProject(projectId)
      const rawUsages = await materialsApiService.getUsagesByProject(projectId)

      this.entries = rawEntries.map(e => {
        const mat = this.materials.find(m => m.id === e.materialId)
        return {...e, materialName: mat?.name || 'Desconocido'}
      })

      this.usages = rawUsages.map(u => {
        const mat = this.materials.find(m => m.id === u.materialId)
        return {...u, materialName: mat?.name || 'Desconocido'}
      })

      this.loading = false
    },

    getColumns(type) {
      if (type === 'inventory') {
        return [
          {field: 'name', header: this.$t('inventory.name')},
          {field: 'type', header: this.$t('inventory.type')},
          {field: 'unit', header: this.$t('inventory.unit')},
          {field: 'minimumStock', header: this.$t('inventory.minimumStock')},
          {field: 'stockActual', header: this.$t('inventory.currentStock')},
          {field: 'price', header: this.$t('inventory.unitPrice')},
          {field: 'total', header: this.$t('inventory.total')}
        ]
      }
      if (type === 'entries') {
        return [
          {field: 'date', header: this.$t('inventory.date')},
          {field: 'materialName', header: this.$t('inventory.material')},
          {field: 'quantity', header: this.$t('inventory.quantity')},
          {field: 'provider', header: this.$t('inventory.provider')},
          {field: 'comprobante', header: this.$t('inventory.documentType')},
          {field: 'payment', header: this.$t('inventory.paymentMethod')}
        ]
      }
      if (type === 'usages') {
        return [
          {field: 'date', header: this.$t('inventory.date')},
          {field: 'materialName', header: this.$t('inventory.material')},
          {field: 'quantity', header: this.$t('inventory.usedQuantity')},
          {field: 'area', header: this.$t('inventory.usageArea')},
          {field: 'usageType', header: this.$t('inventory.usageType')},
          {field: 'observations', header: this.$t('inventory.observations')}
        ]
      }
    },

    getToday() {
      return new Date().toISOString().split('T')[0];
    },

    async exportCurrentTable() {
      const type = this.selectedTab;

      if (type === 'inventory') {
        await this.exportInventoryToExcel(this.inventory);
      } else if (type === 'entries') {
        await this.exportEntriesToExcel(this.entries);
      } else if (type === 'usages') {
        await this.exportUsagesToExcel(this.usages);
      }
    },

    async exportInventoryToExcel(data, fileName = 'Inventario') {
      const exportData = data.map(item => ({
        'Nombre': item.name,
        'Tipo': item.type,
        'Unidad': item.unit,
        'Stock Mínimo': item.minimumStock,
        'Stock Actual': item.stockActual,
        'Precio Unitario (S/)': item.price,
        'Total (S/)': item.total
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      XLSX.writeFile(wb, `${fileName}_${this.getToday()}.xlsx`);
    },

    async exportEntriesToExcel(data, fileName = 'Entradas') {
      const exportData = data.map(entry => ({
        'Fecha': entry.date,
        'Material': entry.materialName,
        'Cantidad': entry.quantity,
        'Proveedor': entry.provider,
        'Comprobante': entry.comprobante,
        'Método de Pago': entry.payment
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Entradas');
      XLSX.writeFile(wb, `${fileName}_${this.getToday()}.xlsx`);
    },

    async exportUsagesToExcel(data, fileName = 'Usos') {
      const exportData = data.map(usage => ({
        'Fecha': usage.date,
        'Material': usage.materialName,
        'Cantidad Usada': usage.quantity,
        'Área': usage.area,
        'Tipo de Uso': usage.usageType,
        'Observaciones': usage.observations
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Usos');
      XLSX.writeFile(wb, `${fileName}_${this.getToday()}.xlsx`);
    }
  }
}
</script>

<template>
  <div class="inventory-manager-tabs">
    <!-- Tabs de navegación -->
    <nav class="tabs-navigation">
      <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-button"
          :class="{ 'active': selectedTab === tab.key }"
          @click="selectedTab = tab.key"
      >
        <i :class="tab.icon"></i>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Tabla de datos -->
    <AppTable
        :columns="getColumns(selectedTab)"
        :data="selectedTab === 'inventory' ? inventory : selectedTab === 'entries' ? entries : usages"
        :loading="loading"
        :paginator="true"
        :rows="10"
        :show-export-button="true"
        :show-filter-button="true"
        @export="exportCurrentTable"
    />
  </div>
</template>

<style scoped>
.tabs-navigation {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8f8f8;
  border-radius: 8px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 500;
  background-color: #f1f1f1;
  color: #333;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-button:hover {
  background-color: #ffe3d1;
  color: #FF5F01;
}

.tab-button.active {
  background-color: #FF5F01;
  color: white;
  border: 2px solid #FF5F01;
  box-shadow: 0 4px 10px rgba(255, 95, 1, 0.25);
}

.tab-button i {
  font-size: 1rem;
}
</style>
