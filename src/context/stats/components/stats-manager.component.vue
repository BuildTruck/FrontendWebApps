<script>
import ChartCardComponent from "./chart-card.component.vue";
import AppButton from '../../../core/components/AppButton.vue';
import AppInput from '../../../core/components/AppInput.vue';
import AppNotification from '../../../core/components/AppNotification.vue';

import { statsService } from '../services/stats-api.service.js';
import { Stats } from "../model/stats.entity.js";

export default {
  name: 'ManagerStats',
  components: {
    ChartCardComponent,
    AppButton,
    AppInput,
    AppNotification
  },
  data() {
    return {
      loading: false,
      refreshing: false,
      error: null,
      stats: null,
      alerts: [],
      comparison: null,
      selectedPeriod: 'CURRENT_MONTH',
      customStartDate: null,
      customEndDate: null,
      showGoalsDialog: false,
      savingGoals: false,
      goalForm: {
        targetProjects: null,
        targetPersonnel: null,
        maxIncidents: null,
        budgetLimit: null,
        targetEfficiency: null
      },
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success'
    };
  },
  computed: {
    periodOptions() {
      return [
        { value: 'CURRENT_MONTH', label: this.$t('stats.currentMonth') },
        { value: 'CURRENT_QUARTER', label: this.$t('stats.currentQuarter') },
        { value: 'CURRENT_YEAR', label: this.$t('stats.currentYear') },
        { value: 'LAST_30_DAYS', label: this.$t('stats.last30Days') },
        { value: 'LAST_90_DAYS', label: this.$t('stats.last90Days') },
        { value: 'CUSTOM', label: this.$t('stats.customPeriod') }
      ];
    },

    // Datos para gráficos específicos
    projectsSummaryData() {
      if (!this.stats) return null;
      return {
        labels: [this.$t('stats.activeProjects'), this.$t('stats.completedProjects'), this.$t('stats.projectsPlanned')],
        datasets: [{
          data: [this.stats.activeProjects, this.stats.completedProjects, this.stats.totalProjects - this.stats.activeProjects - this.stats.completedProjects]
        }]
      };
    },

    performanceSummaryData() {
      if (!this.stats) return null;
      const performance = this.stats.getOverallPerformance ? this.stats.getOverallPerformance() : 0;
      return {
        labels: [this.$t('stats.achievement'), this.$t('stats.remaining')],
        datasets: [{
          data: [performance, 100 - performance]
        }]
      };
    },

    projectsChartData() {
      if (!this.stats?.projectsByStatus) return null;
      return {
        labels: Object.keys(this.stats.projectsByStatus),
        datasets: [{
          data: Object.values(this.stats.projectsByStatus)
        }]
      };
    },

    incidentsChartData() {
      if (!this.stats?.incidentsBySeverity) return null;
      return {
        labels: Object.keys(this.stats.incidentsBySeverity),
        datasets: [{
          data: Object.values(this.stats.incidentsBySeverity)
        }]
      };
    },

    personnelChartData() {
      if (!this.stats?.personnelByType) return null;
      return {
        labels: Object.keys(this.stats.personnelByType),
        datasets: [{
          data: Object.values(this.stats.personnelByType)
        }]
      };
    },

    materialsChartData() {
      if (!this.stats?.materialsByCategory) return null;
      return {
        labels: Object.keys(this.stats.materialsByCategory),
        datasets: [{
          data: Object.values(this.stats.materialsByCategory)
        }]
      };
    },

    machineryChartData() {
      if (!this.stats?.machineryByStatus) return null;
      return {
        labels: Object.keys(this.stats.machineryByStatus),
        datasets: [{
          data: Object.values(this.stats.machineryByStatus)
        }]
      };
    },

    costsTimelineData() {
      if (!this.stats?.costsOverTime || !Array.isArray(this.stats.costsOverTime)) {
        // Generar datos de ejemplo si no existen
        return this.generateTimelineData('costs');
      }
      return {
        labels: this.stats.costsOverTime.map(item => item.period || item.date),
        datasets: [{
          label: this.$t('stats.totalMaterialCost'),
          data: this.stats.costsOverTime.map(item => item.amount || item.value)
        }]
      };
    },

    incidentsTimelineData() {
      if (!this.stats?.incidentsOverTime || !Array.isArray(this.stats.incidentsOverTime)) {
        return this.generateTimelineData('incidents');
      }
      return {
        labels: this.stats.incidentsOverTime.map(item => item.period || item.date),
        datasets: [{
          label: this.$t('stats.totalIncidents'),
          data: this.stats.incidentsOverTime.map(item => item.count || item.value)
        }]
      };
    },

    performanceRadarData() {
      if (!this.stats) return null;

      const metrics = [
        { label: this.$t('stats.projects'), current: this.getProjectsScore(), target: 100 },
        { label: this.$t('stats.personnel'), current: this.stats.getPersonnelActiveRate?.() || 0, target: 100 },
        { label: this.$t('stats.safetyScore'), current: this.getSafetyScore(), target: 100 },
        { label: this.$t('stats.budgetUtilization'), current: this.getBudgetScore(), target: 100 },
        { label: this.$t('stats.machineryAvailability'), current: this.stats.getMachineryAvailabilityRate?.() || 0, target: 100 }
      ];

      return {
        labels: metrics.map(m => m.label),
        datasets: [
          {
            label: this.$t('stats.current'),
            data: metrics.map(m => m.current),
            backgroundColor: 'rgba(255, 95, 1, 0.2)',
            borderColor: '#FF5F01',
            borderWidth: 2
          },
          {
            label: this.$t('stats.target'),
            data: metrics.map(m => m.target),
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            borderColor: '#22c55e',
            borderWidth: 2
          }
        ]
      };
    }
  },

  async mounted() {
    await this.loadStats();
  },

  watch: {
    stats: {
      handler(newStats) {
        if (newStats) {
          this.goalForm = {
            targetProjects: newStats.targetProjects,
            targetPersonnel: newStats.targetPersonnel,
            maxIncidents: newStats.maxIncidents,
            budgetLimit: newStats.budgetLimit,
            targetEfficiency: newStats.targetEfficiency
          };
        }
      },
      immediate: true
    }
  },

  methods: {
    async getCurrentManagerId() {
      try {
        const managerId = await statsService.getCurrentManagerId();
        return managerId;
      } catch (error) {
        console.error('❌ Error obteniendo Manager ID:', error);
        return null;
      }
    },

    async loadStats() {
      try {
        this.loading = true;
        this.error = null;

        const managerId = await this.getCurrentManagerId();
        if (!managerId) {
          throw new Error('Manager ID not found in session');
        }

        const params = {
          period: this.selectedPeriod,
          startDate: this.customStartDate,
          endDate: this.customEndDate
        };

        // 🎯 CARGAR STATS UNA SOLA VEZ
        const statsData = await statsService.getManagerStats(managerId, params);

        // 🚨 Generar alertas sin API calls adicionales
        const alertsData = this.generateAlerts(statsData);

        // 📊 Generar comparación básica
        const comparisonData = this.generateComparison(statsData);

        this.stats = statsData;
        this.alerts = alertsData;
        this.comparison = comparisonData;

      } catch (err) {
        console.error('❌ Error loading stats:', err);
        this.error = err.message;
        this.showNotificationMessage(this.$t('stats.errorLoading'), 'error');
      } finally {
        this.loading = false;
      }
    },

    generateAlerts(stats) {
      const alerts = [];

      if (stats.criticalIncidents > 0) {
        alerts.push({
          type: 'CRITICAL',
          title: 'Incidentes Críticos',
          message: `Hay ${stats.criticalIncidents} incidente(s) crítico(s) que requieren atención inmediata`,
          count: stats.criticalIncidents,
          priority: 'HIGH',
          icon: 'pi-exclamation-triangle',
          color: '#ef4444'
        });
      }

      if (stats.budgetLimit && stats.totalMaterialCost > stats.budgetLimit * 0.9) {
        const percentage = Math.round((stats.totalMaterialCost / stats.budgetLimit) * 100);
        alerts.push({
          type: 'BUDGET',
          title: 'Límite de Presupuesto',
          message: `Presupuesto al ${percentage}% del límite establecido`,
          percentage,
          priority: percentage > 100 ? 'HIGH' : 'MEDIUM',
          icon: 'pi-dollar',
          color: percentage > 100 ? '#ef4444' : '#f59e0b'
        });
      }

      if (stats.criticalIncidents === 0 && stats.totalIncidents < 3) {
        alerts.push({
          type: 'SUCCESS',
          title: 'Excelente Seguridad',
          message: 'Muy pocos incidentes este período. ¡Buen trabajo!',
          priority: 'LOW',
          icon: 'pi-shield',
          color: '#22c55e'
        });
      }

      return alerts.sort((a, b) => {
        const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    },

    generateComparison(stats) {
      return {
        projects: {
          label: 'Proyectos',
          current: stats.totalProjects,
          previous: 0,
          change: 0,
          percentChange: 0,
          trend: 'stable',
          icon: 'pi-briefcase',
          color: '#6b7280'
        },
        personnel: {
          label: 'Personal Activo',
          current: stats.activePersonnel,
          previous: 0,
          change: 0,
          percentChange: 0,
          trend: 'stable',
          icon: 'pi-users',
          color: '#6b7280'
        }
      };
    },

    calculatePercentChange(oldValue, newValue) {
      if (oldValue === 0) return newValue > 0 ? 100 : 0;
      return Math.round(((newValue - oldValue) / oldValue) * 100);
    },

    async refreshStats() {
      try {
        this.refreshing = true;

        // 🔄 Forzar recálculo (ignora cache)
        const managerId = await this.getCurrentManagerId();
        const params = {
          period: this.selectedPeriod,
          startDate: this.customStartDate,
          endDate: this.customEndDate,
          forceRefresh: true // Flag para ignorar cache
        };

        const statsData = await statsService.calculateManagerStats(managerId, params);
        const alertsData = await statsService.getAlerts(managerId);
        const comparisonData = await statsService.getPerformanceComparison(managerId);

        // 💾 Guardar los nuevos datos
        if (statsData.id) {
          await statsService.update(statsData.id, statsData);
        } else {
          await statsService.create(statsData);
        }

        this.stats = statsData;
        this.alerts = alertsData;
        this.comparison = comparisonData;

        this.showNotificationMessage(this.$t('stats.dataRefreshed'), 'success');
      } catch (err) {
        console.error('Error refreshing stats:', err);
        this.showNotificationMessage(this.$t('stats.errorLoading'), 'error');
      } finally {
        this.refreshing = false;
      }
    },

    onPeriodChange() {
      if (this.selectedPeriod !== 'CUSTOM') {
        this.customStartDate = null;
        this.customEndDate = null;
      }
      this.loadStats();
    },

    onCustomDateChange() {
      if (this.customStartDate && this.customEndDate) {
        this.loadStats();
      }
    },

    async saveGoals() {
      try {
        this.savingGoals = true;
        const managerId = await this.getCurrentManagerId();

        if (!managerId) {
          throw new Error('Manager ID not found');
        }

        await statsService.updateGoals(managerId, this.goalForm);

        this.showGoalsDialog = false;
        this.showNotificationMessage(this.$t('stats.goals.goalsUpdated'), 'success');

        await this.loadStats();
      } catch (err) {
        console.error('Error saving goals:', err);
        this.showNotificationMessage('Error saving goals', 'error');
      } finally {
        this.savingGoals = false;
      }
    },

    async exportToExcel() {
      try {
        if (!this.stats) {
          throw new Error('No stats data to export');
        }
        await statsService.exportToExcel(this.stats, 'estadisticas_manager');
        this.showNotificationMessage(this.$t('stats.export.exportSuccessful'), 'success');
      } catch (err) {
        console.error('Error exporting:', err);
        this.showNotificationMessage(this.$t('stats.export.exportError'), 'error');
      }
    },

    // Formateo de datos
    formatCurrency(amount) {
      return Stats.formatCurrency(amount);
    },

    formatMetricValue(value, key) {
      if (key === 'costs') {
        return this.formatCurrency(value);
      }
      return typeof value === 'number' ? value.toLocaleString('es-PE') : value;
    },

    // Cálculos para gráficos
    getProjectsScore() {
      if (!this.stats) return 0;
      return this.stats.getProjectsCompletionRate?.() || 0;
    },

    getSafetyScore() {
      if (!this.stats) return 100;
      if (this.stats.totalPersonnel === 0) return 100;
      const incidentRate = (this.stats.totalIncidents / this.stats.totalPersonnel) * 100;
      return Math.max(0, 100 - incidentRate);
    },

    getBudgetScore() {
      if (!this.stats || !this.stats.budgetLimit) return 100;
      const utilization = (this.stats.totalMaterialCost / this.stats.budgetLimit) * 100;
      return Math.max(0, 100 - Math.max(0, utilization - 100));
    },

    generateTimelineData(type) {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
      const data = months.map(month => ({
        period: month,
        value: type === 'costs'
            ? Math.floor(Math.random() * 50000) + 10000
            : Math.floor(Math.random() * 10) + 1
      }));

      return {
        labels: data.map(item => item.period),
        datasets: [{
          label: type === 'costs' ? this.$t('stats.totalMaterialCost') : this.$t('stats.totalIncidents'),
          data: data.map(item => item.value)
        }]
      };
    },

    // Variantes de UI
    getIncidentsVariant() {
      if (!this.stats) return 'info';
      if (this.stats.criticalIncidents > 0) return 'danger';
      if (this.stats.totalIncidents > 5) return 'warning';
      return 'success';
    },

    getIncidentsBadge() {
      if (!this.stats) return null;
      if (this.stats.criticalIncidents === 0) {
        return {
          type: 'success',
          icon: 'pi-check',
          text: this.$t('stats.alerts.excellentSafety')
        };
      }
      return null;
    },

    getPerformanceBadge() {
      if (!this.stats || !this.stats.getOverallPerformance) return null;

      const performance = this.stats.getOverallPerformance();
      if (performance === null || performance === undefined) return null;

      if (performance >= 90) {
        return { type: 'success', text: this.$t('stats.goals.achievedGoal') };
      }
      if (performance < 70) {
        return { type: 'warning', text: this.$t('stats.goals.belowGoal') };
      }
      return null;
    },

    // Notificaciones
    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    }
  }
};
</script>

<template>
  <div class="manager-stats">
    <!-- Header con controles -->
    <div class="stats-header">
      <div class="header-content">
        <div class="header-title">
          <h1>{{ $t('stats.dashboard') }}</h1>
          <p class="header-subtitle">{{ $t('stats.subtitle') }}</p>
        </div>

        <!-- Filtros de período -->
        <div class="header-filters">
          <AppInput
              v-model="selectedPeriod"
              type="select"
              :label="$t('stats.period')"
              :placeholder="$t('stats.selectPeriod')"
              :options="periodOptions"
              @update:modelValue="onPeriodChange"
              :disabled="loading"
              class="period-select"
          />

          <!-- Fechas personalizadas -->
          <div v-if="selectedPeriod === 'CUSTOM'" class="custom-dates">
            <AppInput
                v-model="customStartDate"
                type="date"
                :label="$t('stats.startDate')"
                @update:modelValue="onCustomDateChange"
                :disabled="loading"
            />
            <AppInput
                v-model="customEndDate"
                type="date"
                :label="$t('stats.endDate')"
                @update:modelValue="onCustomDateChange"
                :disabled="loading"
            />
          </div>
        </div>
      </div>

      <!-- Acciones del header -->
      <div class="header-actions">
        <AppButton
            :label="$t('stats.refreshData')"
            icon="pi pi-refresh"
            variant="secondary"
            @click="refreshStats"
            :loading="refreshing"
            :disabled="loading"
        />

        <AppButton
            :label="$t('stats.export.exportExcel')"
            icon="pi pi-file-excel"
            variant="secondary"
            @click="exportToExcel"
            :disabled="loading || !stats"
        />

        <AppButton
            :label="$t('stats.goals.setGoals')"
            icon="pi pi-cog"
            variant="primary"
            @click="showGoalsDialog = true"
            :disabled="loading"
        />
      </div>
    </div>

    <!-- Alertas del sistema -->
    <div v-if="alerts.length > 0" class="alerts-section">
      <div class="alerts-container">
        <div
            v-for="alert in alerts"
            :key="alert.type"
            class="alert-card"
            :class="`alert-card--${alert.priority.toLowerCase()}`"
        >
          <div class="alert-icon">
            <i :class="['pi', alert.icon]" :style="{ color: alert.color }"></i>
          </div>
          <div class="alert-content">
            <h4 class="alert-title">{{ alert.title }}</h4>
            <p class="alert-message">{{ alert.message }}</p>
          </div>
          <div v-if="alert.count" class="alert-badge">
            {{ alert.count }}
          </div>
        </div>
      </div>
    </div>

    <!-- Cards numéricas importantes (solo 2) - Usando ChartCard como cards simples -->
    <div class="summary-cards" v-if="!loading && stats">
      <ChartCardComponent
          :title="$t('stats.summary')"
          :subtitle="$t('stats.overview')"
          chart-type="doughnut"
          :data="projectsSummaryData"
          :total-value="`${stats.activeProjects}/${stats.totalProjects}`"
          :total-label="$t('stats.projects')"
          variant="primary"
          color-scheme="primary"
          :height="200"
          :footer-text="`${stats.criticalIncidents} ${$t('stats.criticalIncidents').toLowerCase()}`"
          :last-updated="stats.updatedAt"
      />

      <ChartCardComponent
          :title="$t('stats.overallPerformance')"
          :subtitle="$t('stats.efficiency')"
          chart-type="doughnut"
          :data="performanceSummaryData"
          :total-value="stats.getOverallPerformance ? stats.getOverallPerformance() : 0"
          total-label="%"
          variant="success"
          color-scheme="success"
          :height="200"
          :footer-text="$t('stats.goals.achievedGoal')"
      />
    </div>

    <!-- Grid principal de gráficos -->
    <div class="charts-grid" v-if="!loading && stats">
      <!-- Proyectos por estado - Donut Chart -->
      <ChartCardComponent
          :title="$t('stats.projects')"
          :subtitle="$t('stats.projectsByStatus')"
          chart-type="doughnut"
          :data="projectsChartData"
          :total-value="stats.totalProjects"
          :total-label="$t('stats.totalProjects')"
          variant="primary"
          color-scheme="primary"
          :last-updated="stats.updatedAt"
      />

      <!-- Incidentes por severidad - Bar Chart -->
      <ChartCardComponent
          :title="$t('stats.incidents')"
          :subtitle="$t('stats.incidentsBySeverity')"
          chart-type="bar"
          :data="incidentsChartData"
          :total-value="stats.totalIncidents"
          :total-label="$t('stats.totalIncidents')"
          variant="danger"
          color-scheme="danger"
      />

      <!-- Personal por tipo - Pie Chart -->
      <ChartCardComponent
          :title="$t('stats.personnel')"
          :subtitle="$t('stats.personnelByType')"
          chart-type="pie"
          :data="personnelChartData"
          :total-value="stats.totalPersonnel"
          :total-label="$t('stats.totalPersonnel')"
          variant="info"
          color-scheme="cool"
      />

      <!-- Costos en el tiempo - Line Chart -->
      <ChartCardComponent
          :title="$t('stats.materials')"
          :subtitle="$t('stats.totalMaterialCost')"
          chart-type="line"
          :data="costsTimelineData"
          :total-value="formatCurrency(stats.totalMaterialCost)"
          :total-label="$t('stats.totalMaterialCost')"
          variant="warning"
          color-scheme="warning"
          :height="350"
      />

      <!-- Maquinaria por estado - Horizontal Bar -->
      <ChartCardComponent
          :title="$t('stats.machinery')"
          :subtitle="$t('stats.machineryByStatus')"
          chart-type="horizontalBar"
          :data="machineryChartData"
          :total-value="stats.totalMachinery"
          :total-label="$t('stats.totalMachinery')"
          variant="info"
          color-scheme="cool"
      />

      <!-- Incidentes en el tiempo - Line Chart -->
      <ChartCardComponent
          :title="$t('stats.trends')"
          :subtitle="$t('stats.incidents') + ' ' + $t('stats.trends').toLowerCase()"
          chart-type="line"
          :data="incidentsTimelineData"
          variant="warning"
          color-scheme="danger"
          :height="350"
      />

      <!-- Materiales por categoría - Polar Area -->
      <ChartCardComponent
          :title="$t('stats.materials')"
          :subtitle="$t('stats.materialsByCategory')"
          chart-type="polarArea"
          :data="materialsChartData"
          variant="success"
          color-scheme="warm"
      />

      <!-- Performance Radar - Radar Chart -->
      <ChartCardComponent
          :title="$t('stats.performance')"
          :subtitle="$t('stats.comparison.title')"
          chart-type="radar"
          :data="performanceRadarData"
          variant="success"
          color-scheme="default"
          :height="400"
          :footer-text="$t('stats.comparison.subtitle')"
      />
    </div>

    <!-- Comparación de rendimiento -->
    <div v-if="comparison && !loading" class="comparison-section">
      <div class="section-header">
        <h2>{{ $t('stats.comparison.title') }}</h2>
        <p class="section-subtitle">{{ $t('stats.comparison.subtitle') }}</p>
      </div>

      <div class="comparison-grid">
        <div
            v-for="(metric, key) in comparison"
            :key="key"
            class="comparison-card"
        >
          <div class="comparison-header">
            <i :class="['pi', metric.icon]" :style="{ color: metric.color }"></i>
            <h4>{{ metric.label }}</h4>
          </div>

          <div class="comparison-values">
            <div class="current-value">
              <span class="value">{{ formatMetricValue(metric.current, key) }}</span>
              <span class="label">{{ $t('stats.current') }}</span>
            </div>

            <div class="comparison-arrow">
              <i :class="['pi', `pi-arrow-${metric.trend}`]" :style="{ color: metric.color }"></i>
            </div>

            <div class="previous-value">
              <span class="value">{{ formatMetricValue(metric.previous, key) }}</span>
              <span class="label">{{ $t('stats.previous') }}</span>
            </div>
          </div>

          <div class="comparison-change" :style="{ color: metric.color }">
            <span class="change-value">
              {{ metric.change > 0 ? '+' : '' }}{{ formatMetricValue(metric.change, key) }}
            </span>
            <span class="change-percent">
              ({{ metric.percentChange > 0 ? '+' : '' }}{{ metric.percentChange }}%)
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner">
        <i class="pi pi-spin pi-spinner"></i>
      </div>
      <p class="loading-text">{{ $t('stats.loading') }}</p>
    </div>

    <!-- Error state -->
    <div v-if="error && !loading" class="error-container">
      <div class="error-content">
        <i class="pi pi-exclamation-triangle error-icon"></i>
        <h3>{{ $t('stats.errorLoading') }}</h3>
        <p>{{ error }}</p>
        <AppButton
            :label="$t('stats.tryAgain')"
            icon="pi pi-refresh"
            variant="primary"
            @click="loadStats"
        />
      </div>
    </div>

    <!-- Modal de metas -->
    <pv-dialog
        v-model:visible="showGoalsDialog"
        :header="$t('stats.goals.title')"
        modal
        :style="{ width: '500px' }"
    >
      <div class="goals-form">
        <AppInput
            v-model="goalForm.targetProjects"
            type="number"
            :label="$t('stats.goals.targetProjects')"
            :min="0"
        />

        <AppInput
            v-model="goalForm.targetPersonnel"
            type="number"
            :label="$t('stats.goals.targetPersonnel')"
            :min="0"
        />

        <AppInput
            v-model="goalForm.maxIncidents"
            type="number"
            :label="$t('stats.goals.maxIncidents')"
            :min="0"
        />

        <AppInput
            v-model="goalForm.budgetLimit"
            type="number"
            :label="$t('stats.goals.budgetLimit')"
            :min="0"
        />

        <AppInput
            v-model="goalForm.targetEfficiency"
            type="number"
            :label="$t('stats.goals.targetEfficiency')"
            :min="0"
            :max="100"
        />
      </div>

      <template #footer>
        <AppButton
            label="Cancelar"
            variant="secondary"
            @click="showGoalsDialog = false"
        />
        <AppButton
            :label="$t('stats.goals.saveGoals')"
            variant="primary"
            @click="saveGoals"
            :loading="savingGoals"
        />
      </template>
    </pv-dialog>

    <!-- Notificaciones -->
    <AppNotification
        v-model="showNotification"
        :message="notificationMessage"
        :type="notificationType"
        :auto-close="true"
    />
  </div>
</template>

<style scoped>
.manager-stats {
  padding: 1.5rem;
  background-color: #f8f9fa;
  min-height: 100vh;
}

/* Header */
.stats-header {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 2rem;
}

.header-title h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
}

.header-subtitle {
  margin: 0.5rem 0 0 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.header-filters {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.period-select {
  min-width: 200px;
}

.custom-dates {
  display: flex;
  gap: 1rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

/* Alerts */
.alerts-section {
  margin-bottom: 1.5rem;
}

.alerts-container {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.alert-card {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 280px;
  flex-shrink: 0;
  border-left: 4px solid transparent;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.alert-card--high {
  border-left-color: #ef4444;
}

.alert-card--medium {
  border-left-color: #f59e0b;
}

.alert-card--low {
  border-left-color: #22c55e;
}

.alert-icon {
  font-size: 1.25rem;
}

.alert-content {
  flex: 1;
}

.alert-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.alert-message {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.3;
}

.alert-badge {
  background: #FF5F01;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Charts Grid */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Comparison Section */
.comparison-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
  text-align: center;
}

.section-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.section-subtitle {
  margin: 0.5rem 0 0 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.comparison-card {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.comparison-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.comparison-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.comparison-values {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.current-value,
.previous-value {
  text-align: center;
}

.current-value .value,
.previous-value .value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
}

.current-value .label,
.previous-value .label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.comparison-arrow {
  font-size: 1.5rem;
}

.comparison-change {
  text-align: center;
  font-size: 0.875rem;
  font-weight: 600;
}

.change-percent {
  margin-left: 0.25rem;
  opacity: 0.8;
}

/* Loading & Error States */
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.loading-spinner {
  font-size: 2rem;
  color: #FF5F01;
  margin-bottom: 1rem;
}

.loading-text {
  color: #6b7280;
  font-size: 0.875rem;
}

.error-content {
  max-width: 400px;
}

.error-icon {
  font-size: 3rem;
  color: #ef4444;
  margin-bottom: 1rem;
}

.error-content h3 {
  margin: 0 0 0.5rem 0;
  color: #111827;
}

.error-content p {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
}

/* Goals Modal */
.goals-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1rem;
  }

  .summary-cards {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }

  .comparison-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }
}

@media (max-width: 768px) {
  .manager-stats {
    padding: 1rem;
  }

  .stats-header {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .header-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .custom-dates {
    flex-direction: column;
  }

  .header-actions {
    justify-content: center;
  }

  .charts-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .summary-cards {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .comparison-grid {
    grid-template-columns: 1fr;
  }

  .alerts-container {
    flex-direction: column;
    overflow-x: visible;
  }

  .alert-card {
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .comparison-values {
    flex-direction: column;
    gap: 0.5rem;
  }

  .comparison-arrow {
    transform: rotate(90deg);
  }
}
</style>