<script>
import { incidentsApi } from '../services/incidents-api.service';
import AppInput from '../../../core/components/AppInput.vue';
import AppButton from '../../../core/components/AppButton.vue';
import AppNotification from '../../../core/components/AppNotification.vue';

export default {
  name: "incidents-manager.component",
  props: ['projectId'],
  components: {
    AppInput,
    AppButton,
    AppNotification
  },
  data() {
    return {
      incidents: [],
      selectedIncident: null
    };
  },
  async created() {
    this.incidents = await incidentsApi.fetchAll();
  },
  methods: {
    async selectIncident(id) {
      const data = await incidentsApi.fetchById(id);

      // Convertir "dd/mm/yyyy" a "yyyy-mm-dd" para input[type=date]
      if (data.fecha) {
        const [dd, mm, yyyy] = data.fecha.split('/');
        if (dd && mm && yyyy) {
          data.fecha = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
      }

      this.selectedIncident = data;
    },
    getColor(status) {
      if (status === 'Resuelto') return 'green';
      if (status === 'Pendiente') return 'orange';
      return 'gray';
    }
  }
};
</script>

<template>
  <div class="container">
    <!-- Lista de incidentes -->
    <div v-if="!selectedIncident">
      <div class="header">
        <div class="actionss">
          <button class="busq">Buscar</button>

        </div>
        <div class="actions">
          <button class="filter">Filtro</button>

        </div>
      </div>
      <table class="incident-table">
        <thead>
        <tr>
          <th>Fecha</th>
          <th>Tipo de Incidente</th>
          <th>Gravedad</th>
          <th>Estado</th>
        </tr>
        </thead>
        <tbody>
        <tr
            v-for="incidente in incidents"
            :key="incidente.id"
            @click="selectIncident(incidente.id)"
        >
          <td>{{ incidente.fecha }}</td>
          <td>{{ incidente.tipo }}</td>
          <td>{{ incidente.gravedad }}</td>
          <td>
              <span :style="{ color: getColor(incidente.estado) }">
                ● {{ incidente.estado }}
              </span>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- Vista detalle -->
    <div v-else class="detail-view">
      <button class="back-btn" @click="selectedIncident = null">⬅ Volver</button>


      <div class="form-grid">
        <AppInput
            label="Tipo de incidente"
            v-model="selectedIncident.tipo"
            :disabled="true"
        />
        <AppInput
            label="Gravedad"
            v-model="selectedIncident.gravedad"
            :disabled="true"
        />
        <AppInput
            label="Fecha del incidente"
            type="date"
            v-model="selectedIncident.fecha"
            :disabled="true"
        />
        <AppInput
            label="Estado"
            v-model="selectedIncident.estado"
            :disabled="true"
        />
        <AppInput
            label="Descripción detallada"
            type="textarea"
            v-model="selectedIncident.descripcion"
            :disabled="true"
            class="full-width"
        />
        <AppInput
            label="Medidas tomadas"
            type="textarea"
            v-model="selectedIncident.medidas"
            :disabled="true"
            class="full-width"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 2rem;
  font-family: 'Poppins', sans-serif;
  color: #333;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  color: #C53508;
}
.title {
  margin-bottom: 1rem;
  font-size: 1.5rem;
  color: #FF5F01;
}

.actions button {
  background-color: #ff5f01;
  color: white;
  padding: 10px 14px;
  margin-right: auto;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}


.actionss button {
  background-color: #D9D9D9;
  color: #697077;
  padding: 10px 44px;
  margin-left: 10px;
  border: none;
  border-radius: 1px;
  cursor: pointer;


}
.incident-table {



  width: 100%;
  border-collapse: collapse;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;

  margin-top: 2rem;
}

.incident-table th{
  color:#ff5f01;
  padding: 10px;
  border-bottom: 1px solid #ff5f01;
  text-align: left;

}
.incident-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.incident-table tr:hover {
  background-color: #f9f9f9;
  cursor: pointer;
}

.back-btn {
  margin-bottom: 1rem;
  background: none;
  border: none;
  color: #FF5F01;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
}

.detail-view {
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
  max-width: 900px;
  margin: auto;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.full-width {
  grid-column: span 2;
}


</style>

