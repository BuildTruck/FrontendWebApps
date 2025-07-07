<script>
import AppTable from '../../../core/components/AppTable.vue'
import { materialsApiService } from '../services/materials-api.service.js'
import { MaterialEntity } from '../models/materials.entity.js'
import { MaterialEntryEntity } from '../models/material-entries.entity.js'
import { MaterialUsageEntity } from '../models/material-usages.entity.js'
import { personnelService } from '../../personnel/services/personnel-api.service.js'
import 'primeicons/primeicons.css'

export default {
  name: 'MaterialsBusinessman',
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

  computed: {
    tabs() {
      return [
        { key: 'inventory', label: this.$t('inventory.inventory'), icon: 'pi pi-box' },
        { key: 'entries', label: this.$t('inventory.entries'), icon: 'pi pi-download' },
        { key: 'usages', label: this.$t('inventory.usages'), icon: 'pi pi-upload' }
      ];
    }
  },

  async created() {
    await this.loadAll()
  },

  methods: {
    async loadAll() {
      try {
        this.loading = true
        const projectId = materialsApiService.getCurrentProjectIdSync()

        // ✅ Cargar materiales y workers
        this.materials = await materialsApiService.getByProject(projectId)
        this.workers = await personnelService.getByProject(projectId)

        // ✅ Cargar inventario con mapeo de labels
        const rawInventory = await materialsApiService.getInventorySummary(projectId)
        this.inventory = rawInventory.map(item => {
          const typeObj = MaterialEntity.TYPES.find(t => t.value === item.type);
          const typeLabel = typeObj ? typeObj.label : item.type?.toLowerCase() || '';

          const unitObj = MaterialEntity.UNITS.find(u => u.value === item.unit);
          const unitLabel = unitObj ? unitObj.label : item.unit?.toLowerCase() || '';

          return {
            ...item,
            type: typeLabel,
            unit: unitLabel
          };
        });

        // ✅ Cargar entradas con mapeo de labels
        const rawEntries = await materialsApiService.getEntriesByProject(projectId)
        this.entries = rawEntries.map(entry => {
          const material = this.materials.find(m => m.id === entry.materialId);

          const paymentObj = MaterialEntryEntity.PAYMENT_METHODS.find(p => p.value === entry.payment);
          const paymentLabel = paymentObj ? paymentObj.label : entry.payment?.toLowerCase() || '';

          const comprobanteObj = MaterialEntryEntity.COMPROBANTE_TYPES.find(c => c.value === entry.comprobante);
          const comprobanteLabel = comprobanteObj ? comprobanteObj.label : entry.comprobante?.toLowerCase() || '';

          const statusObj = MaterialEntryEntity.STATUSES.find(s => s.value === entry.status);
          const statusLabel = statusObj ? statusObj.label : entry.status?.toLowerCase() || '';

          return {
            ...entry,
            materialName: material?.name || 'Desconocido',
            payment: paymentLabel,
            comprobante: comprobanteLabel,
            status: statusLabel
          };
        });

        // ✅ Cargar usos con mapeo de labels
        const rawUsages = await materialsApiService.getUsagesByProject(projectId)
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
        console.error('Error al cargar datos:', error);
      } finally {
        this.loading = false
      }
    },

    getColumns(type) {
      if (type === 'inventory') {
        return [
          { field: 'name', header: this.$t('inventory.name') },
          { field: 'type', header: this.$t('inventory.type') },
          { field: 'unit', header: this.$t('inventory.unit') },
          { field: 'minimumStock', header: this.$t('inventory.minimumStock') },
          { field: 'provider', header: this.$t('inventory.provider') },
          {
            field: 'totalEntries',
            header: this.$t('inventory.entries'),
            body: row => row.totalEntries || 0
          },
          {
            field: 'totalUsages',
            header: this.$t('inventory.usages'),
            body: row => row.totalUsages || 0
          },
          {
            field: 'stockActual',
            header: this.$t('inventory.currentStock'),
            body: row => row.stockActual || 0
          },
          {
            field: 'unitPrice',
            header: this.$t('inventory.unitPrice'),
            dataType: 'numeric',
            body: row => row.unitPrice && row.unitPrice > 0 ? `S/ ${row.unitPrice.toFixed(2)}` : '-'
          },
          {
            field: 'total',
            header: this.$t('inventory.total'),
            dataType: 'numeric',
            body: row => row.total && row.total > 0 ? `S/ ${row.total.toFixed(2)}` : '-'
          }
        ]
      }
      if (type === 'entries') {
        return [
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
          {
            field: 'status',
            header: this.$t('inventory.status'),
            body: row => `<div class="status-container-custom">
            <span class="status-badge status-${row.status?.toLowerCase().replace(/\s+/g, '-')}">${row.status}</span>
            </div>`
          },
          { field: 'ruc', header: this.$t('inventory.ruc') },
          { field: 'payment', header: this.$t('inventory.paymentMethod') },
          { field: 'observations', header: this.$t('inventory.observations') }
        ]
      }
      if (type === 'usages') {
        return [
          { field: 'date', header: this.$t('inventory.date') },
          { field: 'materialName', header: this.$t('inventory.material') },
          { field: 'quantity', header: this.$t('inventory.usedQuantity') },
          { field: 'area', header: this.$t('inventory.area') },
          { field: 'workerName', header: this.$t('inventory.worker') },
          { field: 'usageType', header: this.$t('inventory.usageType') },
          { field: 'observations', header: this.$t('inventory.observations') }
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
      // ✅ Importar dinámicamente para evitar errores
      const XLSX = await import('xlsx');

      const exportData = data.map(item => ({
        'Nombre': item.name,
        'Tipo': item.type,
        'Unidad': item.unit,
        'Stock Mínimo': item.minimumStock,
        'Proveedor': item.provider,
        'Entradas': item.totalEntries || 0,
        'Usos': item.totalUsages || 0,
        'Stock Actual': item.stockActual,
        'Precio Unitario (S/)': item.unitPrice || 0,
        'Total (S/)': item.total || 0
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      XLSX.writeFile(wb, `${fileName}_${this.getToday()}.xlsx`);
    },

    async exportEntriesToExcel(data, fileName = 'Entradas') {
      const XLSX = await import('xlsx');

      const exportData = data.map(entry => ({
        'Fecha': entry.date,
        'Material': entry.materialName,
        'Cantidad': entry.quantity,
        'Precio Unitario (S/)': entry.unitCost || 0,
        'Proveedor': entry.provider,
        'Comprobante': entry.comprobante,
        'N° Comprobante': entry.comprobanteNumber,
        'Estado': entry.status,
        'RUC': entry.ruc,
        'Método de Pago': entry.payment,
        'Observaciones': entry.observations
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Entradas');
      XLSX.writeFile(wb, `${fileName}_${this.getToday()}.xlsx`);
    },

    async exportUsagesToExcel(data, fileName = 'Usos') {
      const XLSX = await import('xlsx');

      const exportData = data.map(usage => ({
        'Fecha': usage.date,
        'Material': usage.materialName,
        'Cantidad Usada': usage.quantity,
        'Área': usage.area,
        'Trabajador': usage.workerName,
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
  <div class="inventory-businessman-tabs">
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

    <!-- Tabla de datos - SOLO LECTURA -->
    <AppTable
        :columns="getColumns(selectedTab)"
        :data="selectedTab === 'inventory' ? inventory : selectedTab === 'entries' ? entries : usages"
        :loading="loading"
        :paginator="true"
        :rows="10"
        :show-export-button="true"
        :show-filter-button="true"
        :show-add-button="false"
        :selectable="false"
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

/* ========================================
   STATUS BADGES - ESTADOS PINTADOS
   ======================================== */

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  text-align: center;
  min-width: 80px;
}

/* Pendiente - Amarillo */
.status-badge.status-pendiente,
.status-badge.status-pending {
  background-color: #fef3c7 !important;
  color: #92400e !important;
  border: 1px solid #fbbf24 !important;
}

/* Confirmado - Verde */
.status-badge.status-confirmado,
.status-badge.status-confirmed {
  background-color: #d1fae5 !important;
  color: #065f46 !important;
  border: 1px solid #10b981 !important;
}

/* Cancelado - Rojo */
.status-badge.status-cancelado,
.status-badge.status-cancelled {
  background-color: #fee2e2 !important;
  color: #991b1b !important;
  border: 1px solid #ef4444 !important;
}

/* En Proceso - Azul */
.status-badge.status-en-proceso,
.status-badge.status-in-process,
.status-badge.status-inprocess {
  background-color: #dbeafe !important;
  color: #1d4ed8 !important;
  border: 1px solid #3b82f6 !important;
}

/* Completado - Morado */
.status-badge.status-completado,
.status-badge.status-completed {
  background-color: #f3e8ff !important;
  color: #6b21a8 !important;
  border: 1px solid #8b5cf6 !important;
}

/* Estado desconocido - Gris */
.status-badge.status-unknown {
  background-color: #f3f4f6 !important;
  color: #374151 !important;
  border: 1px solid #9ca3af !important;
}
</style>