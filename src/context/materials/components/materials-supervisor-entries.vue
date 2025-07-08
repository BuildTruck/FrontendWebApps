<script>
import AppTable from '../../../core/components/AppTable.vue';
import AppButton from '../../../core/components/AppButton.vue';
import AppNotification from '../../../core/components/AppNotification.vue';
import MaterialsForm from './materials-form.vue';
import ExportButton from '../../../core/exports/components/ExportButton.vue';
import { materialsApiService } from '../services/materials-api.service.js';
import { MaterialEntryEntity } from '../models/material-entries.entity.js';

export default {
  name: 'MaterialsSupervisorEntries',
  components: {
    AppTable,
    AppButton,
    AppNotification,
    MaterialsForm,
    ExportButton
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
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',
      columns: [
        { field: 'date', header: this.$t('inventory.date', 'Date'), sortable: true, style: 'width: 120px' },
        { field: 'materialName', header: this.$t('inventory.material', 'Material'), sortable: true, style: 'min-width: 180px' },
        { field: 'quantity', header: this.$t('inventory.quantity', 'Quantity'), sortable: true, style: 'width: 100px' },
        {
          field: 'unitCost',
          header: this.$t('inventory.unitPrice', 'Unit Price'),
          dataType: 'numeric',
          body: row => row.unitCost ? `S/ ${row.unitCost.toFixed(2)}` : '-',
          sortable: true,
          style: 'width: 120px'
        },
        { field: 'provider', header: this.$t('inventory.provider', 'Provider'), sortable: true, style: 'min-width: 150px' },
        { field: 'comprobante', header: this.$t('inventory.documentType', 'Document'), sortable: true, style: 'width: 120px' },
        { field: 'comprobanteNumber', header: this.$t('inventory.documentNumber', 'Doc Number'), sortable: true, style: 'width: 130px' },
        {
          field: 'status',
          header: this.$t('inventory.status', 'Status'),
          body: row => `<div class="status-container-custom">
            <span class="status-badge status-${row.status?.toLowerCase().replace(/\s+/g, '-')}">${row.status}</span>
          </div>`,
          sortable: true,
          style: 'width: 120px; text-align: center;'
        },
        { field: 'ruc', header: this.$t('inventory.ruc', 'RUC'), sortable: true, style: 'width: 120px' },
        { field: 'payment', header: this.$t('inventory.paymentMethod', 'Payment'), sortable: true, style: 'width: 120px' }
      ]
    };
  },

  computed: {
    // Estadísticas de entradas
    entriesStats() {
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
    },

    // Datos filtrados para la tabla con mejor formato
    formattedEntries() {
      return this.entries.map(entry => ({
        ...entry,
        date: this.formatDate(entry.date),
        totalCost: entry.quantity * (entry.unitCost || 0)
      }));
    }
  },

  async created() {
    await this.loadMaterials();
    await this.loadEntries();
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

    async loadEntries() {
      try {
        this.loading = true;
        const projectId = materialsApiService.getCurrentProjectIdSync();
        const rawEntries = await materialsApiService.getEntriesByProject(projectId);

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
      } catch (error) {
        console.error('Error loading entries:', error);
        this.showNotificationMessage('Error al cargar entradas', 'error');
      } finally {
        this.loading = false;
      }
    },

    handleAdd() {
      this.selectedEntry = null;
      this.isEditingEntry = false;
      this.showForm = true;
    },

    handleRowClick({ data }) {
      const material = this.materials.find(m => m.id === data.materialId);

      const paymentValue = MaterialEntryEntity.PAYMENT_METHODS.find(p => p.label === data.payment)?.value || data.payment;
      const comprobanteValue = MaterialEntryEntity.COMPROBANTE_TYPES.find(c => c.label === data.comprobante)?.value || data.comprobante;
      const statusValue = MaterialEntryEntity.STATUSES.find(s => s.label === data.status)?.value || data.status;

      this.selectedEntry = {
        entryId: data.id,
        id: material?.id,
        quantity: data.quantity,
        date: data.date,
        provider: data.provider,
        comprobante: comprobanteValue,
        comprobanteNumber: data.comprobanteNumber,
        ruc: data.ruc,
        payment: paymentValue,
        price: data.unitCost,
        description: data.observations,
        status: statusValue
      };

      this.isEditingEntry = true;
      this.showForm = true;
    },

    backToList() {
      this.showForm = false;
      this.isEditingEntry = false;
      this.selectedEntry = null;
    },

    async handleConfirm(data) {
      try {
        const projectId = materialsApiService.getCurrentProjectIdSync();

        const materialIdToFind = parseInt(data.id);
        const material = this.materials.find(m => parseInt(m.id) === materialIdToFind);

        if (!material) {
          this.showNotificationMessage('Material no encontrado. Verifica la selección.', 'error');
          return;
        }

        const entryPayload = {
          id: this.isEditingEntry ? data.entryId : 'e' + Date.now(),
          materialId: parseInt(material.id),
          projectId: parseInt(projectId),
          date: data.date,
          quantity: Number(data.quantity),
          provider: data.provider,
          comprobante: data.comprobante,
          comprobanteNumber: data.comprobanteNumber,
          ruc: data.ruc,
          payment: data.payment,
          unitCost: Number(data.price),
          totalCost: Number(data.quantity) * Number(data.price),
          observations: data.description,
          status: data.status || 'Pendiente',
          createdBy: JSON.parse(sessionStorage.getItem('user')).id
        };

        if (this.isEditingEntry) {
          await materialsApiService.updateEntry(entryPayload.id, entryPayload);
          this.showNotificationMessage('Entrada actualizada correctamente', 'success');
        } else {
          await materialsApiService.createEntry(entryPayload);
          this.showNotificationMessage('Entrada creada correctamente', 'success');
        }

        this.showForm = false;
        this.isEditingEntry = false;
        await this.loadEntries();
        this.$emit('updated', 'Ingreso guardado correctamente');

      } catch (error) {
        console.error('Error saving entry:', error);
        this.showNotificationMessage(
            `Error al guardar entrada: ${error.response?.data?.message || error.message}`,
            'error'
        );
      }
    },

    async handleDelete(selected) {
      if (!window.confirm(`¿Eliminar ${selected.length} entrada(s)?`)) return;

      try {
        for (const entry of selected) {
          const index = this.entries.findIndex(e => e.id === entry.id);
          if (index !== -1) this.entries.splice(index, 1);
        }

        this.selection = [];
        this.showNotificationMessage('Entradas eliminadas correctamente', 'success');
      } catch (error) {
        console.error('Error deleting entries:', error);
        this.showNotificationMessage('Error al eliminar entradas', 'error');
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
  <div class="entries-supervisor">
    <!-- Vista de Formulario -->
    <div v-if="showForm" class="form-view">
      <div class="form-header">
        <div class="form-back">
          <AppButton
              icon="pi pi-arrow-left"
              :label="isEditingEntry ? $t('common.back', 'Back') : $t('common.cancel', 'Cancel')"
              variant="secondary"
              @click="backToList"
          />
        </div>

        <div class="form-title-section">
          <h2 class="form-title">
            {{ isEditingEntry
              ? $t('inventory.editEntry', 'Edit Material Entry')
              : $t('inventory.newEntry', 'New Material Entry')
            }}
          </h2>
          <p class="form-subtitle">
            {{ isEditingEntry
              ? $t('inventory.editEntryDescription', 'Modify material entry details')
              : $t('inventory.newEntryDescription', 'Record new material entry')
            }}
          </p>
        </div>
      </div>

      <div class="form-content">
        <MaterialsForm
            :material="selectedEntry || {}"
            :readonly="false"
            :mode="'entry'"
            :allow-editing="true"
            :materials-list="materials"
            @confirm="handleConfirm"
            @cancel="backToList"
        />
      </div>
    </div>

    <!-- Vista de Lista -->
    <div v-else class="list-view">
      <!-- Header con estadísticas -->
      <div class="entries-header">
        <div class="header-content">
          <div class="entries-title-section">
            <h2 class="entries-title">
              <i class="pi pi-arrow-down"></i>
              {{ $t('inventory.materialEntries', 'Material Entries') }}
            </h2>
            <p class="entries-subtitle">
              {{ $t('inventory.manageEntriesDescription', 'Manage and track material entries') }}
            </p>
          </div>

          <!-- Controles -->
          <div class="entries-controls">
            <ExportButton
                :data="formattedEntries"
                type="material-entries"
                :formats="['excel', 'pdf', 'csv']"
                :button-label="$t('exports.export', 'Export')"
                variant="secondary"
                @export-complete="onExportComplete"
            />
          </div>
        </div>

        <!-- Estadísticas -->
        <div class="entries-stats">
          <div class="stat-card total">
            <div class="stat-content">
              <div class="stat-number">{{ entriesStats.total }}</div>
              <div class="stat-label">{{ $t('inventory.totalEntries', 'Total Entries') }}</div>
            </div>
            <i class="pi pi-list stat-icon"></i>
          </div>

          <div class="stat-card pending">
            <div class="stat-content">
              <div class="stat-number">{{ entriesStats.pending }}</div>
              <div class="stat-label">{{ $t('inventory.pendingEntries', 'Pending') }}</div>
            </div>
            <i class="pi pi-clock stat-icon"></i>
          </div>

          <div class="stat-card confirmed">
            <div class="stat-content">
              <div class="stat-number">{{ entriesStats.confirmed }}</div>
              <div class="stat-label">{{ $t('inventory.confirmedEntries', 'Confirmed') }}</div>
            </div>
            <i class="pi pi-check-circle stat-icon"></i>
          </div>

          <div class="stat-card amount">
            <div class="stat-content">
              <div class="stat-number">S/ {{ entriesStats.totalAmount.toFixed(2) }}</div>
              <div class="stat-label">{{ $t('inventory.totalAmount', 'Total Amount') }}</div>
            </div>
            <i class="pi pi-dollar stat-icon"></i>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="entries-table">
        <AppTable
            :columns="columns"
            :data="formattedEntries"
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
            class="entries-data-table"
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
.entries-supervisor {
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

.entries-header {
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

.entries-title-section {
  flex: 1;
}

.entries-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #333;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.entries-title i {
  font-size: 1.5rem;
  color: #FF5F01;
}

.entries-subtitle {
  margin: 0;
  color: #666;
  font-size: 1rem;
}

.entries-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* ========== ESTADÍSTICAS ========== */
.entries-stats {
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
.stat-card.pending { --stat-color: #f59e0b; }
.stat-card.confirmed { --stat-color: #10b981; }
.stat-card.amount { --stat-color: #8b5cf6; }

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
.entries-table {
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

.entries-data-table {
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

/* ========== HOVER EFFECTS ========== */
:deep(.entries-data-table .p-datatable-tbody > tr:hover) {
  background-color: rgba(255, 95, 1, 0.05) !important;
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.entries-data-table .p-datatable-tbody > tr) {
  transition: all 0.2s ease;
}

/* ========== RESPONSIVE ========== */
@media (max-width: 768px) {
  .entries-header {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    margin-bottom: 1rem;
  }

  .entries-title {
    font-size: 1.5rem;
    text-align: center;
  }

  .entries-subtitle {
    text-align: center;
    font-size: 0.875rem;
  }

  .entries-controls {
    justify-content: center;
  }

  .entries-stats {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  .entries-table {
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
  .entries-header {
    padding: 0.75rem;
  }

  .entries-title {
    font-size: 1.25rem;
    flex-direction: column;
    gap: 0.5rem;
  }

  .entries-subtitle {
    font-size: 0.8rem;
  }

  .entries-stats {
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

  .entries-table {
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