<script>
import PersonnelForm from "./personnel-form.vue";
import AppTable from '../../../core/components/AppTable.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import AppButton from '../../../core/components/AppButton.vue'
import {personnelApiService} from "../services/personnel-api.service.js";

export default {
  name: 'PersonnelSupervisor',
  components: {
    PersonnelForm,
    AppTable,
    AppNotification,
    AppButton,
  },
  data() {
    return {
      selectedTab: 'personnel',
      inventory: [],
      selectedPerson: null,
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
        {field: 'name', header: 'Nombre'},
        {field: 'dni', header: 'DNI'},
        {field: 'rol', header: 'Rol'},
        {field: 'status', header: 'Estado'}
      ];
    }
  },
  async created() {
    await this.loadPersonnel()
  },
  methods: {
    async loadPersonnel() {
      try {
        this.loading = true;
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (!user?.projectId) {
          throw new Error('No projectId found in user session');
        }
        const data = await personnelApiService.getInventorySummary(user.projectId);
        this.inventory = Array.isArray(data) ? data : []; // Ensure inventory is an array
      } catch (error) {
        console.error('Error al cargar personal:', error);
        this.inventory = []; // Reset to empty array on error
        this.notificationMessage = 'Error al cargar el personal. Intente de nuevo.';
        this.showNotification = true;
      } finally {
        this.loading = false;
      }
    },

    async handleUpdated(message = '') {
      await this.loadPersonnel()
      if (message) {
        this.notificationMessage = message
        this.showNotification = true
      }
    },

    handleAdd() {
      this.selectedPerson = null
      this.showForm = true
      this.isReadonly = false
      this.isEditing = false
      this.showAddForm = true
    },

    async handleConfirm(personnel) {
      try {
        const user = JSON.parse(sessionStorage.getItem('user'))
        personnel.projectId = user?.projectId

        if (personnel.id) {
          await personnelApiService.updatePersonnel(personnel.id,personnel)
        } else {
          await personnelApiService.createPersonnel(personnel)
        }

        this.notificationMessage = 'Trabajador guardado correctamente'
        this.showNotification = true
        this.showForm = false
        this.showAddForm = false
        this.selectedPerson = null
        await this.loadInventory()
      } catch (error) {
        console.error('Error al guardar personal:', error)
      }
    },

    handleRowClick({data}) {
      this.selectedPerson = {...data}
      this.showForm = true
      this.isReadonly = true
      this.isEditing = false
    },

    handleEdit() {
      this.isReadonly = false
      this.isEditing = true
    },

    cancelView() {
      this.showForm = false
      this.showAddForm = false
      this.selectedPerson = null
      this.isReadonly = false
      this.isEditing = false
    }
  }
}
</script>

<template>
  <div>
    <!-- TABS -->
    <div v-if="selectedTab === 'personnel'">

      <!--Formulario personal -->
      <PersonnelForm
          v-if="showForm || showAddForm"
          :personnel="selectedPerson || {}"
          :readonly="isReadonly"
          :mode="'personnel'"
          @confirm="handleConfirm"
          @cancel="cancelView"
          :personnel-list="inventory"
      />

      <!-- Botones al ver detalles -->
      <div v-if="showForm && isReadonly" class="flex justify-end gap-2 mt-4">
        <AppButton label="Editar" variant="primary" @click="handleEdit"/>
        <AppButton label="Cerrar" variant="secondary" @click="cancelView"/>
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

/* Estilo base del botĆ³n-tab */
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
}

/* Hover limpio sin ningĆŗn cambio */
.tabs-wrapper .p-button:hover,
.tabs-wrapper .p-button:focus,
.tabs-wrapper .p-button:active {
  color: #FF5F01;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

/* Estilo del tab activo */
.tabs-wrapper .tab-active {
  color: #FF5F01 !important;
  border-bottom: 3px solid #FF5F01;
}
</style>