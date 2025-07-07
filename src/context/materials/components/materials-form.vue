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
    workersList: { type: Array, default: () => [] }
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
      this.$emit('cancel')
    }
  }
}
</script>

<template>
  <div class="card p-4">
    <div class="grid grid-cols-2 gap-4">
      <AppInput v-if="mode !== 'material'" v-model="localMaterial.id" :disabled="readonly" :label="$t('inventory.selectMaterial')" type="select" :options="materialsList.map(m => ({ label: m.name, value: m.id }))" />

      <AppInput v-if="mode === 'material'" v-model="localMaterial.name" :disabled="readonly" :label="$t('inventory.materialName')" :placeholder="$t('inventory.materialNamePlaceholder')" />

      <AppInput v-if="mode === 'material'" v-model="localMaterial.type" :disabled="readonly" :label="$t('inventory.materialType')" type="select" :options="typeOptions" />

      <AppInput v-if="mode === 'material' && localMaterial.type === 'CUSTOM_TYPE'" v-model="localMaterial.customType" :disabled="readonly" :label="$t('inventory.customTypeName')" :placeholder="$t('inventory.enterCustomType')" :required="true" />

      <!-- Usando la computed property unitOptions -->
      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.unit"
          :disabled="readonly"
          :label="$t('inventory.unit')"
          type="select"
          :options="unitOptions"
      />

      <AppInput v-if="mode === 'material'" v-model="localMaterial.minimumStock" :disabled="readonly" :label="$t('inventory.minimumStock')" type="number" />

      <AppInput v-if="mode === 'material'" v-model="localMaterial.provider" :disabled="readonly" :label="$t('inventory.mainProvider')" />

      <!-- ENTRY -->
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.provider" :disabled="readonly" :label="$t('inventory.provider')" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.quantity" :disabled="readonly" :label="$t('inventory.quantity')" type="number" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.date" :disabled="readonly" :label="$t('inventory.entryDate')" type="date" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.price" :disabled="readonly" :label="$t('inventory.unitPrice')" type="number" />

      <!-- Usando la computed property comprobanteOptions -->
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.comprobante" :disabled="readonly" :label="$t('inventory.documentType')" type="select" :options="comprobanteOptions" />

      <AppInput v-if="mode === 'entry'" v-model="localMaterial.comprobanteNumber" :disabled="readonly" :label="$t('inventory.documentNumber')" />

      <!-- Usando la computed property statusOptions -->
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.status" :disabled="readonly" :label="$t('inventory.status')" type="select" :options="statusOptions" />

      <AppInput v-if="mode === 'entry'" v-model="localMaterial.ruc" :disabled="readonly" :label="$t('inventory.ruc')" />

      <!-- Usando la computed property paymentOptions -->
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.payment" :disabled="readonly" :label="$t('inventory.paymentMethod')" type="select" :options="paymentOptions"/>

      <AppInput v-if="mode === 'entry'" v-model="localMaterial.description" :disabled="readonly" :label="$t('inventory.observations')" type="textarea" />

      <!-- USAGE -->
      <AppInput v-if="mode === 'usage'" v-model="localMaterial.quantity" :disabled="readonly" :label="$t('inventory.usedQuantity')" type="number" />
      <AppInput v-if="mode === 'usage'" v-model="localMaterial.date" :disabled="readonly" :label="$t('inventory.usageDate')" type="date" />
      <AppInput v-if="mode === 'usage'" v-model="localMaterial.area" :disabled="readonly" :label="$t('inventory.usageArea')" />

      <!-- Usando la computed property usageTypeOptions -->
      <AppInput v-if="mode === 'usage'" v-model="localMaterial.usageType" :disabled="readonly" :label="$t('inventory.usageType')" type="select" :options="usageTypeOptions" />

      <AppInput v-if="mode === 'usage'" v-model="localMaterial.worker" :disabled="readonly" :label="$t('inventory.worker')" type="select" :options="workersList.map(w => ({ label: w.name, value: w.id }))" />
      <AppInput v-if="mode === 'usage'" v-model="localMaterial.description" :disabled="readonly" :label="$t('inventory.observations')" type="textarea" />
    </div>

    <div class="flex justify-end mt-4 gap-2" v-if="!readonly">
      <AppButton :label="$t('general.confirm')" variant="primary" @click="confirm" />
      <AppButton :label="$t('general.cancel')" variant="secondary" @click="cancel" />
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.gap-4 { gap: 1rem; }
.mt-4 { margin-top: 1rem; }
</style>