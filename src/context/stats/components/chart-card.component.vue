<template>
  <div class="chart-card" :class="[`chart-card--${variant}`, { 'chart-card--loading': loading }]">
    <!-- Header -->
    <div class="chart-card__header">
      <div class="chart-card__title-section">
        <h3 class="chart-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="chart-card__subtitle">{{ subtitle }}</p>
      </div>

      <!-- Total value display -->
      <div v-if="totalValue !== null" class="chart-card__total">
        <span class="chart-card__total-value">{{ formattedTotal }}</span>
        <span class="chart-card__total-label">{{ totalLabel }}</span>
      </div>
    </div>

    <!-- Chart Container -->
    <div class="chart-card__content">
      <div class="chart-card__chart-container" :style="{ height: chartHeight }">
        <!-- Loading state -->
        <div v-if="loading" class="chart-card__loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>{{ $t('stats.charts.loadingChart') }}</span>
        </div>

        <!-- Chart -->
        <pv-chart
            v-else-if="hasData"
            :type="normalizedChartType"
            :data="chartData"
            :options="chartOptions"
            class="chart-card__chart"
            @select="handleChartClick"
        />

        <!-- No data state -->
        <div v-else class="chart-card__no-data">
          <i :class="getNoDataIcon()"></i>
          <p>{{ noDataMessage || $t('stats.charts.noDataAvailable') }}</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div v-if="footerText || lastUpdated" class="chart-card__footer">
      <span v-if="footerText" class="chart-card__footer-text">{{ footerText }}</span>
      <span v-if="lastUpdated" class="chart-card__last-updated">
        {{ $t('stats.meta.lastUpdated') }}: {{ formatDate(lastUpdated) }}
      </span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChartCard',

  props: {
    // Básicos
    title: {
      type: String,
      required: true
    },
    subtitle: {
      type: String,
      default: null
    },
    chartType: {
      type: String,
      required: true,
      validator: value => [
        'pie', 'doughnut', 'bar', 'line', 'radar',
        'polarArea', 'horizontalBar', 'scatter', 'bubble'
      ].includes(value)
    },

    // Datos del gráfico
    data: {
      type: Object,
      required: true
    },

    // Configuración del gráfico
    options: {
      type: Object,
      default: () => ({})
    },

    // Variantes de estilo
    variant: {
      type: String,
      default: 'default',
      validator: value => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(value)
    },

    // Tamaño
    height: {
      type: [String, Number],
      default: 300
    },

    // Información adicional
    totalValue: {
      type: [Number, String],
      default: null
    },
    totalLabel: {
      type: String,
      default: 'Total'
    },

    // Footer
    footerText: {
      type: String,
      default: null
    },
    lastUpdated: {
      type: [String, Date],
      default: null
    },

    // Estados
    loading: {
      type: Boolean,
      default: false
    },

    // Mensaje personalizado para sin datos
    noDataMessage: {
      type: String,
      default: null
    }
  },

  emits: ['chartClick'],

  computed: {
    /**
     * Normaliza el tipo de gráfico para PrimeVue
     */
    normalizedChartType() {
      return this.chartType === 'horizontalBar' ? 'bar' : this.chartType;
    },

    /**
     * Datos del gráfico con colores por defecto
     */
    chartData() {
      if (!this.data || this.loading) {
        return this.getEmptyChartData();
      }

      const processedData = { ...this.data };

      // Aplicar colores por defecto si no los tiene
      if (processedData.datasets && processedData.datasets.length > 0) {
        processedData.datasets = processedData.datasets.map((dataset, index) => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || this.getDefaultColors(),
          borderColor: dataset.borderColor || (this.isLineChart ? this.getDefaultColors() : '#ffffff'),
          borderWidth: dataset.borderWidth || (this.isLineChart ? 2 : 1)
        }));
      }

      return processedData;
    },

    /**
     * Opciones del gráfico combinadas
     */
    chartOptions() {
      const baseOptions = this.getBaseOptions();
      const typeSpecificOptions = this.getTypeSpecificOptions();

      return this.mergeDeep(baseOptions, typeSpecificOptions, this.options);
    },

    /**
     * Altura del gráfico
     */
    chartHeight() {
      return typeof this.height === 'number' ? `${this.height}px` : this.height;
    },

    /**
     * Total formateado
     */
    formattedTotal() {
      if (typeof this.totalValue === 'number') {
        return this.totalValue.toLocaleString('es-PE');
      }
      return this.totalValue;
    },

    /**
     * Verifica si hay datos para mostrar
     */
    hasData() {
      if (!this.data || !this.data.datasets) return false;

      return this.data.datasets.some(dataset =>
          dataset.data && dataset.data.length > 0 &&
          dataset.data.some(value => value > 0)
      );
    },

    /**
     * Verifica si es gráfico de línea
     */
    isLineChart() {
      return ['line', 'radar'].includes(this.chartType);
    }
  },

  methods: {
    /**
     * Opciones base para todos los gráficos
     */
    getBaseOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              font: { size: 12 },
              color: '#374151'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#FF5F01',
            borderWidth: 1,
            cornerRadius: 6,
            displayColors: true
          }
        }
      };
    },

    /**
     * Opciones específicas por tipo de gráfico
     */
    getTypeSpecificOptions() {
      switch (this.chartType) {
        case 'pie':
        case 'doughnut':
          return {
            cutout: this.chartType === 'doughnut' ? '60%' : '0%',
            plugins: {
              legend: { position: 'right' }
            }
          };

        case 'bar':
          return {
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#f3f4f6' },
                ticks: { font: { size: 11 }, color: '#6b7280' }
              },
              x: {
                grid: { display: false },
                ticks: { font: { size: 11 }, color: '#6b7280' }
              }
            }
          };

        case 'horizontalBar':
          return {
            indexAxis: 'y',
            scales: {
              x: {
                beginAtZero: true,
                grid: { color: '#f3f4f6' },
                ticks: { font: { size: 11 }, color: '#6b7280' }
              },
              y: {
                grid: { display: false },
                ticks: { font: { size: 11 }, color: '#6b7280' }
              }
            }
          };

        case 'line':
          return {
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: '#f3f4f6' },
                ticks: { font: { size: 11 }, color: '#6b7280' }
              },
              x: {
                grid: { display: false },
                ticks: { font: { size: 11 }, color: '#6b7280' }
              }
            },
            elements: {
              point: { radius: 4, hoverRadius: 8 },
              line: { tension: 0.4 }
            }
          };

        case 'radar':
          return {
            scales: {
              r: {
                beginAtZero: true,
                max: 100,
                grid: { color: '#f3f4f6' },
                pointLabels: {
                  font: { size: 11 },
                  color: '#6b7280'
                },
                ticks: {
                  font: { size: 10 },
                  color: '#6b7280'
                }
              }
            }
          };

        case 'polarArea':
          return {
            scales: {
              r: {
                beginAtZero: true,
                grid: { color: '#f3f4f6' },
                ticks: {
                  display: false
                }
              }
            }
          };

        default:
          return {};
      }
    },

    /**
     * Colores por defecto basados en el branding
     */
    getDefaultColors() {
      return [
        '#FF5F01', // Primary orange
        '#22c55e', // Success green
        '#3b82f6', // Info blue
        '#f59e0b', // Warning yellow
        '#ef4444', // Danger red
        '#8b5cf6', // Purple
        '#06b6d4', // Cyan
        '#f97316', // Orange
        '#84cc16', // Lime
        '#ec4899'  // Pink
      ];
    },

    /**
     * Datos vacíos para estado de carga
     */
    getEmptyChartData() {
      return {
        labels: [''],
        datasets: [{
          data: [1],
          backgroundColor: ['#e5e7eb'],
          borderColor: ['#d1d5db'],
          borderWidth: 1
        }]
      };
    },

    /**
     * Icono para estado sin datos
     */
    getNoDataIcon() {
      const iconMap = {
        pie: 'pi pi-chart-pie',
        doughnut: 'pi pi-chart-pie',
        bar: 'pi pi-chart-bar',
        horizontalBar: 'pi pi-chart-bar',
        line: 'pi pi-chart-line',
        radar: 'pi pi-sitemap',
        polarArea: 'pi pi-chart-pie'
      };

      return iconMap[this.chartType] || 'pi pi-chart-pie';
    },

    /**
     * Maneja clics en el gráfico
     */
    handleChartClick(event) {
      this.$emit('chartClick', event);
    },

    /**
     * Formatea fecha
     */
    formatDate(date) {
      if (!date) return '';

      const d = new Date(date);
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    /**
     * Merge profundo de objetos
     */
    mergeDeep(target, ...sources) {
      if (!sources.length) return target;
      const source = sources.shift();

      if (this.isObject(target) && this.isObject(source)) {
        for (const key in source) {
          if (this.isObject(source[key])) {
            if (!target[key]) Object.assign(target, { [key]: {} });
            this.mergeDeep(target[key], source[key]);
          } else {
            Object.assign(target, { [key]: source[key] });
          }
        }
      }

      return this.mergeDeep(target, ...sources);
    },

    /**
     * Verifica si es objeto
     */
    isObject(item) {
      return item && typeof item === 'object' && !Array.isArray(item);
    }
  }
};
</script>

<style scoped>
.chart-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  min-height: 300px;
  transition: all 0.3s ease;
}

.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.chart-card--loading {
  opacity: 0.7;
}

/* Variantes */
.chart-card--primary {
  border-left: 4px solid #FF5F01;
}

.chart-card--success {
  border-left: 4px solid #22c55e;
}

.chart-card--warning {
  border-left: 4px solid #f59e0b;
}

.chart-card--danger {
  border-left: 4px solid #ef4444;
}

.chart-card--info {
  border-left: 4px solid #3b82f6;
}

/* Header */
.chart-card__header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 1rem;
}

.chart-card__title-section {
  flex: 1;
  min-width: 0;
}

.chart-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  line-height: 1.2;
}

.chart-card__subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.2;
}

.chart-card__total {
  text-align: right;
  flex-shrink: 0;
}

.chart-card__total-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.chart-card__total-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

/* Content */
.chart-card__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chart-card__chart-container {
  position: relative;
  flex: 1;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-card__chart {
  width: 100% !important;
  height: 100% !important;
}

.chart-card__loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.chart-card__loading i {
  font-size: 1.5rem;
  color: #FF5F01;
}

.chart-card__no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  text-align: center;
  padding: 2rem;
}

.chart-card__no-data i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.chart-card__no-data p {
  margin: 0;
  font-size: 0.875rem;
}

/* Footer */
.chart-card__footer {
  border-top: 1px solid #f3f4f6;
  padding-top: 0.75rem;
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.chart-card__footer-text,
.chart-card__last-updated {
  font-size: 0.75rem;
  color: #6b7280;
}

.chart-card__last-updated {
  text-align: right;
}

/* Responsive */
@media (max-width: 768px) {
  .chart-card {
    padding: 1rem;
    min-height: 250px;
  }

  .chart-card__header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .chart-card__total {
    text-align: left;
  }

  .chart-card__chart-container {
    min-height: 150px;
  }

  .chart-card__footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .chart-card__last-updated {
    text-align: left;
  }
}

/* Animaciones */
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

.chart-card__chart {
  animation: fadeIn 0.5s ease-out;
}

/* Mejoras para gráficos específicos */
:deep(.p-chart canvas) {
  border-radius: 8px;
}

/* Estados de hover mejorados */
.chart-card:hover .chart-card__title {
  color: #FF5F01;
}

.chart-card--primary:hover .chart-card__title {
  color: #FF5F01;
}

.chart-card--success:hover .chart-card__title {
  color: #22c55e;
}

.chart-card--warning:hover .chart-card__title {
  color: #f59e0b;
}

.chart-card--danger:hover .chart-card__title {
  color: #ef4444;
}

.chart-card--info:hover .chart-card__title {
  color: #3b82f6;
}
</style>