<template>
  <div class="estadisticas-container">
    <h1>Estadísticas Generales</h1>

    <section class="grafico">
      <h2>Resumen de asistencia por obra</h2>
      <pv-chart type="bar" :data="asistenciaData" :options="barOptions" />
    </section>

    <div class="graficos-dobles">
      <section class="grafico">
        <h2>Obras con más personal</h2>
        <pv-chart type="doughnut" :data="personalData" :options="doughnutOptions" />
      </section>

      <section class="grafico">
        <h2>Tasa de ausencia laboral</h2>
        <pv-chart type="doughnut" :data="ausenciaData" :options="doughnutOptions" />
      </section>
    </div>
  </div>
</template>

<script>
import {
  getResumenAsistencia,
  getObrasConMasPersonal,
  getTasaAusenciaLaboral,
} from '../services/stats-api.service';

export default {
  name: 'StatsManagerComponent',
  data() {
    return {
      asistenciaData: null,
      personalData: null,
      ausenciaData: null,
      barOptions: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 55,
            ticks: {
              callback: value => `${value}%`,
            },
          },
        },
      },
      doughnutOptions: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    };
  },
  mounted() {
    this.asistenciaData = getResumenAsistencia();
    this.personalData = getObrasConMasPersonal();
    this.ausenciaData = getTasaAusenciaLaboral();
  },
};
</script>

<style scoped>
.estadisticas-container {
  padding: 2rem;
}

.grafico {
  margin-bottom: 2rem;
}

.graficos-dobles {
  display: flex;
  gap: 2rem;
}
</style>
