<script>
import AppButton from "../../../core/components/AppButton.vue";
import AppTable from "../../../core/components/AppTable.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import AppInput from "../../../core/components/AppInput.vue";
import PersonnelForm from "./personnel-form.vue";
import { Personnel } from "../models/personnel.entity.js";
import { PersonnelApiService } from "../services/personnel-api.service.js";

export default {
  name: 'PersonnelManager',
  components: {
    AppButton,
    AppTable,
    AppNotification,
    AppInput,
    PersonnelForm
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      // Vista activa: 'summary' o 'detail'
      currentView: 'summary',

      // Datos principales
      allPersonnel: [],
      loading: false,

      // Personal seleccionado para detalle
      selectedPersonnel: null,

      // Selector de mes para asistencia
      selectedYear: new Date().getFullYear(),
      selectedMonth: new Date().getMonth() + 1,

      // Filtros y agrupaciones
      personnelByType: {
        TECHNICAL: [],
        SPECIALIST: [],
        ADMINISTRATIVE: [],
        RENTED_OPERATOR: [],
        LABORER: []
      },

      // Notificaciones
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',

      // Servicio
      personnelService: new PersonnelApiService(),

      // Búsqueda global
      globalSearchTerm: '',

      // Performance optimizations
      isCalculating: false,
      debounceTimer: null
    };
  },
  computed: {
    personnelTypes() {
      return [
        {
          key: 'TECHNICAL',
          label: this.$t('personnel.typeTechnical'),
          color: '#3b82f6',
          icon: 'pi pi-cog'
        },
        {
          key: 'SPECIALIST',
          label: this.$t('personnel.typeSpecialist'),
          color: '#8b5cf6',
          icon: 'pi pi-star'
        },
        {
          key: 'ADMINISTRATIVE',
          label: this.$t('personnel.typeAdministrative'),
          color: '#10b981',
          icon: 'pi pi-file-o'
        },
        {
          key: 'RENTED_OPERATOR',
          label: this.$t('personnel.typeRentedOperator'),
          color: '#f59e0b',
          icon: 'pi pi-wrench'
        },
        {
          key: 'LABORER',
          label: this.$t('personnel.typeLaborer'),
          color: '#ef4444',
          icon: 'pi pi-users'
        }
      ];
    },

    summaryTableColumns() {
      return [
        { field: 'fullName', header: this.$t('personnel.name'), sortable: true, style: 'min-width: 200px' },
        { field: 'documentNumber', header: this.$t('personnel.documentNumber'), sortable: true, style: 'width: 120px' },
        { field: 'position', header: this.$t('personnel.position'), sortable: true, style: 'min-width: 150px' },
        { field: 'monthlyAmount', header: this.$t('personnel.monthlyAmount'), sortable: true, dataType: 'numeric', style: 'width: 110px' },
        { field: 'startDate', header: this.$t('personnel.startDate'), sortable: true, dataType: 'date', style: 'width: 100px' },
        { field: 'week1', header: `${this.$t('personnel.week')} 1`, sortable: false, style: 'width: 80px; text-align: center;' },
        { field: 'week2', header: `${this.$t('personnel.week')} 2`, sortable: false, style: 'width: 80px; text-align: center;' },
        { field: 'week3', header: `${this.$t('personnel.week')} 3`, sortable: false, style: 'width: 80px; text-align: center;' },
        { field: 'week4', header: `${this.$t('personnel.week')} 4`, sortable: false, style: 'width: 80px; text-align: center;' },
        { field: 'week5', header: `${this.$t('personnel.week')} 5`, sortable: false, style: 'width: 80px; text-align: center;' },
        { field: 'totalDays', header: this.$t('personnel.totalDays'), sortable: true, style: 'width: 90px; text-align: center;' },
        { field: 'totalAmount', header: this.$t('personnel.totalAmount'), sortable: true, dataType: 'numeric', style: 'width: 120px' },
        { field: 'status', header: this.$t('personnel.status'), sortable: true, style: 'width: 100px' }
      ];
    },

    filteredPersonnelByType() {
      const filtered = {};

      Object.keys(this.personnelByType).forEach(type => {
        filtered[type] = this.personnelByType[type].filter(person => {
          if (!this.globalSearchTerm) return true;

          const searchTerm = this.globalSearchTerm.toLowerCase();
          return (
              person.name.toLowerCase().includes(searchTerm) ||
              person.lastname.toLowerCase().includes(searchTerm) ||
              person.documentNumber.toLowerCase().includes(searchTerm) ||
              person.position.toLowerCase().includes(searchTerm) ||
              person.department.toLowerCase().includes(searchTerm)
          );
        });
      });

      return filtered;
    },

    totalStats() {
      return {
        total: this.allPersonnel.length,
        active: this.allPersonnel.filter(p => p.isActive()).length,
        inactive: this.allPersonnel.filter(p => !p.isActive()).length,
        byType: this.personnelTypes.map(type => ({
          ...type,
          count: this.personnelByType[type.key].length,
          activeCount: this.personnelByType[type.key].filter(p => p.isActive()).length
        }))
      };
    }
  },
  watch: {
    globalSearchTerm() {
      // Debounce para búsqueda - SOLO ESTA OPTIMIZACIÓN
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.$forceUpdate();
      }, 300);
    }
  },

  async mounted() {
    await this.loadPersonnel();
  },

  beforeUnmount() {
    clearTimeout(this.debounceTimer);
  },
  methods: {
    async loadPersonnel() {
      this.loading = true;
      try {
        this.allPersonnel = await this.personnelService.getByProject(this.projectId);

        // TODO: Cuando implementes backend, reemplazar esta línea con:
        // this.allPersonnel = await this.personnelService.getPersonnelWithAttendance(this.projectId, this.selectedYear, this.selectedMonth);

        this.groupPersonnelByType();
      } catch (error) {
        console.error('Error loading personnel:', error);
        this.showNotificationMessage(this.$t('personnel.errorLoading'), 'error');
      } finally {
        this.loading = false;
      }
    },

    groupPersonnelByType() {
      // Reinicializar grupos
      Object.keys(this.personnelByType).forEach(type => {
        this.personnelByType[type] = [];
      });

      // Agrupar personal por tipo
      this.allPersonnel.forEach(person => {
        if (this.personnelByType[person.personnelType]) {
          this.personnelByType[person.personnelType].push(person);
        }
      });
    },

    handleRowClick(event, personnelType) {
      if (event.data && event.data.id) {
        const originalPersonnel = this.personnelByType[personnelType].find(p => p.id === event.data.id);
        if (originalPersonnel) {
          this.selectedPersonnel = originalPersonnel.clone();
          this.currentView = 'detail';
        }
      }
    },

    handleBackToSummary() {
      this.currentView = 'summary';
      this.selectedPersonnel = null;
    },

    onPersonnelSaved(savedPersonnel) {
      // Actualizar en la lista local
      if (this.selectedPersonnel && this.selectedPersonnel.id) {
        // Actualización existente
        const index = this.allPersonnel.findIndex(p => p.id === savedPersonnel.id);
        if (index !== -1) {
          this.allPersonnel[index] = savedPersonnel;
        }
      } else {
        // Nuevo personal
        this.allPersonnel.push(savedPersonnel);
      }

      this.groupPersonnelByType();
      this.currentView = 'summary';
      this.selectedPersonnel = null;
    },

    onFormCancelled() {
      this.currentView = 'summary';
      this.selectedPersonnel = null;
    },

    async handleExportAll() {
      try {
        const fileName = this.$t('personnel.personnelManagerReport');
        await this.personnelService.exportToExcel(this.allPersonnel, fileName);
        this.showNotificationMessage(this.$t('personnel.exportSuccess'), 'success');
      } catch (error) {
        console.error('Error exporting:', error);
        this.showNotificationMessage(this.$t('personnel.exportError'), 'error');
      }
    },

    async handleExportByType(personnelType) {
      try {
        const typeLabel = this.personnelTypes.find(t => t.key === personnelType)?.label || personnelType;
        const fileName = `${this.$t('personnel.personnelManagerReport')}_${typeLabel}`;
        await this.personnelService.exportToExcel(this.personnelByType[personnelType], fileName);
        this.showNotificationMessage(this.$t('personnel.exportSuccess'), 'success');
      } catch (error) {
        console.error('Error exporting:', error);
        this.showNotificationMessage(this.$t('personnel.exportError'), 'error');
      }
    },

    formatPersonnelForTable(personnelList) {
      if (!personnelList.length) return [];

      return personnelList.map(p => {
        // TODO: Cuando implementes backend, estos cálculos vendrán ya hechos del servidor
        // Y solo necesitarás: return { ...p, formattedFields... }

        // ⚠️ TEMPORAL: Cálculos en frontend (remover cuando tengas backend)
        this.calculateAttendanceData(p);

        return {
          ...p,
          fullName: `${p.name} ${p.lastname}`.trim(),
          status: this.formatStatus(p.status),
          monthlyAmount: this.formatCurrency(p.monthlyAmount),
          startDate: this.formatDate(p.startDate),
          // Estos datos vendrán del backend calculados:
          week1: p._weekData?.week1 || 0,
          week2: p._weekData?.week2 || 0,
          week3: p._weekData?.week3 || 0,
          week4: p._weekData?.week4 || 0,
          week5: p._weekData?.week5 || 0,
          totalDays: p._calculatedTotalDays || 0,
          totalAmount: this.formatCurrency(p.totalAmount || 0)
        };
      });
    },

    // ⚠️ TEMPORAL: Este método será reemplazado por cálculos del backend
    calculateAttendanceData(person) {
      if (person.initializeMonthAttendance) {
        person.initializeMonthAttendance(this.selectedYear, this.selectedMonth);
      }
      if (person.calculateMonthlyTotals) {
        person.calculateMonthlyTotals(this.selectedYear, this.selectedMonth);
      }

      // Calcular semanas (temporal)
      const weekDays = this.getWeekDaysWorked(person, this.selectedYear, this.selectedMonth);
      person._weekData = weekDays;
      person._calculatedTotalDays = weekDays.week1 + weekDays.week2 + weekDays.week3 + weekDays.week4 + weekDays.week5;
    },

    getWeekDaysWorked(person, year, month) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const weeks = { week1: 0, week2: 0, week3: 0, week4: 0, week5: 0 };

      for (let day = 1; day <= daysInMonth; day++) {
        const status = person.getDayAttendance ?
            person.getDayAttendance(year, month, day) : '';

        // Solo contar días trabajados (X) y compensatorios (P)
        if (status === 'X' || status === 'P') {
          const weekNumber = Math.ceil(day / 7);
          if (weekNumber <= 5) {
            weeks[`week${weekNumber}`]++;
          }
        }
      }

      return weeks;
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
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    },

    onMonthChange() {
      // TODO: Cuando implementes backend, llamar al endpoint con el nuevo mes:
      // await this.loadPersonnelForMonth(this.selectedYear, this.selectedMonth);

      // ⚠️ TEMPORAL: Recalcular en frontend
      this.groupPersonnelByType();
    },

    // TODO: Implementar cuando tengas backend
    async loadPersonnelForMonth(year, month) {
      this.loading = true;
      try {
        // this.allPersonnel = await this.personnelService.getPersonnelWithAttendance(this.projectId, year, month);
        // this.groupPersonnelByType();
      } catch (error) {
        this.showNotificationMessage(this.$t('personnel.errorLoading'), 'error');
      } finally {
        this.loading = false;
      }
    },

    getMonthName(monthNumber) {
      const monthKeys = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const monthKey = monthKeys[monthNumber - 1];
      return this.$t(`personnel.${monthKey}`);
    },

    invalidateCache() {
      this._formattedDataCache = null;
      this._personCache = {};
    },

    getAvailableYears() {
      const currentYear = new Date().getFullYear();
      return [currentYear - 1, currentYear, currentYear + 1];
    }
  }
};
</script>

<template>
  <div class="personnel-manager">
    <!-- Vista de Resumen -->
    <div v-if="currentView === 'summary'" class="summary-view">
      <!-- Estadísticas generales -->
      <div class="stats-section">
        <div class="general-stats">
          <div class="stat-card total">
            <div class="stat-number">{{ totalStats.total }}</div>
            <div class="stat-label">{{ $t('personnel.totalPersonnel') }}</div>
            <i class="pi pi-users"></i>
          </div>
          <div class="stat-card active">
            <div class="stat-number">{{ totalStats.active }}</div>
            <div class="stat-label">{{ $t('personnel.activePersonnel') }}</div>
            <i class="pi pi-check-circle"></i>
          </div>
          <div class="stat-card inactive">
            <div class="stat-number">{{ totalStats.inactive }}</div>
            <div class="stat-label">{{ $t('personnel.inactivePersonnel') }}</div>
            <i class="pi pi-times-circle"></i>
          </div>
        </div>

        <!-- Estadísticas por tipo -->
        <div class="type-stats">
          <div
              v-for="typeInfo in totalStats.byType"
              :key="typeInfo.key"
              class="type-stat-card"
              :style="{ borderLeftColor: typeInfo.color }"
          >
            <div class="type-header">
              <i :class="typeInfo.icon" :style="{ color: typeInfo.color }"></i>
              <span class="type-name">{{ typeInfo.label }}</span>
            </div>
            <div class="type-counts">
              <span class="total-count">{{ typeInfo.count }}</span>
              <span class="active-count">{{ typeInfo.activeCount }} {{ $t('personnel.active') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Controles de búsqueda, mes y exportación -->
      <div class="controls-section">
        <div class="month-selector">
          <label class="month-label">{{ $t('personnel.viewMonth') }}:</label>
          <select v-model="selectedMonth" @change="onMonthChange" class="month-select">
            <option v-for="month in 12" :key="month" :value="month">
              {{ getMonthName(month) }}
            </option>
          </select>
          <select v-model="selectedYear" @change="onMonthChange" class="year-select">
            <option v-for="year in getAvailableYears()" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>

        <div class="search-container">
          <AppInput
              v-model="globalSearchTerm"
              :placeholder="$t('personnel.searchPlaceholder')"
              icon="pi pi-search"
              class="global-search"
          />
        </div>

        <div class="export-controls">
          <AppButton
              :label="$t('personnel.exportAll')"
              icon="pi pi-download"
              variant="primary"
              @click="handleExportAll"
              :loading="loading"
          />
        </div>
      </div>

      <!-- Tablas por tipo de personal -->
      <div class="personnel-tables" v-if="!loading">
        <div
            v-for="typeInfo in personnelTypes"
            :key="typeInfo.key"
            class="personnel-type-section"
            v-show="filteredPersonnelByType[typeInfo.key].length > 0"
        >
          <div class="section-header">
            <div class="section-title">
              <i :class="typeInfo.icon" :style="{ color: typeInfo.color }"></i>
              <h3>{{ typeInfo.label }}</h3>
              <span class="count-badge" :style="{ backgroundColor: typeInfo.color }">
                {{ filteredPersonnelByType[typeInfo.key].length }}
              </span>
            </div>

            <AppButton
                :label="$t('personnel.export')"
                icon="pi pi-download"
                variant="secondary"
                size="small"
                @click="handleExportByType(typeInfo.key)"
                v-if="filteredPersonnelByType[typeInfo.key].length > 0"
            />
          </div>

          <AppTable
              :columns="summaryTableColumns"
              :data="formatPersonnelForTable(filteredPersonnelByType[typeInfo.key])"
              :loading="false"
              :paginator="true"
              :rows="10"
              :show-export-button="false"
              :show-filter-button="true"
              data-key="id"
              @row-click="(event) => handleRowClick(event, typeInfo.key)"
              class="personnel-table"
              :row-hover="true"
          />
        </div>
      </div>

      <!-- Estado de carga -->
      <div v-if="loading" class="loading-state">
        <i class="pi pi-spin pi-spinner"></i>
        <p>{{ $t('personnel.loading') }}</p>
      </div>
    </div>

    <!-- Vista de Detalle -->
    <div v-if="currentView === 'detail'" class="detail-view">
      <PersonnelForm
          :personnel="selectedPersonnel"
          :project-id="projectId"
          @save="onPersonnelSaved"
          @cancel="onFormCancelled"
          class="detail-form-container"
      />
    </div>

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
.personnel-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

/* ========================================
   VISTA DE RESUMEN
   ======================================== */

.summary-view {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.stats-section {
  margin-bottom: 2rem;
}

.general-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.stat-card i {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 2rem;
  opacity: 0.2;
}

.stat-number {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.stat-card.total .stat-number { color: #3b82f6; }
.stat-card.active .stat-number { color: #10b981; }
.stat-card.inactive .stat-number { color: #ef4444; }

.type-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.type-stat-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-left: 4px solid;
  transition: transform 0.2s;
}

.type-stat-card:hover {
  transform: translateX(4px);
}

.type-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.type-header i {
  font-size: 1.25rem;
}

.type-name {
  font-weight: 600;
  color: #333;
}

.type-counts {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.total-count {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
}

.active-count {
  font-size: 0.875rem;
  color: #666;
}

.controls-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.search-container {
  flex: 1;
  max-width: 400px;
}

.global-search {
  width: 100%;
}

.export-controls {
  display: flex;
  gap: 0.75rem;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: white;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.month-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}

.month-select,
.year-select {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #333;
  background-color: white;
  cursor: pointer;
  min-width: 100px;
}

.month-select:focus,
.year-select:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.2);
}

.personnel-tables {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.personnel-type-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-title h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.section-title i {
  font-size: 1.5rem;
}

.count-badge {
  background-color: #3b82f6;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.personnel-table {
  border-radius: 8px;
  overflow: hidden;
}

/* ========================================
   VISTA DE DETALLE
   ======================================== */

.detail-view {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background-color: #f8f9fa;
}

.detail-form-container {
  width: 100%;
  height: 100%;
}

/* Hacer que el formulario se comporte igual que summary-view */
:deep(.personnel-form-page) {
  height: auto !important;
  width: 100% !important;
  background-color: transparent !important;
}

:deep(.form-header) {
  background: white !important;
  padding: 1.5rem 2rem !important;
  border-bottom: 1px solid #e0e0e0 !important;
  border-radius: 8px 8px 0 0 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  margin-bottom: 0 !important;
}

:deep(.form-content) {
  flex: none !important;
  padding: 0 !important;
  overflow-y: visible !important;
  background-color: transparent !important;
}

:deep(.form-container) {
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
}

:deep(.form-section) {
  background: white !important;
  border-radius: 8px !important;
  padding: 2rem !important;
  margin-bottom: 1.5rem !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  width: 100% !important;
}

:deep(.form-section:first-child) {
  border-radius: 0 0 8px 8px !important;
  margin-top: 0 !important;
}

:deep(.form-grid) {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
  gap: 1.5rem !important;
}

.no-selection-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
}

.no-selection-content {
  text-align: center;
  max-width: 400px;
}

.no-selection-content i {
  font-size: 4rem;
  color: #FF5F01;
  margin-bottom: 1.5rem;
  opacity: 0.7;
}

.no-selection-content h3 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.no-selection-content p {
  margin: 0 0 2rem 0;
  font-size: 1rem;
  color: #666;
  line-height: 1.5;
}

/* ========================================
   ESTADOS
   ======================================== */

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #666;
  padding: 4rem;
}

.loading-state i {
  font-size: 3rem;
  color: #FF5F01;
}

.loading-state p {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 500;
}

/* ========================================
   RESPONSIVE DESIGN
   ======================================== */

@media (max-width: 768px) {
  .summary-view {
    padding: 1rem;
  }

  :deep(.form-content) {
    padding: 1rem !important;
    overflow-y: auto !important;
  }

  :deep(.form-section) {
    padding: 1.5rem !important;
    margin-bottom: 1rem !important;
  }

  :deep(.form-grid) {
    grid-template-columns: 1fr !important;
    gap: 1rem !important;
  }

  :deep(.form-header) {
    padding: 1rem !important;
  }

  .general-stats {
    grid-template-columns: 1fr;
  }

  .type-stats {
    grid-template-columns: 1fr;
  }

  .controls-section {
    flex-direction: column;
    align-items: stretch;
  }

  .search-container {
    max-width: 100%;
  }

  .export-controls {
    justify-content: center;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
  }

  .section-title {
    justify-content: center;
  }

  .detail-header {
    padding: 1rem;
    flex-direction: column;
    align-items: stretch;
  }

  .detail-actions {
    justify-content: center;
  }

  .detail-content {
    padding: 1rem;
  }

  .form-section {
    padding: 1.5rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .manager-header {
    padding: 1rem;
  }

  .manager-title {
    font-size: 1.25rem;
  }

  .stat-card {
    padding: 1.5rem;
  }

  .stat-number {
    font-size: 2rem;
  }

  .type-stat-card {
    padding: 1rem;
  }

  .personnel-type-section {
    padding: 1rem;
  }

  :deep(.form-content) {
    padding: 0.75rem !important;
  }

  :deep(.form-section) {
    padding: 0.75rem !important;
    margin-bottom: 0.5rem !important;
  }

  :deep(.form-header) {
    padding: 0.75rem !important;
  }

  .detail-content {
    padding: 0.75rem;
  }

  .form-section {
    padding: 1rem;
  }
}

/* ========================================
   ANIMACIONES Y TRANSICIONES
   ======================================== */

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.personnel-type-section {
  animation: fadeIn 0.3s ease-out;
}

.form-section {
  animation: fadeIn 0.3s ease-out;
}

.form-section {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.form-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* ========================================
   MEJORAS VISUALES
   ======================================== */

.manager-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.05) 50%, transparent 70%);
  pointer-events: none;
}

button:focus,
.custom-checkbox:focus,
input:focus {
  outline: 2px solid #FF5F01;
  outline-offset: 2px;
}

/* Scrollbar personalizado */
.summary-view::-webkit-scrollbar,
.detail-content::-webkit-scrollbar {
  width: 8px;
}

.summary-view::-webkit-scrollbar-track,
.detail-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.summary-view::-webkit-scrollbar-thumb,
.detail-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.summary-view::-webkit-scrollbar-thumb:hover,
.detail-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Hover effects para las tablas */
:deep(.personnel-table .p-datatable-tbody > tr:hover) {
  background-color: rgba(255, 95, 1, 0.05) !important;
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.personnel-table .p-datatable-tbody > tr) {
  transition: all 0.2s ease;
}

/* Efectos de entrada para las estadísticas */
.stat-card {
  transform: translateY(20px);
  opacity: 0;
  animation: slideInUp 0.6s ease-out forwards;
}

.stat-card:nth-child(1) { animation-delay: 0.1s; }
.stat-card:nth-child(2) { animation-delay: 0.2s; }
.stat-card:nth-child(3) { animation-delay: 0.3s; }

@keyframes slideInUp {
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.type-stat-card {
  transform: translateX(-20px);
  opacity: 0;
  animation: slideInLeft 0.6s ease-out forwards;
}

.type-stat-card:nth-child(1) { animation-delay: 0.1s; }
.type-stat-card:nth-child(2) { animation-delay: 0.2s; }
.type-stat-card:nth-child(3) { animation-delay: 0.3s; }
.type-stat-card:nth-child(4) { animation-delay: 0.4s; }
.type-stat-card:nth-child(5) { animation-delay: 0.5s; }

@keyframes slideInLeft {
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>