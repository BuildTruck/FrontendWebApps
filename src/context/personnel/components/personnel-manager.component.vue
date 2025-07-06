<script>
import AppButton from "../../../core/components/AppButton.vue";
import AppTable from "../../../core/components/AppTable.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import { Personnel } from "../models/personnel.entity.js";
import { PersonnelApiService } from "../services/personnel-api.service.js";
import ExportModal from '../../../core/exports/components/ExportModal.vue'

export default {
  name: 'PersonnelManager',
  components: {
    AppButton,
    AppTable,
    AppNotification,
    ExportModal
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      // Vistas: 'list' | 'attendance'
      currentView: 'list',
      showExportModal: false,
      // Datos
      allPersonnel: [],
      selectedPerson: null,
      loading: false,

      // Filtros
      selectedTypeFilter: '',
      selectedStatusFilter: '',

      // Asistencia
      selectedMonth: new Date().getMonth() + 1,
      selectedYear: new Date().getFullYear(),
      monthDays: [],

      // Notificaciones
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',

      // Servicio
      personnelService: new PersonnelApiService()
    };
  },

  computed: {
    exportData() {
      return this.allPersonnel.map(p => ({
        id: p.id,
        name: p.name,
        lastname: p.lastname,
        documentNumber: p.documentNumber,
        position: p.position,
        department: p.department,
        personnelType: p.personnelType,
        status: p.status,
        monthlyAmount: p.monthlyAmount,
        startDate: p.startDate,
        endDate: p.endDate,
        phone: p.phone,
        email: p.email,
        workedDays: p.workedDays,
        absences: p.absences,
        totalAmount: p.totalAmount,
        // Campos adicionales para filtros
        bank: p.bank,
        accountNumber: p.accountNumber
      }))
    },
    personnelTypes() {
      return [
        { key: 'TECHNICAL', label: this.safeTranslate('personnel.typeTechnical', 'Technical') },
        { key: 'SPECIALIST', label: this.safeTranslate('personnel.typeSpecialist', 'Specialist') },
        { key: 'ADMINISTRATIVE', label: this.safeTranslate('personnel.typeAdministrative', 'Administrative') },
        { key: 'RENTED_OPERATOR', label: this.safeTranslate('personnel.typeRentedOperator', 'Rented Operator') },
        { key: 'LABORER', label: this.safeTranslate('personnel.typeLaborer', 'Laborer') }
      ];
    },

    attendanceStatuses() {
      return [
        { value: 'X', label: this.safeTranslate('personnel.worked', 'Worked'), color: '#22c55e' },
        { value: 'F', label: this.safeTranslate('personnel.absence', 'Absence'), color: '#ef4444' },
        { value: 'P', label: this.safeTranslate('personnel.leave', 'Leave'), color: '#3b82f6' },
        { value: 'DD', label: this.safeTranslate('personnel.sunday', 'Sunday'), color: '#6b7280' },
        { value: 'PD', label: this.safeTranslate('personnel.unpaidLeave', 'Unpaid Leave'), color: '#f97316' }
      ];
    },

    personnelTableColumns() {
      return [
        { field: 'fullName', header: this.safeTranslate('personnel.name', 'Name'), sortable: true, style: 'min-width: 200px' },
        { field: 'documentNumber', header: this.safeTranslate('personnel.document', 'Document'), sortable: true, style: 'width: 120px' },
        { field: 'position', header: this.safeTranslate('personnel.position', 'Position'), sortable: true, style: 'min-width: 150px' },
        { field: 'department', header: this.safeTranslate('personnel.department', 'Department'), sortable: true, style: 'min-width: 120px' },
        { field: 'personnelType', header: this.safeTranslate('personnel.type', 'Type'), sortable: true, style: 'width: 120px' },
        { field: 'status', header: this.safeTranslate('personnel.status', 'Status'), sortable: true, style: 'width: 100px' },
        { field: 'monthlyAmount', header: this.safeTranslate('personnel.monthlyAmount', 'Monthly'), sortable: true, style: 'width: 120px' },
        { field: 'startDate', header: this.safeTranslate('personnel.startDate', 'Start Date'), sortable: true, style: 'width: 120px' },
        { field: 'phone', header: this.safeTranslate('personnel.phone', 'Phone'), sortable: true, style: 'width: 120px' },
        { field: 'email', header: this.safeTranslate('personnel.email', 'Email'), sortable: true, style: 'min-width: 180px' },
        { field: 'workedDays', header: this.safeTranslate('personnel.workedDays', 'Worked'), sortable: true, style: 'width: 80px; text-align: center;' },
        { field: 'absences', header: this.safeTranslate('personnel.absences', 'Absences'), sortable: true, style: 'width: 80px; text-align: center;' },
        { field: 'totalAmount', header: this.safeTranslate('personnel.amount', 'Amount'), sortable: true, style: 'width: 120px' }
      ];
    },

    filteredPersonnel() {
      return this.allPersonnel.filter(person => {
        // Filtro por tipo
        if (this.selectedTypeFilter && person.personnelType !== this.selectedTypeFilter) {
          return false;
        }

        // Filtro por estado
        if (this.selectedStatusFilter) {
          // Para ACTIVE/INACTIVE usar la lógica existente
          if (this.selectedStatusFilter === 'ACTIVE' && (!person.isActive || !person.isActive())) {
            return false;
          }
          if (this.selectedStatusFilter === 'INACTIVE' && person.isActive && person.isActive()) {
            return false;
          }

          // Para los demás estados, comparar directamente
          if (['PENDING', 'SUSPENDED', 'FINISHED'].includes(this.selectedStatusFilter)) {
            if (person.status !== this.selectedStatusFilter) {
              return false;
            }
          }
        }

        return true;
      });
    },

    formattedPersonnelData() {
      return this.filteredPersonnel.map(person => ({
        ...person,
        fullName: `${person.name || ''} ${person.lastname || ''}`.trim(),
        personnelType: this.getPersonnelTypeLabel(person.personnelType),
        status: this.formatStatus(person.status),
        monthlyAmount: this.formatCurrency(person.monthlyAmount || 0),
        totalAmount: this.formatCurrency(person.totalAmount || 0),
        startDate: this.formatDate(person.startDate),
        phone: person.phone || '-',
        email: person.email || '-',
        workedDays: person.workedDays || 0,
        absences: person.absences || 0
      }));
    }
  },

  async mounted() {
    this.generateMonthDays();
    await this.loadPersonnelWithAttendance();
  },

  methods: {
    openExportModal() {
      this.showExportModal = true
    },
    safeTranslate(key, fallback = '') {
      try {
        return this.$t ? this.$t(key) : fallback;
      } catch (error) {
        return fallback;
      }
    },

    async loadPersonnelWithAttendance() {
      this.loading = true;
      try {
        // Cargar personal con datos de asistencia del mes seleccionado
        this.allPersonnel = await this.personnelService.getByProject(
            this.projectId,
            true, // includeAttendance
            this.selectedYear,
            this.selectedMonth
        );
      } catch (error) {
        console.error('Error loading personnel:', error);
        this.showNotificationMessage(
            this.safeTranslate('personnel.errorLoading', 'Error loading personnel'),
            'error'
        );
      } finally {
        this.loading = false;
      }
    },

    generateMonthDays() {
      this.monthDays = Personnel.generateMonthDays(this.selectedYear, this.selectedMonth);
    },

    handlePersonnelClick(event) {
      if (event.data && event.data.id) {
        const person = this.allPersonnel.find(p => p.id === event.data.id);
        if (person) {
          this.selectedPerson = person;
          this.currentView = 'attendance';
        }
      }
    },

    backToList() {
      this.currentView = 'list';
      this.selectedPerson = null;
    },

    getPersonAttendance(day) {
      if (!this.selectedPerson) return '';

      if (this.selectedPerson.getDayAttendance) {
        return this.selectedPerson.getDayAttendance(this.selectedYear, this.selectedMonth, day);
      }

      // Fallback
      const monthKey = `${this.selectedYear}-${this.selectedMonth.toString().padStart(2, '0')}`;
      const attendanceString = this.selectedPerson.monthlyAttendance?.[monthKey] || '';

      if (!attendanceString) {
        const dayData = this.monthDays.find(d => d.day === day);
        return dayData?.isSunday ? 'DD' : '';
      }

      const attendanceArray = attendanceString.split('|');
      const status = attendanceArray[day - 1] || '';

      if (!status) {
        const dayData = this.monthDays.find(d => d.day === day);
        return dayData?.isSunday ? 'DD' : '';
      }

      return status;
    },

    getAttendanceColor(status) {
      const statusInfo = this.attendanceStatuses.find(s => s.value === status);
      return statusInfo ? statusInfo.color : '#f3f4f6';
    },

    getPersonInitials(person) {
      const firstName = person.name || '';
      const lastName = person.lastname || '';
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    },

    getPersonnelTypeLabel(type) {
      const typeInfo = this.personnelTypes.find(t => t.key === type);
      return typeInfo ? typeInfo.label : type;
    },

    formatStatus(status) {
      const statuses = {
        'ACTIVE': this.safeTranslate('personnel.active', 'Active'),
        'INACTIVE': this.safeTranslate('personnel.inactive', 'Inactive'),
        'PENDING': this.safeTranslate('personnel.pending', 'Pending'),
        'SUSPENDED': this.safeTranslate('personnel.suspended', 'Suspended'),
        'FINISHED': this.safeTranslate('personnel.finished', 'Finished')
      };
      return statuses[status] || status;
    },

    formatCurrency(amount) {
      if (!amount && amount !== 0) return '';
      try {
        return new Intl.NumberFormat('es-PE', {
          style: 'currency',
          currency: 'PEN'
        }).format(amount);
      } catch (error) {
        return `S/. ${amount}`;
      }
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

    getMonthName(month) {
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return months[month - 1] || month;
    },

    getAvailableYears() {
      const currentYear = new Date().getFullYear();
      return [currentYear - 1, currentYear, currentYear + 1];
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    }
  },

  watch: {
    selectedMonth() {
      this.generateMonthDays();
    },
    selectedYear() {
      this.generateMonthDays();
    }
  }
};
</script>

<template>
  <div class="personnel-manager">
    <!-- Vista de Lista -->
    <div v-if="currentView === 'list'" class="list-view">
      <!-- Header con controles -->
      <div class="manager-header">
        <div class="header-left">
          <h1 class="page-title">{{ $t('personnel.personnelManagement') }}</h1>
          <p class="page-subtitle">{{ $t('personnel.viewPersonnelAndAttendance') }}</p>
        </div>

        <div class="header-controls">
          <!-- Selector de mes para asistencia -->
          <div class="month-selector">
            <label>{{ $t('personnel.attendanceMonth') }}:</label>
            <select v-model="selectedMonth" @change="loadPersonnelWithAttendance">
              <option v-for="month in 12" :key="month" :value="month">
                {{ getMonthName(month) }}
              </option>
            </select>
            <select v-model="selectedYear" @change="loadPersonnelWithAttendance">
              <option v-for="year in getAvailableYears()" :key="year" :value="year">
                {{ year }}
              </option>
            </select>
          </div>

          <AppButton
              :label="$t('exports.export')"
              icon="pi pi-download"
              variant="primary"
              @click="openExportModal"
              :disabled="allPersonnel.length === 0"
          />
        </div>
      </div>

      <!-- Filtros -->
      <div class="filters-section">
        <div class="filter-group">
          <div class="filter-select">
            <label>{{ $t('personnel.filterByType') }}:</label>
            <select v-model="selectedTypeFilter">
              <option value="">{{ $t('personnel.allTypes') }}</option>
              <option v-for="type in personnelTypes" :key="type.key" :value="type.key">
                {{ type.label }}
              </option>
            </select>
          </div>

          <div class="filter-select">
            <label>{{ $t('personnel.filterByStatus') }}:</label>
            <select v-model="selectedStatusFilter">
              <option value="">{{ $t('personnel.allStatuses') }}</option>
              <option value="ACTIVE">{{ $t('personnel.active') }}</option>
              <option value="INACTIVE">{{ $t('personnel.inactive') }}</option>
              <!-- AGREGAR ESTAS 3 LÍNEAS: -->
              <option value="PENDING">{{ $t('personnel.pending') }}</option>
              <option value="SUSPENDED">{{ $t('personnel.suspended') }}</option>
              <option value="FINISHED">{{ $t('personnel.finished') }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tabla de personal -->
      <div v-if="!loading && filteredPersonnel.length > 0" class="personnel-table-section">
        <AppTable
            :columns="personnelTableColumns"
            :data="formattedPersonnelData"
            :loading="loading"
            :paginator="true"
            :rows="15"
            :show-export-button="false"
            :show-filter-button="true"
            data-key="id"
            @row-click="handlePersonnelClick"
            class="personnel-table"
            :row-hover="true"
        />
      </div>

      <!-- Estado sin datos - SOLO si no hay datos y no está cargando -->
      <div v-else-if="!loading && filteredPersonnel.length === 0" class="empty-state">
        <i class="pi pi-users"></i>
        <h3>{{ $t('personnel.noPersonnelFound') }}</h3>
        <p>{{ $t('personnel.tryAdjustingFilters') }}</p>
      </div>
    </div>

    <!-- Vista de Detalle de Asistencia Individual -->
    <div v-if="currentView === 'attendance'" class="attendance-view">
      <div class="detail-header">
        <div class="header-back">
          <AppButton
              icon="pi pi-arrow-left"
              :label="$t('common.back')"
              variant="secondary"
              @click="backToList"
          />
        </div>

        <div class="person-info" v-if="selectedPerson">
          <div class="person-avatar">
            <img v-if="selectedPerson.avatarUrl"
                 :src="selectedPerson.avatarUrl"
                 :alt="selectedPerson.fullName"
                 class="avatar-image" />
            <div v-else class="avatar-placeholder">
              {{ getPersonInitials(selectedPerson) }}
            </div>
          </div>

          <!-- Todos los datos del personal -->
          <div class="person-details">
            <h2>{{ selectedPerson.fullName }}</h2>

            <!-- Grid completo de información -->
            <div class="person-meta">
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.document') }}</span>
                <span class="meta-value">{{ selectedPerson.documentNumber }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.position') }}</span>
                <span class="meta-value">{{ selectedPerson.position }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.department') }}</span>
                <span class="meta-value">{{ selectedPerson.department }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.type') }}</span>
                <span class="meta-value">{{ getPersonnelTypeLabel(selectedPerson.personnelType) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.status') }}</span>
                <span class="meta-value">{{ formatStatus(selectedPerson.status) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.monthlyAmount') }}</span>
                <span class="meta-value">{{ formatCurrency(selectedPerson.monthlyAmount) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">{{ $t('personnel.startDate') }}</span>
                <span class="meta-value">{{ formatDate(selectedPerson.startDate) }}</span>
              </div>
              <div class="meta-item" v-if="selectedPerson.endDate">
                <span class="meta-label">{{ $t('personnel.endDate') }}</span>
                <span class="meta-value">{{ formatDate(selectedPerson.endDate) }}</span>
              </div>
              <div class="meta-item" v-if="selectedPerson.phone">
                <span class="meta-label">{{ $t('personnel.phone') }}</span>
                <span class="meta-value">{{ selectedPerson.phone }}</span>
              </div>
              <div class="meta-item" v-if="selectedPerson.email">
                <span class="meta-label">{{ $t('personnel.email') }}</span>
                <span class="meta-value">{{ selectedPerson.email }}</span>
              </div>
              <div class="meta-item" v-if="selectedPerson.bank">
                <span class="meta-label">{{ $t('personnel.bank') }}</span>
                <span class="meta-value">{{ selectedPerson.bank }}</span>
              </div>
              <div class="meta-item" v-if="selectedPerson.accountNumber">
                <span class="meta-label">{{ $t('personnel.accountNumber') }}</span>
                <span class="meta-value">{{ selectedPerson.accountNumber }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen de asistencia -->
        <div class="attendance-summary" v-if="selectedPerson">
          <div class="summary-item">
            <span class="label">{{ $t('personnel.workedDays') }}</span>
            <span class="value worked">{{ selectedPerson.workedDays || 0 }}</span>
          </div>
          <div class="summary-item">
            <span class="label">{{ $t('personnel.absences') }}</span>
            <span class="value absences">{{ selectedPerson.absences || 0 }}</span>
          </div>
          <div class="summary-item">
            <span class="label">{{ $t('personnel.totalAmount') }}</span>
            <span class="value amount">{{ formatCurrency(selectedPerson.totalAmount || 0) }}</span>
          </div>
        </div>
      </div>

      <!-- Calendario de asistencia mejorado -->
      <div class="attendance-calendar" v-if="selectedPerson">
        <div class="calendar-header">
          <h3>{{ $t('personnel.attendanceFor') }} {{ getMonthName(selectedMonth) }} {{ selectedYear }}</h3>

          <!-- Leyenda -->
          <div class="attendance-legend">
            <div v-for="status in attendanceStatuses"
                 :key="status.value"
                 class="legend-item">
              <div class="legend-color" :style="{ backgroundColor: status.color }"></div>
              <span>{{ status.label }} ({{ status.value }})</span>
            </div>
          </div>
        </div>

        <!-- Grid del calendario en DOS FILAS -->
        <div class="calendar-grid">
          <!-- PRIMERA FILA: Días del mes -->
          <div class="calendar-days-header">
            <div v-for="day in monthDays"
                 :key="day.date"
                 class="day-header"
                 :class="{ 'sunday': day.isSunday }">
              <span class="day-number">{{ day.day }}</span>
              <span class="day-name">{{ day.dayName }}</span>
            </div>
          </div>

          <!-- SEGUNDA FILA: Asistencia -->
          <div class="calendar-attendance">
            <div v-for="day in monthDays"
                 :key="day.date"
                 class="attendance-day"
                 :class="{ 'sunday': day.isSunday }"
                 :style="{ backgroundColor: getAttendanceColor(getPersonAttendance(day.day)) }">
              <span class="attendance-status">{{ getPersonAttendance(day.day) }}</span>
            </div>
          </div>
        </div>
      </div>
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

/* ========== VISTA DE LISTA ========== */
.list-view {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.header-left .page-title {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #333;
}

.header-left .page-subtitle {
  margin: 0;
  color: #666;
  font-size: 1.125rem;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f8f9fa;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.month-selector label {
  font-size: 0.875rem;
  color: #666;
  white-space: nowrap;
  font-weight: 500;
}

.month-selector select {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 0.875rem;
  min-width: 100px;
  background: white;
  color: #333;
}

.month-selector select:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.2);
}

.filters-section {
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.filter-group {
  display: flex;
  gap: 1.5rem;
  align-items: end;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.filter-select {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-select label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.filter-select select {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.875rem;
  min-width: 150px;
  background: white;
  color: #333;
}

.filter-select select:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.2);
}

.personnel-table-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
}

.personnel-table {
  border-radius: 8px;
  overflow: hidden;
}

/* ========== VISTA DE ASISTENCIA ========== */
.attendance-view {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.detail-header {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
}

.header-back {
  margin-bottom: 2rem;
}

.person-info {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 2rem;
}

/* IMAGEN MÁS GRANDE - 200px */
.person-avatar {
  width: 350px;
  height: 500px;
  border-radius: 20px;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid #e9ecef;
  flex-shrink: 0;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 3rem;
  font-weight: 600;
  color: #666;
}

/* DATOS COMPLETOS MÁS VISIBLES */
.person-details {
  flex: 1;
}

.person-details h2 {
  margin: 0 0 1.5rem 0;
  font-size: 2.25rem;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.person-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.meta-item {
  background: #f8f9fa;
  padding: 1.25rem 1.5rem;
  border-radius: 10px;
  border-left: 4px solid #FF5F01;
  transition: all 0.2s ease;
}

.meta-item:hover {
  background: #f1f3f4;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.meta-label {
  display: block;
  font-size: 0.75rem;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.meta-value {
  display: block;
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
}

.attendance-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
}

.summary-item .label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-item .value {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
}

.value.worked { color: #22c55e; }
.value.absences { color: #ef4444; }
.value.amount { color: #3b82f6; }

.attendance-calendar {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
}

.calendar-header {
  margin-bottom: 2rem;
}

.calendar-header h3 {
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
}

.attendance-legend {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid rgba(255, 255, 255, 0.8);
}

.calendar-grid {
  display: grid;
  gap: 1rem;
}

/* CALENDARIO EN 2 FILAS RESPONSIVO */
.calendar-days-header {
  display: grid;
  gap: 4px;
  padding: 1rem;
  background: #f1f3f4;
  border-radius: 8px;
  border: 2px solid #e9ecef;
  /* Grid dinámico basado en el número de días */
  grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
}

.day-header {
  text-align: center;
  padding: 0.5rem 0.25rem;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  min-height: 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.day-header.sunday {
  background: #f8f9fa;
  border-color: #dee2e6;
}

.day-number {
  display: block;
  font-weight: 700;
  font-size: 0.875rem;
  color: #333;
  margin-bottom: 0.25rem;
}

.day-name {
  display: block;
  font-size: 0.625rem;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.calendar-attendance {
  display: grid;
  gap: 4px;
  padding: 1rem;
  background: #e9ecef;
  border-radius: 8px;
  border: 2px solid #dee2e6;
  /* Grid dinámico basado en el número de días */
  grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
}

.attendance-day {
  height: 50px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.875rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  min-height: 50px;
}

.attendance-day:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.attendance-day.sunday {
  border-color: rgba(107, 114, 128, 0.5);
}

.attendance-status {
  font-size: 0.875rem;
  font-weight: 700;
}


.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  color: #666;
  text-align: center;
  background: white;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.empty-state i {
  font-size: 4rem;
  color: #FF5F01;
  margin-bottom: 1.5rem;
  opacity: 0.7;
}

.empty-state h3 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.empty-state p {
  margin: 0;
  color: #666;
  font-size: 1rem;
}

@media (max-width: 1400px) {
  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(auto-fit, minmax(35px, 1fr));
  }

  .day-number {
    font-size: 0.75rem;
  }

  .day-name {
    font-size: 0.5rem;
  }

  .attendance-status {
    font-size: 0.75rem;
  }
}

@media (max-width: 1200px) {
  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(auto-fit, minmax(32px, 1fr));
  }
}

@media (max-width: 768px) {
  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(auto-fit, minmax(30px, 1fr));
    padding: 0.75rem;
    gap: 3px;
  }

  .day-header {
    padding: 0.25rem;
    min-height: 40px;
  }

  .attendance-day {
    height: 40px;
    min-height: 40px;
  }

  .day-number {
    font-size: 0.625rem;
    margin-bottom: 0.125rem;
  }

  .day-name {
    font-size: 0.5rem;
  }

  .attendance-status {
    font-size: 0.625rem;
  }
}

@media (max-width: 480px) {
  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(auto-fit, minmax(25px, 1fr));
    padding: 0.5rem;
    gap: 2px;
  }

  .day-header {
    padding: 0.125rem;
    min-height: 35px;
  }

  .attendance-day {
    height: 35px;
    min-height: 35px;
  }

  .day-number {
    font-size: 0.5rem;
  }

  .day-name {
    font-size: 0.375rem;
  }

  .attendance-status {
    font-size: 0.5rem;
  }
}

/* ========== RESPONSIVE ========== */
@media (max-width: 1200px) {
  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(16, 1fr);
  }
}

@media (max-width: 768px) {
  .list-view, .attendance-view {
    padding: 1rem;
  }

  .manager-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding: 1.5rem;
  }

  .header-controls {
    justify-content: center;
  }

  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }

  .person-info {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }

  .person-avatar {
    width: 150px;
    height: 150px;
  }

  .person-details h2 {
    font-size: 1.75rem;
    text-align: center;
  }

  .person-meta {
    grid-template-columns: 1fr;
  }

  .attendance-summary {
    grid-template-columns: repeat(2, 1fr);
    padding: 1.5rem;
  }

  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(8, 1fr);
  }

  .attendance-legend {
    flex-direction: column;
  }

  .day-header {
    padding: 0.5rem 0.25rem;
    min-height: 50px;
  }

  .attendance-day {
    height: 50px;
    min-height: 50px;
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .person-avatar {
    width: 120px;
    height: 120px;
  }

  .avatar-placeholder {
    font-size: 2.5rem;
  }

  .person-details h2 {
    font-size: 1.5rem;
  }

  .summary-item .value {
    font-size: 1.5rem;
  }

  .attendance-summary {
    grid-template-columns: 1fr;
  }

  .calendar-header h3 {
    font-size: 1.25rem;
  }

  .attendance-day {
    height: 40px;
    min-height: 40px;
    font-size: 0.75rem;
  }

  .day-header {
    min-height: 40px;
    padding: 0.25rem;
  }

  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(7, 1fr);
  }
}

/* ========== HOVER EFFECTS ========== */
:deep(.personnel-table .p-datatable-tbody > tr:hover) {
  background-color: rgba(255, 95, 1, 0.05) !important;
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.personnel-table .p-datatable-tbody > tr) {
  transition: all 0.2s ease;
}

/* ========== RESPONSIVE DESIGN MEJORADO ========== */

/* Extra Large Screens */
@media (max-width: 1400px) {
  .manager-header {
    padding: 1.5rem;
  }

  .person-avatar {
    width: 300px;
    height: 400px;
  }

  .person-meta {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(auto-fit, minmax(32px, 1fr));
  }
}

/* Large Screens */
@media (max-width: 1200px) {
  .personnel-manager {
    padding: 0;
  }

  .list-view, .attendance-view {
    padding: 1.5rem;
  }

  .manager-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .header-controls {
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .month-selector {
    order: 1;
    flex: 1;
    min-width: 280px;
  }

  .person-avatar {
    width: 250px;
    height: 300px;
  }

  .person-details h2 {
    font-size: 2rem;
  }

  .person-meta {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .attendance-summary {
    grid-template-columns: repeat(3, 1fr);
  }

  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(auto-fit, minmax(28px, 1fr));
    padding: 0.75rem;
  }

  .day-header,
  .attendance-day {
    min-height: 45px;
  }
}

/* Medium Screens */
@media (max-width: 992px) {
  .list-view, .attendance-view {
    padding: 1rem;
  }

  .manager-header {
    padding: 1rem;
  }

  .header-left .page-title {
    font-size: 1.75rem;
  }

  .header-left .page-subtitle {
    font-size: 1rem;
  }

  .header-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .month-selector {
    justify-content: center;
    flex-wrap: wrap;
    padding: 1rem;
  }

  .month-selector select {
    min-width: 80px;
  }

  .filters-section {
    padding: 1rem;
  }

  .filter-group {
    flex-direction: column;
    gap: 1rem;
  }

  .filter-select {
    width: 100%;
  }

  .filter-select select {
    width: 100%;
    min-width: auto;
  }

  .personnel-table-section {
    padding: 1rem;
    overflow-x: auto;
  }

  .person-info {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.5rem;
  }

  .person-avatar {
    width: 200px;
    height: 250px;
  }

  .person-details {
    width: 100%;
  }

  .person-details h2 {
    font-size: 1.75rem;
    text-align: center;
  }

  .person-meta {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .meta-item {
    padding: 1rem;
  }

  .meta-value {
    font-size: 1rem;
  }

  .attendance-summary {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    padding: 1.5rem;
  }

  .summary-item .value {
    font-size: 1.75rem;
  }

  .attendance-calendar {
    padding: 1.5rem;
  }

  .calendar-header h3 {
    font-size: 1.25rem;
  }

  .attendance-legend {
    flex-direction: column;
    gap: 0.75rem;
  }

  .legend-item {
    justify-content: center;
    padding: 0.75rem;
  }

  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(auto-fit, minmax(24px, 1fr));
    gap: 3px;
    padding: 0.5rem;
  }

  .day-header,
  .attendance-day {
    min-height: 40px;
  }

  .day-number {
    font-size: 0.75rem;
  }

  .day-name {
    font-size: 0.5rem;
  }

  .attendance-status {
    font-size: 0.75rem;
  }
}

/* Small Screens */
@media (max-width: 768px) {
  .personnel-manager {
    background-color: #f8f9fa;
  }

  .list-view, .attendance-view {
    padding: 0.75rem;
  }

  .manager-header {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 8px;
  }

  .header-left .page-title {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .header-left .page-subtitle {
    font-size: 0.875rem;
  }

  .month-selector {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .month-selector label {
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .month-selector select {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
  }

  .filters-section {
    margin-bottom: 1rem;
    padding: 1rem;
    border-radius: 8px;
  }

  .personnel-table-section {
    border-radius: 8px;
    padding: 0.75rem;
  }

  /* Tabla responsive */
  :deep(.personnel-table .p-datatable-wrapper) {
    overflow-x: auto;
  }

  :deep(.personnel-table .p-datatable-table) {
    min-width: 800px;
  }

  .detail-header {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 8px;
  }

  .person-avatar {
    width: 150px;
    height: 200px;
    border-radius: 12px;
  }

  .avatar-placeholder {
    font-size: 2.5rem;
  }

  .person-details h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .person-meta {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .meta-item {
    padding: 0.75rem 1rem;
  }

  .meta-label {
    font-size: 0.625rem;
  }

  .meta-value {
    font-size: 0.875rem;
  }

  .attendance-summary {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 1rem;
  }

  .summary-item {
    flex-direction: row;
    justify-content: space-between;
    background: white;
    padding: 1rem;
    border-radius: 8px;
    border-left: 4px solid #FF5F01;
  }

  .summary-item .label {
    font-size: 0.75rem;
    text-align: left;
  }

  .summary-item .value {
    font-size: 1.5rem;
  }

  .attendance-calendar {
    padding: 1rem;
    border-radius: 8px;
  }

  .calendar-header h3 {
    font-size: 1.125rem;
    margin-bottom: 1rem;
  }

  .attendance-legend {
    padding: 0.75rem;
    border-radius: 6px;
  }

  .legend-item {
    font-size: 0.75rem;
    padding: 0.5rem 0.75rem;
  }

  .legend-color {
    width: 16px;
    height: 16px;
  }

  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    padding: 0.5rem;
    border-radius: 6px;
  }

  .day-header,
  .attendance-day {
    min-height: 35px;
    border-radius: 4px;
  }

  .day-header {
    padding: 0.25rem;
  }

  .day-number {
    font-size: 0.625rem;
    margin-bottom: 0.125rem;
  }

  .day-name {
    font-size: 0.375rem;
  }

  .attendance-status {
    font-size: 0.625rem;
  }

  .empty-state {
    padding: 2rem 1rem;
    border-radius: 8px;
  }

  .empty-state i {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    font-size: 1.25rem;
  }

  .empty-state p {
    font-size: 0.875rem;
  }
}

/* Extra Small Screens */
@media (max-width: 480px) {
  .list-view, .attendance-view {
    padding: 0.5rem;
  }

  .manager-header,
  .filters-section,
  .personnel-table-section,
  .detail-header,
  .attendance-calendar {
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    border-radius: 6px;
  }

  .header-left .page-title {
    font-size: 1.25rem;
  }

  .header-left .page-subtitle {
    font-size: 0.75rem;
  }

  .month-selector {
    padding: 0.5rem;
  }

  .month-selector select {
    padding: 0.5rem;
    font-size: 0.875rem;
  }

  .person-avatar {
    width: 120px;
    height: 160px;
    border-radius: 8px;
  }

  .avatar-placeholder {
    font-size: 2rem;
  }

  .person-details h2 {
    font-size: 1.25rem;
  }

  .meta-item {
    padding: 0.5rem 0.75rem;
  }

  .attendance-summary {
    padding: 0.75rem;
  }

  .summary-item {
    padding: 0.75rem;
  }

  .summary-item .value {
    font-size: 1.25rem;
  }

  .calendar-header h3 {
    font-size: 1rem;
  }

  .attendance-legend {
    padding: 0.5rem;
  }

  .legend-item {
    font-size: 0.625rem;
    padding: 0.375rem 0.5rem;
  }

  .legend-color {
    width: 14px;
    height: 14px;
  }

  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    padding: 0.375rem;
  }

  .day-header,
  .attendance-day {
    min-height: 30px;
    border-radius: 3px;
  }

  .day-header {
    padding: 0.125rem;
  }

  .day-number {
    font-size: 0.5rem;
    margin-bottom: 0;
  }

  .day-name {
    font-size: 0.375rem;
    display: none; /* Ocultar nombres de días en pantallas muy pequeñas */
  }

  .attendance-status {
    font-size: 0.5rem;
  }
}

/* Ultra Small Screens */
@media (max-width: 360px) {
  .list-view, .attendance-view {
    padding: 0.25rem;
  }

  .manager-header,
  .filters-section,
  .personnel-table-section,
  .detail-header,
  .attendance-calendar {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .header-left .page-title {
    font-size: 1.125rem;
  }

  .person-avatar {
    width: 100px;
    height: 130px;
  }

  .avatar-placeholder {
    font-size: 1.5rem;
  }

  .person-details h2 {
    font-size: 1.125rem;
  }

  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    padding: 0.25rem;
  }

  .day-header,
  .attendance-day {
    min-height: 25px;
  }

  .day-number {
    font-size: 0.375rem;
  }

  .attendance-status {
    font-size: 0.375rem;
  }

  .summary-item .value {
    font-size: 1rem;
  }

  .meta-value {
    font-size: 0.75rem;
  }
}

/* Landscape orientation adjustments */
@media (max-height: 600px) and (orientation: landscape) {
  .person-avatar {
    width: 120px;
    height: 150px;
  }

  .person-info {
    flex-direction: row;
    align-items: flex-start;
  }

  .attendance-summary {
    grid-template-columns: repeat(3, 1fr);
  }

  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(auto-fit, minmax(20px, 1fr));
  }
}

/* Print styles */
@media print {
  .personnel-manager {
    background: white !important;
  }

  .manager-header,
  .filters-section,
  .personnel-table-section,
  .attendance-calendar {
    box-shadow: none !important;
    border: 1px solid #ddd !important;
    background: white !important;
  }

  .header-controls,
  .filter-group {
    display: none !important;
  }

  .calendar-days-header,
  .calendar-attendance {
    grid-template-columns: repeat(31, 1fr) !important;
    gap: 1px !important;
  }

  .day-header,
  .attendance-day {
    min-height: 20px !important;
    font-size: 0.5rem !important;
  }
}
</style>