<script>
import AppButton from "../../../core/components/AppButton.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import { Personnel } from "../models/personnel.entity.js";
import { PersonnelApiService } from "../services/personnel-api.service.js";

export default {
  name: 'PersonnelAttendanceSupervisor',
  components: {
    AppButton,
    AppNotification
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true
    },
    personnel: {
      type: Array,
      default: () => []
    }
  },
  emits: ['attendance-updated'],
  data() {
    return {
      // Attendance data
      attendancePersonnel: [],
      allPersonnel: [],
      loading: false,
      saving: false,

      // Current date
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth() + 1,
      monthDays: [],

      // Filters
      selectedPersonnelType: 'ALL',

      // Notifications
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',

      // Service
      personnelService: new PersonnelApiService(),

      // Context menu for cells
      showContextMenu: false,
      contextMenuPosition: { x: 0, y: 0 },
      selectedCell: null
    };
  },
  computed: {
    attendanceStatuses() {
      return [
        { value: 'X', label: this.$t('personnel.statusX'), color: '#22c55e', description: this.$t('personnel.statusDescX') },
        { value: 'F', label: this.$t('personnel.statusF'), color: '#ef4444', description: this.$t('personnel.statusDescF') },
        { value: 'P', label: this.$t('personnel.statusP'), color: '#3b82f6', description: this.$t('personnel.statusDescP') },
        { value: 'DD', label: this.$t('personnel.statusDD'), color: '#6b7280', description: this.$t('personnel.statusDescDD') },
        { value: 'PD', label: this.$t('personnel.statusPD'), color: '#f97316', description: this.$t('personnel.statusDescPD') }
      ];
    },

    personnelTypeFilterOptions() {
      const types = [
        { value: 'ALL', label: this.$t('personnel.allTypes') },
        { value: 'TECHNICAL', label: this.$t('personnel.typeTechnical') },
        { value: 'SPECIALIST', label: this.$t('personnel.typeSpecialist') },
        { value: 'ADMINISTRATIVE', label: this.$t('personnel.typeAdministrative') },
        { value: 'RENTED_OPERATOR', label: this.$t('personnel.typeRentedOperator') },
        { value: 'LABORER', label: this.$t('personnel.typeLaborer') }
      ];

      if (this.allPersonnel.length > 0) {
        const existingTypes = [...new Set(this.allPersonnel.map(p => p.personnelType))];
        return types.filter(type =>
            type.value === 'ALL' || existingTypes.includes(type.value)
        );
      }

      return types;
    },

    filteredPersonnel() {
      if (this.selectedPersonnelType === 'ALL') {
        return this.allPersonnel;
      }
      return this.allPersonnel.filter(person => person.personnelType === this.selectedPersonnelType);
    }
  },
  async mounted() {
    this.generateMonthDays();
    await this.loadAttendanceData();
    document.addEventListener('click', this.hideContextMenu);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.hideContextMenu);
  },
  watch: {
    personnel: {
      handler() {
        this.loadAttendanceData();
      },
      deep: true
    },

    selectedPersonnelType() {
      this.attendancePersonnel = this.filteredPersonnel.map(p => p.clone());
    }
  },
  methods: {
    generateMonthDays() {
      this.monthDays = Personnel.generateMonthDays(this.currentYear, this.currentMonth);
    },

    async loadAttendanceData() {
      this.loading = true;
      try {
        // SIEMPRE cargar con parámetros de asistencia
        const projectPersonnel = await this.personnelService.getByProject(
            this.projectId,
            true, // includeAttendance
            this.currentYear,
            this.currentMonth
        );

        this.allPersonnel = projectPersonnel
            .filter(p => p.isActive())
            .map(p => {
              const clonedPerson = p.clone();

              // Initialize attendance for current month if not exists
              if (clonedPerson.initializeMonthAttendance) {
                clonedPerson.initializeMonthAttendance(this.currentYear, this.currentMonth);
              }
              if (clonedPerson.calculateMonthlyTotals) {
                clonedPerson.calculateMonthlyTotals(this.currentYear, this.currentMonth);
              }

              return clonedPerson;
            });

        this.attendancePersonnel = this.filteredPersonnel.map(p => p.clone());

      } catch (error) {
        console.error('❌ Error loading attendance:', error);
        this.showNotificationMessage(this.$t('personnel.errorLoadingAttendance'), 'error');
      } finally {
        this.loading = false;
      }
    },

    mapToBackendStatus(frontendStatus) {
      // Mapear estados del frontend a los enum del backend
      const statusMap = {
        'X': 'X',      // Worked day
        'F': 'F',      // Absence
        'P': 'P',      // Compensatory leave
        'DD': 'DD',    // Sunday
        'PD': 'PD',    // Unpaid leave
        '': null       // Empty
      };

      return statusMap[frontendStatus] || null;
    },

    async saveAttendance() {
      this.saving = true;
      try {
        const attendanceUpdates = this.attendancePersonnel.map((person) => {
          const monthKey = `${this.currentYear}-${this.currentMonth.toString().padStart(2, '0')}`;
          const attendanceString = person.monthlyAttendance?.[monthKey] || '';

          const dailyAttendance = {};

          if (attendanceString) {
            const attendanceArray = attendanceString.split('|');

            attendanceArray.forEach((status, index) => {
              if (status && status.trim()) {
                const dayNumber = index + 1;
                const backendStatus = this.mapToBackendStatus(status.trim());

                if (backendStatus) {
                  dailyAttendance[dayNumber] = backendStatus;
                }
              }
            });
          }

          // Skip si no hay datos
          if (Object.keys(dailyAttendance).length === 0) {
            return null;
          }

          return this.personnelService.updateMonthlyAttendance(
              person.id,
              this.currentYear,
              this.currentMonth,
              dailyAttendance
          );
        });

        // Filter out nulls y ejecutar
        const validUpdates = attendanceUpdates.filter(update => update !== null);
        const results = await Promise.allSettled(validUpdates);

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failCount = results.filter(r => r.status === 'rejected').length;

        if (successCount > 0) {
          this.showNotificationMessage(
              `${this.$t('personnel.attendanceSaved')} (${successCount}/${results.length})`,
              failCount > 0 ? 'warning' : 'success'
          );
          this.$emit('attendance-updated', this.attendancePersonnel);
        } else {
          this.showNotificationMessage(this.$t('personnel.errorSavingAttendance'), 'error');
        }

      } catch (error) {
        console.error('❌ Error saving attendance:', error);
        this.showNotificationMessage(this.$t('personnel.errorSavingAttendance'), 'error');
      } finally {
        this.saving = false;
      }
    },


    handleCellClick(person, day, event) {
      event.preventDefault();
      event.stopPropagation();

      this.selectedCell = { person, day };
      this.showContextMenu = true;
      this.contextMenuPosition = {
        x: event.clientX,
        y: event.clientY
      };
    },

    setAttendanceStatus(status) {
      if (!this.selectedCell) return;

      const { person, day } = this.selectedCell;

      try {
        if (person.setDayAttendance) {
          person.setDayAttendance(this.currentYear, this.currentMonth, day.day, status);
        } else {
          // Fallback: direct manipulation
          const monthKey = `${this.currentYear}-${this.currentMonth.toString().padStart(2, '0')}`;
          if (!person.monthlyAttendance) person.monthlyAttendance = {};

          let attendanceString = person.monthlyAttendance[monthKey] || '';
          const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

          const attendanceArray = attendanceString.split('|');
          while (attendanceArray.length < daysInMonth) {
            attendanceArray.push('');
          }

          attendanceArray[day.day - 1] = status || '';
          person.monthlyAttendance[monthKey] = attendanceArray.join('|');
        }

        // Update in allPersonnel to maintain sync
        const originalPerson = this.allPersonnel.find(p => p.id === person.id);
        if (originalPerson && originalPerson.setDayAttendance) {
          originalPerson.setDayAttendance(this.currentYear, this.currentMonth, day.day, status);
        } else if (originalPerson) {
          originalPerson.monthlyAttendance = { ...person.monthlyAttendance };
        }

        this.hideContextMenu();
        this.$forceUpdate();

      } catch (error) {
        this.showNotificationMessage(this.$t('personnel.errorSavingAttendance'), 'error');
      }
    },

    hideContextMenu() {
      this.showContextMenu = false;
      this.selectedCell = null;
    },

    getAttendanceStatus(person, day) {
      if (person.getDayAttendance) {
        return person.getDayAttendance(this.currentYear, this.currentMonth, day.day);
      }

      // Fallback
      const monthKey = `${this.currentYear}-${this.currentMonth.toString().padStart(2, '0')}`;
      const attendanceString = person.monthlyAttendance?.[monthKey] || '';

      if (!attendanceString) {
        return day.isSunday ? 'DD' : '';
      }

      const attendanceArray = attendanceString.split('|');
      const status = attendanceArray[day.day - 1] || '';
      return status || (day.isSunday ? 'DD' : '');
    },

    getAttendanceColor(status, day = null) {
      if (day?.isSunday && (!status || status === 'DD')) {
        return '#6b7280';
      }

      const statusInfo = this.attendanceStatuses.find(s => s.value === status);
      return statusInfo ? statusInfo.color : '#f3f4f6';
    },

    getAttendanceLabel(status) {
      const statusInfo = this.attendanceStatuses.find(s => s.value === status);
      return statusInfo ? statusInfo.description : status;
    },

    changeMonth(direction) {
      if (direction === 'prev') {
        if (this.currentMonth === 1) {
          this.currentMonth = 12;
          this.currentYear--;
        } else {
          this.currentMonth--;
        }
      } else {
        if (this.currentMonth === 12) {
          this.currentMonth = 1;
          this.currentYear++;
        } else {
          this.currentMonth++;
        }
      }

      this.generateMonthDays();
      this.loadAttendanceData();
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    },

    getMonthName() {
      const monthKeys = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const monthKey = monthKeys[this.currentMonth - 1];
      return this.$t(`personnel.${monthKey}`);
    },

    getTotalsForPerson(person) {
      return {
        worked: person.workedDays,
        compensatory: person.compensatoryDays,
        unpaidLeave: person.unpaidLeave,
        absences: person.absences,
        sundays: person.sundays,
        total: person.totalDays,
        amount: person.totalAmount
      };
    },

    formatCurrency(amount) {
      if (!amount && amount !== 0) return '';
      return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN'
      }).format(amount);
    }
  }
};
</script>

<template>
  <div class="attendance-container">
    <!-- Header with month navigation -->
    <div class="attendance-header">
      <div class="month-navigation">
        <AppButton
            icon="pi pi-chevron-left"
            variant="secondary"
            size="small"
            @click="changeMonth('prev')"
            :disabled="loading"
        />
        <h2 class="month-title">{{ getMonthName() }} {{ currentYear }}</h2>
        <AppButton
            icon="pi pi-chevron-right"
            variant="secondary"
            size="small"
            @click="changeMonth('next')"
            :disabled="loading"
        />
      </div>

      <div class="attendance-actions">
        <div class="personnel-type-filter">
          <label class="filter-label">{{ $t('personnel.filterByType') }}:</label>
          <select
              v-model="selectedPersonnelType"
              class="type-select"
              :disabled="loading"
          >
            <option
                v-for="option in personnelTypeFilterOptions"
                :key="option.value"
                :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="active-count">
          <span class="count-label">{{ $t('personnel.activePersonnelForAttendance') }}:</span>
          <span class="count-number">{{ attendancePersonnel.length }}</span>
        </div>

        <AppButton
            :label="$t('personnel.saveAttendance')"
            icon="pi pi-save"
            variant="primary"
            :loading="saving"
            :disabled="loading"
            @click="saveAttendance"
        />
      </div>
    </div>

    <!-- Status legend -->
    <div class="attendance-legend">
      <h3 class="legend-title">{{ $t('personnel.legend') }}:</h3>
      <div class="legend-items">
        <div
            v-for="status in attendanceStatuses"
            :key="status.value"
            class="legend-item"
        >
          <div
              class="legend-color"
              :style="{ backgroundColor: status.color }"
          ></div>
          <span class="legend-label">
            {{ status.label }} ({{ status.value }})
          </span>
        </div>
      </div>
    </div>

    <!-- Attendance table -->
    <div class="attendance-table-container" v-if="!loading">
      <table class="attendance-table">
        <thead>
        <tr>
          <th class="name-column">{{ $t('personnel.name') }}</th>
          <th
              v-for="day in monthDays"
              :key="day.date"
              class="day-column"
              :class="{ 'sunday': day.isSunday }"
          >
            <div class="day-header">
              <span class="day-number">{{ day.day }}</span>
              <span class="day-name">{{ day.dayName }}</span>
            </div>
          </th>
          <th class="totals-column">{{ $t('personnel.workedDays') }}</th>
          <th class="totals-column">{{ $t('personnel.compensatoryDays') }}</th>
          <th class="totals-column">{{ $t('personnel.leaves') }}</th>
          <th class="totals-column">{{ $t('personnel.absences') }}</th>
          <th class="totals-column">{{ $t('personnel.sundays') }}</th>
          <th class="totals-column">{{ $t('personnel.total') }}</th>
          <th class="totals-column">{{ $t('personnel.amount') }}</th>
        </tr>
        </thead>
        <tbody>
        <tr
            v-for="person in attendancePersonnel"
            :key="person.id"
            class="attendance-row"
        >
          <td class="name-cell">
            <div class="person-info">
              <span class="person-name">{{ person.name }} {{ person.lastname }}</span>
              <span class="person-dni">{{ person.documentNumber }}</span>
            </div>
          </td>
          <td
              v-for="day in monthDays"
              :key="`${person.id}-${day.date}`"
              class="attendance-cell"
              :class="{
                'sunday': day.isSunday,
                'clickable': true
              }"
              :style="{
                backgroundColor: getAttendanceColor(getAttendanceStatus(person, day), day),
                color: 'white'
              }"
              @click="handleCellClick(person, day, $event)"
              @mousedown.prevent
              :title="getAttendanceLabel(getAttendanceStatus(person, day))"
          >
            {{ getAttendanceStatus(person, day) }}
          </td>
          <td class="totals-cell">{{ getTotalsForPerson(person).worked }}</td>
          <td class="totals-cell">{{ getTotalsForPerson(person).compensatory }}</td>
          <td class="totals-cell">{{ getTotalsForPerson(person).unpaidLeave }}</td>
          <td class="totals-cell">{{ getTotalsForPerson(person).absences }}</td>
          <td class="totals-cell">{{ getTotalsForPerson(person).sundays }}</td>
          <td class="totals-cell total">{{ getTotalsForPerson(person).total }}</td>
          <td class="totals-cell amount">{{ formatCurrency(getTotalsForPerson(person).amount) }}</td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner"></i>
      <p>{{ $t('personnel.loadingAttendance') }}</p>
    </div>

    <!-- Context menu -->
    <div
        v-if="showContextMenu"
        class="context-menu"
        :style="{
        left: contextMenuPosition.x + 'px',
        top: contextMenuPosition.y + 'px'
      }"
        @click.stop
    >
      <div class="context-menu-header">{{ $t('personnel.markAs') }}:</div>
      <button
          v-for="status in attendanceStatuses"
          :key="status.value"
          class="context-menu-item"
          @click="setAttendanceStatus(status.value)"
      >
        <div
            class="status-indicator"
            :style="{ backgroundColor: status.color }"
        ></div>
        <span class="status-code">{{ status.value }}</span>
      </button>
      <button
          class="context-menu-item clear"
          @click="setAttendanceStatus('')"
      >
        <div class="status-indicator empty"></div>
        <span class="status-code">{{ $t('personnel.clear') }}</span>
      </button>
    </div>

    <!-- Notifications -->
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
.attendance-container {
  padding: 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.attendance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.month-navigation {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.month-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  min-width: 200px;
  text-align: center;
}

.attendance-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.personnel-type-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}

.type-select {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  color: #333;
  background-color: white;
  min-width: 160px;
  cursor: pointer;
}

.type-select:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 2px rgba(255, 95, 1, 0.2);
}

.type-select:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.active-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.count-label {
  font-size: 0.875rem;
  color: #666;
}

.count-number {
  font-weight: 600;
  color: #FF5F01;
  font-size: 1rem;
}

/* Legend */
.attendance-legend {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.legend-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.legend-items {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.legend-label {
  font-size: 0.875rem;
  color: #666;
}

/* Attendance table */
.attendance-table-container {
  flex: 1;
  overflow: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.attendance-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
}

.attendance-table th,
.attendance-table td {
  border: 1px solid #e0e0e0;
  text-align: center;
  vertical-align: middle;
}

.attendance-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 10;
}

.name-column {
  width: 200px;
  min-width: 200px;
  text-align: left !important;
  padding: 0.75rem;
  position: sticky;
  left: 0;
  background-color: #f8f9fa !important;
  z-index: 11;
}

.day-column {
  width: 40px;
  min-width: 40px;
  padding: 0.5rem 0.25rem;
}

.day-column.sunday {
  background-color: #f0f0f0;
}

.day-header {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.day-number {
  font-weight: 600;
  font-size: 0.875rem;
}

.day-name {
  font-size: 0.625rem;
  color: #666;
}

.totals-column {
  width: 80px;
  min-width: 80px;
  padding: 0.5rem;
  background-color: #f8f9fa;
}

/* Data cells */
.name-cell {
  padding: 0.75rem;
  text-align: left;
  position: sticky;
  left: 0;
  background-color: white;
  z-index: 5;
}

.person-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.person-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.person-dni {
  font-size: 0.75rem;
  color: #666;
}

.attendance-cell {
  padding: 0.5rem 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  font-size: 0.875rem;
  user-select: none;
  position: relative;
}

.attendance-cell.clickable {
  cursor: pointer;
}

.attendance-cell:hover {
  transform: scale(1.1);
  z-index: 2;
  border: 2px solid #FF5F01;
  box-shadow: 0 2px 8px rgba(255, 95, 1, 0.3);
}


.totals-cell {
  padding: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  background-color: #fafafa;
}

.totals-cell.total {
  background-color: #e3f2fd;
  color: #1976d2;
}

.totals-cell.amount {
  background-color: #e8f5e8;
  color: #2e7d32;
  font-weight: 700;
}

/* Context menu */
.context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid #e0e0e0;
  z-index: 1000;
  min-width: 120px;
  overflow: hidden;
}

.context-menu-header {
  padding: 0.5rem 0.75rem;
  background-color: #f8f9fa;
  font-weight: 600;
  font-size: 0.75rem;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  text-align: center;
}

.context-menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.875rem;
}

.context-menu-item:hover {
  background-color: #f5f5f5;
}

.context-menu-item.clear:hover {
  background-color: #ffeaa7;
}

.status-indicator {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.status-indicator.empty {
  background-color: white;
}

.status-code {
  font-weight: 600;
  font-size: 0.875rem;
  min-width: 30px;
  text-align: center;
}

/* Loading state */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #666;
}

.loading-state i {
  font-size: 2rem;
  color: #FF5F01;
}

/* Responsive */
@media (max-width: 768px) {
  .attendance-container {
    padding: 1rem;
  }

  .attendance-header {
    flex-direction: column;
    align-items: stretch;
  }

  .month-navigation {
    justify-content: center;
  }

  .attendance-actions {
    justify-content: center;
    flex-direction: column;
    gap: 1rem;
  }

  .personnel-type-filter {
    order: -1;
  }

  .legend-items {
    justify-content: center;
  }

  .attendance-table {
    font-size: 0.75rem;
  }

  .name-column {
    width: 150px;
    min-width: 150px;
  }

  .day-column {
    width: 35px;
    min-width: 35px;
  }

  .totals-column {
    width: 60px;
    min-width: 60px;
  }
}
</style>