<script>
export default {
  name: 'ChartCardComponent',
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
    width: {
      type: [String, Number],
      default: '100%'
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

    // Comportamiento
    clickable: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },

    // Colores personalizados
    colorScheme: {
      type: String,
      default: 'default',
      validator: value => ['default', 'primary', 'success', 'warning', 'danger', 'cool', 'warm'].includes(value)
    }
  },

  emits: ['click', 'chartClick'],

  computed: {
    chartData() {
      if (this.loading) {
        return this.getEmptyChartData();
      }
      return this.formatChartData(this.data);
    },

    chartOptions() {
      const baseOptions = this.getBaseOptions();
      const typeSpecificOptions = this.getTypeSpecificOptions();
      const userOptions = this.options;

      return this.mergeDeep(baseOptions, typeSpecificOptions, userOptions);
    },

    chartHeight() {
      return typeof this.height === 'number' ? `${this.height}px` : this.height;
    },

    chartWidth() {
      return typeof this.width === 'number' ? `${this.width}px` : this.width;
    },

    colorPalette() {
      return this.getColorPalette(this.colorScheme);
    },

    hasTotal() {
      return this.totalValue !== null && this.totalValue !== undefined;
    },

    formattedTotal() {
      if (typeof this.totalValue === 'number') {
        return this.totalValue.toLocaleString('es-PE');
      }
      return this.totalValue;
    }
  },

  methods: {
    formatChartData(data) {
      if (!data) return this.getEmptyChartData();

      switch (this.chartType) {
        case 'pie':
        case 'doughnut':
        case 'polarArea':
          return this.formatCircularChartData(data);
        case 'bar':
        case 'horizontalBar':
          return this.formatBarChartData(data);
        case 'line':
          return this.formatLineChartData(data);
        case 'radar':
          return this.formatRadarChartData(data);
        default:
          return data;
      }
    },

    formatCircularChartData(data) {
      // Para gráficos circulares: pie, doughnut, polarArea
      if (data.labels && data.datasets) {
        return {
          labels: data.labels,
          datasets: [{
            data: data.datasets[0]?.data || [],
            backgroundColor: this.colorPalette.slice(0, data.labels.length),
            borderColor: '#ffffff',
            borderWidth: 2,
            ...data.datasets[0]
          }]
        };
      }

      // Si viene como objeto { key: value }
      if (typeof data === 'object' && !Array.isArray(data)) {
        const labels = Object.keys(data);
        const values = Object.values(data);

        return {
          labels,
          datasets: [{
            data: values,
            backgroundColor: this.colorPalette.slice(0, labels.length),
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        };
      }

      return this.getEmptyChartData();
    },

    formatBarChartData(data) {
      if (data.labels && data.datasets) {
        return {
          labels: data.labels,
          datasets: data.datasets.map((dataset, index) => ({
            ...dataset,
            backgroundColor: dataset.backgroundColor || this.colorPalette[index % this.colorPalette.length],
            borderColor: dataset.borderColor || this.colorPalette[index % this.colorPalette.length],
            borderWidth: 1
          }))
        };
      }

      // Si viene como objeto { key: value }
      if (typeof data === 'object' && !Array.isArray(data)) {
        const labels = Object.keys(data);
        const values = Object.values(data);

        return {
          labels,
          datasets: [{
            label: this.title,
            data: values,
            backgroundColor: this.colorPalette[0],
            borderColor: this.colorPalette[0],
            borderWidth: 1
          }]
        };
      }

      return this.getEmptyChartData();
    },

    formatLineChartData(data) {
      if (data.labels && data.datasets) {
        return {
          labels: data.labels,
          datasets: data.datasets.map((dataset, index) => ({
            ...dataset,
            borderColor: dataset.borderColor || this.colorPalette[index % this.colorPalette.length],
            backgroundColor: dataset.backgroundColor || `${this.colorPalette[index % this.colorPalette.length]}20`,
            tension: 0.4,
            pointBackgroundColor: dataset.borderColor || this.colorPalette[index % this.colorPalette.length],
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4
          }))
        };
      }

      // Para arrays de datos temporales
      if (Array.isArray(data)) {
        const labels = data.map((item, index) => item.label || item.date || `Punto ${index + 1}`);
        const values = data.map(item => item.value || item.amount || 0);

        return {
          labels,
          datasets: [{
            label: this.title,
            data: values,
            borderColor: this.colorPalette[0],
            backgroundColor: `${this.colorPalette[0]}20`,
            tension: 0.4,
            pointBackgroundColor: this.colorPalette[0],
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4
          }]
        };
      }

      return this.getEmptyChartData();
    },

    formatRadarChartData(data) {
      if (data.labels && data.datasets) {
        return {
          labels: data.labels,
          datasets: data.datasets.map((dataset, index) => ({
            ...dataset,
            backgroundColor: dataset.backgroundColor || `${this.colorPalette[index % this.colorPalette.length]}30`,
            borderColor: dataset.borderColor || this.colorPalette[index % this.colorPalette.length],
            borderWidth: 2,
            pointBackgroundColor: dataset.borderColor || this.colorPalette[index % this.colorPalette.length],
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
          }))
        };
      }

      return this.getEmptyChartData();
    },

    getEmptyChartData() {
      return {
        labels: ['Sin datos'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e5e7eb'],
          borderColor: ['#d1d5db'],
          borderWidth: 1
        }]
      };
    },

    getBaseOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#ffffff',
            borderWidth: 1,
            cornerRadius: 6,
            displayColors: true
          }
        },
        onHover: (event, activeElements) => {
          event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
        },
        onClick: (event, activeElements) => {
          if (activeElements.length > 0) {
            this.$emit('chartClick', {
              element: activeElements[0],
              data: this.chartData,
              event
            });
          }
        }
      };
    },

    getTypeSpecificOptions() {
      switch (this.chartType) {
        case 'pie':
        case 'doughnut':
          return {
            plugins: {
              legend: {
                position: 'right'
              }
            }
          };

        case 'bar':
          return {
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: '#f3f4f6'
                },
                ticks: {
                  font: {
                    size: 11
                  }
                }
              },
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  font: {
                    size: 11
                  }
                }
              }
            }
          };

        case 'horizontalBar':
          return {
            indexAxis: 'y',
            scales: {
              x: {
                beginAtZero: true,
                grid: {
                  color: '#f3f4f6'
                }
              },
              y: {
                grid: {
                  display: false
                }
              }
            }
          };

        case 'line':
          return {
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: '#f3f4f6'
                }
              },
              x: {
                grid: {
                  display: false
                }
              }
            },
            elements: {
              point: {
                hoverRadius: 8
              }
            }
          };

        case 'radar':
          return {
            scales: {
              r: {
                beginAtZero: true,
                grid: {
                  color: '#f3f4f6'
                },
                pointLabels: {
                  font: {
                    size: 11
                  }
                }
              }
            }
          };

        default:
          return {};
      }
    },

    getColorPalette(scheme) {
      const palettes = {
        default: [
          '#FF5F01', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
          '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899'
        ],
        primary: [
          '#FF5F01', '#FF7F01', '#FF9F01', '#FFBF01', '#FFDF01',
          '#FFF001', '#E0E001', '#C0C001', '#A0A001', '#808001'
        ],
        success: [
          '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
          '#84cc16', '#65a30d', '#4d7c0f', '#365314', '#1a2e05'
        ],
        warning: [
          '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f',
          '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'
        ],
        danger: [
          '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d',
          '#f87171', '#fca5a5', '#fecaca', '#fee2e2', '#fef2f2'
        ],
        cool: [
          '#3b82f6', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554',
          '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'
        ],
        warm: [
          '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f',
          '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'
        ]
      };

      return palettes[scheme] || palettes.default;
    },

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

    isObject(item) {
      return item && typeof item === 'object' && !Array.isArray(item);
    },

    handleClick() {
      if (this.clickable && !this.loading) {
        this.$emit('click');
      }
    },

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
    }
  }
};
</script>

<template>
  <div
      class="chart-card"
      :class="[
      `chart-card--${variant}`,
      { 'chart-card--clickable': clickable, 'chart-card--loading': loading }
    ]"
      @click="handleClick"
  >
    <!-- Header -->
    <div class="chart-card__header">
      <div class="chart-card__title-section">
        <h3 class="chart-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="chart-card__subtitle">{{ subtitle }}</p>
      </div>

      <!-- Total value display -->
      <div v-if="hasTotal" class="chart-card__total">
        <span class="chart-card__total-value">{{ formattedTotal }}</span>
        <span class="chart-card__total-label">{{ totalLabel }}</span>
      </div>
    </div>

    <!-- Chart Container -->
    <div class="chart-card__content">
      <div
          class="chart-card__chart-container"
          :style="{ height: chartHeight, width: chartWidth }"
      >
        <div v-if="loading" class="chart-card__loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando gráfico...</span>
        </div>

        <pv-chart
            v-else
            :type="chartType === 'horizontalBar' ? 'bar' : chartType"
            :data="chartData"
            :options="chartOptions"
            class="chart-card__chart"
        />
      </div>
    </div>

    <!-- Footer -->
    <div v-if="footerText || lastUpdated" class="chart-card__footer">
      <span v-if="footerText" class="chart-card__footer-text">{{ footerText }}</span>
      <span v-if="lastUpdated" class="chart-card__last-updated">
        Actualizado: {{ formatDate(lastUpdated) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.chart-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.chart-card--clickable {
  cursor: pointer;
}

.chart-card--clickable:hover {
  border-color: #FF5F01;
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
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
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

/* Footer */
.chart-card__footer {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.chart-card__footer-text,
.chart-card__last-updated {
  font-size: 0.75rem;
  color: #6b7280;
}

.chart-card__last-updated {
  text-align: right;
}

/* Loading state */
.chart-card--loading {
  opacity: 0.6;
  pointer-events: none;
}

/* Responsive */
@media (max-width: 768px) {
  .chart-card {
    padding: 1rem;
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
    min-height: 250px;
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

/* Mejoras visuales para los gráficos */
:deep(.chart-card__chart canvas) {
  border-radius: 8px;
}

/* Animaciones suaves */
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
</style>