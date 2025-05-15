<script>
import { incidentsApi } from '../services/incidents-api.service';
import AppInput from '../../../core/components/AppInput.vue';
import AppButton from '../../../core/components/AppButton.vue';
import AppNotification from '../../../core/components/AppNotification.vue';

export default {
  name: 'incidents-supervisor.component',
  components: {
    AppInput,
    AppButton,
    AppNotification
  },
  data() {
    return {
      incidentes: [],
      modoFormulario: false,
      modoEdicion: false,
      mostrarNotificacion: false,
      mostrarModalConfirmacion: false,
      incidenteSeleccionado: null,
      nuevoIncidente: {
        tipo: '',
        gravedad: '',
        fecha: '',
        estado: '',
        descripcion: '',
        medidas: ''
      }
    };
  },
  async created() {
    this.incidentes = await incidentsApi.fetchAll();
  },
  methods: {
    abrirFormulario() {
      this.modoFormulario = true;
      this.modoEdicion = false;
      this.incidenteSeleccionado = null;
      this.nuevoIncidente = {
        tipo: '',
        gravedad: '',
        fecha: '',
        estado: '',
        descripcion: '',
        medidas: ''
      };
    },
    cancelarFormulario() {
      this.modoFormulario = false;
      this.modoEdicion = false;
      this.incidenteSeleccionado = null;
    },
    confirmarIncidente() {
      this.incidentes.push({
        ...this.nuevoIncidente,
        id: Date.now()
      });
      this.mostrarNotificacion = true;
      this.modoFormulario = false;

      setTimeout(() => {
        this.mostrarNotificacion = false;
      }, 2000);
    },
    seleccionarIncidente(incidente) {
      this.incidenteSeleccionado = incidente;
      this.nuevoIncidente = { ...incidente };
      this.modoFormulario = true;
      this.modoEdicion = true;
    },
    guardarCambios() {
      if (this.incidenteSeleccionado) {
        Object.assign(this.incidenteSeleccionado, this.nuevoIncidente);
      }
      this.modoFormulario = false;
      this.modoEdicion = false;
      this.incidenteSeleccionado = null;
      this.mostrarModalConfirmacion = true;
    },
    cerrarModal() {
      this.mostrarModalConfirmacion = false;
    }
  }
};
</script>

<template>
  <div class="container">
    <!-- VISTA DE TABLA -->
    <div v-if="!modoFormulario">
      <div class="header">
        <div class="actions">
          <button class="btn-naranja" @click="abrirFormulario">Añadir</button>
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
        <tr v-for="inc in incidentes" :key="inc.id" @click="seleccionarIncidente(inc)">
          <td>{{ inc.fecha }}</td>
          <td>{{ inc.tipo }}</td>
          <td>{{ inc.gravedad }}</td>
          <td>
              <span :style="{ color: inc.estado === 'Resuelto' ? 'green' : inc.estado === 'Pendiente' ? 'orange' : 'gray' }">
                ● {{ inc.estado }}
              </span>
          </td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- FORMULARIO -->
    <div v-else class="detail-view">
      <button class="back-btn" @click="cancelarFormulario">⬅ Volver</button>

      <div class="form-grid">
        <AppInput label="Tipo de incidente" v-model="nuevoIncidente.tipo" />
        <AppInput label="Gravedad" v-model="nuevoIncidente.gravedad" />
        <AppInput label="Fecha del incidente" type="date" v-model="nuevoIncidente.fecha" />
        <AppInput label="Estado" v-model="nuevoIncidente.estado" />
        <AppInput label="Descripción detallada" type="textarea" v-model="nuevoIncidente.descripcion" class="full-width" />
        <AppInput label="Medidas tomadas" type="textarea" v-model="nuevoIncidente.medidas" class="full-width" />

        <div class="botones">
          <!-- Mostrar botón dependiendo del modo -->
          <AppButton v-if="modoEdicion" @click="guardarCambios">Guardar</AppButton>
          <AppButton v-else @click="confirmarIncidente">Confirmar</AppButton>
          <AppButton @click="cancelarFormulario" color="gray">Cancelar</AppButton>
        </div>
      </div>
    </div>


    <AppNotification v-if="mostrarNotificacion" type="success">
       Incidente añadido
    </AppNotification>


    <div v-if="mostrarModalConfirmacion" class="modal-overlay">
      <div class="modal-content">
        <span class="modal-icon">✅</span>
        <p>Cambios guardados correctamente</p>
        <button class="modal-btn" @click="cerrarModal">Aceptar</button>
      </div>
    </div>
  </div>
</template>
<style>

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

.actions .btn-naranja {
background-color: #ff5f01;
color: white;
padding: 10px 20px;
border: none;
border-radius: 8px;
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

.incident-table th {
color: #ff5f01;
padding: 12px;
border-bottom: 1px solid #ff5f01;
text-align: left;
}
.incident-table td {
padding: 1rem;
border-bottom: 1px solid #eee;
}
.incident-table tr:hover {
background-color: #f9f9f9;
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

.back-btn {
margin-bottom: 1rem;
background: none;
border: none;
color: #ff5f01;
font-weight: bold;
font-size: 1rem;
cursor: pointer;
}

.form-grid {
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 1.5rem;
}

.full-width {
grid-column: span 2;
}

.botones {
grid-column: span 2;
display: flex;
justify-content: flex-end;
gap: 1rem;
margin-top: 1rem;
}

/* MODAL DE CONFIRMACIÓN */
.modal-overlay {
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
background-color: rgba(0, 0, 0, 0.4);
display: flex;
align-items: center;
justify-content: center;
z-index: 1000;
}

.modal-content {
background: white;
padding: 2rem;
border-radius: 12px;
text-align: center;
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
max-width: 400px;
width: 90%;
}

.modal-icon {
font-size: 2rem;
color: green;
margin-bottom: 1rem;
display: block;
}

.modal-btn {
background-color: #ff5f01;
color: white;
padding: 0.5rem 1.5rem;
border: none;
border-radius: 8px;
cursor: pointer;
font-weight: bold;
margin-top: 1rem;
}

</style>
