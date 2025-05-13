<script>
import AppTable from '../../../core/components/AppTable.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import MaterialsForm from './materials-form.vue'
import { materialsApiService } from '../services/materials-api.service.js'
import AppButton from '../../../core/components/AppButton.vue'

export default {
  name: 'MaterialsSupervisor',
  components: {
    AppTable,
    MaterialsForm,
    AppNotification,
    AppButton
  },
  data() {
    return {
      materials: [],
      selectedMaterial: null,
      showForm: false,
      isReadonly: false,
      isEditing: false,
      showAddForm: false, // ✅ necesario para ocultar tabla cuando agregas
      loading: false,     // ✅ para el estado de carga en la tabla
      showNotification: false,
      notificationMessage: '',
      columns: [
        { field: 'date', header: 'Fecha', dataType: 'date' },
        { field: 'name', header: 'Nombre Material' },
        { field: 'type', header: 'Tipo' },
        { field: 'unit', header: 'Unidad' },
        { field: 'quantity', header: 'Cantidad' },
        { field: 'stock', header: 'Stock' },
        { field: 'price', header: 'Precio Unitario', dataType: 'numeric' },
        { field: 'provider', header: 'Proveedor' },
        { field: 'total', header: 'Total', dataType: 'numeric' },
        { field: 'status', header: 'Estado' }
      ]
    }
  },
  async created() {
    await this.loadMaterials()
  },
  methods: {
    async loadMaterials() {
      try {
        this.loading = true
        const user = JSON.parse(sessionStorage.getItem('user'))
        const projectId = user?.projectId
        this.materials = await materialsApiService.getByProject(projectId)
      } catch (error) {
        console.error('Error al cargar materiales:', error)
      } finally {
        this.loading = false
      }
    },

    handleAdd() {
      this.selectedMaterial = null
      this.isReadonly = false
      this.showForm = true
      this.isEditing = false
      this.showAddForm = true
    },

    async handleConfirm(material) {
      try {
        const user = JSON.parse(sessionStorage.getItem('user'))
        material.projectId = user?.projectId

        if (material.id) {
          await materialsApiService.updateMaterial(material.id, material)
        } else {
          await materialsApiService.createMaterial(material)
        }

        this.notificationMessage = 'Material guardado correctamente'
        this.showNotification = true
        this.showForm = false
        this.showAddForm = false
        this.selectedMaterial = null
        await this.loadMaterials()
      } catch (error) {
        console.error('Error al guardar material:', error)
      }
    },

    handleRowClick({ data }) {
      this.selectedMaterial = { ...data }
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
      this.selectedMaterial = null
      this.isReadonly = false
      this.isEditing = false
    }
  }
}
</script>

<template>
  <div>
    <!-- Formulario -->
    <MaterialsForm
        v-if="showForm"
        :material="selectedMaterial || {}"
        :readonly="isReadonly"
        @confirm="handleConfirm"
        @cancel="cancelView"
    />

    <!-- Botones al ver detalles -->
    <div v-if="showForm && isReadonly" class="flex justify-end gap-2 mt-4">
      <AppButton label="Editar" variant="primary" @click="handleEdit" />
      <AppButton label="Cerrar" variant="secondary" @click="cancelView" />
    </div>

    <!-- Tabla (se oculta si estás viendo/agregando) -->
    <div v-if="!showForm && !showAddForm">
      <AppTable
          :columns="columns"
          :data="materials"
          :loading="loading"
          :showFilterButton="true"
          :showAddButton="true"
          @row-click="handleRowClick"
          @add="handleAdd"
      />
    </div>

    <!-- Notificación -->
    <AppNotification
        v-model="showNotification"
        :message="notificationMessage"
        type="success"
        :autoClose="true"
        :duration="2000"
    />
  </div>
</template>
