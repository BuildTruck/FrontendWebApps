<script>
import AppTable from '../../../core/components/AppTable.vue'
import AppNotification from '../../../core/components/AppNotification.vue'
import AppButton from '../../../core/components/AppButton.vue'
import MaterialsForm from './materials-form.vue'
import MaterialsSupervisorEntries from './materials-supervisor-entries.vue'
import MaterialsSupervisorUsages from './materials-supervisor-usages.vue'
import ExportButton from '../../../core/exports/components/ExportButton.vue'
import { materialsApiService } from '../services/materials-api.service.js'
import { MaterialEntity } from '../models/materials.entity.js'

export default {
  name: 'MaterialsSupervisor',
  components: {
    AppTable,
    AppNotification,
    AppButton,
    MaterialsForm,
    MaterialsSupervisorEntries,
    MaterialsSupervisorUsages,
    ExportButton
  },
  data() {
    return {
      currentView: 'inventory',
      inventory: [],
      selectedMaterial: null,
      showForm: false,
      isReadonly: false,
      isEditing: false,
      showAddForm: false,
      loading: false,
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success'
    }
  },

  computed: {
    // Pestañas de navegación
    tabs() {
      return [
        {
          key: 'inventory',
          label: this.$t('inventory.inventory', 'Inventory'),
          icon: 'pi pi-box'
        },
        {
          key: 'entries',
          label: this.$t('inventory.entries', 'Entries'),
          icon: 'pi pi-arrow-down'
        },
        {
          key: 'usages',
          label: this.$t('inventory.usages', 'Usages'),
          icon: 'pi pi-arrow-up'
        }
      ]
    },

    columns() {
      return [
        { field: 'name', header: this.$t('inventory.name') },
        { field: 'type', header: this.$t('inventory.type') },
        { field: 'unit', header: this.$t('inventory.unit') },
        { field: 'minimumStock', header: this.$t('inventory.minimumStock') },
        { field: 'provider', header: this.$t('inventory.provider') },
        {
          field: 'totalEntries',
          header: this.$t('inventory.entries'),
          body: row => row.totalEntries || 0
        },
        {
          field: 'totalUsages',
          header: this.$t('inventory.usages'),
          body: row => row.totalUsages || 0
        },
        {
          field: 'stockActual',
          header: this.$t('inventory.currentStock'),
          body: row => row.stockActual || 0
        },
        {
          field: 'unitPrice',
          header: this.$t('inventory.unitPrice'),
          dataType: 'numeric',
          body: row => row.unitPrice && row.unitPrice > 0 ? `S/ ${row.unitPrice.toFixed(2)}` : '-'
        },
        {
          field: 'total',
          header: this.$t('inventory.total'),
          dataType: 'numeric',
          body: row => row.total && row.total > 0 ? `S/ ${row.total.toFixed(2)}` : '-'
        }
      ];
    },

    // Estadísticas del inventario
    inventoryStats() {
      return {
        total: this.inventory.length,
        lowStock: this.inventory.filter(item =>
            item.stockActual <= item.minimumStock && item.minimumStock > 0
        ).length,
        totalValue: this.inventory.reduce((sum, item) => sum + (item.total || 0), 0),
        activeSuppliers: new Set(this.inventory.map(item => item.provider).filter(Boolean)).size
      };
    }
  },

  async created() {
    await this.loadInventory()
  },

  methods: {
    // Navegación entre pestañas
    setActiveView(viewKey) {
      if (this.currentView === viewKey) return;

      // Si está editando, preguntar antes de cambiar
      if (this.showForm && !this.isReadonly) {
        if (confirm(this.$t('common.unsavedChanges', 'You have unsaved changes. Are you sure you want to leave?'))) {
          this.cancelView();
          this.currentView = viewKey;
        }
      } else {
        this.currentView = viewKey;
      }
    },

    async loadInventory() {
      try {
        this.loading = true
        const projectId = materialsApiService.getCurrentProjectIdSync()
        if (!projectId) throw new Error('No projectId')

        const rawInventory = await materialsApiService.getInventorySummary(projectId)

        console.log('📥 Inventario RAW del backend:', rawInventory)

        // ✅ MAPEAR LOS VALORES A LABELS BONITOS
        this.inventory = rawInventory.map(item => {
          // ✅ BUSCAR LOS LABELS CORRESPONDIENTES
          const typeObj = MaterialEntity.TYPES.find(t => t.value === item.type);
          const typeLabel = typeObj ? typeObj.label : item.type?.toLowerCase() || '';

          const unitObj = MaterialEntity.UNITS.find(u => u.value === item.unit);
          const unitLabel = unitObj ? unitObj.label : item.unit?.toLowerCase() || '';

          console.log('🔄 Mapeando inventario:', {
            id: item.materialId,
            name: item.name,
            typeOriginal: item.type,
            typeLabel: typeLabel,
            unitOriginal: item.unit,
            unitLabel: unitLabel
          });

          return {
            ...item,
            // ✅ USAR LOS LABELS PARA LA TABLA
            type: typeLabel,
            unit: unitLabel
          };
        });

        console.log('📋 Inventario cargado:', this.inventory.length, 'materiales')
        console.log('🔍 Primer elemento mapeado:', this.inventory[0])
      } catch (error) {
        console.error('Error al cargar inventario:', error)
        this.showNotificationMessage('Error al cargar inventario', 'error')
      } finally {
        this.loading = false
      }
    },

    async handleUpdated(message = '') {
      await this.loadInventory()
      if (message) {
        this.showNotificationMessage(message, 'success')
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
          this.showNotificationMessage('No se pudo determinar el proyecto actual', 'error')
          return
        }

        if (material.id) {
          await materialsApiService.updateMaterial(material.id, material)
        } else {
          await materialsApiService.createMaterial(material)
        }

        this.showNotificationMessage('Material guardado correctamente', 'success')
        this.showForm = false
        this.showAddForm = false
        this.selectedMaterial = null
        await this.loadInventory()
      } catch (error) {
        console.error('Error al guardar material:', error)
        this.showNotificationMessage('Error al guardar material', 'error')
      }
    },

    handleRowClick({ data }) {
      console.log('🖱️ Click en inventario - datos:', data);

      // ✅ CONVERTIR LOS LABELS DE VUELTA A VALUES PARA EL FORMULARIO
      const typeValue = MaterialEntity.TYPES.find(t => t.label === data.type)?.value || data.type;
      const unitValue = MaterialEntity.UNITS.find(u => u.label === data.unit)?.value || data.unit;

      this.selectedMaterial = {
        ...data,
        // ✅ USAR VALUES ORIGINALES PARA EL FORMULARIO
        type: typeValue,
        unit: unitValue
      };

      console.log('📝 Material preparado para formulario:', this.selectedMaterial);

      this.showForm = true;
      this.isReadonly = true;
      this.isEditing = false;
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
    },

    onExportComplete(result) {
      this.showNotificationMessage(
          this.$t('inventory.exportedSuccessfully', 'Exported successfully'),
          'success'
      );
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    }
  }
}
</script>

<template>
  <div class="materials-supervisor">
    <!-- Header con título y navegación -->
    <div class="supervisor-header">
      <!-- Contenido del header -->
      <div class="header-content">
        <h1 class="supervisor-title">
          <i class="pi pi-box"></i>
          {{ $t('inventory.materialManagement', 'Material Management') }}
        </h1>
        <p class="supervisor-subtitle">
          {{ $t('inventory.manageInventoryDescription', 'Manage inventory, entries, and material usage') }}
        </p>
      </div>

      <!-- Navegación de pestañas -->
      <nav class="tabs-navigation">
        <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-button"
            :class="{ 'active': currentView === tab.key }"
            @click="setActiveView(tab.key)"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </div>

    <!-- Contenido de las vistas -->
    <div class="view-content">
      <!-- VISTA DE INVENTARIO -->
      <div v-if="currentView === 'inventory'" class="view-panel">
        <!-- Formulario de Material -->
        <div v-if="showForm" class="form-container">
          <div class="form-header">
            <div class="form-back">
              <AppButton
                  icon="pi pi-arrow-left"
                  :label="showAddForm ? $t('common.cancel', 'Cancel') : $t('common.back', 'Back')"
                  variant="secondary"
                  @click="cancelView"
              />
            </div>

            <div v-if="isReadonly" class="form-actions">
              <AppButton
                  :label="$t('general.edit', 'Edit')"
                  variant="primary"
                  @click="handleEdit"
              />
              <AppButton
                  :label="$t('general.close', 'Close')"
                  variant="secondary"
                  @click="cancelView"
              />
            </div>
          </div>

          <MaterialsForm
              :material="selectedMaterial || {}"
              :readonly="isReadonly"
              :mode="'material'"
              :allow-editing="true"
              @confirm="handleConfirm"
              @cancel="cancelView"
              :materials-list="inventory"
          />
        </div>

        <!-- Lista de Inventario -->
        <div v-if="!showForm && !showAddForm" class="inventory-container">
          <!-- Header de inventario con estadísticas -->
          <div class="inventory-header">
            <div class="inventory-stats">
              <div class="stat-card total">
                <div class="stat-content">
                  <div class="stat-number">{{ inventoryStats.total }}</div>
                  <div class="stat-label">{{ $t('inventory.totalMaterials', 'Total Materials') }}</div>
                </div>
                <i class="pi pi-box stat-icon"></i>
              </div>

              <div class="stat-card warning">
                <div class="stat-content">
                  <div class="stat-number">{{ inventoryStats.lowStock }}</div>
                  <div class="stat-label">{{ $t('inventory.lowStock', 'Low Stock') }}</div>
                </div>
                <i class="pi pi-exclamation-triangle stat-icon"></i>
              </div>

              <div class="stat-card value">
                <div class="stat-content">
                  <div class="stat-number">S/ {{ inventoryStats.totalValue.toFixed(2) }}</div>
                  <div class="stat-label">{{ $t('inventory.totalValue', 'Total Value') }}</div>
                </div>
                <i class="pi pi-dollar stat-icon"></i>
              </div>

              <div class="stat-card suppliers">
                <div class="stat-content">
                  <div class="stat-number">{{ inventoryStats.activeSuppliers }}</div>
                  <div class="stat-label">{{ $t('inventory.suppliers', 'Suppliers') }}</div>
                </div>
                <i class="pi pi-users stat-icon"></i>
              </div>
            </div>

            <!-- Controles de inventario -->
            <div class="inventory-controls">
              <ExportButton
                  :data="inventory"
                  type="materials"
                  :formats="['excel', 'pdf', 'csv']"
                  :button-label="$t('exports.export', 'Export')"
                  variant="secondary"
                  @export-complete="onExportComplete"
              />
            </div>
          </div>

          <!-- Tabla de inventario -->
          <div class="inventory-table">
            <AppTable
                :columns="columns"
                :data="inventory"
                :loading="loading"
                :showFilterButton="true"
                :showAddButton="true"
                :selectable="false"
                :paginator="true"
                :rows="15"
                @add="handleAdd"
                @row-click="handleRowClick"
                class="materials-table"
                :row-hover="true"
            />
          </div>
        </div>
      </div>

      <!-- VISTA DE ENTRADAS -->
      <div v-else-if="currentView === 'entries'" class="view-panel">
        <MaterialsSupervisorEntries @updated="handleUpdated" />
      </div>

      <!-- VISTA DE USOS -->
      <div v-else-if="currentView === 'usages'" class="view-panel">
        <MaterialsSupervisorUsages @updated="handleUpdated" />
      </div>
    </div>

    <!-- NOTIFICACIÓN -->
    <AppNotification
        v-model="showNotification"
        :message="notificationMessage"
        :type="notificationType"
        :auto-close="true"
        :duration="3000"
    />
  </div>
</template>

<style scoped>
.materials-supervisor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  overflow: hidden;
}

/* ========== HEADER ========== */
.supervisor-header {
  background: white;
  color: #333;
  padding: 1.5rem 2rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  border-bottom: 1px solid #e9ecef;
}

.supervisor-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.05) 50%, transparent 70%);
  pointer-events: none;
}

.header-content {
  margin-bottom: 1rem;
}

.supervisor-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.supervisor-title i {
  font-size: 1.5rem;
  color: #FF5F01; /* Mantener el ícono naranja */
}

.supervisor-subtitle {
  margin: 0;
  font-size: 1rem;
  opacity: 0.8; /* Reducir la opacidad ya que el texto ya no es blanco */
  font-weight: 400;
  color: #666; /* Color gris para el subtítulo */
}

/* ========== TABS NAVIGATION ========== */
.tabs-navigation {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid rgba(255, 95, 1, 0.3);
  padding-bottom: 1rem;
  position: relative;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8f9fa;
  padding: 0.625rem 1.25rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  color: #666;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.tab-button:hover {
  background-color: rgba(255, 95, 1, 0.1);
  color: #FF5F01;
  border-color: #FF5F01;
  transform: translateY(-2px);
}

.tab-button.active {
  background-color: #FF5F01;
  color: white;
  border-color: #FF5F01;
  box-shadow: 0 4px 12px rgba(255, 95, 1, 0.3);
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1.125rem;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}

.tab-button i {
  font-size: 1rem;
}

/* ========== CONTENT AREAS ========== */
.view-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.view-panel {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ========== FORM CONTAINER ========== */
.form-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.form-header {
  background: white;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.form-back {
  display: flex;
  align-items: center;
}

.form-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

/* ========== INVENTORY CONTAINER ========== */
.inventory-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.inventory-header {
  background: white;
  padding: 2rem;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
}

.inventory-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
  border-left: 4px solid var(--stat-color, #3b82f6);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.stat-card.total { --stat-color: #3b82f6; }
.stat-card.warning { --stat-color: #f59e0b; }
.stat-card.value { --stat-color: #10b981; }
.stat-card.suppliers { --stat-color: #8b5cf6; }

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.25rem;
  color: var(--stat-color, #333);
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.stat-icon {
  font-size: 2rem;
  color: var(--stat-color, #333);
  opacity: 0.3;
}

.inventory-controls {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* ========== INVENTORY TABLE ========== */
.inventory-table {
  flex: 1;
  overflow: hidden;
  background: white;
  margin: 0 2rem 2rem 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
}

.materials-table {
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}

/* ========== HOVER EFFECTS ========== */
:deep(.materials-table .p-datatable-tbody > tr:hover) {
  background-color: rgba(255, 95, 1, 0.05) !important;
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.materials-table .p-datatable-tbody > tr) {
  transition: all 0.2s ease;
}

/* ========== RESPONSIVE ========== */
@media (max-width: 768px) {
  .supervisor-header {
    padding: 1rem;
  }

  .supervisor-title {
    font-size: 1.25rem;
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }

  .supervisor-subtitle {
    font-size: 0.875rem;
    text-align: center;
  }

  .tabs-navigation {
    flex-direction: column;
    gap: 0.25rem;
  }

  .tab-button {
    justify-content: center;
    padding: 0.5rem 1rem;
  }

  .tab-button.active::after {
    display: none;
  }

  .form-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .form-actions {
    justify-content: space-between;
  }

  .inventory-header {
    padding: 1rem;
  }

  .inventory-stats {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .stat-card {
    padding: 1rem;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  .inventory-table {
    margin: 0 1rem 1rem 1rem;
  }

  .inventory-controls {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .materials-supervisor {
    height: 100vh;
  }

  .supervisor-header {
    padding: 0.75rem;
  }

  .supervisor-title {
    font-size: 1.125rem;
  }

  .supervisor-subtitle {
    font-size: 0.8rem;
  }

  .tab-button {
    font-size: 0.8rem;
  }

  .tab-button i {
    font-size: 0.875rem;
  }

  .inventory-stats {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .stat-card {
    padding: 0.75rem;
    flex-direction: row;
    justify-content: space-between;
  }

  .stat-number {
    font-size: 1.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
  }

  .stat-icon {
    font-size: 1.5rem;
  }

  .inventory-table {
    margin: 0 0.5rem 0.5rem 0.5rem;
  }
}

/* ========== ANIMATIONS ========== */
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

.stat-card {
  animation: fadeIn 0.6s ease-out forwards;
}

.stat-card:nth-child(1) { animation-delay: 0.1s; }
.stat-card:nth-child(2) { animation-delay: 0.2s; }
.stat-card:nth-child(3) { animation-delay: 0.3s; }
.stat-card:nth-child(4) { animation-delay: 0.4s; }

/* ========== FOCUS ACCESSIBILITY ========== */
.tab-button:focus {
  outline: 2px solid rgba(255, 255, 255, 0.5);
  outline-offset: 2px;
}

/* ========== ADDITIONAL VISUAL ENHANCEMENTS ========== */
.tab-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.tab-button:hover::before {
  left: 100%;
}
</style>