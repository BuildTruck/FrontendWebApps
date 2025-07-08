<script>
import AppTable from '../../../core/components/AppTable.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import ExportButton from '../../../core/exports/components/ExportButton.vue'
import { materialsApiService } from '../services/materials-api.service.js'
import { MaterialEntity } from '../models/materials.entity.js'
import { MaterialEntryEntity } from '../models/material-entries.entity.js'
import { MaterialUsageEntity } from '../models/material-usages.entity.js'
import { personnelService } from '../../personnel/services/personnel-api.service.js'
import 'primeicons/primeicons.css'

export default {
  name: 'MaterialsBusinessman',
  components: {
    AppTable,
    AppNotification,
    ExportButton
  },
  data() {
    return {
      currentView: 'inventory',
      inventory: [],
      entries: [],
      usages: [],
      materials: [],
      workers: [],
      loading: false,
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success'
    };
  },

  computed: {
    // Pestañas de navegación
    tabs() {
      return [
        {
          key: 'inventory',
          label: this.$t('inventory.inventory', 'Inventory'),
          icon: 'pi pi-box'
        },
        {
          key: 'entries',
          label: this.$t('inventory.entries', 'Entries'),
          icon: 'pi pi-arrow-down'
        },
        {
          key: 'usages',
          label: this.$t('inventory.usages', 'Usages'),
          icon: 'pi pi-arrow-up'
        }
      ];
    },

    // Estadísticas por vista
    currentStats() {
      switch(this.currentView) {
        case 'inventory':
          return {
            total: this.inventory.length,
            lowStock: this.inventory.filter(item =>
                item.stockActual <= item.minimumStock && item.minimumStock > 0
            ).length,
            totalValue: this.inventory.reduce((sum, item) => sum + (item.total || 0), 0),
            activeSuppliers: new Set(this.inventory.map(item => item.provider).filter(Boolean)).size
          };
        case 'entries':
          const totalEntries = this.entries.length;
          const totalAmount = this.entries.reduce((sum, entry) =>
              sum + (entry.quantity * (entry.unitCost || 0)), 0
          );
          const pendingEntries = this.entries.filter(entry =>
              entry.status?.toLowerCase().includes('pendiente') ||
              entry.status?.toLowerCase().includes('pending')
          ).length;
          const confirmedEntries = this.entries.filter(entry =>
              entry.status?.toLowerCase().includes('confirmado') ||
              entry.status?.toLowerCase().includes('confirmed')
          ).length;
          return {
            total: totalEntries,
            totalAmount,
            pending: pendingEntries,
            confirmed: confirmedEntries
          };
        case 'usages':
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
        default:
          return {};
      }
    },

    // Datos actuales según la vista
    currentData() {
      switch(this.currentView) {
        case 'inventory':
          return this.inventory;
        case 'entries':
          return this.entries.map(entry => ({
            ...entry,
            date: this.formatDate(entry.date)
          }));
        case 'usages':
          return this.usages.map(usage => ({
            ...usage,
            date: this.formatDate(usage.date),
            area: usage.area || '-',
            observations: usage.observations || '-'
          }));
        default:
          return [];
      }
    },

    // Título y descripción de la vista actual
    currentViewInfo() {
      switch(this.currentView) {
        case 'inventory':
          return {
            title: this.$t('inventory.inventory'),
            subtitle: this.$t('inventory.viewInventoryOverview'),
            icon: 'pi pi-box'
          };
        case 'entries':
          return {
            title: this.$t('inventory.materialEntries'),
            subtitle: this.$t('inventory.viewEntriesOverview'),
            icon: 'pi pi-arrow-down'
          };
        case 'usages':
          return {
            title: this.$t('inventory.materialUsages'),
            subtitle: this.$t('inventory.viewUsagesOverview'),
            icon: 'pi pi-arrow-up'
          };
        default:
          return {};
      }
    }
  },

  async created() {
    await this.loadAll()
  },

  methods: {
    // Navegación entre pestañas
    setActiveView(viewKey) {
      this.currentView = viewKey;
    },

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
        this.showNotificationMessage('Error al cargar datos', 'error');
      } finally {
        this.loading = false
      }
    },

    getColumns(type) {
      if (type === 'inventory') {
        return [
          { field: 'name', header: this.$t('inventory.name'), sortable: true, style: 'min-width: 200px' },
          { field: 'type', header: this.$t('inventory.type'), sortable: true, style: 'min-width: 150px' },
          { field: 'unit', header: this.$t('inventory.unit'), sortable: true, style: 'width: 100px' },
          { field: 'minimumStock', header: this.$t('inventory.minimumStock'), sortable: true, style: 'width: 120px' },
          { field: 'provider', header: this.$t('inventory.provider'), sortable: true, style: 'min-width: 150px' },
          {
            field: 'totalEntries',
            header: this.$t('inventory.entries'),
            body: row => row.totalEntries || 0,
            sortable: true,
            style: 'width: 100px; text-align: center;'
          },
          {
            field: 'totalUsages',
            header: this.$t('inventory.usages'),
            body: row => row.totalUsages || 0,
            sortable: true,
            style: 'width: 100px; text-align: center;'
          },
          {
            field: 'stockActual',
            header: this.$t('inventory.currentStock'),
            body: row => row.stockActual || 0,
            sortable: true,
            style: 'width: 120px; text-align: center;'
          },
          {
            field: 'unitPrice',
            header: this.$t('inventory.unitPrice'),
            dataType: 'numeric',
            body: row => row.unitPrice && row.unitPrice > 0 ? `S/ ${row.unitPrice.toFixed(2)}` : '-',
            sortable: true,
            style: 'width: 120px'
          },
          {
            field: 'total',
            header: this.$t('inventory.total'),
            dataType: 'numeric',
            body: row => row.total && row.total > 0 ? `S/ ${row.total.toFixed(2)}` : '-',
            sortable: true,
            style: 'width: 120px'
          }
        ]
      }
      if (type === 'entries') {
        return [
          { field: 'date', header: this.$t('inventory.date'), sortable: true, style: 'width: 120px' },
          { field: 'materialName', header: this.$t('inventory.material'), sortable: true, style: 'min-width: 180px' },
          { field: 'quantity', header: this.$t('inventory.quantity'), sortable: true, style: 'width: 100px' },
          {
            field: 'unitCost',
            header: this.$t('inventory.unitPrice'),
            dataType: 'numeric',
            body: row => row.unitCost ? `S/ ${row.unitCost.toFixed(2)}` : '-',
            sortable: true,
            style: 'width: 120px'
          },
          { field: 'provider', header: this.$t('inventory.provider'), sortable: true, style: 'min-width: 150px' },
          { field: 'comprobante', header: this.$t('inventory.documentType'), sortable: true, style: 'width: 120px' },
          { field: 'comprobanteNumber', header: this.$t('inventory.documentNumber'), sortable: true, style: 'width: 130px' },
          {
            field: 'status',
            header: this.$t('inventory.status'),
            body: row => `<div class="status-container-custom">
              <span class="status-badge status-${row.status?.toLowerCase().replace(/\s+/g, '-')}">${row.status}</span>
            </div>`,
            sortable: true,
            style: 'width: 120px; text-align: center;'
          },
          { field: 'ruc', header: this.$t('inventory.ruc'), sortable: true, style: 'width: 120px' },
          { field: 'payment', header: this.$t('inventory.paymentMethod'), sortable: true, style: 'width: 120px' }
        ]
      }
      if (type === 'usages') {
        return [
          { field: 'date', header: this.$t('inventory.date'), sortable: true, style: 'width: 120px' },
          { field: 'materialName', header: this.$t('inventory.material'), sortable: true, style: 'min-width: 180px' },
          { field: 'quantity', header: this.$t('inventory.usedQuantity'), sortable: true, style: 'width: 120px' },
          { field: 'area', header: this.$t('inventory.area'), sortable: true, style: 'min-width: 130px' },
          { field: 'workerName', header: this.$t('inventory.worker'), sortable: true, style: 'min-width: 150px' },
          { field: 'usageType', header: this.$t('inventory.usageType'), sortable: true, style: 'width: 130px' },
          { field: 'observations', header: this.$t('inventory.observations'), sortable: false, style: 'min-width: 150px' }
        ]
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
    },

    getToday() {
      return new Date().toISOString().split('T')[0];
    }
  }
}
</script>

<template>
  <div class="materials-businessman">
    <!-- Header con título y navegación -->
    <div class="businessman-header">
      <!-- Contenido del header -->
      <div class="header-content">
        <h1 class="businessman-title">
          <i :class="currentViewInfo.icon"></i>
          {{ currentViewInfo.title }}
        </h1>
        <p class="businessman-subtitle">
          {{ currentViewInfo.subtitle }}
        </p>
      </div>

      <!-- Navegación de pestañas -->
      <nav class="tabs-navigation">
        <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-button"
            :class="{ 'active': currentView === tab.key }"
            @click="setActiveView(tab.key)"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </div>

    <!-- Contenido principal -->
    <div class="businessman-content">
      <!-- Estadísticas -->
      <div class="businessman-stats">
        <!-- Estadísticas de Inventario -->
        <template v-if="currentView === 'inventory'">
          <div class="stat-card total">
            <div class="stat-content">
              <div class="stat-number">{{ currentStats.total }}</div>
              <div class="stat-label">{{ $t('inventory.totalMaterials', 'Total Materials') }}</div>
            </div>
            <i class="pi pi-box stat-icon"></i>
          </div>

          <div class="stat-card warning">
            <div class="stat-content">
              <div class="stat-number">{{ currentStats.lowStock }}</div>
              <div class="stat-label">{{ $t('inventory.lowStock', 'Low Stock') }}</div>
            </div>
            <i class="pi pi-exclamation-triangle stat-icon"></i>
          </div>

          <div class="stat-card value">
            <div class="stat-content">
              <div class="stat-number">S/ {{ currentStats.totalValue.toFixed(2) }}</div>
              <div class="stat-label">{{ $t('inventory.totalValue', 'Total Value') }}</div>
            </div>
            <i class="pi pi-dollar stat-icon"></i>
          </div>

          <div class="stat-card suppliers">
            <div class="stat-content">
              <div class="stat-number">{{ currentStats.activeSuppliers }}</div>
              <div class="stat-label">{{ $t('inventory.suppliers', 'Suppliers') }}</div>
            </div>
            <i class="pi pi-users stat-icon"></i>
          </div>
        </template>

        <!-- Estadísticas de Entradas -->
        <template v-else-if="currentView === 'entries'">
          <div class="stat-card total">
            <div class="stat-content">
              <div class="stat-number">{{ currentStats.total }}</div>
              <div class="stat-label">{{ $t('inventory.totalEntries', 'Total Entries') }}</div>
            </div>
            <i class="pi pi-list stat-icon"></i>
          </div>

          <div class="stat-card pending">
            <div class="stat-content">
              <div class="stat-number">{{ currentStats.pending }}</div>
              <div class="stat-label">{{ $t('inventory.pendingEntries', 'Pending') }}</div>
            </div>
            <i class="pi pi-clock stat-icon"></i>
          </div>

          <div class="stat-card confirmed">
            <div class="stat-content">
              <div class="stat-number">{{ currentStats.confirmed }}</div>
              <div class="stat-label">{{ $t('inventory.confirmedEntries', 'Confirmed') }}</div>
            </div>
            <i class="pi pi-check-circle stat-icon"></i>
          </div>

          <div class="stat-card amount">
            <div class="stat-content">
              <div class="stat-number">S/ {{ currentStats.totalAmount.toFixed(2) }}</div>
              <div class="stat-label">{{ $t('inventory.totalAmount', 'Total Amount') }}</div>
            </div>
            <i class="pi pi-dollar stat-icon"></i>
          </div>
        </template>

        <!-- Estadísticas de Usos -->
        <template v-else-if="currentView === 'usages'">
          <div class="stat-card total">
            <div class="stat-content">
              <div class="stat-number">{{ currentStats.total }}</div>
              <div class="stat-label">{{ $t('inventory.totalUsages', 'Total Usages') }}</div>
            </div>
            <i class="pi pi-list stat-icon"></i>
          </div>

          <div class="stat-card quantity">
            <div class="stat-content">
              <div class="stat-number">{{ currentStats.totalQuantity }}</div>
              <div class="stat-label">{{ $t('inventory.totalQuantityUsed', 'Total Quantity') }}</div>
            </div>
            <i class="pi pi-box stat-icon"></i>
          </div>

          <div class="stat-card areas">
            <div class="stat-content">
              <div class="stat-number">{{ currentStats.uniqueAreas }}</div>
              <div class="stat-label">{{ $t('inventory.activeAreas', 'Active Areas') }}</div>
            </div>
            <i class="pi pi-map stat-icon"></i>
          </div>

          <div class="stat-card workers">
            <div class="stat-content">
              <div class="stat-number">{{ currentStats.activeWorkers }}</div>
              <div class="stat-label">{{ $t('inventory.activeWorkers', 'Active Workers') }}</div>
            </div>
            <i class="pi pi-users stat-icon"></i>
          </div>
        </template>
      </div>

      <!-- Controles -->
      <div class="businessman-controls">
        <ExportButton
            :data="currentData"
            :type="`material-${currentView}`"
            :formats="['excel', 'pdf', 'csv']"
            :button-label="$t('exports.export', 'Export')"
            variant="secondary"
            @export-complete="onExportComplete"
        />
      </div>

      <!-- Tabla -->
      <div class="businessman-table">
        <AppTable
            :columns="getColumns(currentView)"
            :data="currentData"
            :loading="loading"
            :paginator="true"
            :rows="15"
            :show-export-button="false"
            :show-filter-button="true"
            :show-add-button="false"
            :selectable="false"
            class="businessman-data-table"
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
.materials-businessman {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  overflow: hidden;
}

/* ========== HEADER ========== */
.businessman-header {
  background: white;
  color: #333;
  padding: 1.5rem 2rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  border-bottom: 1px solid #e9ecef;
}

.businessman-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 95, 1, 0.02) 50%, transparent 70%);
  pointer-events: none;
}

.header-content {
  margin-bottom: 1rem;
}

.businessman-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #333;
}

.businessman-title i {
  font-size: 1.5rem;
  color: #FF5F01;
}

.businessman-subtitle {
  margin: 0;
  font-size: 1rem;
  opacity: 0.8;
  font-weight: 400;
  color: #666;
}

/* ========== TABS NAVIGATION ========== */
.tabs-navigation {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 1rem;
  position: relative;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8f9fa;
  padding: 0.625rem 1.25rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  color: #666;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.tab-button:hover {
  background-color: rgba(255, 95, 1, 0.1);
  color: #FF5F01;
  border-color: #FF5F01;
  transform: translateY(-2px);
}

.tab-button.active {
  background-color: #FF5F01;
  color: white;
  border-color: #FF5F01;
  box-shadow: 0 4px 12px rgba(255, 95, 1, 0.3);
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1.125rem;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #FF5F01;
}

.tab-button i {
  font-size: 1rem;
}

/* ========== CONTENT ========== */
.businessman-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 2rem;
  gap: 2rem;
}

/* ========== ESTADÍSTICAS ========== */
.businessman-stats {
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
.stat-card.warning { --stat-color: #f59e0b; }
.stat-card.value { --stat-color: #10b981; }
.stat-card.suppliers { --stat-color: #8b5cf6; }
.stat-card.pending { --stat-color: #f59e0b; }
.stat-card.confirmed { --stat-color: #10b981; }
.stat-card.amount { --stat-color: #8b5cf6; }
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

/* ========== CONTROLS ========== */
.businessman-controls {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* ========== TABLA ========== */
.businessman-table {
  flex: 1;
  overflow: hidden;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
}

.businessman-data-table {
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}

/* ========== STATUS BADGES ========== */
:deep(.status-badge) {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
  text-align: center;
  min-width: 80px;
}

:deep(.status-badge.status-pendiente),
:deep(.status-badge.status-pending) {
  background-color: #fef3c7 !important;
  color: #92400e !important;
  border: 1px solid #fbbf24 !important;
}

:deep(.status-badge.status-confirmado),
:deep(.status-badge.status-confirmed) {
  background-color: #d1fae5 !important;
  color: #065f46 !important;
  border: 1px solid #10b981 !important;
}

:deep(.status-badge.status-cancelado),
:deep(.status-badge.status-cancelled) {
  background-color: #fee2e2 !important;
  color: #991b1b !important;
  border: 1px solid #ef4444 !important;
}

:deep(.status-badge.status-en-proceso),
:deep(.status-badge.status-in-process) {
  background-color: #dbeafe !important;
  color: #1d4ed8 !important;
  border: 1px solid #3b82f6 !important;
}

:deep(.status-badge.status-completado),
:deep(.status-badge.status-completed) {
  background-color: #f3e8ff !important;
  color: #6b21a8 !important;
  border: 1px solid #8b5cf6 !important;
}

:deep(.status-badge.status-unknown) {
  background-color: #f3f4f6 !important;
  color: #374151 !important;
  border: 1px solid #9ca3af !important;
}

/* ========== HOVER EFFECTS ========== */
:deep(.businessman-data-table .p-datatable-tbody > tr:hover) {
  background-color: rgba(255, 95, 1, 0.05) !important;
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.businessman-data-table .p-datatable-tbody > tr) {
  transition: all 0.2s ease;
}

/* ========== RESPONSIVE ========== */
@media (max-width: 768px) {
  .businessman-header {
    padding: 1rem;
  }

  .businessman-title {
    font-size: 1.5rem;
    text-align: center;
    flex-direction: column;
    gap: 0.5rem;
  }

  .businessman-subtitle {
    text-align: center;
    font-size: 0.875rem;
  }

  .tabs-navigation {
    flex-direction: column;
    gap: 0.25rem;
  }

  .tab-button {
    justify-content: center;
    padding: 0.5rem 1rem;
  }

  .tab-button.active::after {
    display: none;
  }

  .businessman-content {
    padding: 1rem;
    gap: 1rem;
  }

  .businessman-stats {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  .businessman-controls {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .businessman-header {
    padding: 0.75rem;
  }

  .businessman-title {
    font-size: 1.25rem;
  }

  .businessman-subtitle {
    font-size: 0.8rem;
  }

  .tab-button {
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
  }

  .tab-button i {
    font-size: 0.875rem;
  }

  .businessman-content {
    padding: 0.75rem;
  }

  .businessman-stats {
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

/* ========== FOCUS ACCESSIBILITY ========== */
.tab-button:focus {
  outline: 2px solid rgba(255, 95, 1, 0.5);
  outline-offset: 2px;
}

/* ========== ADDITIONAL VISUAL ENHANCEMENTS ========== */
.tab-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 95, 1, 0.2), transparent);
  transition: left 0.5s;
}

.tab-button:hover::before {
  left: 100%;
}

/* ========== LOADING STATES ========== */
.businessman-data-table.loading {
  opacity: 0.7;
  pointer-events: none;
}

/* ========== TABLE ENHANCEMENTS ========== */
:deep(.businessman-data-table .p-datatable-header) {
  background: #f8f9fa;
  border-bottom: 2px solid #FF5F01;
}

:deep(.businessman-data-table .p-column-header-content) {
  font-weight: 600;
  color: #333;
}

:deep(.businessman-data-table .p-datatable-tbody > tr:nth-child(even)) {
  background-color: #fafafa;
}

/* ========== STATUS BADGE ANIMATIONS ========== */
:deep(.status-badge) {
  transition: all 0.2s ease;
}

:deep(.status-badge:hover) {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* ========== DARK MODE SUPPORT ========== */
@media (prefers-color-scheme: dark) {
  .materials-businessman {
    background-color: #1a1a1a;
  }

  .businessman-header {
    background: #2d2d2d;
    color: #e5e5e5;
    border-bottom-color: #404040;
  }

  .businessman-title {
    color: #e5e5e5;
  }

  .businessman-subtitle {
    color: #b3b3b3;
  }

  .tab-button {
    background-color: #3a3a3a;
    border-color: #505050;
    color: #b3b3b3;
  }

  .tab-button:hover {
    background-color: rgba(255, 95, 1, 0.2);
    border-color: #FF5F01;
  }

  .tab-button.active {
    background-color: #FF5F01;
    color: white;
  }

  .stat-card {
    background: #2d2d2d;
    border-left-color: var(--stat-color, #3b82f6);
  }

  .stat-number {
    color: var(--stat-color, #e5e5e5);
  }

  .stat-label {
    color: #b3b3b3;
  }

  .businessman-table {
    background: #2d2d2d;
    border-color: #404040;
  }
}
</style>