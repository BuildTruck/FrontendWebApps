<script>
import AppButton from "../../../core/components/AppButton.vue";
import AppTable from "../../../core/components/AppTable.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import { Personnel } from "../models/personnel.entity.js";
import { PersonnelApiService } from "../services/personnel-api.service.js";

export default {
  name: 'PersonnelInformationSupervisor',
  components: {
    AppButton,
    AppTable,
    AppNotification
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true
    }
  },
  emits: ['personnel-updated', 'edit-personnel', 'add-personnel'],
  data() {
    return {
      // Datos principales
      personnel: [],
      loading: false,

      // Selección múltiple
      selectedPersonnel: [],

      // Notificaciones
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',

      // Servicio
      personnelService: new PersonnelApiService()
    };
  },
  async mounted() {
    await this.loadPersonnel();
  },
  computed: {
    // Mover las columnas a computed para que se actualicen con el idioma
    tableColumns() {
      return [
        { field: 'fullName', header: this.$t('personnel.name'), sortable: true, style: 'min-width: 200px' },
        { field: 'documentNumber', header: this.$t('personnel.documentNumber'), sortable: true, style: 'width: 120px' },
        { field: 'position', header: this.$t('personnel.position'), sortable: true, style: 'min-width: 150px' },
        { field: 'department', header: this.$t('personnel.department'), sortable: true, style: 'width: 120px' },
        { field: 'personnelType', header: this.$t('personnel.personnelType'), sortable: true, style: 'width: 120px' },
        { field: 'monthlyAmount', header: this.$t('personnel.monthlyAmount'), sortable: true, dataType: 'numeric', style: 'width: 130px' },
        { field: 'status', header: this.$t('personnel.status'), sortable: true, style: 'width: 100px' },
        { field: 'startDate', header: this.$t('personnel.startDate'), sortable: true, dataType: 'date', style: 'width: 120px' },
        { field: 'phone', header: this.$t('personnel.phone'), sortable: false, style: 'width: 120px' }
      ];
    },

    formattedPersonnel() {
      return this.formatPersonnelForTable(this.personnel);
    },

    hasSelectedPersonnel() {
      return this.selectedPersonnel.length > 0;
    }
  },
  methods: {
    async loadPersonnel() {
      this.loading = true;
      try {
        this.personnel = await this.personnelService.getByProject(this.projectId);
        this.$emit('personnel-updated', this.personnel);
      } catch (error) {
        console.error('Error al cargar personal:', error);
        this.showNotificationMessage(this.$t('personnel.errorLoading'), 'error');
      } finally {
        this.loading = false;
      }
    },

    handleAddPersonnel() {
      this.$emit('add-personnel');
    },

    handleEditPersonnel(personnel) {
      this.$emit('edit-personnel', personnel);
    },

    async handleDeletePersonnel(personnel) {
      if (!confirm(this.$t('personnel.confirmDelete'))) {
        return;
      }

      try {
        await this.personnelService.delete(personnel.id);
        this.showNotificationMessage(this.$t('personnel.personnelDeleted'), 'success');
        await this.loadPersonnel();
      } catch (error) {
        console.error('Error al eliminar personal:', error);
        this.showNotificationMessage(this.$t('personnel.errorDeleting'), 'error');
      }
    },

    async handleDeleteMultiple() {
      if (!this.selectedPersonnel.length) {
        this.showNotificationMessage(this.$t('personnel.selectToDelete'), 'warning');
        return;
      }

      const count = this.selectedPersonnel.length;
      const message = count === 1
          ? this.$t('personnel.confirmDelete')
          : this.$t('personnel.confirmDeleteMultiple', { count });

      if (!confirm(message)) {
        return;
      }

      try {
        const ids = this.selectedPersonnel.map(p => p.id);
        await this.personnelService.deleteMultiple(ids);
        this.showNotificationMessage(
            this.$t('personnel.multipleDeleted', { count }),
            'success'
        );
        this.selectedPersonnel = [];
        await this.loadPersonnel();
      } catch (error) {
        console.error('Error al eliminar personal:', error);
        this.showNotificationMessage(this.$t('personnel.errorDeleting'), 'error');
      }
    },

    handleRowClick(event) {
      // ✅ CORREGIDO: Abrir edición con click en la fila
      if (event.data && event.data.id) {
        // Encontrar el objeto Personnel original (no el formateado)
        const originalPersonnel = this.personnel.find(p => p.id === event.data.id);
        if (originalPersonnel) {
          this.handleEditPersonnel(originalPersonnel);
        }
      }
    },

    onSelectionChange(selection) {
      this.selectedPersonnel = selection;
    },

    async handleExport(format = 'xlsx') {
      try {
        const fileName = this.$t('personnel.personnelList');
        await this.personnelService.exportToExcel(this.personnel, fileName);
        this.showNotificationMessage(this.$t('personnel.exportSuccess'), 'success');
      } catch (error) {
        console.error('Error al exportar:', error);
        this.showNotificationMessage(this.$t('personnel.exportError'), 'error');
      }
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    },

    // Formatear datos para la tabla - SIN llamar métodos problemáticos
    formatPersonnelForTable(personnelList) {
      return personnelList.map(p => ({
        ...p,
        // Formatear directamente sin usar métodos que causen problemas
        fullName: `${p.name} ${p.lastname}`.trim(),
        personnelType: this.formatPersonnelType(p.personnelType),
        status: this.formatStatus(p.status),
        monthlyAmount: this.formatCurrency(p.monthlyAmount),
        startDate: this.formatDate(p.startDate)
      }));
    },

    // Métodos simples de formateo que NO causan conflicto
    formatPersonnelType(type) {
      const types = {
        'TECHNICAL': this.$t('personnel.typeTechnical'),
        'SPECIALIST': this.$t('personnel.typeSpecialist'),
        'ADMINISTRATIVE': this.$t('personnel.typeAdministrative'),
        'RENTED_OPERATOR': this.$t('personnel.typeRentedOperator'),
        'LABORER': this.$t('personnel.typeLaborer')
      };
      return types[type] || type;
    },

    formatStatus(status) {
      const statuses = {
        'ACTIVE': this.$t('personnel.statusActive'),
        'INACTIVE': this.$t('personnel.statusInactive'),
        'PENDING': this.$t('personnel.statusPending'),
        'SUSPENDED': this.$t('personnel.statusSuspended'),
        'FINISHED': this.$t('personnel.statusFinished')
      };
      return statuses[status] || status;
    },

    formatCurrency(amount) {
      if (!amount && amount !== 0) return '';
      return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
      }).format(amount);
    },

    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }
};
</script>

<template>
  <div class="personnel-information-container">
    <!-- Header con estadísticas y botones -->
    <div class="personnel-header">
      <div class="personnel-stats">
        <div class="stat-card">
          <div class="stat-number">{{ personnel.length }}</div>
          <div class="stat-label">{{ $t('personnel.totalPersonnel') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ personnel.filter(p => p.isActive()).length }}</div>
          <div class="stat-label">{{ $t('personnel.activePersonnel') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ personnel.filter(p => !p.isActive()).length }}</div>
          <div class="stat-label">{{ $t('personnel.inactivePersonnel') }}</div>
        </div>
      </div>

      <div class="personnel-actions">
        <AppButton
            v-if="hasSelectedPersonnel"
            :label="`${$t('personnel.delete')} (${selectedPersonnel.length})`"
            icon="pi pi-trash"
            variant="danger"
            size="small"
            @click="handleDeleteMultiple"
        />
        <AppButton
            :label="$t('personnel.addNew')"
            icon="pi pi-plus"
            variant="primary"
            @click="handleAddPersonnel"
        />
      </div>
    </div>

    <!-- Tabla de personal -->
    <AppTable
        :columns="tableColumns"
        :data="formattedPersonnel"
        :loading="loading"
        :selectable="true"
        v-model:selection="selectedPersonnel"
        :show-export-button="true"
        :show-filter-button="true"
        :paginator="true"
        :rows="15"
        data-key="id"
        @row-click="handleRowClick"
        @update:selection="onSelectionChange"
        @export="handleExport"
        class="personnel-table"
        :row-hover="true"
        selection-mode="multiple"
    />

    <!-- Notificaciones -->
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
.personnel-information-container {
  padding: 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.personnel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.personnel-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 1rem 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #FF5F01;
  min-width: 120px;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #FF5F01;
  line-height: 1;
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.personnel-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.personnel-table {
  flex: 1;
  min-height: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .personnel-information-container {
    padding: 1rem;
  }

  .personnel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .personnel-stats {
    justify-content: center;
  }

  .personnel-actions {
    justify-content: center;
  }

  .stat-card {
    flex: 1;
    min-width: 100px;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .personnel-stats {
    flex-direction: column;
  }

  .stat-card {
    min-width: unset;
  }
}

/* Mejorar la apariencia de la tabla */
:deep(.personnel-table .p-datatable-tbody > tr:hover) {
  background-color: rgba(255, 95, 1, 0.05) !important;
  cursor: pointer;
}

:deep(.personnel-table .p-datatable-tbody > tr.p-highlight) {
  background-color: rgba(255, 95, 1, 0.1) !important;
}

/* Estilos para celdas específicas */
:deep(.personnel-table td[data-field="status"]) {
  font-weight: 600;
}

:deep(.personnel-table td[data-field="monthlyAmount"]) {
  text-align: right;
  font-weight: 600;
}

:deep(.personnel-table td[data-field="name"]) {
  font-weight: 600;
  color: #FF5F01;
}
</style>