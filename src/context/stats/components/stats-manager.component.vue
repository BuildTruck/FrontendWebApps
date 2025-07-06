
<script>
import { statsService } from '../services/stats-api.service.js';
import { ManagerStats} from "../model/stats.entity.js";

export default {
  name: 'ManagerStats',

  data() {
    return {
      // Estados de carga
      loading: false,
      refreshing: false,
      calculating: false,
      error: null,

      // Datos principales
      stats: null,
      alerts: [],

      // Filtros de período
      selectedPeriod: 'CURRENT_MONTH',
      customStartDate: null,
      customEndDate: null,

      // Notificaciones
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success'
    };
  },

  computed: {
    /**
     * Opciones de período con i18n
     */
    periodOptions() {
      return [
        { value: 'CURRENT_MONTH', label: this.$t('stats.periods.currentMonth') },
        { value: 'CURRENT_QUARTER', label: this.$t('stats.periods.currentQuarter') },
        { value: 'CURRENT_YEAR', label: this.$t('stats.periods.currentYear') },
        { value: 'LAST_30_DAYS', label: this.$t('stats.periods.last30Days') },
        { value: 'LAST_90_DAYS', label: this.$t('stats.periods.last90Days') },
        { value: 'CUSTOM', label: this.$t('stats.periods.customPeriod') }
      ];
    },

    /**
     * Datos para gráfico de proyectos
     */
    projectsChartData() {
      if (!this.stats?.projectMetrics) return null;
      return {
        labels: Object.keys(this.stats.projectMetrics.projectsByStatus),
        datasets: [{
          data: Object.values(this.stats.projectMetrics.projectsByStatus),
          backgroundColor: ['#FF5F01', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      };
    },

    /**
     * Datos para gráfico de personal
     */
    personnelChartData() {
      if (!this.stats?.personnelMetrics) return null;
      return {
        labels: Object.keys(this.stats.personnelMetrics.personnelByType),
        datasets: [{
          data: Object.values(this.stats.personnelMetrics.personnelByType),
          backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      };
    },

    /**
     * Datos para gráfico de incidentes
     */
    incidentsChartData() {
      if (!this.stats?.incidentMetrics) return null;
      return {
        labels: Object.keys(this.stats.incidentMetrics.incidentsBySeverity),
        datasets: [{
          label: this.$t('stats.incidents.total'),
          data: Object.values(this.stats.incidentMetrics.incidentsBySeverity),
          backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
          borderWidth: 1
        }]
      };
    },

    /**
     * Datos para gráfico de materiales
     */
    materialsChartData() {
      if (!this.stats?.materialMetrics) return null;
      return {
        labels: Object.keys(this.stats.materialMetrics.materialsByCategory),
        datasets: [{
          data: Object.values(this.stats.materialMetrics.materialsByCategory),
          backgroundColor: ['#FF5F01', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      };
    },

    /**
     * Datos para gráfico de maquinaria
     */
    machineryChartData() {
      if (!this.stats?.machineryMetrics) return null;
      return {
        labels: Object.keys(this.stats.machineryMetrics.machineryByStatus),
        datasets: [{
          label: this.$t('stats.machinery.total'),
          data: Object.values(this.stats.machineryMetrics.machineryByStatus),
          backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
          borderWidth: 1
        }]
      };
    },

    /**
     * Datos para gráfico radar de performance
     */
    performanceRadarData() {
      if (!this.stats?.scoreBreakdown) return null;

      const breakdown = this.stats.scoreBreakdown;
      const labels = Object.keys(breakdown);
      const values = Object.values(breakdown);

      return {
        labels: labels,
        datasets: [{
          label: this.$t('stats.performance.score'),
          data: values,
          backgroundColor: 'rgba(255, 95, 1, 0.2)',
          borderColor: '#FF5F01',
          borderWidth: 2,
          pointBackgroundColor: '#FF5F01',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }]
      };
    },

    /**
     * Opciones de configuración para gráficos
     */
    chartOptions() {
      const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              font: { size: 12 }
            }
          }
        }
      };

      return {
        doughnut: {
          ...baseOptions,
          cutout: '60%',
          plugins: {
            ...baseOptions.plugins,
            legend: { ...baseOptions.plugins.legend, position: 'right' }
          }
        },
        pie: {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            legend: { ...baseOptions.plugins.legend, position: 'right' }
          }
        },
        bar: {
          ...baseOptions,
          scales: {
            y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
            x: { grid: { display: false } }
          }
        },
        horizontalBar: {
          ...baseOptions,
          indexAxis: 'y',
          scales: {
            x: { beginAtZero: true, grid: { color: '#f3f4f6' } },
            y: { grid: { display: false } }
          }
        },
        polarArea: baseOptions,
        radar: {
          ...baseOptions,
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              grid: { color: '#f3f4f6' },
              pointLabels: { font: { size: 11 } }
            }
          }
        }
      };
    },

    // Verificadores de datos
    hasProjectData() {
      return this.stats?.projectMetrics?.totalProjects > 0;
    },

    hasPersonnelData() {
      return this.stats?.personnelMetrics?.totalPersonnel > 0;
    },

    hasIncidentData() {
      return this.stats?.incidentMetrics?.totalIncidents > 0;
    },

    hasMaterialData() {
      return this.stats?.materialMetrics?.totalMaterials > 0;
    },

    hasMachineryData() {
      return this.stats?.machineryMetrics?.totalMachinery > 0;
    }
  },

  async mounted() {
    await this.loadStats();
  },

  methods: {
    /**
     * Carga las estadísticas principales
     */
    async loadStats() {
      try {
        this.loading = true;
        this.error = null;

        const managerId = await this.getCurrentManagerId();
        const params = this.buildPeriodParams();

        // Cargar stats actuales
        const stats = await statsService.getManagerStats(managerId, params);
        this.stats = stats;
        this.alerts = stats.alerts || [];

        console.log('✅ Stats cargadas:', stats);
      } catch (err) {
        console.error('❌ Error cargando stats:', err);
        this.error = err.message;
        this.showNotificationMessage(this.$t('stats.errorLoading'), 'error');
      } finally {
        this.loading = false;
      }
    },

    /**
     * Actualiza las estadísticas (sin recalcular)
     */
    async refreshStats() {
      try {
        this.refreshing = true;
        this.error = null;

        const managerId = await this.getCurrentManagerId();
        const params = this.buildPeriodParams();

        const stats = await statsService.getCurrentManagerStats(managerId);
        this.stats = stats;
        this.alerts = stats.alerts || [];

        this.showNotificationMessage(this.$t('stats.dataRefreshed'), 'success');
      } catch (err) {
        console.error('❌ Error refrescando stats:', err);
        this.showNotificationMessage(this.$t('stats.errorLoading'), 'error');
      } finally {
        this.refreshing = false;
      }
    },

    /**
     * Calcula/recalcula las estadísticas
     */
    async calculateStats() {
      try {
        this.calculating = true;
        this.error = null;

        const managerId = await this.getCurrentManagerId();
        const params = this.buildPeriodParams();

        const request = {
          ...params,
          forceRecalculation: true,
          saveHistory: true,
          notes: `Recálculo manual - ${new Date().toLocaleString('es-PE')}`
        };

        const stats = await statsService.calculateManagerStats(managerId, request);
        this.stats = stats;
        this.alerts = stats.alerts || [];

        this.showNotificationMessage(this.$t('stats.dataCalculated'), 'success');
      } catch (err) {
        console.error('❌ Error calculando stats:', err);
        this.showNotificationMessage(this.$t('stats.errorCalculating'), 'error');
      } finally {
        this.calculating = false;
      }
    },

    /**
     * Maneja cambio de período
     */
    onPeriodChange() {
      if (this.selectedPeriod !== 'CUSTOM') {
        this.customStartDate = null;
        this.customEndDate = null;
      }
      this.loadStats();
    },

    /**
     * Maneja cambio de fechas personalizadas
     */
    onCustomDateChange() {
      if (this.customStartDate && this.customEndDate) {
        this.loadStats();
      }
    },

    /**
     * Obtiene el ID del manager actual
     */
    async getCurrentManagerId() {
      try {
        return statsService.getCurrentManagerId();
      } catch (error) {
        throw new Error('No se pudo obtener el ID del manager autenticado');
      }
    },

    /**
     * Construye parámetros de período
     */
    buildPeriodParams() {
      const params = { periodType: this.selectedPeriod };

      if (this.selectedPeriod === 'CUSTOM') {
        params.startDate = this.customStartDate;
        params.endDate = this.customEndDate;
      }

      return params;
    },

    /**
     * Obtiene clase CSS para alerta
     */
    getAlertClass(alert) {
      if (alert.includes('🚨') || alert.includes('crítico') || alert.includes('Crítico')) {
        return 'alert-critical';
      }
      if (alert.includes('⚠️') || alert.includes('limite') || alert.includes('bajo')) {
        return 'alert-warning';
      }
      if (alert.includes('✅') || alert.includes('Excelente') || alert.includes('Buen')) {
        return 'alert-success';
      }
      return 'alert-info';
    },

    /**
     * Obtiene icono para alerta
     */
    getAlertIcon(alert) {
      if (alert.includes('🚨') || alert.includes('crítico')) {
        return 'pi pi-exclamation-triangle';
      }
      if (alert.includes('💰') || alert.includes('presupuesto')) {
        return 'pi pi-dollar';
      }
      if (alert.includes('📦') || alert.includes('stock')) {
        return 'pi pi-box';
      }
      if (alert.includes('🔧') || alert.includes('mantenimiento')) {
        return 'pi pi-cog';
      }
      if (alert.includes('✅') || alert.includes('Excelente')) {
        return 'pi pi-check-circle';
      }
      return 'pi pi-info-circle';
    },

    /**
     * Muestra notificación
     */
    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;

      // Auto-hide después de 5 segundos
      setTimeout(() => {
        this.hideNotification();
      }, 5000);
    },

    /**
     * Oculta notificación
     */
    hideNotification() {
      this.showNotification = false;
    },

    /**
     * Obtiene icono para notificación
     */
    getNotificationIcon() {
      switch (this.notificationType) {
        case 'success': return 'pi pi-check';
        case 'error': return 'pi pi-times';
        case 'warning': return 'pi pi-exclamation-triangle';
        default: return 'pi pi-info';
      }
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
          <h1><i class="pi pi-chart-bar"></i> {{ $t('stats.title') }}</h1>
          <p class="header-subtitle">{{ $t('stats.subtitle') }}</p>
        </div>

        <!-- Filtros de período -->
        <div class="header-filters">
          <div class="filter-group">
            <label>{{ $t('stats.periods.selectPeriod') }}:</label>
            <select
                v-model="selectedPeriod"
                @change="onPeriodChange"
                :disabled="loading"
                class="period-select"
            >
              <option
                  v-for="option in periodOptions"
                  :key="option.value"
                  :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Fechas personalizadas -->
          <div v-if="selectedPeriod === 'CUSTOM'" class="custom-dates">
            <div class="date-group">
              <label>{{ $t('stats.periods.from') }}:</label>
              <input
                  v-model="customStartDate"
                  type="date"
                  @change="onCustomDateChange"
                  :disabled="loading"
              />
            </div>
            <div class="date-group">
              <label>{{ $t('stats.periods.to') }}:</label>
              <input
                  v-model="customEndDate"
                  type="date"
                  @change="onCustomDateChange"
                  :disabled="loading"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Acciones del header -->
      <div class="header-actions">
        <button
            @click="refreshStats"
            :disabled="loading || refreshing"
            class="btn btn-secondary"
        >
          <i class="pi pi-refresh" :class="{ 'pi-spin': refreshing }"></i>
          {{ refreshing ? $t('stats.refreshing') : $t('stats.refresh') }}
        </button>

        <button
            @click="calculateStats"
            :disabled="loading || calculating"
            class="btn btn-primary"
        >
          <i class="pi pi-calculator" :class="{ 'pi-spin': calculating }"></i>
          {{ calculating ? $t('stats.calculating') : $t('stats.recalculate') }}
        </button>
      </div>
    </div>

    <!-- Alertas del sistema -->
    <div v-if="alerts.length > 0" class="alerts-section">
      <div class="alerts-container">
        <div
            v-for="(alert, index) in alerts"
            :key="index"
            class="alert-card"
            :class="getAlertClass(alert)"
        >
          <div class="alert-icon">
            <i :class="getAlertIcon(alert)"></i>
          </div>
          <div class="alert-content">
            <p class="alert-message">{{ alert }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Cards resumen principales -->
    <div class="summary-cards" v-if="!loading && stats">
      <!-- Performance General -->
      <div class="summary-card performance-card">
        <div class="card-header">
          <h3><i class="pi pi-trophy"></i> {{ $t('stats.performance.title') }}</h3>
          <div class="performance-badge" :style="{ backgroundColor: stats.getPerformanceColor() }">
            {{ stats.performanceGrade }}
          </div>
        </div>
        <div class="card-content">
          <div class="performance-score">
            <span class="score-value">{{ stats.overallPerformanceScore.toFixed(1) }}%</span>
            <span class="score-label">{{ $t('stats.performance.score') }}</span>
          </div>
          <div class="performance-status">
            <i :class="stats.getPerformanceIcon()" :style="{ color: stats.getPerformanceColor() }"></i>
            <span>{{ stats.overallStatus }}</span>
          </div>
        </div>
      </div>

      <!-- Proyectos Summary -->
      <div class="summary-card projects-card">
        <div class="card-header">
          <h3><i class="pi pi-briefcase"></i> {{ $t('stats.projects.title') }}</h3>
          <div class="metric-badge">
            {{ stats.projectMetrics.totalProjects }}
          </div>
        </div>
        <div class="card-content">
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-value">{{ stats.projectMetrics.activeProjects }}</span>
              <span class="metric-label">{{ $t('stats.projects.active') }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-value">{{ stats.projectMetrics.completedProjects }}</span>
              <span class="metric-label">{{ $t('stats.projects.completed') }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-value">{{ stats.projectMetrics.completionRate.toFixed(1) }}%</span>
              <span class="metric-label">{{ $t('stats.projects.completionRate') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Safety Summary -->
      <div class="summary-card safety-card">
        <div class="card-header">
          <h3><i class="pi pi-shield"></i> {{ $t('stats.incidents.safety') }}</h3>
          <div class="safety-badge" :style="{ backgroundColor: stats.incidentMetrics.getSafetyIndicator().color }">
            {{ stats.incidentMetrics.safetyScore.toFixed(0) }}
          </div>
        </div>
        <div class="card-content">
          <div class="safety-status">
            <i :class="stats.incidentMetrics.getSafetyIndicator().icon"
               :style="{ color: stats.incidentMetrics.getSafetyIndicator().color }"></i>
            <span>{{ stats.incidentMetrics.safetyStatus }}</span>
          </div>
          <div class="safety-metrics">
            <span v-if="stats.incidentMetrics.criticalIncidents > 0" class="critical-incidents">
              {{ stats.incidentMetrics.criticalIncidents }} {{ $t('stats.incidents.critical').toLowerCase() }}
            </span>
            <span v-else class="no-critical">
              {{ $t('stats.incidents.noIncidents') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Grid principal de gráficos -->
    <div class="charts-grid" v-if="!loading && stats">
      <!-- Proyectos por estado -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>{{ $t('stats.projects.byStatus') }}</h3>
          <div class="chart-total">
            <span class="total-value">{{ stats.projectMetrics.totalProjects }}</span>
            <span class="total-label">{{ $t('stats.projects.total') }}</span>
          </div>
        </div>
        <div class="chart-content">
          <pv-chart
              v-if="hasProjectData"
              type="doughnut"
              :data="projectsChartData"
              :options="chartOptions.doughnut"
              class="chart"
          />
          <div v-else class="no-data">
            <i class="pi pi-chart-pie"></i>
            <p>{{ $t('stats.charts.noDataAvailable') }}</p>
          </div>
        </div>
        <div class="chart-footer">
          <span class="last-updated">{{ $t('stats.meta.lastUpdated') }}: {{ stats.getFormattedCalculatedAt() }}</span>
        </div>
      </div>

      <!-- Personal por tipo -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>{{ $t('stats.personnel.byType') }}</h3>
          <div class="chart-total">
            <span class="total-value">{{ stats.personnelMetrics.totalPersonnel }}</span>
            <span class="total-label">{{ $t('stats.personnel.total') }}</span>
          </div>
        </div>
        <div class="chart-content">
          <pv-chart
              v-if="hasPersonnelData"
              type="pie"
              :data="personnelChartData"
              :options="chartOptions.pie"
              class="chart"
          />
          <div v-else class="no-data">
            <i class="pi pi-users"></i>
            <p>{{ $t('stats.charts.noDataAvailable') }}</p>
          </div>
        </div>
        <div class="chart-footer">
          <div class="metrics-row">
            <span>{{ $t('stats.personnel.attendance') }}: {{ stats.personnelMetrics.averageAttendanceRate.toFixed(1) }}%</span>
            <span>{{ $t('stats.personnel.salary') }}: {{ stats.personnelMetrics.formatSalary() }}</span>
          </div>
        </div>
      </div>

      <!-- Incidentes por severidad -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>{{ $t('stats.incidents.bySeverity') }}</h3>
          <div class="chart-total safety-indicator" :style="{ color: stats.incidentMetrics.getSafetyIndicator().color }">
            <span class="total-value">{{ stats.incidentMetrics.totalIncidents }}</span>
            <span class="total-label">{{ $t('stats.incidents.total') }}</span>
          </div>
        </div>
        <div class="chart-content">
          <pv-chart
              v-if="hasIncidentData"
              type="bar"
              :data="incidentsChartData"
              :options="chartOptions.bar"
              class="chart"
          />
          <div v-else class="no-data success">
            <i class="pi pi-shield"></i>
            <p>{{ $t('stats.incidents.noIncidents') }}</p>
          </div>
        </div>
        <div class="chart-footer">
          <span class="safety-score">{{ $t('stats.incidents.safetyScore') }}: {{ stats.incidentMetrics.safetyScore.toFixed(1) }}%</span>
        </div>
      </div>

      <!-- Materiales por categoría -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>{{ $t('stats.materials.byCategory') }}</h3>
          <div class="chart-total">
            <span class="total-value">{{ stats.materialMetrics.formatCost() }}</span>
            <span class="total-label">{{ $t('stats.materials.cost') }}</span>
          </div>
        </div>
        <div class="chart-content">
          <pv-chart
              v-if="hasMaterialData"
              type="polarArea"
              :data="materialsChartData"
              :options="chartOptions.polarArea"
              class="chart"
          />
          <div v-else class="no-data">
            <i class="pi pi-box"></i>
            <p>{{ $t('stats.charts.noDataAvailable') }}</p>
          </div>
        </div>
        <div class="chart-footer">
          <div class="stock-alerts" v-if="stats.materialMetrics.stockAlerts.length > 0">
            <i class="pi pi-exclamation-triangle"></i>
            <span>{{ stats.materialMetrics.stockAlerts.length }} alertas de stock</span>
          </div>
          <span v-else class="stock-ok">{{ $t('stats.materials.inventory') }}: {{ stats.materialMetrics.inventoryHealthScore.toFixed(0) }}%</span>
        </div>
      </div>

      <!-- Maquinaria por estado -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>{{ $t('stats.machinery.byStatus') }}</h3>
          <div class="chart-total">
            <span class="total-value">{{ stats.machineryMetrics.totalMachinery }}</span>
            <span class="total-label">{{ $t('stats.machinery.total') }}</span>
          </div>
        </div>
        <div class="chart-content">
          <pv-chart
              v-if="hasMachineryData"
              type="horizontalBar"
              :data="machineryChartData"
              :options="chartOptions.horizontalBar"
              class="chart"
          />
          <div v-else class="no-data">
            <i class="pi pi-cog"></i>
            <p>{{ $t('stats.charts.noDataAvailable') }}</p>
          </div>
        </div>
        <div class="chart-footer">
          <span class="availability">{{ $t('stats.machinery.availability') }}: {{ stats.machineryMetrics.activeRate.toFixed(1) }}%</span>
        </div>
      </div>

      <!-- Performance Breakdown -->
      <div class="chart-card performance-breakdown">
        <div class="chart-header">
          <h3>{{ $t('stats.performance.title') }} - Breakdown</h3>
        </div>
        <div class="chart-content">
          <pv-chart
              type="radar"
              :data="performanceRadarData"
              :options="chartOptions.radar"
              class="chart"
          />
        </div>
        <div class="chart-footer">
          <span class="overall-score">{{ $t('stats.performance.score') }}: {{ stats.overallPerformanceScore.toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <!-- Recomendaciones -->
    <div v-if="stats && stats.recommendations.length > 0" class="recommendations-section">
      <div class="section-header">
        <h2><i class="pi pi-lightbulb"></i> {{ $t('stats.recommendations.title') }}</h2>
      </div>
      <div class="recommendations-list">
        <div
            v-for="(recommendation, index) in stats.recommendations"
            :key="index"
            class="recommendation-item"
        >
          <i class="pi pi-lightbulb"></i>
          <span>{{ recommendation }}</span>
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
        <button
            @click="loadStats"
            class="btn btn-primary"
        >
          <i class="pi pi-refresh"></i>
          {{ $t('stats.tryAgain') }}
        </button>
      </div>
    </div>

    <!-- Toast para notificaciones -->
    <div v-if="showNotification" class="toast-notification" :class="notificationType">
      <i :class="getNotificationIcon()"></i>
      <span>{{ notificationMessage }}</span>
      <button @click="hideNotification" class="toast-close">
        <i class="pi pi-times"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.manager-stats {
  padding: 1.5rem;
  background-color: #f9fafb;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Header */
.stats-header {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  flex-wrap: wrap;
}

.filter-group, .date-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label, .date-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.period-select, .date-group input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  min-width: 150px;
}

.period-select:focus, .date-group input:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 3px rgba(255, 95, 1, 0.1);
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

/* Botones */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #FF5F01;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #e54801;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 95, 1, 0.3);
}

.btn-secondary {
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f9fafb;
  border-color: #FF5F01;
  color: #FF5F01;
}

/* Alertas */
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
  min-width: 300px;
  flex-shrink: 0;
  border-left: 4px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.alert-critical {
  border-left-color: #ef4444;
  background-color: #fef2f2;
}

.alert-warning {
  border-left-color: #f59e0b;
  background-color: #fffbeb;
}

.alert-success {
  border-left-color: #22c55e;
  background-color: #f0fdf4;
}

.alert-info {
  border-left-color: #3b82f6;
  background-color: #eff6ff;
}

.alert-icon {
  font-size: 1.25rem;
  color: inherit;
}

.alert-content {
  flex: 1;
}

.alert-message {
  margin: 0;
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.4;
}

/* Cards de resumen */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.performance-badge, .metric-badge, .safety-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  color: white;
  font-weight: 700;
  font-size: 0.875rem;
  min-width: 40px;
  text-align: center;
}

.metric-badge {
  background-color: #FF5F01;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.performance-score {
  text-align: center;
}

.score-value {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.score-label {
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.performance-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.metric-item {
  text-align: center;
}

.metric-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
}

.metric-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.safety-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.safety-metrics {
  text-align: center;
}

.critical-incidents {
  color: #ef4444;
  font-weight: 600;
}

.no-critical {
  color: #22c55e;
  font-weight: 500;
}

/* Grid de gráficos */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 1rem;
}

.chart-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.chart-total {
  text-align: right;
}

.total-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.total-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.safety-indicator .total-value {
  color: inherit;
}

.chart-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 250px;
  position: relative;
}

.chart {
  width: 100%;
  height: 100%;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  text-align: center;
  padding: 2rem;
}

.no-data i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-data.success i {
  color: #22c55e;
  opacity: 1;
}

.no-data p {
  margin: 0;
  font-size: 0.875rem;
}

.chart-footer {
  border-top: 1px solid #f3f4f6;
  padding-top: 1rem;
  margin-top: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.metrics-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.stock-alerts {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f59e0b;
}

.stock-ok {
  color: #22c55e;
}

.safety-score, .availability, .overall-score {
  font-weight: 500;
  color: #374151;
}

.performance-breakdown {
  grid-column: 1 / -1;
}

/* Recomendaciones */
.recommendations-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 2rem;
}

.section-header h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recommendation-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 3px solid #FF5F01;
}

.recommendation-item i {
  color: #FF5F01;
  margin-top: 0.125rem;
  flex-shrink: 0;
}

/* Estados de carga y error */
.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
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

/* Toast de notificaciones */
.toast-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-left: 4px solid #22c55e;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 400px;
  z-index: 1000;
  animation: slideInRight 0.3s ease;
}

.toast-notification.error {
  border-left-color: #ef4444;
}

.toast-notification.warning {
  border-left-color: #f59e0b;
}

.toast-close {
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: #9ca3af;
  margin-left: auto;
}

.toast-close:hover {
  color: #374151;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}


/* Responsive Design */
@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1rem;
  }

  .summary-cards {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
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

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .metrics-row {
    flex-direction: column;
    gap: 0.5rem;
  }

  .alerts-container {
    flex-direction: column;
    overflow-x: visible;
  }

  .alert-card {
    min-width: auto;
  }

  .chart-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .chart-total {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .header-title h1 {
    font-size: 1.5rem;
  }

  .chart-card {
    min-height: 350px;
  }

  .performance-breakdown {
    grid-column: 1;
  }
}

/* Mejoras de accesibilidad */
@media (prefers-reduced-motion: reduce) {
  .summary-card:hover,
  .btn:hover {
    transform: none;
  }

  .toast-notification {
    animation: none;
  }
}



.period-select, .date-group input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(#d1d5db);
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  min-width: 150px;
}

.period-select:focus, .date-group input:focus {
  outline: none;
  border-color: var(#FF5F01);
  box-shadow: 0 0 0 3px rgba(255, 95, 1, 0.1);
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

/* Botones */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* ================================================================
   MANAGER STATS RESPONSIVE
   ================================================================ */

/* Tablets - 1024px y menos */
@media (max-width: 1024px) {
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
    gap: 0.75rem;
  }

  .custom-dates {
    flex-direction: column;
    gap: 0.75rem;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .charts-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1rem;
  }

  .summary-cards {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .alerts-container {
    gap: 0.75rem;
  }

  .alert-card {
    min-width: 280px;
  }

  .recommendations-list {
    gap: 0.5rem;
  }

  .recommendation-item {
    padding: 0.5rem 0.75rem;
  }
}

/* Mobile - 768px y menos */
@media (max-width: 768px) {
  .manager-stats {
    padding: 0.75rem;
  }

  .stats-header {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }

  .header-title h1 {
    font-size: 1.5rem;
  }

  .header-subtitle {
    font-size: 0.8rem;
  }

  .header-filters {
    gap: 0.5rem;
  }

  .period-select,
  .date-group input {
    min-width: auto;
    width: 100%;
  }

  .header-actions {
    gap: 0.5rem;
    justify-content: stretch;
  }

  .btn {
    flex: 1;
    min-width: 0;
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
  }

  /* Summary Cards Mobile */
  .summary-cards {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .summary-card {
    padding: 1rem;
  }

  .card-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .card-header h3 {
    font-size: 0.9rem;
  }

  .performance-badge,
  .metric-badge,
  .safety-badge {
    align-self: flex-start;
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .score-value {
    font-size: 1.75rem;
  }

  .metric-value {
    font-size: 1.1rem;
  }

  /* Charts Grid Mobile */
  .charts-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .chart-card {
    min-height: 320px;
    padding: 1rem;
  }

  .chart-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .chart-header h3 {
    font-size: 0.9rem;
  }

  .chart-total {
    text-align: left;
  }

  .total-value {
    font-size: 1.25rem;
  }

  .total-label {
    font-size: 0.7rem;
  }

  .chart-content {
    min-height: 200px;
  }

  .chart-footer {
    padding-top: 0.5rem;
    margin-top: 0.75rem;
    font-size: 0.7rem;
  }

  .metrics-row {
    flex-direction: column;
    gap: 0.25rem;
  }

  /* Alerts Mobile */
  .alerts-container {
    flex-direction: column;
    overflow-x: visible;
    gap: 0.5rem;
  }

  .alert-card {
    min-width: auto;
    padding: 0.75rem;
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    gap: 0.5rem;
  }

  .alert-icon {
    align-self: center;
  }

  .alert-message {
    font-size: 0.8rem;
  }

  /* Recommendations Mobile */
  .recommendations-section {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .section-header h2 {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }

  .recommendation-item {
    padding: 0.75rem;
    gap: 0.5rem;
    font-size: 0.85rem;
  }

  /* Loading & Error Mobile */
  .loading-container,
  .error-container {
    padding: 2rem 1rem;
  }

  .error-content {
    max-width: 100%;
  }

  .error-icon {
    font-size: 2.5rem;
  }

  .error-content h3 {
    font-size: 1.1rem;
  }

  .error-content p {
    font-size: 0.85rem;
  }

  /* Toast Mobile */
  .toast-notification {
    left: 0.75rem;
    right: 0.75rem;
    top: 10px;
    max-width: none;
    padding: 0.75rem;
    font-size: 0.85rem;
  }
}

/* Mobile Small - 480px y menos */
@media (max-width: 480px) {
  .manager-stats {
    padding: 0.5rem;
  }

  .stats-header {
    padding: 0.5rem;
  }

  .header-title h1 {
    font-size: 1.25rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .header-subtitle {
    font-size: 0.75rem;
  }

  .btn {
    font-size: 0.75rem;
    padding: 0.5rem;
  }

  /* Summary Cards Ultra Mobile */
  .summary-card {
    padding: 0.75rem;
  }

  .card-header h3 {
    font-size: 0.85rem;
  }

  .score-value {
    font-size: 1.5rem;
  }

  .metric-value {
    font-size: 1rem;
  }

  .metric-label,
  .score-label {
    font-size: 0.7rem;
  }

  /* Charts Ultra Mobile */
  .chart-card {
    min-height: 280px;
    padding: 0.75rem;
  }

  .chart-content {
    min-height: 160px;
  }

  .chart-header h3 {
    font-size: 0.85rem;
  }

  .total-value {
    font-size: 1.1rem;
  }

  .no-data i {
    font-size: 2rem;
  }

  .no-data p {
    font-size: 0.8rem;
  }

  /* Performance breakdown full width */
  .performance-breakdown {
    grid-column: 1;
  }

  /* Alerts Ultra Mobile */
  .alert-card {
    padding: 0.5rem;
  }

  .alert-message {
    font-size: 0.75rem;
    line-height: 1.3;
  }

  /* Recommendations Ultra Mobile */
  .recommendations-section {
    padding: 0.75rem;
  }

  .section-header h2 {
    font-size: 1rem;
  }

  .recommendation-item {
    padding: 0.5rem;
    font-size: 0.8rem;
    line-height: 1.3;
  }

  /* Toast Ultra Mobile */
  .toast-notification {
    left: 0.5rem;
    right: 0.5rem;
    padding: 0.5rem;
    font-size: 0.8rem;
  }

  .toast-close {
    padding: 0.25rem;
  }
}

/* Landscape Mobile - altura máxima 500px */
@media (max-height: 500px) and (orientation: landscape) {
  .manager-stats {
    padding: 0.5rem;
  }

  .stats-header {
    margin-bottom: 0.75rem;
  }

  .summary-cards {
    margin-bottom: 1rem;
  }

  .charts-grid {
    margin-bottom: 1rem;
  }

  .chart-card {
    min-height: 250px;
  }

  .chart-content {
    min-height: 140px;
  }

  .recommendations-section {
    margin-bottom: 0.75rem;
  }
}
</style>


