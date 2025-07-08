<script>
import AppInput from '../../../core/components/AppInput.vue'
import AppButton from '../../../core/components/AppButton.vue'

import { MaterialEntryEntity } from '../models/material-entries.entity.js'
import {MaterialEntity} from "../models/materials.entity.js";
import {MaterialUsageEntity} from "../models/material-usages.entity.js";

const MATERIAL_TYPES_KEY = 'materialTypes'

export default {
  name: 'MaterialsForm',
  components: { AppInput, AppButton },
  props: {
    material: { type: Object, default: () => ({}) },
    readonly: { type: Boolean, default: false },
    mode: { type: String, default: 'material' },
    materialsList: { type: Array, default: () => [] },
    workersList: { type: Array, default: () => [] },
    allowEditing: { type: Boolean, default: true }
  },
  emits: ['confirm', 'cancel'],
  data() {
    return {
      localMaterial: {
        id: null, projectId: null, name: '', type: '', customType: '',
        unit: '', quantity: 0, stock: 0, price: 0, total: 0, provider: '',
        ruc: '', date: '', status: 'PENDING', payment: 'CASH', comprobante: 'RECEIPT',
        comprobanteNumber: '', description: '', minimumStock: 0,
        area: '', usageType: '', worker: ''
      },
      materialTypes: [],

      // Estados de edición (copiados de MachineryForm)
      isEditing: false,
      hasChanges: false,
      originalData: null,
      isSaving: false,
    }
  },
  computed: {
    typeOptions() {
      return [
        ...MaterialEntity.TYPES,
        ...this.materialTypes.map(type => ({ label: type, value: type })),
        { label: this.$t('inventory.other'), value: 'CUSTOM_TYPE' }
      ]
    },

    unitOptions() {
      return MaterialEntity.UNITS;
    },

    comprobanteOptions() {
      return MaterialEntryEntity.COMPROBANTE_TYPES;
    },

    statusOptions() {
      return MaterialEntryEntity.STATUSES;
    },

    paymentOptions() {
      return MaterialEntryEntity.PAYMENT_METHODS;
    },

    usageTypeOptions() {
      return MaterialUsageEntity.USAGE_TYPES;
    },

    canEdit() {
      return this.allowEditing && !this.readonly;
    },

    // Título dinámico según el modo
    formTitle() {
      switch(this.mode) {
        case 'entry': return this.$t('inventory.materialEntry', 'Material Entry');
        case 'usage': return this.$t('inventory.materialUsage', 'Material Usage');
        default: return this.$t('inventory.materialInfo', 'Material Information');
      }
    }
  },

  watch: {
    material: {
      handler(newVal) {
        if (newVal && newVal.status) {
          this.$nextTick(() => {
            this.localMaterial.status = newVal.status;
          });
        }
      },
      deep: true,
      immediate: true
    }
  },

  created() {
    this.loadTypes()
    if (this.material && Object.keys(this.material).length > 0) {
      this.localMaterial = { ...this.material }
    }

    const user = JSON.parse(sessionStorage.getItem('user'))
    if (!this.readonly && user?.projectId) {
      this.localMaterial.projectId = user.projectId
    }
  },

  methods: {
    loadTypes() {
      try {
        const stored = JSON.parse(localStorage.getItem(MATERIAL_TYPES_KEY)) || []
        this.materialTypes = Array.isArray(stored) ? stored : []
      } catch (e) {
        this.materialTypes = []
      }
    },

    saveCustomType(newType) {
      const trimmedType = newType.trim();
      if (!trimmedType) return;

      const lowerSet = new Set(this.materialTypes.map(t => t.toLowerCase()));
      if (!lowerSet.has(trimmedType.toLowerCase())) {
        this.materialTypes.push(trimmedType);
        localStorage.setItem(MATERIAL_TYPES_KEY, JSON.stringify(this.materialTypes));
      }
    },

    // ========== MÉTODOS DE EDICIÓN (copiados de MachineryForm) ==========
    startEditing() {
      if (!this.canEdit || this.isEditing) return;

      this.isEditing = true;
      this.hasChanges = false;
      this.originalData = { ...this.localMaterial };

      console.log('Editing mode enabled for material:', this.localMaterial.name);
    },

    detectChanges() {
      if (!this.isEditing || !this.originalData) return;

      const currentData = this.localMaterial;
      const originalData = this.originalData;

      // Detectar cambios en todos los campos relevantes
      this.hasChanges = (
          currentData.name !== originalData.name ||
          currentData.type !== originalData.type ||
          currentData.customType !== originalData.customType ||
          currentData.unit !== originalData.unit ||
          currentData.quantity !== originalData.quantity ||
          currentData.price !== originalData.price ||
          currentData.provider !== originalData.provider ||
          currentData.ruc !== originalData.ruc ||
          currentData.date !== originalData.date ||
          currentData.status !== originalData.status ||
          currentData.payment !== originalData.payment ||
          currentData.comprobante !== originalData.comprobante ||
          currentData.comprobanteNumber !== originalData.comprobanteNumber ||
          currentData.description !== originalData.description ||
          currentData.minimumStock !== originalData.minimumStock ||
          currentData.area !== originalData.area ||
          currentData.usageType !== originalData.usageType ||
          currentData.worker !== originalData.worker
      );
    },

    async saveChanges() {
      if (!this.hasChanges || this.isSaving) return;

      try {
        this.isSaving = true;

        console.log('Saving changes for material');

        // Procesar tipo personalizado si es necesario
        if (this.localMaterial.type === 'CUSTOM_TYPE' && this.localMaterial.customType) {
          const customType = this.localMaterial.customType.trim();
          if (customType) {
            this.localMaterial.type = customType;
            this.saveCustomType(customType);
          } else {
            alert('Por favor ingresa un nombre para el tipo personalizado');
            return;
          }
        }

        // Emitir confirmación con los datos
        this.confirm();

        // Resetear estado de edición
        this.isEditing = false;
        this.hasChanges = false;
        this.originalData = null;

      } catch (error) {
        console.error('💥 Error saving changes:', error);
      } finally {
        this.isSaving = false;
      }
    },

    cancelChanges() {
      if (!this.isEditing) return;

      if (this.originalData) {
        // Restaurar datos originales
        Object.assign(this.localMaterial, this.originalData);
      }

      this.isEditing = false;
      this.hasChanges = false;
      this.originalData = null;

      console.log('Changes cancelled, data restored');
    },

    // ========== HANDLERS DE CAMPOS ==========
    handleFieldClick(fieldName) {
      if (!this.canEdit) return;

      if (!this.isEditing) {
        this.startEditing();
      }
    },

    handleFieldChange(fieldName, value) {
      if (!this.isEditing) return;

      this.localMaterial[fieldName] = value;
      this.detectChanges();
    },

    // ========== MÉTODOS ORIGINALES ==========
    confirm() {
      if (this.localMaterial.type === 'CUSTOM_TYPE' && this.localMaterial.customType) {
        const customType = this.localMaterial.customType.trim();
        if (customType) {
          this.localMaterial.type = customType;
          this.saveCustomType(customType);
        } else {
          alert('Por favor ingresa un nombre para el tipo personalizado');
          return;
        }
      }

      if (this.mode === 'entry') {
        this.$emit('confirm', {
          entryId: this.material.entryId,
          id: this.localMaterial.id,
          quantity: this.localMaterial.quantity,
          date: this.localMaterial.date,
          provider: this.localMaterial.provider,
          comprobante: this.localMaterial.comprobante,
          comprobanteNumber: this.localMaterial.comprobanteNumber,
          status: this.localMaterial.status,
          ruc: this.localMaterial.ruc,
          payment: this.localMaterial.payment,
          price: this.localMaterial.price,
          description: this.localMaterial.description
        })
      } else if (this.mode === 'usage') {
        this.$emit('confirm', {
          usageId: this.material.usageId,
          id: this.localMaterial.id,
          quantity: this.localMaterial.quantity,
          date: this.localMaterial.date,
          area: this.localMaterial.area,
          usageType: this.localMaterial.usageType,
          description: this.localMaterial.description,
          worker: this.localMaterial.worker,
          status: this.localMaterial.status
        })
      } else {
        this.$emit('confirm', {
          ...this.localMaterial,
          customType: undefined
        })
      }
    },

    cancel() {
      // Si hay cambios pendientes, preguntar antes de cancelar
      if (this.hasChanges) {
        if (confirm(this.$t('common.unsavedChanges', 'You have unsaved changes. Are you sure you want to leave?'))) {
          this.cancelChanges();
          this.$emit('cancel');
        }
      } else {
        this.$emit('cancel');
      }
    }
  }
}
</script>

<template>
  <div class="materials-form">
    <div class="form-container">
      <!-- Header del formulario -->
      <div class="form-header">
        <div class="header-back">
          <!-- Botones de Guardar/Cancelar (solo aparecen si hay cambios) -->
          <div v-if="hasChanges && isEditing" class="edit-actions">
            <AppButton
                :label="$t('common.save', 'Save')"
                icon="pi pi-check"
                variant="primary"
                @click="saveChanges"
                :loading="isSaving"
                :disabled="!hasChanges"
            />
            <AppButton
                :label="$t('common.cancel', 'Cancel')"
                icon="pi pi-times"
                variant="secondary"
                @click="cancelChanges"
                :disabled="isSaving"
            />
          </div>
        </div>

        <!-- Título del formulario -->
        <div class="form-title-section">
          <h2 class="form-title">{{ formTitle }}</h2>
          <p class="form-subtitle" v-if="mode === 'material'">
            {{ $t('inventory.manageMaterialInfo', 'Manage material information and details') }}
          </p>
          <p class="form-subtitle" v-else-if="mode === 'entry'">
            {{ $t('inventory.recordMaterialEntry', 'Record material entry details') }}
          </p>
          <p class="form-subtitle" v-else-if="mode === 'usage'">
            {{ $t('inventory.recordMaterialUsage', 'Record material usage details') }}
          </p>
        </div>
      </div>

      <!-- Formulario con campos editables -->
      <div class="form-content">
        <div class="form-grid">

          <!-- SELECT MATERIAL (para entry y usage) -->
          <div v-if="mode !== 'material'" class="form-field">
            <span class="field-label">{{ $t('inventory.selectMaterial', 'Select Material') }}</span>
            <select
                v-if="isEditing"
                v-model="localMaterial.id"
                @change="handleFieldChange('id', $event.target.value)"
                @click="handleFieldClick('id')"
                class="field-select"
            >
              <option v-for="material in materialsList" :key="material.id" :value="material.id">
                {{ material.name }}
              </option>
            </select>
            <span
                v-else
                @click="handleFieldClick('id')"
                :class="['field-value', { 'editable-field': canEdit }]"
                :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
            >
              {{ materialsList.find(m => m.id === localMaterial.id)?.name || '-' }}
            </span>
          </div>

          <!-- MATERIAL NAME (solo para material) -->
          <div v-if="mode === 'material'" class="form-field">
            <span class="field-label">{{ $t('inventory.materialName', 'Material Name') }}</span>
            <input
                v-if="isEditing"
                v-model="localMaterial.name"
                @input="handleFieldChange('name', $event.target.value)"
                @click="handleFieldClick('name')"
                class="field-input"
                :placeholder="$t('inventory.materialNamePlaceholder', 'Enter material name')"
            />
            <span
                v-else
                @click="handleFieldClick('name')"
                :class="['field-value', { 'editable-field': canEdit }]"
                :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
            >
              {{ localMaterial.name || '-' }}
            </span>
          </div>

          <!-- MATERIAL TYPE (solo para material) -->
          <div v-if="mode === 'material'" class="form-field">
            <span class="field-label">{{ $t('inventory.materialType', 'Material Type') }}</span>
            <select
                v-if="isEditing"
                v-model="localMaterial.type"
                @change="handleFieldChange('type', $event.target.value)"
                @click="handleFieldClick('type')"
                class="field-select"
            >
              <option v-for="option in typeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <span
                v-else
                @click="handleFieldClick('type')"
                :class="['field-value', { 'editable-field': canEdit }]"
                :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
            >
              {{ typeOptions.find(t => t.value === localMaterial.type)?.label || localMaterial.type || '-' }}
            </span>
          </div>

          <!-- CUSTOM TYPE (solo si type === 'CUSTOM_TYPE') -->
          <div v-if="mode === 'material' && localMaterial.type === 'CUSTOM_TYPE'" class="form-field">
            <span class="field-label">{{ $t('inventory.customTypeName', 'Custom Type Name') }}</span>
            <input
                v-if="isEditing"
                v-model="localMaterial.customType"
                @input="handleFieldChange('customType', $event.target.value)"
                @click="handleFieldClick('customType')"
                class="field-input"
                :placeholder="$t('inventory.enterCustomType', 'Enter custom type')"
                required
            />
            <span
                v-else
                @click="handleFieldClick('customType')"
                :class="['field-value', { 'editable-field': canEdit }]"
                :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
            >
              {{ localMaterial.customType || '-' }}
            </span>
          </div>

          <!-- UNIT (solo para material) -->
          <div v-if="mode === 'material'" class="form-field">
            <span class="field-label">{{ $t('inventory.unit', 'Unit') }}</span>
            <select
                v-if="isEditing"
                v-model="localMaterial.unit"
                @change="handleFieldChange('unit', $event.target.value)"
                @click="handleFieldClick('unit')"
                class="field-select"
            >
              <option v-for="option in unitOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <span
                v-else
                @click="handleFieldClick('unit')"
                :class="['field-value', { 'editable-field': canEdit }]"
                :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
            >
              {{ unitOptions.find(u => u.value === localMaterial.unit)?.label || localMaterial.unit || '-' }}
            </span>
          </div>

          <!-- MINIMUM STOCK (solo para material) -->
          <div v-if="mode === 'material'" class="form-field">
            <span class="field-label">{{ $t('inventory.minimumStock', 'Minimum Stock') }}</span>
            <input
                v-if="isEditing"
                v-model="localMaterial.minimumStock"
                @input="handleFieldChange('minimumStock', $event.target.value)"
                @click="handleFieldClick('minimumStock')"
                class="field-input"
                type="number"
                min="0"
            />
            <span
                v-else
                @click="handleFieldClick('minimumStock')"
                :class="['field-value', { 'editable-field': canEdit }]"
                :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
            >
              {{ localMaterial.minimumStock || '0' }}
            </span>
          </div>

          <!-- PROVIDER -->
          <div class="form-field">
            <span class="field-label">{{
                mode === 'material'
                    ? $t('inventory.mainProvider', 'Main Provider')
                    : $t('inventory.provider', 'Provider')
              }}</span>
            <input
                v-if="isEditing"
                v-model="localMaterial.provider"
                @input="handleFieldChange('provider', $event.target.value)"
                @click="handleFieldClick('provider')"
                class="field-input"
                :placeholder="$t('inventory.provider', 'Provider')"
            />
            <span
                v-else
                @click="handleFieldClick('provider')"
                :class="['field-value', { 'editable-field': canEdit }]"
                :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
            >
              {{ localMaterial.provider || '-' }}
            </span>
          </div>

          <!-- CAMPOS ESPECÍFICOS PARA ENTRY -->
          <template v-if="mode === 'entry'">
            <!-- QUANTITY -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.quantity', 'Quantity') }}</span>
              <input
                  v-if="isEditing"
                  v-model="localMaterial.quantity"
                  @input="handleFieldChange('quantity', $event.target.value)"
                  @click="handleFieldClick('quantity')"
                  class="field-input"
                  type="number"
                  min="0"
              />
              <span
                  v-else
                  @click="handleFieldClick('quantity')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ localMaterial.quantity || '0' }}
              </span>
            </div>

            <!-- DATE -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.entryDate', 'Entry Date') }}</span>
              <input
                  v-if="isEditing"
                  v-model="localMaterial.date"
                  @change="handleFieldChange('date', $event.target.value)"
                  @click="handleFieldClick('date')"
                  class="field-input"
                  type="date"
              />
              <span
                  v-else
                  @click="handleFieldClick('date')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ localMaterial.date || '-' }}
              </span>
            </div>

            <!-- PRICE -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.unitPrice', 'Unit Price') }}</span>
              <input
                  v-if="isEditing"
                  v-model="localMaterial.price"
                  @input="handleFieldChange('price', $event.target.value)"
                  @click="handleFieldClick('price')"
                  class="field-input"
                  type="number"
                  min="0"
                  step="0.01"
              />
              <span
                  v-else
                  @click="handleFieldClick('price')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ localMaterial.price || '0' }}
              </span>
            </div>

            <!-- COMPROBANTE -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.documentType', 'Document Type') }}</span>
              <select
                  v-if="isEditing"
                  v-model="localMaterial.comprobante"
                  @change="handleFieldChange('comprobante', $event.target.value)"
                  @click="handleFieldClick('comprobante')"
                  class="field-select"
              >
                <option v-for="option in comprobanteOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <span
                  v-else
                  @click="handleFieldClick('comprobante')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ comprobanteOptions.find(c => c.value === localMaterial.comprobante)?.label || localMaterial.comprobante || '-' }}
              </span>
            </div>

            <!-- COMPROBANTE NUMBER -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.documentNumber', 'Document Number') }}</span>
              <input
                  v-if="isEditing"
                  v-model="localMaterial.comprobanteNumber"
                  @input="handleFieldChange('comprobanteNumber', $event.target.value)"
                  @click="handleFieldClick('comprobanteNumber')"
                  class="field-input"
                  :placeholder="$t('inventory.documentNumber', 'Document Number')"
              />
              <span
                  v-else
                  @click="handleFieldClick('comprobanteNumber')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ localMaterial.comprobanteNumber || '-' }}
              </span>
            </div>

            <!-- STATUS -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.status', 'Status') }}</span>
              <select
                  v-if="isEditing"
                  v-model="localMaterial.status"
                  @change="handleFieldChange('status', $event.target.value)"
                  @click="handleFieldClick('status')"
                  class="field-select"
              >
                <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <span
                  v-else
                  @click="handleFieldClick('status')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ statusOptions.find(s => s.value === localMaterial.status)?.label || localMaterial.status || '-' }}
              </span>
            </div>

            <!-- RUC -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.ruc', 'RUC') }}</span>
              <input
                  v-if="isEditing"
                  v-model="localMaterial.ruc"
                  @input="handleFieldChange('ruc', $event.target.value)"
                  @click="handleFieldClick('ruc')"
                  class="field-input"
                  :placeholder="$t('inventory.ruc', 'RUC')"
              />
              <span
                  v-else
                  @click="handleFieldClick('ruc')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ localMaterial.ruc || '-' }}
              </span>
            </div>

            <!-- PAYMENT METHOD -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.paymentMethod', 'Payment Method') }}</span>
              <select
                  v-if="isEditing"
                  v-model="localMaterial.payment"
                  @change="handleFieldChange('payment', $event.target.value)"
                  @click="handleFieldClick('payment')"
                  class="field-select"
              >
                <option v-for="option in paymentOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <span
                  v-else
                  @click="handleFieldClick('payment')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ paymentOptions.find(p => p.value === localMaterial.payment)?.label || localMaterial.payment || '-' }}
              </span>
            </div>
          </template>

          <!-- CAMPOS ESPECÍFICOS PARA USAGE -->
          <template v-if="mode === 'usage'">
            <!-- USED QUANTITY -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.usedQuantity', 'Used Quantity') }}</span>
              <input
                  v-if="isEditing"
                  v-model="localMaterial.quantity"
                  @input="handleFieldChange('quantity', $event.target.value)"
                  @click="handleFieldClick('quantity')"
                  class="field-input"
                  type="number"
                  min="0"
              />
              <span
                  v-else
                  @click="handleFieldClick('quantity')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ localMaterial.quantity || '0' }}
              </span>
            </div>

            <!-- USAGE DATE -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.usageDate', 'Usage Date') }}</span>
              <input
                  v-if="isEditing"
                  v-model="localMaterial.date"
                  @change="handleFieldChange('date', $event.target.value)"
                  @click="handleFieldClick('date')"
                  class="field-input"
                  type="date"
              />
              <span
                  v-else
                  @click="handleFieldClick('date')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ localMaterial.date || '-' }}
              </span>
            </div>

            <!-- USAGE AREA -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.usageArea', 'Usage Area') }}</span>
              <input
                  v-if="isEditing"
                  v-model="localMaterial.area"
                  @input="handleFieldChange('area', $event.target.value)"
                  @click="handleFieldClick('area')"
                  class="field-input"
                  :placeholder="$t('inventory.usageArea', 'Usage Area')"
              />
              <span
                  v-else
                  @click="handleFieldClick('area')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ localMaterial.area || '-' }}
              </span>
            </div>

            <!-- USAGE TYPE -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.usageType', 'Usage Type') }}</span>
              <select
                  v-if="isEditing"
                  v-model="localMaterial.usageType"
                  @change="handleFieldChange('usageType', $event.target.value)"
                  @click="handleFieldClick('usageType')"
                  class="field-select"
              >
                <option v-for="option in usageTypeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <span
                  v-else
                  @click="handleFieldClick('usageType')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ usageTypeOptions.find(u => u.value === localMaterial.usageType)?.label || localMaterial.usageType || '-' }}
              </span>
            </div>

            <!-- WORKER -->
            <div class="form-field">
              <span class="field-label">{{ $t('inventory.worker', 'Worker') }}</span>
              <select
                  v-if="isEditing"
                  v-model="localMaterial.worker"
                  @change="handleFieldChange('worker', $event.target.value)"
                  @click="handleFieldClick('worker')"
                  class="field-select"
              >
                <option v-for="worker in workersList" :key="worker.id" :value="worker.id">
                  {{ worker.name }}
                </option>
              </select>
              <span
                  v-else
                  @click="handleFieldClick('worker')"
                  :class="['field-value', { 'editable-field': canEdit }]"
                  :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
              >
                {{ workersList.find(w => w.id === localMaterial.worker)?.name || '-' }}
              </span>
            </div>
          </template>

          <!-- DESCRIPTION (para todos los modos) -->
          <div class="form-field full-width">
            <span class="field-label">{{
                mode === 'material'
                    ? $t('inventory.description', 'Description')
                    : $t('inventory.observations', 'Observations')
              }}</span>
            <textarea
                v-if="isEditing"
                v-model="localMaterial.description"
                @input="handleFieldChange('description', $event.target.value)"
                @click="handleFieldClick('description')"
                class="field-textarea"
                :placeholder="mode === 'material' ? $t('inventory.description', 'Description') : $t('inventory.observations', 'Observations')"
                rows="3"
            />
            <span
                v-else
                @click="handleFieldClick('description')"
                :class="['field-value', { 'editable-field': canEdit }]"
                :title="canEdit ? $t('common.clickToEdit', 'Click to edit') : ''"
            >
              {{ localMaterial.description || '-' }}
            </span>
          </div>

        </div>
      </div>

      <!-- Botones de acción (solo aparecen si NO está en modo edición o es readonly) -->
      <div class="form-actions" v-if="!readonly && !isEditing">
        <AppButton
            :label="$t('general.confirm', 'Confirm')"
            variant="primary"
            @click="confirm"
        />
        <AppButton
            :label="$t('general.cancel', 'Cancel')"
            variant="secondary"
            @click="cancel"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.materials-form {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

.form-container {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

/* ========== HEADER DEL FORMULARIO ========== */
.form-header {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
}

.header-back {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 1.5rem;
}

.edit-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.form-title-section {
  text-align: center;
}

.form-title {
  margin: 0 0 0.5rem 0;
  font-size: 2.25rem;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.form-subtitle {
  margin: 0;
  color: #666;
  font-size: 1.125rem;
}

/* ========== CONTENIDO DEL FORMULARIO ========== */
.form-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-field {
  background: #f8f9fa;
  padding: 1.25rem 1.5rem;
  border-radius: 10px;
  border-left: 4px solid #FF5F01;
  transition: all 0.2s ease;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.form-field:hover {
  background: #f1f3f4;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.field-label {
  display: block;
  font-size: 0.75rem;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.field-value {
  display: block;
  font-size: 1.125rem;
  font-weight: 600;
  color: #423d3d;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  min-height: 1.5rem;
}

.field-value.editable-field {
  border: 2px dashed transparent;
  padding: 0.25rem;
  border-radius: 4px;
}

.field-value.editable-field:hover {
  border-color: #FF5F01;
  background: rgba(255, 95, 1, 0.05);
  color: #FF5F01;
}

.field-value.readonly {
  cursor: default;
  opacity: 0.7;
}

.field-value.readonly:hover {
  border-color: transparent;
  background: transparent;
  color: #494e49;
}

/* ========== CAMPOS DE ENTRADA EDITABLES ========== */
.field-input,
.field-select,
.field-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #FF5F01;
  border-radius: 6px;
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  background: white;
  transition: all 0.2s ease;
}

.field-input:focus,
.field-select:focus,
.field-textarea:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 95, 1, 0.2);
  border-color: #FF5F01;
}

.field-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

/* ========== BOTONES DE ACCIÓN ========== */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
}

/* ========== RESPONSIVE ========== */
@media (max-width: 1200px) {
  .form-container {
    padding: 1.5rem;
  }

  .form-header,
  .form-content {
    padding: 1.5rem;
  }

  .form-title {
    font-size: 2rem;
  }

  .form-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.25rem;
  }
}

@media (max-width: 992px) {
  .form-container {
    padding: 1rem;
  }

  .form-header,
  .form-content,
  .form-actions {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .form-title {
    font-size: 1.75rem;
  }

  .form-subtitle {
    font-size: 1rem;
  }

  .form-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .form-field {
    padding: 1rem;
  }

  .field-value,
  .field-input,
  .field-select,
  .field-textarea {
    font-size: 1rem;
  }
}

@media (max-width: 768px) {
  .form-container {
    padding: 0.75rem;
  }

  .form-header,
  .form-content,
  .form-actions {
    padding: 1rem;
    border-radius: 8px;
  }

  .header-back {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .edit-actions {
    justify-content: space-between;
  }

  .form-title {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
  }

  .form-subtitle {
    font-size: 0.875rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .form-field {
    padding: 0.75rem 1rem;
  }

  .field-label {
    font-size: 0.625rem;
  }

  .field-value,
  .field-input,
  .field-select,
  .field-textarea {
    font-size: 0.875rem;
  }

  .form-actions {
    flex-direction: column;
    gap: 0.75rem;
  }
}

@media (max-width: 480px) {
  .form-container {
    padding: 0.5rem;
  }

  .form-header,
  .form-content,
  .form-actions {
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    border-radius: 6px;
  }

  .form-title {
    font-size: 1.25rem;
  }

  .form-subtitle {
    font-size: 0.75rem;
  }

  .form-field {
    padding: 0.5rem 0.75rem;
  }
}

/* ========== ANIMACIONES ========== */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-field {
  animation: slideInUp 0.6s ease-out forwards;
}

.form-field:nth-child(1) { animation-delay: 0.1s; }
.form-field:nth-child(2) { animation-delay: 0.2s; }
.form-field:nth-child(3) { animation-delay: 0.3s; }
.form-field:nth-child(4) { animation-delay: 0.4s; }
.form-field:nth-child(5) { animation-delay: 0.5s; }
.form-field:nth-child(6) { animation-delay: 0.6s; }

/* ========== EFECTOS DE EDICIÓN ========== */
.editable-field {
  position: relative;
}

/* Transición suave entre modo edición y visualización */
.field-value,
.field-input,
.field-select,
.field-textarea {
  transition: all 0.3s ease;
}

/* Indicador de cambios pendientes */
.has-changes {
  border-left: 4px solid #f59e0b !important;
  background: rgba(245, 158, 11, 0.1) !important;
}

/* Loading state para guardar */
.saving-overlay {
  position: relative;
}

.saving-overlay::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  border-radius: inherit;
  z-index: 10;
}

.saving-overlay::after {
  content: 'Guardando...';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1rem;
  font-weight: 600;
  z-index: 11;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ========== HOVER EFFECTS ========== */
.form-field:hover .field-value.editable-field::after {
  content: '✏️';
  position: absolute;
  right: -1.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.875rem;
  opacity: 0.6;
}
</style>