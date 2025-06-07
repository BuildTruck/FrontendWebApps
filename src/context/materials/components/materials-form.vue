<script>
import AppInput from '../../../core/components/AppInput.vue'
import AppButton from '../../../core/components/AppButton.vue'

const MATERIAL_TYPES_KEY = 'materialTypes'

export default {
  name: 'MaterialsForm',
  components: { AppInput, AppButton },
  props: {
    material: { type: Object, default: () => ({}) },
    readonly: { type: Boolean, default: false },
    mode: { type: String, default: 'material' }, // 'material' | 'entry' | 'usage'
    materialsList: { type: Array, default: () => [] },
    workersList: { type: Array, default: () => [] }
  },
  emits: ['confirm', 'cancel'],
  data() {
    return {
      localMaterial: {
        id: null, projectId: null, name: '', type: '', customType: '',
        unit: '', quantity: 0, stock: 0, price: 0, total: 0, provider: '',
        ruc: '', date: '', status: 'Pendiente', payment: '', comprobante: '',
        comprobanteNumber: '', description: '', minimumStock: 0,
        area: '', usageType: '', worker: ''
      },
      materialTypes: [],
    }
  },
  computed: {
    typeOptions() {
      return [
        { label: this.$t('inventory.material'), value: 'MAT' },
        { label: this.$t('inventory.fuel'), value: 'COMBUST.' },
        ...this.materialTypes.map(type => ({ label: type, value: type })),
        { label: this.$t('inventory.other'), value: 'Otro' }
      ]
    }
  },
  created() {
    this.loadTypes()
    if (this.material && Object.keys(this.material).length > 0) {
      this.localMaterial = { ...this.material }
      if (!['MAT', 'COMBUST.'].includes(this.material.type)) {
        this.localMaterial.customType = this.material.type
        this.localMaterial.type = this.material.type
      }
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
      if (this.localMaterial.type === 'Otro' && this.localMaterial.customType) {
        this.localMaterial.type = this.localMaterial.customType
        this.saveCustomType(this.localMaterial.customType)
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
        this.$emit('confirm', { ...this.localMaterial })
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
      <!-- SELECT MATERIAL (entry / usage) -->
      <AppInput
          v-if="mode !== 'material'"
          v-model="localMaterial.id"
          :disabled="readonly"
          :label="$t('inventory.selectMaterial')"
          type="select"
          :options="materialsList.map(m => ({ label: m.name, value: m.id }))"
      />

      <!-- MATERIAL FORM -->
      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.name"
          :disabled="readonly"
          :label="$t('inventory.materialName')"
          :placeholder="$t('inventory.materialNamePlaceholder')"
      />

      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.type"
          :disabled="readonly"
          :label="$t('inventory.materialType')"
          type="select"
          :options="typeOptions"
      />

      <AppInput
          v-if="mode === 'material' && localMaterial.type === 'Otro'"
          v-model="localMaterial.customType"
          :disabled="readonly"
          :label="$t('inventory.otherMaterial')"
          :placeholder="$t('inventory.otherMaterialPlaceholder')"
      />

      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.unit"
          :disabled="readonly"
          :label="$t('inventory.unit')"
          :placeholder="$t('inventory.unitPlaceholder')"
      />

      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.minimumStock"
          :disabled="readonly"
          :label="$t('inventory.minimumStock')"
          type="number"
      />

      <AppInput
          v-if="mode === 'material'"
          v-model="localMaterial.provider"
          :disabled="readonly"
          :label="$t('inventory.mainProvider')"
      />

      <!-- ENTRY -->
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.provider" :disabled="readonly" :label="$t('inventory.provider')" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.quantity" :disabled="readonly" :label="$t('inventory.quantity')" type="number" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.date" :disabled="readonly" :label="$t('inventory.entryDate')" type="date" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.price" :disabled="readonly" :label="$t('inventory.unitPrice')" type="number" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.comprobante" :disabled="readonly" :label="$t('inventory.documentType')" type="select"
                :options="[{ label: $t('inventory.invoice'), value: 'Factura' }, { label: $t('inventory.receipt'), value: 'Boleta' }, { label: $t('inventory.guide'), value: 'Guía' }]" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.comprobanteNumber" :disabled="readonly" :label="$t('inventory.documentNumber')" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.status" :disabled="readonly" :label="$t('inventory.status')" type="select"
                :options="[{ label: $t('inventory.pending'), value: 'Pendiente' }, { label: $t('inventory.canceled'), value: 'Cancelado' }]" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.ruc" :disabled="readonly" :label="$t('inventory.ruc')" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.payment" :disabled="readonly" :label="$t('inventory.paymentMethod')" type="select"
                :options="[{ label: $t('inventory.cash'), value: 'Contado' }, { label: $t('inventory.credit'), value: 'Crédito' }]" />
      <AppInput v-if="mode === 'entry'" v-model="localMaterial.description" :disabled="readonly" :label="$t('inventory.observations')" type="textarea" />

      <!-- USAGE -->
      <AppInput v-if="mode === 'usage'" v-model="localMaterial.quantity" :disabled="readonly" :label="$t('inventory.usedQuantity')" type="number" />
      <AppInput v-if="mode === 'usage'" v-model="localMaterial.date" :disabled="readonly" :label="$t('inventory.usageDate')" type="date" />
      <AppInput v-if="mode === 'usage'" v-model="localMaterial.area" :disabled="readonly" :label="$t('inventory.usageArea')" />
      <AppInput v-if="mode === 'usage'" v-model="localMaterial.usageType" :disabled="readonly" :label="$t('inventory.usageType')" type="select"
                :options="[{ label: $t('inventory.normal'), value: 'Normal' }, { label: $t('inventory.urgent'), value: 'Urgente' }, { label: $t('inventory.waste'), value: 'Desperdicio' }]" />
      <AppInput v-if="mode === 'usage'" v-model="localMaterial.worker" :disabled="readonly" :label="$t('inventory.worker')" type="select"
                :options="workersList.map(w => ({ label: w.name, value: w.id }))" />
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
