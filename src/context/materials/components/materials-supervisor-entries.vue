<script>
import AppTable from '../../../core/components/AppTable.vue';
import MaterialsForm from './materials-form.vue';
import { materialsApiService } from '../services/materials-api.service.js';
import { MaterialEntryEntity } from '../models/material-entries.entity.js';

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
    };
  },
  async created() {
    await this.loadMaterials();
    await this.loadEntries();
  },
  methods: {
    async loadMaterials() {
      const projectId = materialsApiService.getCurrentProjectIdSync();
      this.materials = await materialsApiService.getByProject(projectId);
    },
    formatStatus(status) {
      const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
      return `<span class="status-badge status-${normalizedStatus}">${status}</span>`;
    },

    async loadEntries() {
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

    cancelForm() {
      this.showForm = false;
      this.isEditingEntry = false;
    },

    async handleConfirm(data) {
      try {
        const projectId = materialsApiService.getCurrentProjectIdSync();

        const materialIdToFind = parseInt(data.id);
        const material = this.materials.find(m => parseInt(m.id) === materialIdToFind);

        if (!material) {
          alert('Material no encontrado. Verifica la selección.');
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
        } else {
          await materialsApiService.createEntry(entryPayload);
        }

        this.showForm = false;
        this.isEditingEntry = false;
        await this.loadEntries();
        this.$emit('updated', 'Ingreso guardado correctamente');

      } catch (error) {
        alert(`Error al guardar entrada: ${error.response?.data?.message || error.message}`);
      }
    },

    async handleDelete(selected) {
      if (!window.confirm(`¿Eliminar ${selected.length} ingreso(s)?`)) return;

      for (const entry of selected) {
        const index = this.entries.findIndex(e => e.id === entry.id);
        if (index !== -1) this.entries.splice(index, 1);
      }

      this.selection = [];
    }
  }
};
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

<style scoped>
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

/* ✅ USAR !important PARA FORZAR LOS ESTILOS */

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

/* ========================================
   ESTILOS GENERALES DEL COMPONENTE
   ======================================== */

/* Contenedor principal */
.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Espaciado y layout */
.p-4 {
  padding: 1rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.gap-4 {
  gap: 1rem;
}

.flex {
  display: flex;
}

.justify-end {
  justify-content: flex-end;
}

.mt-4 {
  margin-top: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}

/* ========================================
   ESTILOS RESPONSIVOS
   ======================================== */

@media (max-width: 768px) {
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }

  .status-badge {
    min-width: 60px;
    font-size: 11px;
    padding: 3px 8px;
  }
}

@media (max-width: 480px) {
  .p-4 {
    padding: 0.75rem;
  }

  .gap-4 {
    gap: 0.75rem;
  }

  .status-badge {
    min-width: 50px;
    font-size: 10px;
    padding: 2px 6px;
  }
}

/* ========================================
   ESTADOS DE HOVER Y FOCUS
   ======================================== */

.status-badge {
  transition: all 0.2s ease;
}

.status-badge:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* ========================================
   ACCESIBILIDAD
   ======================================== */

.status-badge {
  cursor: default;
  user-select: none;
}

/* Mejora de contraste para lectores de pantalla */
.status-badge::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  border-radius: inherit;
}

/* ========================================
   UTILIDADES ADICIONALES
   ======================================== */

/* Animaciones suaves */
@keyframes statusFadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.status-badge {
  animation: statusFadeIn 0.3s ease-out;
}

/* Estados especiales */
.status-badge.loading {
  background-color: #f3f4f6 !important;
  color: #9ca3af !important;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Variaciones de tamaño */
.status-badge.small {
  padding: 2px 8px;
  font-size: 10px;
  min-width: 60px;
}

.status-badge.large {
  padding: 6px 16px;
  font-size: 14px;
  min-width: 100px;
}

/* ========================================
   DARK MODE SUPPORT (OPCIONAL)
   ======================================== */

@media (prefers-color-scheme: dark) {
  .card {
    background-color: #1f2937;
    color: #f9fafb;
  }

  .status-badge.status-pendiente,
  .status-badge.status-pending {
    background-color: #451a03 !important;
    color: #fbbf24 !important;
  }

  .status-badge.status-confirmado,
  .status-badge.status-confirmed {
    background-color: #064e3b !important;
    color: #10b981 !important;
  }

  .status-badge.status-cancelado,
  .status-badge.status-cancelled {
    background-color: #7f1d1d !important;
    color: #ef4444 !important;
  }

  .status-badge.status-en-proceso,
  .status-badge.status-in-process,
  .status-badge.status-inprocess {
    background-color: #1e3a8a !important;
    color: #3b82f6 !important;
  }

  .status-badge.status-completado,
  .status-badge.status-completed {
    background-color: #581c87 !important;
    color: #8b5cf6 !important;
  }
}
</style>