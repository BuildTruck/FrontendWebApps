<script>
import AppTable from '../../../core/components/AppTable.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import AppButton from '../../../core/components/AppButton.vue'
import {machineryApiService} from "../services/machinery-api.service.js";

import MachineryForm from "./machinery-form.vue";

export default {
  name: 'MachinerySupervisor',
  components: {
    MachineryForm,
    AppTable,
    AppNotification,
    AppButton,

  },
  data() {
    return {
      selectedTab: 'machinery',
      inventory: [],
      selectedMachine: null,
      showForm: false,
      isReadonly: false,
      isEditing: false,
      showAddForm: false,
      loading: false,
      showNotification: false,
      notificationMessage: ''
    }
  },
  computed: {
    columns() {
      return [
        { field: 'name', header: 'Nombre' },
        { field: 'licensePlate', header: 'Codigo/Placa' },
        { field: 'registerDate', header: 'Fecha Registro' },
        { field: 'status', header: 'Estado' }
      ];
    }
  },
  async created() {
    await this.loadMachines()
  },
  methods: {
    async loadMachines() {
      try {
        this.loading = true;
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (!user?.projectId) {
          throw new Error('No projectId found in user session');
        }
        const data = await machineryApiService.getInventorySummary(user.projectId);
        this.inventory = Array.isArray(data) ? data : []; // Ensure inventory is an array
      } catch (error) {
        console.error('Error al cargar maquinaria:', error);
        this.inventory = []; // Reset to empty array on error
        this.notificationMessage = 'Error al cargar la maquinaria. Intente de nuevo.';
        this.showNotification = true;
      } finally {
        this.loading = false;
      }
    },

    async handleUpdated(message = '') {
      await this.loadMachines()
      if (message) {
        this.notificationMessage = message
        this.showNotification = true
      }
    },

    handleAdd() {
      this.selectedMachine = null
      this.showForm = true
      this.isReadonly = false
      this.isEditing = false
      this.showAddForm = true
    },

    async handleConfirm(machinery) {
      try {
        const user = JSON.parse(sessionStorage.getItem('user'))
        machinery.projectId = user.projectId

        if (machinery.id) {
          await machineryApiService.updateMachinery(machinery.id, machinery)
        } else {
          await machineryApiService.createMachinery(machinery)
        }

        this.notificationMessage = 'Maquinaria guardada correctamente'
        this.showNotification = true
        this.showForm = false
        this.showAddForm = false
        this.selectedMachine = null
        await this.loadMachines()
      } catch (error) {
        console.error('Error al guardar maquinaria:', error)
      }
    },

    handleRowClick({data}) {
      this.selectedMachine = {...data}
      this.showForm = true
      this.isReadonly = true
      this.isEditing = false
    },

    handleEdit() {
      this.isReadonly = false
      this.isEditing = true
      this.showForm = true
      this.showAddForm = false
    },

    cancelView() {
      this.showForm = false
      this.showAddForm = false
      this.selectedMachine = null
      this.isReadonly = false
      this.isEditing = false
    }
  }
}
</script>

<template>
  <div>
    <!-- TABS -->
    <div v-if="selectedTab === 'machinery'">
      <!-- Formulario para maquinaria -->
      <machinery-form
          v-if="showForm || showAddForm"
          :machinery="selectedMachine || {}"
          :readonly="isReadonly"
          :machinery-list="inventory"
          @confirm="handleConfirm"
          @cancel="cancelView"
      />
      <!-- Botones al ver detalles -->
      <div v-if="showForm && isReadonly" class="flex justify-end gap-2 mt-4">
        <AppButton label="Editar" variant="primary" @click="handleEdit" />
        <AppButton label="Cerrar" variant="secondary" @click="cancelView" />
      </div>

      <!-- Tabla -->
      <div v-if="!showForm && !showAddForm">
        <AppTable
            :columns="columns"
            :data="inventory"
            :loading="loading"
            :showFilterButton="true"
            :showAddButton="true"
            :selectable="false"
            @add="handleAdd"
            @row-click="handleRowClick"
        />
        <div v-if="!loading && inventory.length === 0" class="text-center p-4">
          No se encontraron máquinas.
        </div>
      </div>
    </div>

    <!-- NOTIFICACIÓN -->
    <AppNotification
        v-model="showNotification"
        :message="notificationMessage"
        type="success"
        :autoClose="true"
        :duration="2000"
    />

  </div>
</template>
<style scoped>
.tabs-wrapper {
  display: flex;
  gap: 1.5rem;
  border-bottom: 2px solid #ddd;
  margin-bottom: 1.5rem;
}

/* Estilo base del botón-tab */
.tabs-wrapper .p-button {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  outline: none !important;
  color: #555;
  font-weight: 500;
  padding-bottom: 0.5rem;
  border-radius: 0 !important;
  transition: none !important;
}/* Hover limpio sin ningún cambio */
.tabs-wrapper .p-button:hover,
.tabs-wrapper .p-button:focus,
.tabs-wrapper .p-button:active {
  color: #FF5F01;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}/* Estilo del tab activo */
.tabs-wrapper .tab-active {
  color: #FF5F01 !important;
  border-bottom: 3px solid #FF5F01;
}
</style>

