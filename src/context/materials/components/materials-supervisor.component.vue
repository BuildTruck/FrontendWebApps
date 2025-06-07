<script>
import AppTable from '../../../core/components/AppTable.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import AppButton from '../../../core/components/AppButton.vue'
import MaterialsForm from './materials-form.vue'
import MaterialsSupervisorEntries from './materials-supervisor-entries.vue'
import MaterialsSupervisorUsages from './materials-supervisor-usages.vue'
import { materialsApiService } from '../services/materials-api.service.js'

export default {
  name: 'MaterialsSupervisor',
  components: {
    AppTable,
    AppNotification,
    AppButton,
    MaterialsForm,
    MaterialsSupervisorEntries,
    MaterialsSupervisorUsages
  },
  data() {
    return {
      selectedTab: 'inventory',
      inventory: [],
      selectedMaterial: null,
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
      const base = [
        { field: 'name', header: this.$t('inventory.name') },
        { field: 'type', header: this.$t('inventory.type') },
        { field: 'unit', header: this.$t('inventory.unit') },
        { field: 'minimumStock', header: this.$t('inventory.minimumStock') },
        { field: 'provider', header: this.$t('inventory.provider') }
      ]

      const extra = [
        { field: 'totalEntries', header: this.$t('inventory.totalEntries') },
        { field: 'totalUsages', header: this.$t('inventory.totalUsages') },
        { field: 'stockActual', header: this.$t('inventory.currentStock') },
        {
          field: 'price',
          header: this.$t('inventory.unitPrice'),
          dataType: 'numeric',
          body: row => row.price && row.price > 0 ? `S/ ${row.price.toFixed(2)}` : '-'
        },
        {
          field: 'total',
          header: this.$t('inventory.total'),
          dataType: 'numeric',
          body: row => row.total && row.total > 0 ? `S/ ${row.total.toFixed(2)}` : '-'
        }
      ]

      const hasData = this.inventory.some(mat => mat.totalEntries > 0 || mat.totalUsages > 0)
      return hasData ? [...base, ...extra] : base
    }
  },
  async created() {
    await this.loadInventory()
  },
  methods: {
    async loadInventory() {
      try {
        this.loading = true
        const projectId = materialsApiService.getCurrentProjectIdSync()
        if (!projectId) throw new Error('No projectId')

        const allData =  await materialsApiService.getInventorySummary()
        this.inventory = allData.filter(item => item.projectId === projectId)
      } catch (error) {
        console.error('Error al cargar inventario:', error)
      } finally {
        this.loading = false
      }
    },


    async handleUpdated(message = '') {
      await this.loadInventory()
      if (message) {
        this.notificationMessage = message
        this.showNotification = true
      }
    },

    handleAdd() {
      this.selectedMaterial = null
      this.showForm = true
      this.isReadonly = false
      this.isEditing = false
      this.showAddForm = true
    },

    async handleConfirm(material) {
      try {
        if (!material.projectId) {
          material.projectId = materialsApiService.getCurrentProjectIdSync()
        }

        if (!material.projectId) {
          alert('No se pudo determinar el proyecto actual')
          return
        }

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
        await this.loadInventory()
      } catch (error) {
        console.error('Error al guardar material:', error)
        this.notificationMessage = 'Error al guardar material'
        this.showNotification = true
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
    <!-- TABS -->
    <div class="tabs-wrapper">
      <AppButton
          :label="$t('inventory.inventory')"
          :variant="'text'"
          :class="{ 'tab-active': selectedTab === 'inventory' }"
          @click="selectedTab = 'inventory'"
      />
      <AppButton
          :label="$t('inventory.entries')"
          :variant="'text'"
          :class="{ 'tab-active': selectedTab === 'entries' }"
          @click="selectedTab = 'entries'"
      />
      <AppButton
          :label="$t('inventory.usages')"
          :variant="'text'"
          :class="{ 'tab-active': selectedTab === 'usage' }"
          @click="selectedTab = 'usage'"
      />
    </div>

    <!-- INVENTARIO -->
    <div v-if="selectedTab === 'inventory'">
      <MaterialsForm
          v-if="showForm"
          :material="selectedMaterial || {}"
          :readonly="isReadonly"
          :mode="'material'"
          @confirm="handleConfirm"
          @cancel="cancelView"
          :materials-list="inventory"
      />

      <div v-if="showForm && isReadonly" class="flex justify-end gap-2 mt-4">
        <AppButton :label="$t('general.edit')" variant="primary" @click="handleEdit" />
        <AppButton :label="$t('general.close')" variant="secondary" @click="cancelView" />
      </div>

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

    <!-- INGRESOS -->
    <div v-else-if="selectedTab === 'entries'">
      <MaterialsSupervisorEntries @updated="handleUpdated" />
    </div>

    <!-- USOS -->
    <div v-else-if="selectedTab === 'usage'">
      <MaterialsSupervisorUsages @updated="handleUpdated" />
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

.tabs-wrapper .p-button:hover,
.tabs-wrapper .p-button:focus,
.tabs-wrapper .p-button:active {
  color: #FF5F01;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

.tabs-wrapper .tab-active {
  color: #FF5F01 !important;
  border-bottom: 3px solid #FF5F01;
}
</style>
